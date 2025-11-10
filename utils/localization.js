const config = require('./config');

/**
 * Localization and Internationalization Utilities
 * Handles language, timezone, and date formatting
 */

/**
 * Validate if a language code is supported
 * @param {string} lang - Language code (e.g., 'en', 'es')
 * @returns {boolean} - True if supported
 */
const isLanguageSupported = (lang) => {
  if (!lang || typeof lang !== 'string') {
    return false;
  }
  return config.SUPPORTED_LANGUAGES.includes(lang.toLowerCase());
};

/**
 * Get the default language or validate user's language preference
 * @param {string} requestedLang - User's requested language
 * @returns {string} - Valid language code
 */
const getValidLanguage = (requestedLang) => {
  if (requestedLang && isLanguageSupported(requestedLang)) {
    return requestedLang.toLowerCase();
  }
  return config.DEFAULT_LANGUAGE;
};

/**
 * Extract language from Accept-Language header
 * @param {string} acceptLanguageHeader - Accept-Language header value
 * @returns {string} - Best matching language code
 */
const getLanguageFromHeader = (acceptLanguageHeader) => {
  if (!acceptLanguageHeader) {
    return config.DEFAULT_LANGUAGE;
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
  const languages = acceptLanguageHeader
    .split(',')
    .map(lang => {
      const parts = lang.trim().split(';');
      const code = parts[0].split('-')[0]; // Get base language (en from en-US)
      const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
      return { code: code.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality); // Sort by quality

  // Find first supported language
  for (const lang of languages) {
    if (isLanguageSupported(lang.code)) {
      return lang.code;
    }
  }

  return config.DEFAULT_LANGUAGE;
};

/**
 * Format a date according to configured format
 * @param {Date} date - Date to format
 * @param {string} timezone - Timezone (optional, uses default if not provided)
 * @param {string} format - Format type (optional, uses config default)
 * @returns {string} - Formatted date string
 */
const formatDate = (date, timezone = null, format = null) => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const tz = timezone || config.DEFAULT_TIMEZONE;
  const fmt = format || config.DATE_FORMAT;

  try {
    switch (fmt.toUpperCase()) {
      case 'ISO':
        // ISO 8601 format
        return date.toISOString();

      case 'UTC':
        // UTC string
        return date.toUTCString();

      case 'LOCALE':
        // Locale-based formatting
        return date.toLocaleString('en-US', { timeZone: tz });

      case 'DATE_ONLY':
        // Date only (YYYY-MM-DD)
        return date.toISOString().split('T')[0];

      case 'TIME_ONLY':
        // Time only (HH:MM:SS)
        return date.toISOString().split('T')[1].split('.')[0];

      case 'TIMESTAMP':
        // Unix timestamp
        return Math.floor(date.getTime() / 1000).toString();

      default:
        // Default to ISO
        return date.toISOString();
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return date.toISOString(); // Fallback to ISO
  }
};

/**
 * Parse date string with timezone awareness
 * @param {string} dateString - Date string to parse
 * @param {string} timezone - Timezone (optional)
 * @returns {Date} - Parsed date object
 */
const parseDate = (dateString, timezone = null) => {
  if (!dateString) {
    return null;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

/**
 * Get timezone offset in minutes
 * @param {string} timezone - Timezone name
 * @returns {number} - Offset in minutes
 */
const getTimezoneOffset = (timezone = null) => {
  const tz = timezone || config.DEFAULT_TIMEZONE;
  
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    console.error('Timezone offset error:', error);
    return 0;
  }
};

/**
 * Middleware to extract and validate user language preference
 * Sets req.language with validated language code
 */
const languageMiddleware = (req, res, next) => {
  // Priority: 1. Query param, 2. Header, 3. User profile, 4. Default
  let language = req.query.lang || req.query.language;

  if (!language && req.headers['accept-language']) {
    language = getLanguageFromHeader(req.headers['accept-language']);
  }

  if (!language && req.user && req.user.preferences && req.user.preferences.language) {
    language = req.user.preferences.language;
  }

  req.language = getValidLanguage(language);
  next();
};

/**
 * Middleware to set timezone for date operations
 * Sets req.timezone with user's timezone or default
 */
const timezoneMiddleware = (req, res, next) => {
  // Priority: 1. Query param, 2. Header, 3. User profile, 4. Default
  let timezone = req.query.timezone || req.query.tz;

  if (!timezone && req.headers['x-timezone']) {
    timezone = req.headers['x-timezone'];
  }

  if (!timezone && req.user && req.user.preferences && req.user.preferences.timezone) {
    timezone = req.user.preferences.timezone;
  }

  req.timezone = timezone || config.DEFAULT_TIMEZONE;
  next();
};

/**
 * Add localization context to API responses
 * Adds language and timezone info to response metadata
 */
const addLocalizationContext = (res, data) => {
  return {
    ...data,
    _meta: {
      ...(data._meta || {}),
      language: res.req.language || config.DEFAULT_LANGUAGE,
      timezone: res.req.timezone || config.DEFAULT_TIMEZONE,
      dateFormat: config.DATE_FORMAT,
      timestamp: formatDate(new Date(), res.req.timezone)
    }
  };
};

module.exports = {
  isLanguageSupported,
  getValidLanguage,
  getLanguageFromHeader,
  formatDate,
  parseDate,
  getTimezoneOffset,
  languageMiddleware,
  timezoneMiddleware,
  addLocalizationContext
};
