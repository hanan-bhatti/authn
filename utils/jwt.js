const jwt = require('jsonwebtoken');

const generateToken = (payload, rememberMe = false) => {
  const expiresIn = rememberMe
    ? process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    : process.env.JWT_EXPIRES_IN || '7d';

  const options = {
    expiresIn,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  };

  const secret = options.algorithm.startsWith('RS')
    ? process.env.JWT_PRIVATE_KEY
    : process.env.JWT_SECRET;

  return jwt.sign(payload, secret, options);
};

module.exports = { generateToken };