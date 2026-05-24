const path = require('path');

module.exports = {
  db: {
    path: path.join(__dirname, '..', 'data', 'kb-audit.db'),
  },
  server: {
    port: process.env.PORT || 3000,
  },
  export: {
    dir: path.join(__dirname, '..', 'exports'),
  },
  logs: {
    dir: path.join(__dirname, '..', 'logs'),
  },
};
