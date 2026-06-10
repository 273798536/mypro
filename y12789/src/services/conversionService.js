const conversionDAO = require('../db/conversionDAO');
const sampleDAO = require('../db/sampleDAO');
const reagentDAO = require('../db/reagentDAO');
const safetyAlertDAO = require('../db/safetyAlertDAO');
const operationLogDAO = require('../db/operationLogDAO');

const WEIGHING_PRECISION_THRESHOLD = 0.001;

const conversionService = {
  WEIGHING_PRECISION_THRESHOLD,

  createConversion(sampleId, options = {}, operator = 'system') {
    const sample = sampleDAO.getById(sampleId);
    if (!sample) {
      throw new Error('样品不存在');
    }

    const existing = conversionDAO.getLatestBySampleId(sampleId);
    if (existing && ['draft', 'calculated', 'pending_review'].includes(existing.status)) {
      return existing;
    }

    const record = conversionDAO.create({
      sample_id: sampleId,
      reagent_id: options.reagent_id || null,
      status: 'draft'
    });

    operationLogDAO.create({
      operation_type: 'create',
      target_type: 'conversion',
      target_id: record.id,
      operator,
      detail: `创建换算记录，样品: ${sample.sample_no}`
    });

    sampleDAO.updateStatus(sampleId, 'converting');

    return record;
  },

  calculate(conversionId, inputData, operator = 'system') {
    const record = conversionDAO.getById(conversionId);
    if (!record) {
      throw new Error('换算记录不存在');
    }
    if (record.status === 'approved') {
      throw new Error('已复核通过的记录不能重新计算');
    }

    const sample = sampleDAO.getById(record.sample_id);

    const reagent = inputData.reagent_id
      ? reagentDAO.getById(inputData.reagent_id)
      : (record.reagent_id ? reagentDAO.getById(record.reagent_id) : null);

    const weighingPrecision = inputData.weighing_precision ?? record.weighing_precision;
    const precisionCheck = this._checkWeighingPrecision(weighingPrecision);

    const salinityResult = this._calculateSalinity(sample, reagent, inputData);

    const updateData = {
      salinity_result: salinityResult,
      calculation_method: inputData.calculation_method || 'conductivity_method',
      weighing_precision: weighingPrecision,
      weighing_precision_pass: precisionCheck.pass,
      weighing_precision_detail: precisionCheck.detail,
      reaction_condition: inputData.reaction_condition || null,
      spectrum_data: inputData.spectrum_data || JSON.stringify(inputData.spectrum || null),
      status: precisionCheck.pass ? 'calculated' : 'calculated'
    };

    if (inputData.reagent_id) {
      updateData.reagent_id = inputData.reagent_id;
    }

    conversionDAO.update(conversionId, updateData);

    safetyAlertDAO.resolveByConversionId(conversionId);

    if (!precisionCheck.pass) {
      safetyAlertDAO.create({
        conversion_id: conversionId,
        sample_id: record.sample_id,
        alert_type: 'weighing_precision',
        alert_level: 'warning',
        alert_message: precisionCheck.detail
      });
    }

    operationLogDAO.create({
      operation_type: 'calculate',
      target_type: 'conversion',
      target_id: conversionId,
      operator,
      detail: `完成盐度换算，结果: ${salinityResult?.toFixed(4) || 'N/A'}, 称量精度达标: ${precisionCheck.pass ? '是' : '否'}`
    });

    return conversionDAO.getById(conversionId);
  },

  recalculate(conversionId, operator = 'system') {
    const record = conversionDAO.getById(conversionId);
    if (!record) return null;

    const inputData = {
      reagent_id: record.reagent_id,
      weighing_precision: record.weighing_precision,
      calculation_method: record.calculation_method,
      reaction_condition: record.reaction_condition,
      spectrum: record.spectrum_data ? JSON.parse(record.spectrum_data) : null
    };

    return this.calculate(conversionId, inputData, operator);
  },

  submitForReview(conversionId, operator = 'system') {
    const record = conversionDAO.getById(conversionId);
    if (!record) {
      throw new Error('换算记录不存在');
    }
    if (!['calculated'].includes(record.status)) {
      throw new Error('只有已计算的记录才能提交复核');
    }

    conversionDAO.updateStatus(conversionId, 'pending_review');
    sampleDAO.updateStatus(record.sample_id, 'pending_review');

    operationLogDAO.create({
      operation_type: 'submit_review',
      target_type: 'conversion',
      target_id: conversionId,
      operator,
      detail: '提交复核'
    });

    return conversionDAO.getById(conversionId);
  },

  getConversion(id) {
    const record = conversionDAO.getById(id);
    if (!record) return null;

    const sample = sampleDAO.getById(record.sample_id);
    const reagent = record.reagent_id ? reagentDAO.getById(record.reagent_id) : null;
    const alerts = safetyAlertDAO.listByConversionId(id);

    return {
      ...record,
      sample,
      reagent,
      safety_alerts: alerts
    };
  },

  listConversions(params) {
    const list = conversionDAO.list(params);
    const total = conversionDAO.count(params);
    return { list, total, page: params.page || 1, pageSize: params.pageSize || 20 };
  },

  listUnusableRecords() {
    return conversionDAO.listUnusable();
  },

  _checkWeighingPrecision(precision) {
    if (precision === null || precision === undefined || isNaN(precision)) {
      return {
        pass: false,
        detail: '未提供称量精度数据，无法确认称量精度是否达标'
      };
    }

    if (precision > WEIGHING_PRECISION_THRESHOLD) {
      return {
        pass: false,
        detail: `称量精度不足: 当前天平精度 ${precision} g，要求至少达到 ${WEIGHING_PRECISION_THRESHOLD} g（千分之一克）。称量精度过低会导致盐度换算结果误差增大，影响数据可靠性，因此被拦截。请使用精度更高的天平重新称量。`
      };
    }

    return {
      pass: true,
      detail: `称量精度达标: ${precision} g ≤ 阈值 ${WEIGHING_PRECISION_THRESHOLD} g`
    };
  },

  _calculateSalinity(sample, reagent, inputData) {
    if (!sample || sample.conductivity === null || sample.conductivity === undefined) {
      return null;
    }

    const conductivity = sample.conductivity;
    const temperature = sample.temperature || 25;

    let salinity = 0.008 * conductivity + 0.05 * (temperature - 25) + 32.0;

    if (reagent && reagent.concentration) {
      salinity = salinity * (1 + (reagent.concentration - 1) * 0.01);
    }

    if (reagent && reagent.purity) {
      salinity = salinity * (reagent.purity / 100);
    }

    if (inputData.spectrum && inputData.spectrum.peakArea) {
      const spectrumFactor = inputData.spectrum.peakArea / 1000;
      salinity = salinity * (1 + spectrumFactor * 0.001);
    }

    return Math.round(salinity * 10000) / 10000;
  }
};

module.exports = conversionService;
