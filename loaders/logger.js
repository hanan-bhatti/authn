const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../utils/config');

/**
 * Initialize and configure Winston logger
 * @returns {winston.Logger} Configured logger instance
 */
const initializeLogger = () => {
  const logger = winston.createLogger({
    level: config.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: []
  });

  if (config.LOGGING_ENABLED && config.LOG_FILE_PATH) {
    logger.add(new winston.transports.DailyRotateFile({
      filename: config.LOG_FILE_PATH,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: config.LOG_MAX_FILE_SIZE || '20m',
      maxFiles: config.LOG_MAX_FILES || '14d'
    }));
  } else {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
      silent: config.IS_PRODUCTION && config.LOGGING_ENABLED && config.LOG_FILE_PATH
    }));
  }

  return logger;
};

module.exports = { initializeLogger };
