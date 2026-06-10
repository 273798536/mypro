const operationLogDAO = require('../db/operationLogDAO');
const safetyAlertDAO = require('../db/safetyAlertDAO');

const logService = {
  listLogs(params) {
    const list = operationLogDAO.list(params);
    const total = operationLogDAO.count(params);
    return {
      list,
      total,
      page: params.page || 1,
      pageSize: params.pageSize || 50
    };
  },

  getOperationTrace(targetType, targetId) {
    return operationLogDAO.list({
      target_type: targetType,
      target_id: targetId,
      pageSize: 200
    });
  },

  listActiveAlerts() {
    return safetyAlertDAO.listActive();
  }
};

module.exports = logService;
