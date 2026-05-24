const Joi = require('joi');
const ApprovalEmail = require('../models/ApprovalEmail');
const FailedRecord = require('../models/FailedRecord');
const { getUserId } = require('../middleware/auth');

const emailSchema = Joi.object({
  application_id: Joi.string().required(),
  batch_id: Joi.string().optional(),
  email_subject: Joi.string().required(),
  email_content: Joi.string().required(),
  sender: Joi.string().required(),
  sent_at: Joi.number().optional()
});

class ApprovalEmailController {
  static async create(req, res) {
    try {
      const { error, value } = emailSchema.validate(req.body);
      if (error) {
        const errorMessage = error.details.map(d => d.message).join('; ');
        
        await FailedRecord.create({
          record_type: 'CREATE_APPROVAL_EMAIL_VALIDATION',
          record_data: req.body,
          error_message: errorMessage,
          source: 'ApprovalEmailController.create'
        });

        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }

      const result = await ApprovalEmail.create(value);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      await FailedRecord.create({
        record_type: 'CREATE_APPROVAL_EMAIL',
        record_data: req.body,
        error_message: error.message,
        source: 'ApprovalEmailController.create'
      });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const email = await ApprovalEmail.findById(req.params.id);
      if (!email) {
        return res.status(404).json({
          success: false,
          error: '审批邮件不存在'
        });
      }

      res.json({
        success: true,
        data: email
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getByApplicationId(req, res) {
    try {
      const emails = await ApprovalEmail.findAllByApplicationIdIncludingBatches(req.params.applicationId);

      res.json({
        success: true,
        data: emails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getByBatchId(req, res) {
    try {
      const emails = await ApprovalEmail.findByBatchId(req.params.batchId);

      res.json({
        success: true,
        data: emails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async markAsException(req, res) {
    try {
      const result = await ApprovalEmail.markAsException(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: '审批邮件不存在'
        });
      }

      res.json({
        success: true,
        message: '已标记为异常保留'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ApprovalEmailController;
