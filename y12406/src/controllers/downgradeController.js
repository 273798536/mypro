const Joi = require('joi');
const DowngradeService = require('../services/downgradeService');

const DowngradeController = {
  async createRequest(req, res) {
    try {
      const schema = Joi.object({
        contract_id: Joi.number().integer().required(),
        new_seat_count: Joi.number().integer().min(0).required(),
        new_caliber: Joi.object().required(),
        caliber_change_description: Joi.string().required(),
        effective_date: Joi.string().isoDate().required(),
        cross_month_handling_rule: Joi.string().valid('current_month', 'next_month', 'by_effective_date'),
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
      const result = await DowngradeService.createRequest(value, operator);

      return res.status(201).json(result);
    } catch (err) {
      console.error('创建降配申请失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getAffectedUsages(req, res) {
    try {
      const { id } = req.params;
      const result = await DowngradeService.getAffectedUsages(id);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询受影响用量失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async approveRequest(req, res) {
    try {
      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await DowngradeService.approveRequest(id, operator);

      return res.json(result);
    } catch (err) {
      console.error('审批降配申请失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async executeRequest(req, res) {
    try {
      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await DowngradeService.executeRequest(id, operator);

      return res.json(result);
    } catch (err) {
      console.error('执行降配申请失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getRequestList(req, res) {
    try {
      const result = await DowngradeService.getRequestList(req.query);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询降配申请列表失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
};

module.exports = DowngradeController;
