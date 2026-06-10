const reviewDAO = require('../db/reviewDAO');
const conversionDAO = require('../db/conversionDAO');
const sampleDAO = require('../db/sampleDAO');
const safetyAlertDAO = require('../db/safetyAlertDAO');
const operationLogDAO = require('../db/operationLogDAO');

const reviewService = {
  review(conversionId, result, opinion, reviewer = 'engineer') {
    const record = conversionDAO.getById(conversionId);
    if (!record) {
      throw new Error('换算记录不存在');
    }
    if (record.status !== 'pending_review') {
      throw new Error('只有待复核状态的记录才能进行复核');
    }

    const reviewResult = result === 'pass' ? 'approved' : 'rejected';

    const reviewRecord = reviewDAO.create({
      conversion_id: conversionId,
      reviewer,
      review_result: reviewResult,
      review_opinion: opinion
    });

    conversionDAO.updateStatus(conversionId, reviewResult);
    sampleDAO.updateStatus(record.sample_id, reviewResult);

    if (result === 'reject') {
      safetyAlertDAO.create({
        conversion_id: conversionId,
        sample_id: record.sample_id,
        alert_type: 'review_rejected',
        alert_level: 'error',
        alert_message: `复核被驳回: ${opinion || '未说明原因'}`
      });
    } else {
      safetyAlertDAO.resolveByConversionId(conversionId);
    }

    operationLogDAO.create({
      operation_type: 'review',
      target_type: 'conversion',
      target_id: conversionId,
      operator: reviewer,
      detail: `复核${result === 'pass' ? '通过' : '驳回'}: ${opinion || '无意见'}`
    });

    return {
      review: reviewRecord,
      conversion: conversionDAO.getById(conversionId)
    };
  },

  getReviews(conversionId) {
    return reviewDAO.getByConversionId(conversionId);
  },

  listReviews(params) {
    const list = reviewDAO.list(params);
    return { list };
  }
};

module.exports = reviewService;
