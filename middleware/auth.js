function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  try {
    return Object.fromEntries(
      cookieHeader.split(';').map((s) => {
        const [k, ...vParts] = s.trim().split('=');
        const v = vParts.join('=').trim();
        return [k, v ? decodeURIComponent(v.replace(/^"|"$/g, '')) : ''];
      })
    );
  } catch (_) {
    return {};
  }
}

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function requireParentAuth(sessions) {
  return (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies?.parent_session || null;
    if (!token) return res.redirect('/parent/login');
    const s = sessions.get(token);
    if (!s || Date.now() - s.createdAt > SESSION_MAX_AGE_MS) {
      if (token) sessions.delete(token);
      return res.redirect('/parent/login');
    }
    return next();
  };
}

module.exports = { parseCookies, requireParentAuth };
