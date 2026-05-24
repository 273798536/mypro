const waveService = require('../services/waveService');
const replenishmentService = require('../services/replenishmentService');
const performanceService = require('../services/performanceService');
const appealService = require('../services/appealService');
const reportService = require('../services/reportService');
const historyService = require('../services/historyService');

const createWave = async (req, res, next) => {
  try {
    const body = req.body;
    const operator = req.headers['x-operator'] || 'system';
    const idempotentKey = req.idempotentKey;
    
    const result = await waveService.createWave(body, operator, idempotentKey);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getWave = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const result = await waveService.getWaveDetail(waveId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getWaveByNo = async (req, res, next) => {
  try {
    const { waveNo } = req.params;
    const result = await waveService.getWaveByNo(waveNo);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const listWaves = async (req, res, next) => {
  try {
    const result = await waveService.listWaves(req.query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateWaveStatus = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const { status, reason } = req.body;
    const operator = req.headers['x-operator'] || 'system';
    
    const result = await waveService.updateWaveStatus(waveId, status, operator, reason);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const recordPicking = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    
    const result = await waveService.recordPicking(waveId, req.body, operator);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const markShortage = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    const idempotentKey = req.idempotentKey;
    
    const result = await replenishmentService.markShortage(waveId, req.body, operator, idempotentKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const createReplenishmentTask = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    const idempotentKey = req.idempotentKey;
    
    const result = await replenishmentService.createReplenishmentTask(waveId, req.body, operator, idempotentKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const confirmReplenishment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    const idempotentKey = req.idempotentKey;
    
    const result = await replenishmentService.confirmReplenishment(taskId, req.body, operator, idempotentKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const releaseOccupation = async (req, res, next) => {
  try {
    const { occupationId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    
    const result = await replenishmentService.releaseOccupation(occupationId, operator);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getReplenishmentTasks = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const result = await replenishmentService.getReplenishmentTasks(waveId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getLocationOccupations = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const { status } = req.query;
    const result = await replenishmentService.getLocationOccupations(waveId, status);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const recalculatePerformance = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    const idempotentKey = req.idempotentKey;
    
    const result = await performanceService.recalculatePerformance(waveId, operator, idempotentKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getWavePerformance = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const result = await performanceService.getWavePerformance(waveId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const createAppeal = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    
    const result = await appealService.createAppeal(waveId, req.body, operator);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const reviewAppeal = async (req, res, next) => {
  try {
    const { appealId } = req.params;
    const operator = req.headers['x-operator'] || 'system';
    
    const result = await appealService.reviewAppeal(appealId, req.body, operator);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const correctShortageReason = async (req, res, next) => {
  try {
    const { waveId, waveItemId } = req.params;
    const { newReason } = req.body;
    const operator = req.headers['x-operator'] || 'system';
    const idempotentKey = req.idempotentKey;
    
    const result = await appealService.correctShortageReason(waveId, waveItemId, newReason, operator, idempotentKey);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getWaveHistory = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const result = await historyService.getWaveHistory(waveId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getWaveFullDetail = async (req, res, next) => {
  try {
    const { waveId } = req.params;
    const result = await reportService.getWaveFullDetail(waveId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getVarianceReport = async (req, res, next) => {
  try {
    const result = await reportService.getVarianceReport(req.query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const exportVarianceReport = async (req, res, next) => {
  try {
    const { records } = await reportService.getVarianceReport(req.query);
    
    const fields = [
      'wave_no', 'warehouse_code', 'zone_code', 'team_code', 'wave_status',
      'sku_code', 'sku_name', 'location_code', 'plan_qty', 'picked_qty',
      'shortage_qty', 'replenished_qty', 'shortage_reason', 'picker_code',
      'picking_diff', 'reviewer_code', 'task_no', 'replenish_status'
    ];
    
    const csv = await reportService.exportToCSV(records, fields);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=variance_report.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
};

const getPerformanceSummary = async (req, res, next) => {
  try {
    const result = await performanceService.getPerformanceSummary(req.query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const listAppeals = async (req, res, next) => {
  try {
    const result = await appealService.listAppeals(req.query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createWave,
  getWave,
  getWaveByNo,
  listWaves,
  updateWaveStatus,
  recordPicking,
  markShortage,
  createReplenishmentTask,
  confirmReplenishment,
  releaseOccupation,
  getReplenishmentTasks,
  getLocationOccupations,
  recalculatePerformance,
  getWavePerformance,
  createAppeal,
  reviewAppeal,
  correctShortageReason,
  getWaveHistory,
  getWaveFullDetail,
  getVarianceReport,
  exportVarianceReport,
  getPerformanceSummary,
  listAppeals
};
