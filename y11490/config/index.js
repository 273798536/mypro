const path = require('path');

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  database: {
    path: path.join(__dirname, '..', 'data', 'bid_seal.db')
  },
  uploads: {
    dir: path.join(__dirname, '..', 'uploads'),
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: path.join(__dirname, '..', 'logs')
  },
  export: {
    dir: path.join(__dirname, '..', 'exports')
  }
};
