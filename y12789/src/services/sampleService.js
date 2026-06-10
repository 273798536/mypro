const sampleDAO = require('../db/sampleDAO');
const operationLogDAO = require('../db/operationLogDAO');

const sampleService = {
  importSamples(samples, operator = 'system') {
    const results = sampleDAO.batchCreate(samples);
    const successCount = results.filter(r => r.success).length;

    operationLogDAO.create({
      operation_type: 'batch_import',
      target_type: 'sample',
      operator,
      detail: `批量导入样品 ${successCount}/${samples.length} 条成功`
    });

    return {
      total: samples.length,
      success: successCount,
      failed: samples.length - successCount,
      details: results
    };
  },

  getSample(id) {
    return sampleDAO.getById(id);
  },

  getBySampleNo(sampleNo) {
    return sampleDAO.getBySampleNo(sampleNo);
  },

  listSamples(params) {
    const list = sampleDAO.list(params);
    const total = sampleDAO.count(params);
    return { list, total, page: params.page || 1, pageSize: params.pageSize || 20 };
  },

  updateSample(id, data, operator = 'system') {
    const changes = sampleDAO.update(id, data);
    if (changes > 0) {
      operationLogDAO.create({
        operation_type: 'update',
        target_type: 'sample',
        target_id: id,
        operator,
        detail: `更新样品信息: ${JSON.stringify(data)}`
      });
    }
    return sampleDAO.getById(id);
  }
};

module.exports = sampleService;
