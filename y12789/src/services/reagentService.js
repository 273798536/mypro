const reagentDAO = require('../db/reagentDAO');
const conversionDAO = require('../db/conversionDAO');
const conversionService = require('./conversionService');
const operationLogDAO = require('../db/operationLogDAO');

const reagentService = {
  addReagent(reagent, operator = 'system') {
    const result = reagentDAO.create(reagent);
    operationLogDAO.create({
      operation_type: 'create',
      target_type: 'reagent',
      target_id: result.id,
      operator,
      detail: `新增试剂: ${reagent.reagent_name}`
    });
    return result;
  },

  getReagent(id) {
    return reagentDAO.getById(id);
  },

  listReagents(params) {
    const list = reagentDAO.list(params);
    const total = reagentDAO.count();
    return { list, total, page: params.page || 1, pageSize: params.pageSize || 20 };
  },

  updateReagent(id, data, operator = 'system') {
    const oldReagent = reagentDAO.getById(id);
    const changes = reagentDAO.update(id, data);

    if (changes > 0) {
      operationLogDAO.create({
        operation_type: 'update',
        target_type: 'reagent',
        target_id: id,
        operator,
        detail: `更新试剂台账: ${JSON.stringify(data)}`
      });

      if (data.concentration !== undefined || data.purity !== undefined) {
        this._triggerConversionUpdate(id, operator);
      }
    }

    return reagentDAO.getById(id);
  },

  deleteReagent(id, operator = 'system') {
    const changes = reagentDAO.remove(id);
    if (changes > 0) {
      operationLogDAO.create({
        operation_type: 'delete',
        target_type: 'reagent',
        target_id: id,
        operator,
        detail: '删除试剂台账'
      });
    }
    return changes > 0;
  },

  _triggerConversionUpdate(reagentId, operator) {
    const allConversions = conversionDAO.list({ status: null, page: 1, pageSize: 1000 });
    const conversions = allConversions.filter(
      c => c.reagent_id === reagentId && ['draft', 'calculated', 'pending_review'].includes(c.status)
    );

    operationLogDAO.create({
      operation_type: 'trigger_update',
      target_type: 'reagent',
      target_id: reagentId,
      operator,
      detail: `试剂浓度变更，触发 ${conversions.length} 条换算记录重新计算`
    });

    for (const conv of conversions) {
      try {
        conversionService.recalculate(conv.id, operator);
      } catch (e) {
        console.error(`重新计算换算记录 ${conv.id} 失败:`, e.message);
      }
    }
  }
};

module.exports = reagentService;
