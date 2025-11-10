const setTokenCookie = (res, token, rememberMe = false) => {
  const maxAge = rememberMe
    ? parseInt(process.env.COOKIE_MAX_AGE_REMEMBER_ME, 10) || 2592000000 // 30 days
    : parseInt(process.env.COOKIE_MAX_AGE, 10) || 604800000; // 7 days

  const cookieOptions = {
    httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge,
    path: process.env.COOKIE_PATH || '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  };

  res.cookie('token', token, cookieOptions);
};

module.exports = { setTokenCookie };
