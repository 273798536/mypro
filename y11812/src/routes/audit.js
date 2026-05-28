const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');

router.post('/batch', async (req, res) => {
  try {
    const { period, storeIds } = req.body;
    
    if (!period) {
      return res.status(400).json({
        success: false,
        message: '期间不能为空'
      });
    }

    const batch = await auditService.createBatch(period, req.user || 'system');
    const result = await auditService.runAudit(batch.id, period, storeIds);

    res.json({
      success: true,
      message: '复核任务已完成',
      data: {
        batchId: result.batchId,
        batchNo: batch.batchNo,
        totalRecords: result.totalRecords,
        issueCount: result.issueCount
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '复核任务执行失败',
      error: err.message
    });
  }
});

router.get('/batches', async (req, res) => {
  try {
    const { period, status, page, pageSize } = req.query;
    const options = {
      period,
      status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 50
    };

    const batches = await auditService.getBatches(options);

    res.json({
      success: true,
      data: batches
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '获取批次列表失败',
      error: err.message
    });
  }
});

router.get('/batch/:batchId/records', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { status, storeId, page, pageSize } = req.query;
    
    const options = {
      status,
      storeId,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 100
    };

    const records = await auditService.getAuditRecords(batchId, options);

    res.json({
      success: true,
      data: records
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '获取复核记录失败',
      error: err.message
    });
  }
});

router.get('/record/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await auditService.getAuditRecordDetail(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '获取记录详情失败',
      error: err.message
    });
  }
});

router.post('/record/:recordId/status', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { status, reason, operator } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '目标状态不能为空'
      });
    }

    const result = await auditService.transitionStatus(
      recordId, 
      status, 
      reason, 
      operator || 'system'
    );

    res.json({
      success: true,
      message: '状态更新成功',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '状态更新失败',
      error: err.message
    });
  }
});

router.get('/record/:recordId/trace', async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await auditService.getAuditRecordDetail(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    const trace = {
      record: {
        id: record.id,
        period: record.period,
        status: record.status,
        baseRent: record.base_rent,
        commissionAmount: record.commission_amount,
        totalRent: record.total_rent,
        salesAmount: record.sales_amount
      },
      contract: record.contract_no ? {
        contractNo: record.contract_no,
        version: record.contract_version,
        effectiveDate: record.contract_effective_date,
        rentType: record.rent_type,
        baseRent: record.contract_base_rent
      } : null,
      salesAggregation: record.sales_detail,
      trialCalculation: record.trial_calculation,
      statusHistory: record.status_history,
      versionHistory: record.version_history,
      issues: {
        type: record.issue_type,
        description: record.issue_description,
        correctionHint: record.correction_hint,
        followUpAction: record.follow_up_action
      }
    };

    res.json({
      success: true,
      data: trace
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '获取追溯信息失败',
      error: err.message
    });
  }
});

module.exports = router;
