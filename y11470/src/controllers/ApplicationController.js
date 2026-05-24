const Joi = require('joi');
const ReturnApplication = require('../models/ReturnApplication');
const ReturnBatch = require('../models/ReturnBatch');
const FailedRecord = require('../models/FailedRecord');
const { getUserId } = require('../middleware/auth');

const applicationSchema = Joi.object({
  application_no: Joi.string().required(),
  supplier_id: Joi.string().required(),
  supplier_name: Joi.string().required(),
  status: Joi.string().optional()
});

class ApplicationController {
  static async create(req, res) {
    try {
      const { error, value } = applicationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map(d => d.message).join('; ')
        });
      }

      const existing = await ReturnApplication.findByApplicationNo(value.application_no);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: '退供申请号已存在'
        });
      }

      const result = await ReturnApplication.create({
        ...value,
        created_by: getUserId(req)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      await FailedRecord.create({
        record_type: 'CREATE_APPLICATION',
        record_data: req.body,
        error_message: error.message,
        source: 'ApplicationController.create'
      });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const application = await ReturnApplication.findById(req.params.id);
      if (!application) {
        return res.status(404).json({
          success: false,
          error: '退供申请不存在'
        });
      }

      const batches = await ReturnBatch.findByApplicationId(req.params.id);

      res.json({
        success: true,
        data: {
          application,
          batches
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
      const applications = await ReturnApplication.findAll(req.query);

      res.json({
        success: true,
        data: applications
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
      const summary = await ReturnApplication.getSummary(req.query);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ApplicationController;
