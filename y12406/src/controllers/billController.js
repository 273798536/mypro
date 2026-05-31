const Joi = require('joi');
const BillService = require('../services/billService');

const BillController = {
  async generateBill(req, res) {
    try {
      const schema = Joi.object({
        contract_id: Joi.number().integer().required(),
        billing_cycle: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
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
      const result = await BillService.generateBill(
        value.contract_id,
        value.billing_cycle,
        operator
      );

      return res.status(201).json(result);
    } catch (err) {
      console.error('生成账单失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getBillList(req, res) {
    try {
      const result = await BillService.getBillList(req.query);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询账单列表失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async getBillDetail(req, res) {
    try {
      const { id } = req.params;
      const result = await BillService.getBillDetail(id);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('查询账单详情失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async confirmBill(req, res) {
    try {
      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await BillService.confirmBill(id, operator);

      return res.json(result);
    } catch (err) {
      console.error('确认账单失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async exportBill(req, res) {
    try {
      const schema = Joi.object({
        format: Joi.string().valid('csv').default('csv'),
        include_diff: Joi.boolean().default(true),
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: '参数校验失败',
          errors: error.details.map(d => d.message),
        });
      }

      const { id } = req.params;
      const operator = req.headers['x-operator'] || 'system';
      const result = await BillService.exportBill(
        id,
        operator,
        value.format,
        value.include_diff
      );

      return res.json(result);
    } catch (err) {
      console.error('导出账单失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async downloadExport(req, res) {
    try {
      const { filename } = req.params;
      const path = require('path');
      const fs = require('fs');

      const filePath = path.join(process.cwd(), 'exports', filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: '导出文件不存在',
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error('下载导出文件失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async createRedFlushBill(req, res) {
    try {
      const schema = Joi.object({
        bill_id: Joi.number().integer().required(),
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
      const result = await BillService.createRedFlushBill(
        value.bill_id,
        operator,
        value.reason
      );

      return res.status(201).json(result);
    } catch (err) {
      console.error('创建红冲账单失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async updateBillStatus(req, res) {
    try {
      const schema = Joi.object({
        target_status: Joi.string().valid('confirmed', 'invoiced', 'paid', 'cancelled').required(),
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
      const result = await BillService.updateBillStatus(
        id,
        value.target_status,
        operator,
        value.remarks
      );

      return res.json(result);
    } catch (err) {
      console.error('更新账单状态失败:', err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
};

module.exports = BillController;
