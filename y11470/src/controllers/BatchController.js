const Joi = require('joi');
const ReturnBatch = require('../models/ReturnBatch');
const StatusHistory = require('../models/StatusHistory');
const StateMachineService = require('../services/StateMachineService');
const DataConsistencyService = require('../services/DataConsistencyService');
const { getUserId } = require('../middleware/auth');

const batchSchema = Joi.object({
  application_id: Joi.string().required(),
  batch_no: Joi.string().required(),
  product_code: Joi.string().required(),
  product_name: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unit_price: Joi.number().min(0).required()
});

class BatchController {
  static async create(req, res) {
    try {
      const { error, value } = batchSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map(d => d.message).join('; ')
        });
      }

      const result = await StateMachineService.createBatch(
        value.application_id,
        value,
        getUserId(req)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const batch = await ReturnBatch.getDetailed(req.params.id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: '批次不存在'
        });
      }

      const history = await StatusHistory.getFullHistory(req.params.id);

      res.json({
        success: true,
        data: {
          batch,
          status_history: history
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAll(req, res) {
    try {
      const batches = await ReturnBatch.findAll(req.query);

      res.json({
        success: true,
        data: batches
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async qualityInspection(req, res) {
    try {
      const { quality_status, manual_reason } = req.body;
      if (!quality_status) {
        return res.status(400).json({
          success: false,
          error: '缺少质检状态'
        });
      }

      const result = await StateMachineService.qualityInspection(
        req.params.id,
        quality_status,
        getUserId(req),
        manual_reason
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async review(req, res) {
    try {
      const { manual_reason } = req.body;

      const result = await StateMachineService.review(
        req.params.id,
        getUserId(req),
        manual_reason
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async reviewRevise(req, res) {
    try {
      const { manual_reason } = req.body;
      if (!manual_reason) {
        return res.status(400).json({
          success: false,
          error: '缺少复核改判理由'
        });
      }

      const result = await StateMachineService.reviewRevise(
        req.params.id,
        getUserId(req),
        manual_reason
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async freeze(req, res) {
    try {
      const { freeze_reason } = req.body;
      if (!freeze_reason) {
        return res.status(400).json({
          success: false,
          error: '缺少冻结原因'
        });
      }

      const result = await StateMachineService.freeze(
        req.params.id,
        freeze_reason,
        getUserId(req)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async unfreeze(req, res) {
    try {
      const result = await StateMachineService.unfreeze(
        req.params.id,
        getUserId(req)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async settle(req, res) {
    try {
      const result = await StateMachineService.settle(
        req.params.id,
        getUserId(req)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async archive(req, res) {
    try {
      const result = await StateMachineService.archive(
        req.params.id,
        getUserId(req)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getSummary(req, res) {
    try {
      const summary = await DataConsistencyService.safeGetBatchSummary(req.query);

      res.json({
        success: true,
        data: {
          total_count: summary.total_count,
          invalid_count: summary.invalid_count,
          total_quantity: summary.total_quantity,
          total_amount: summary.total_amount,
          invalid_records: summary.invalid_records
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getInternalView(req, res) {
    try {
      const batches = await ReturnBatch.getInternalView(req.query);

      res.json({
        success: true,
        data: batches
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = BatchController;
