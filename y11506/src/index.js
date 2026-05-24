module.exports = {
  database: require('./db/database'),
  importService: require('./services/importService'),
  validationService: require('./services/validationService'),
  fixService: require('./services/fixService'),
  historyService: require('./services/historyService'),
  reportService: require('./services/reportService'),
  exportService: require('./services/exportService'),
  taskService: require('./services/taskService')
};
