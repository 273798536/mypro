const app = require('./server');
const { hasPermission, ROLES } = require('./middleware/auth');

module.exports = {
  app,
  hasPermission,
  ROLES,
  models: {
    Contract: require('./models/Contract'),
    PaymentNode: require('./models/PaymentNode'),
    AcceptanceEmail: require('./models/AcceptanceEmail'),
    Confirmation: require('./models/Confirmation'),
    Storage: require('./models/storage')
  },
  services: {
    ExportService: require('./services/exportService')
  }
};
