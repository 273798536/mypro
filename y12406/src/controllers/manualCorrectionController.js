const Joi = require('joi');
const ManualCorrectionService = require('../services/manualCorrectionService');

const ManualCorrectionController = {
  async createCorrection(req, res) {
    try {
      const schema = Joi.object({
        target_type: Joi.string().valid('seat_usage', 'bill').required(),
        target_id: Joi.number().integer().required(),
        correction_type: Joi.string().valid('usage', 'bill', 'price', 'rule').required(),
        fields: Joi.object().required(),
        reason: Joi.string().required(),
        exception_type: Joi.string().valid('duplicate_seat', 'cross_month_downgrade', 'rule_mismatch', 'data_error', 'other'),
        remarks: Joi.string().allow(''),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: '参数校验失败',
          errors: error.details.map(d => d.message),
        });
      }

      const operator = req.headers['x-operator'] || 'system';
      const result = await ManualCorrectionService.createCorrection(value, operator);

      return res.status(201).json(result);
    } catch (err) {
      console.error('创建人工修正失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async approveCorrection(req, res) {
    try {
      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await ManualCorrectionService.approveCorrection(id, operator);

      return res.json(result);
    } catch (err) {
      console.error('审批人工修正失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async executeCorrection(req, res) {
    try {
      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await ManualCorrectionService.executeCorrection(id, operator);

      return res.json(result);
    } catch (err) {
      console.error('执行人工修正失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getCorrectionDetail(req, res) {
    try {
      const { id } = req.params;
      const result = await ManualCorrectionService.getCorrectionDetail(id);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询修正详情失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getCorrectionList(req, res) {
    try {
      const result = await ManualCorrectionService.getCorrectionList(req.query);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询修正列表失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getCorrectionHistory(req, res) {
    try {
      const { target_type, target_id } = req.query;
      if (!target_type || !target_id) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: target_type, target_id',
        });
      }

      const result = await ManualCorrectionService.getCorrectionHistory(
        target_type,
        Number(target_id)
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询修正历史失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
};

module.exports = ManualCorrectionController;
