const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const { ChangeOrder, ReferenceRecord, sequelize } = require('../models');

router.get('/logs', async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      operatorId,
      operatorRole,
      action,
      batchId,
      startTime,
      endTime,
      isSensitive,
      riskLevel,
      page = 1,
      pageSize = 20
    } = req.query;

    const result = await auditService.queryAuditLogs({
      entityType,
      entityId,
      operatorId,
      operatorRole,
      action,
      batchId,
      startTime,
      endTime,
      isSensitive: isSensitive === 'true' ? true : isSensitive === 'false' ? false : undefined,
      riskLevel,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/logs/:id', async (req, res) => {
  try {
    const { AuditLog } = require('../models');
    const log = await AuditLog.findByPk(req.params.id);
    
    if (!log) {
      return res.status(404).json({ success: false, error: '日志不存在' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/role-view', async (req, res) => {
  try {
    const { role, startTime, endTime } = req.query;

    const where = {};
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.$gte = new Date(startTime);
      if (endTime) where.createdAt.$lte = new Date(endTime);
    }

    const [roleStats] = await sequelize.query(`
      SELECT 
        applicantRole as role,
        COUNT(*) as totalChangeOrders,
        SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draftCount,
        SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as submittedCount,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedCount,
        SUM(CASE WHEN status = 'AUDITED' THEN 1 ELSE 0 END) as auditedCount,
        COUNT(DISTINCT applicantId) as operatorCount
      FROM change_orders
      ${Object.keys(where).length > 0 ? 'WHERE createdAt >= :startTime AND createdAt <= :endTime' : ''}
      GROUP BY applicantRole
      ORDER BY totalChangeOrders DESC
    `, {
      replacements: { startTime, endTime }
    });

    const [operatorStats] = await sequelize.query(`
      SELECT 
        applicantId as operatorId,
        applicantName as operatorName,
        applicantRole as role,
        COUNT(*) as totalChangeOrders,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount,
        ROUND(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as rejectRate
      FROM change_orders
      ${Object.keys(where).length > 0 ? 'WHERE createdAt >= :startTime AND createdAt <= :endTime' : ''}
      GROUP BY applicantId, applicantName, applicantRole
      ORDER BY totalChangeOrders DESC
    `, {
      replacements: { startTime, endTime }
    });

    res.json({
      success: true,
      data: {
        roleStats,
        operatorStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/change-reasons', async (req, res) => {
  try {
    const { startTime, endTime, topN = 10 } = req.query;

    const [reasonStats] = await sequelize.query(`
      SELECT 
        changeReason as reason,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT applicantRole) as roles,
        GROUP_CONCAT(DISTINCT applicantName) as operators
      FROM change_orders
      WHERE changeReason IS NOT NULL AND changeReason != ''
      ${startTime || endTime ? 'AND createdAt >= :startTime AND createdAt <= :endTime' : ''}
      GROUP BY changeReason
      ORDER BY count DESC
      LIMIT :topN
    `, {
      replacements: { 
        startTime: startTime || '1970-01-01', 
        endTime: endTime || '2099-12-31',
        topN: parseInt(topN)
      }
    });

    res.json({ success: true, data: reasonStats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sensitive-stats', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    const where = {};
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.$gte = new Date(startTime);
      if (endTime) where.createdAt.$lte = new Date(endTime);
    }

    const sensitiveChangeOrders = await ChangeOrder.count({
      where: {
        ...where,
        sensitiveFields: { [sequelize.Op.ne]: [] }
      }
    });

    const totalChangeOrders = await ChangeOrder.count({ where });

    const [sensitiveFields] = await sequelize.query(`
      SELECT 
        json_each.value as fieldName,
        COUNT(*) as count
      FROM change_orders, json_each(change_orders.sensitiveFields)
      ${startTime || endTime ? 'WHERE change_orders.createdAt >= :startTime AND change_orders.createdAt <= :endTime' : ''}
      GROUP BY json_each.value
      ORDER BY count DESC
    `, {
      replacements: { startTime: startTime || '1970-01-01', endTime: endTime || '2099-12-31' }
    });

    res.json({
      success: true,
      data: {
        totalChangeOrders,
        sensitiveChangeOrders,
        sensitiveRatio: totalChangeOrders > 0 ? (sensitiveChangeOrders / totalChangeOrders * 100).toFixed(2) : 0,
        topSensitiveFields: sensitiveFields
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/error-claim-stats', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalReferences,
        SUM(CASE WHEN isOfflineContent = 1 THEN 1 ELSE 0 END) as offlineContentCount,
        SUM(CASE WHEN isErrorClaim = 1 THEN 1 ELSE 0 END) as errorClaimCount,
        ROUND(SUM(CASE WHEN isOfflineContent = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as offlineContentRatio,
        SUM(CASE WHEN isErrorClaim = 1 THEN errorClaimAmount ELSE 0 END) as totalErrorClaimAmount,
        COUNT(DISTINCT knowledgeId) as affectedKnowledgeCount,
        COUNT(DISTINCT agentId) as affectedAgentCount
      FROM reference_records
      WHERE 1=1
      ${startTime ? 'AND referenceTime >= :startTime' : ''}
      ${endTime ? 'AND referenceTime <= :endTime' : ''}
    `, {
      replacements: { startTime, endTime }
    });

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
