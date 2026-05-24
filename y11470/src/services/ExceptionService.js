const ReturnApplication = require('../models/ReturnApplication');
const ReturnBatch = require('../models/ReturnBatch');
const Attachment = require('../models/Attachment');
const ApprovalEmail = require('../models/ApprovalEmail');
const StatusHistory = require('../models/StatusHistory');
const FailedRecord = require('../models/FailedRecord');
const { OPERATION_TYPES, RETURN_STATUSES } = require('../utils/common');

class ExceptionService {
  static async reserveExceptionsOnMemberCancel(applicationId, operator) {
    try {
      const application = await ReturnApplication.findById(applicationId);
      if (!application) {
        throw new Error('退供申请不存在');
      }

      await ReturnApplication.memberCancel(applicationId);

      await Attachment.markApplicationAttachmentsAsException(applicationId);
      await ApprovalEmail.markApplicationEmailsAsException(applicationId);

      const batches = await ReturnBatch.findByApplicationId(applicationId);
      for (const batch of batches) {
        await StatusHistory.create({
          batch_id: batch.id,
          application_id: applicationId,
          from_status: batch.status,
          to_status: batch.status,
          operation_type: OPERATION_TYPES.MEMBER_CANCEL,
          operator: operator,
          reason: '会员撤销交易，异常数据已保留'
        });
      }

      const attachments = await Attachment.findAllByApplicationIdIncludingBatches(applicationId);
      const emails = await ApprovalEmail.findAllByApplicationIdIncludingBatches(applicationId);

      return {
        success: true,
        application_id: applicationId,
        reserved_batches: batches.length,
        reserved_attachments: attachments.length,
        reserved_emails: emails.length,
        message: '会员撤销交易，所有异常数据已保留'
      };
    } catch (error) {
      await FailedRecord.create({
        record_type: 'EXCEPTION_RESERVE',
        record_data: { applicationId, operator },
        error_message: error.message,
        source: 'ExceptionService.reserveExceptionsOnMemberCancel'
      });
      throw error;
    }
  }

  static async getExceptionDetails(applicationId) {
    const application = await ReturnApplication.findById(applicationId);
    if (!application) {
      throw new Error('退供申请不存在');
    }

    const batches = await ReturnBatch.findByApplicationId(applicationId);
    const attachments = await Attachment.findAllByApplicationIdIncludingBatches(applicationId);
    const approvalEmails = await ApprovalEmail.findAllByApplicationIdIncludingBatches(applicationId);
    const statusHistory = await StatusHistory.findByApplicationId(applicationId);

    const batchesWithDetails = [];
    for (const batch of batches) {
      const batchAttachments = attachments.filter(a => a.batch_id === batch.id);
      const batchEmails = approvalEmails.filter(e => e.batch_id === batch.id);
      const batchHistory = statusHistory.filter(h => h.batch_id === batch.id);
      
      batchesWithDetails.push({
        ...batch,
        attachments: batchAttachments,
        approval_emails: batchEmails,
        status_history: batchHistory
      });
    }

    return {
      application: {
        id: application.id,
        application_no: application.application_no,
        supplier_id: application.supplier_id,
        supplier_name: application.supplier_name,
        total_quantity: application.total_quantity,
        total_amount: application.total_amount,
        status: application.status,
        exception_reserved: application.exception_reserved,
        member_canceled_at: application.member_canceled_at
      },
      batches: batchesWithDetails,
      application_attachments: attachments.filter(a => !a.batch_id),
      application_emails: approvalEmails.filter(e => !e.batch_id),
      status_history: statusHistory
    };
  }

  static async getAllReservedExceptions(filters = {}) {
    const applications = await ReturnApplication.findAll({
      ...filters,
      exception_reserved: 1
    });

    const result = [];
    for (const app of applications) {
      const batches = await ReturnBatch.findByApplicationId(app.id);
      const exceptionAttachments = await Attachment.findExceptionAttachments(app.id);
      const exceptionEmails = await ApprovalEmail.findExceptionEmails(app.id);
      
      result.push({
        application: app,
        batch_count: batches.length,
        exception_attachment_count: exceptionAttachments.length,
        exception_email_count: exceptionEmails.length,
        batches: batches,
        exception_attachments: exceptionAttachments,
        exception_emails: exceptionEmails
      });
    }

    return result;
  }

  static async verifyExceptionIntegrity(applicationId) {
    const details = await this.getExceptionDetails(applicationId);
    const issues = [];

    if (!details.application.exception_reserved) {
      issues.push('退供申请未标记为异常保留');
    }

    const expectedQuantity = details.batches.reduce((sum, b) => sum + b.quantity, 0);
    if (Math.abs(expectedQuantity - details.application.total_quantity) > 0.001) {
      issues.push(`批次总数(${expectedQuantity})与申请总数(${details.application.total_quantity})不一致`);
    }

    const expectedAmount = details.batches.reduce((sum, b) => sum + b.amount, 0);
    if (Math.abs(expectedAmount - details.application.total_amount) > 0.001) {
      issues.push(`批次总金额(${expectedAmount})与申请总金额(${details.application.total_amount})不一致`);
    }

    return {
      application_id: applicationId,
      is_valid: issues.length === 0,
      issues: issues,
      batch_count: details.batches.length,
      attachment_count: details.batches.reduce((sum, b) => sum + (b.attachments?.length || 0), 0)
    };
  }
}

module.exports = ExceptionService;
