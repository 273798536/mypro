const Joi = require('joi');
const SeatUsageService = require('../services/seatUsageService');
const BillingRuleEngine = require('../utils/billingRuleEngine');

const SeatUsageController = {
  async createUsage(req, res) {
    try {
      const schema = Joi.object({
        contract_id: Joi.number().integer().required(),
        billing_cycle: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
        usage_date: Joi.string().isoDate().required(),
        employee_id: Joi.string().required(),
        employee_name: Joi.string().allow(''),
        department: Joi.string().allow(''),
        active_seats: Joi.number().integer().min(0).required(),
        usage_days: Joi.number().integer().min(1).max(31).default(30),
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
      const result = await SeatUsageService.createUsage(value, operator);

      return res.status(201).json(result);
    } catch (err) {
      if (err.name === 'BillingRuleMissingError') {
        return res.status(422).json({
          success: false,
          message: err.message,
          actionableHints: err.actionableHints,
          errorCode: 'BILLING_RULE_MISSING',
        });
      }
      console.error('创建用量失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getUsageList(req, res) {
    try {
      const result = await SeatUsageService.getUsageList(req.query);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询用量列表失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getUsageDetail(req, res) {
    try {
      const { id } = req.params;
      const result = await SeatUsageService.getUsageDetail(id);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询用量详情失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async submitForReview(req, res) {
    try {
      const schema = Joi.object({
        usage_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
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
      const result = await SeatUsageService.submitForReview(value.usage_ids, operator);

      return res.json(result);
    } catch (err) {
      console.error('提交复核失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async reviewUsage(req, res) {
    try {
      const schema = Joi.object({
        review_result: Joi.string().valid('passed', 'rejected').required(),
        review_comments: Joi.string().allow(''),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: '参数校验失败',
          errors: error.details.map(d => d.message),
        });
      }

      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await SeatUsageService.reviewUsage(
        id,
        value.review_result,
        value.review_comments,
        operator
      );

      return res.json(result);
    } catch (err) {
      console.error('复核用量失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async advanceStatus(req, res) {
    try {
      const schema = Joi.object({
        target_status: Joi.string().valid('billing', 'billed', 'corrected').required(),
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

      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await SeatUsageService.advanceStatus(
        id,
        value.target_status,
        operator,
        value.remarks
      );

      return res.json(result);
    } catch (err) {
      console.error('推进状态失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async recalculateUsage(req, res) {
    try {
      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await SeatUsageService.recalculateUsage(id, operator);

      if (!result.success) {
        return res.status(422).json(result);
      }

      return res.json(result);
    } catch (err) {
      console.error('重新计算失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async markDuplicate(req, res) {
    try {
      const schema = Joi.object({
        duplicate_id: Joi.number().integer().required(),
        master_id: Joi.number().integer().required(),
        reason: Joi.string().required(),
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
      const result = await SeatUsageService.markDuplicate(
        value.duplicate_id,
        value.master_id,
        value.reason,
        operator
      );

      return res.json(result);
    } catch (err) {
      console.error('标记重复失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async mergeDuplicates(req, res) {
    try {
      const schema = Joi.object({
        master_id: Joi.number().integer().required(),
        duplicate_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
        merge_strategy: Joi.string().valid('sum', 'max').default('sum'),
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
      const result = await SeatUsageService.mergeDuplicates(
        value.master_id,
        value.duplicate_ids,
        value.merge_strategy,
        operator
      );

      return res.json(result);
    } catch (err) {
      console.error('合并重复失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async detectBatchDuplicates(req, res) {
    try {
      const { contract_id, billing_cycle } = req.query;
      if (!contract_id || !billing_cycle) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: contract_id, billing_cycle',
        });
      }

      const result = await SeatUsageService.detectBatchDuplicates(
        Number(contract_id),
        billing_cycle
      );

      return res.json({
        success: true,
        data: {
          duplicate_count: result.length,
          duplicates: result,
        },
      });
    } catch (err) {
      console.error('批量检测重复失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async triggerDuplicateForTesting(req, res) {
    try {
      const schema = Joi.object({
        contract_id: Joi.number().integer().required(),
        billing_cycle: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
        employee_id: Joi.string().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: '参数校验失败',
          errors: error.details.map(d => d.message),
        });
      }

      const result = await SeatUsageService.triggerDuplicateForTesting(
        value.contract_id,
        value.billing_cycle,
        value.employee_id
      );

      return res.json({
        success: true,
        message: '测试重复数据已创建',
        data: result,
      });
    } catch (err) {
      console.error('触发测试重复失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async checkBillingRule(req, res) {
    try {
      const { product_code, effective_date, contract_id } = req.query;
      if (!product_code || !effective_date) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: product_code, effective_date',
        });
      }

      try {
        const rule = await BillingRuleEngine.getApplicableRule(
          product_code,
          effective_date,
          contract_id ? Number(contract_id) : null
        );

        return res.json({
          success: true,
          data: {
            rule_found: true,
            rule: rule.toJSON(),
          },
        });
      } catch (err) {
        if (err.name === 'BillingRuleMissingError') {
          return res.status(200).json({
            success: true,
            data: {
              rule_found: false,
              message: err.message,
              actionableHints: err.actionableHints,
            },
          });
        }
        throw err;
      }
    } catch (err) {
      console.error('检查计费规则失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
};

module.exports = SeatUsageController;
