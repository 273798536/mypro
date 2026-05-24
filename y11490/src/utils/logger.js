const winston = require('winston');
const path = require('path');
const config = require('../../config');

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bid-seal-state-machine' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
