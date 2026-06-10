const conversionDAO = require('../db/conversionDAO');
const sampleDAO = require('../db/sampleDAO');
const reagentDAO = require('../db/reagentDAO');
const reviewDAO = require('../db/reviewDAO');
const safetyAlertDAO = require('../db/safetyAlertDAO');
const operationLogDAO = require('../db/operationLogDAO');
const moment = require('moment');

const reportService = {
  generateReport(conversionId) {
    const record = conversionDAO.getById(conversionId);
    if (!record) {
      throw new Error('换算记录不存在');
    }

    const sample = sampleDAO.getById(record.sample_id);
    const reagent = record.reagent_id ? reagentDAO.getById(record.reagent_id) : null;
    const reviews = reviewDAO.getByConversionId(conversionId);
    const alerts = safetyAlertDAO.listByConversionId(conversionId);
    const logs = operationLogDAO.list({ target_type: 'conversion', target_id: conversionId, pageSize: 100 });

    const activeAlerts = alerts.filter(a => a.is_active === 1);
    const isUsable = activeAlerts.length === 0 && record.status === 'approved';

    const blockReasons = [];
    if (record.weighing_precision_pass === 0) {
      blockReasons.push({
        type: 'weighing_precision',
        title: '称量精度不足',
        detail: record.weighing_precision_detail || '称量精度未达到标准要求',
        explanation: this._explainWeighingPrecision(record)
      });
    }
    if (record.status === 'rejected') {
      const rejectReview = reviews.find(r => r.review_result === 'rejected');
      blockReasons.push({
        type: 'review_rejected',
        title: '复核未通过',
        detail: rejectReview ? rejectReview.review_opinion : '复核被驳回',
        explanation: '该记录经配方工程师复核后不予通过，需检查数据并重做实验或重新计算。'
      });
    }

    const report = {
      report_title: '海水盐度化学换算报告',
      report_id: `RPT-${conversionId}-${moment().format('YYYYMMDD')}`,
      generated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      status: record.status,
      is_usable: isUsable,

      sample_info: {
        sample_no: sample.sample_no,
        sampling_point: sample.sampling_point,
        sampling_time: sample.sampling_time,
        temperature: sample.temperature,
        ph: sample.ph,
        conductivity: sample.conductivity,
        manual_remark: sample.manual_remark
      },

      conversion_result: {
        salinity: record.salinity_result,
        calculation_method: record.calculation_method,
        weighing_precision: record.weighing_precision,
        weighing_precision_pass: record.weighing_precision_pass === 1,
        reaction_condition: record.reaction_condition,
        spectrum_data: record.spectrum_data ? JSON.parse(record.spectrum_data) : null
      },

      reagent_info: reagent ? {
        reagent_name: reagent.reagent_name,
        reagent_code: reagent.reagent_code,
        batch_no: reagent.batch_no,
        concentration: reagent.concentration,
        unit: reagent.unit,
        purity: reagent.purity
      } : null,

      block_reasons: blockReasons,

      review_history: reviews.map(r => ({
        reviewer: r.reviewer,
        result: r.review_result,
        opinion: r.review_opinion,
        time: r.reviewed_at
      })),

      safety_alerts: activeAlerts,

      operation_trace: logs.map(l => ({
        operation: l.operation_type,
        operator: l.operator,
        detail: l.detail,
        time: l.created_at
      }))
    };

    return report;
  },

  _explainWeighingPrecision(record) {
    const precision = record.weighing_precision;
    const threshold = 0.001;

    return {
      what_is_weighing_precision: '称量精度指天平能测量的最小质量增量，反映称量结果的准确程度。',
      current_value: precision !== null ? `${precision} g` : '未提供',
      required_value: `${threshold} g (千分之一克)`,
      why_it_matters: [
        '盐度化学换算基于精确的质量测量数据',
        '称量精度不足会导致样品质量测量误差偏大',
        '误差经换算公式放大后，最终盐度结果可能偏离真实值',
        '不符合实验室质量管理规范，数据不具备可追溯性'
      ],
      what_happens_when_insufficient: [
        '换算结果可靠性降低，可能出现较大偏差',
        '数据不能用于正式报告或研究论文',
        '复核时会被配方工程师拦截',
        '需要重新称量并重新计算'
      ],
      how_to_fix: [
        '使用精度更高的分析天平（推荐万分之一精度 0.0001 g）',
        '确保天平已校准并在有效期内',
        '称量前样品需恒温至室温',
        '控制环境温湿度，避免静电影响',
        '增加平行样数量，取平均值减少误差'
      ]
    };
  },

  generateMonthlyHandoverReport(year, month) {
    const allConversions = conversionDAO.list({ page: 1, pageSize: 1000 });
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const monthRecords = allConversions.filter(c => {
      return c.created_at && c.created_at.startsWith(monthStr);
    });

    const unusableRecords = monthRecords.filter(
      c => c.weighing_precision_pass === 0 || c.status === 'rejected'
    );

    const usableRecords = monthRecords.filter(
      c => c.weighing_precision_pass === 1 && c.status === 'approved'
    );

    const byReason = {
      weighing_precision: unusableRecords.filter(c => c.weighing_precision_pass === 0).length,
      review_rejected: unusableRecords.filter(c => c.status === 'rejected').length
    };

    return {
      report_title: '月度海水盐度换算记录转交清单',
      period: `${year}年${month}月`,
      generated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      summary: {
        total: monthRecords.length,
        usable: usableRecords.length,
        unusable: unusableRecords.length,
        unusable_rate: monthRecords.length > 0
          ? ((unusableRecords.length / monthRecords.length) * 100).toFixed(1) + '%'
          : '0%'
      },
      unusable_by_reason: byReason,
      unusable_records: unusableRecords.map(r => ({
        id: r.id,
        sample_no: r.sample_no,
        sampling_point: r.sampling_point,
        status: r.status,
        weighing_precision_pass: r.weighing_precision_pass === 1,
        reason: r.weighing_precision_pass === 0 ? '称量精度不足' : '复核未通过',
        sample_remark: r.sample_remark
      })),
      note: '月底转交时，请重点关注以上不可用记录，与学生沟通原因并安排补做实验。'
    };
  }
};

module.exports = reportService;
