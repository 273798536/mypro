const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { RouteStore, InspectionStore, WarehouseStore, ShelfStore, ZoneStore } = require('../utils/storage');
const { validateRoute, generateResultHash, ViolationTypes } = require('../utils/validation');
const { runInspection } = require('../utils/violation-detector');
const { generateReport, formatReportAsText } = require('../utils/report-generator');
const config = require('../../config.json');

const routeStore = new RouteStore();
const inspectionStore = new InspectionStore();
const warehouseStore = new WarehouseStore();
const shelfStore = new ShelfStore();
const zoneStore = new ZoneStore();

router.post('/routes', (req, res) => {
  const { route, waypoints } = req.body;
  
  const existingRoutes = routeStore.getRoutesByWarehouse(route.warehouse_id);
  const warehouse = warehouseStore.getWarehouse(route.warehouse_id);
  
  const validation = validateRoute(route, waypoints, existingRoutes, warehouse, config);
  
  if (validation.errors.length > 0 && !req.body.force) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }
  
  const result = routeStore.createRoute(route, waypoints, config.validation.enableVersionCheck);
  
  if (result.conflict) {
    return res.status(409).json({
      success: false,
      conflict: true,
      ...result,
      warnings: validation.warnings
    });
  }
  
  res.json({
    success: true,
    data: routeStore.getRoute(result.id),
    warnings: validation.warnings
  });
});

router.get('/routes', (req, res) => {
  const { warehouse_id } = req.query;
  let routes;
  if (warehouse_id) {
    routes = routeStore.getRoutesByWarehouse(warehouse_id);
  } else {
    routes = [];
  }
  res.json({ success: true, data: routes });
});

router.get('/routes/:id', (req, res) => {
  const { id } = req.params;
  const { version } = req.query;
  const route = routeStore.getRoute(id, version ? parseInt(version) : null);
  if (!route) {
    return res.status(404).json({ success: false, error: '航线不存在' });
  }
  res.json({ success: true, data: route });
});

router.post('/inspections/run', (req, res) => {
  const { warehouse_id, route_id, route_version, task_id } = req.body;
  
  const warehouse = warehouseStore.getWarehouse(warehouse_id);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  
  const route = routeStore.getRoute(route_id, route_version ? parseInt(route_version) : null);
  if (!route) {
    return res.status(404).json({ success: false, error: '航线不存在' });
  }
  
  const shelves = shelfStore.getShelvesByWarehouse(warehouse_id);
  const forbiddenZones = zoneStore.getForbiddenZones(warehouse_id);
  const blindZones = zoneStore.getBlindZones(warehouse_id);
  const waypoints = route.waypoints || [];
  
  const result = runInspection(waypoints, warehouse, forbiddenZones, blindZones, shelves, config);
  
  const timestamp = Date.now();
  const resultHash = generateResultHash(route_id, warehouse.version, timestamp);
  
  const duplicateCheck = inspectionStore.checkDuplicateResult(resultHash);
  if (duplicateCheck) {
    return res.status(409).json({
      success: false,
      duplicate: true,
      message: '检测到相同的巡检配置已执行过',
      existingResultId: duplicateCheck.id,
      existingCreatedAt: duplicateCheck.created_at,
      preview: result
    });
  }
  
  let finalTaskId = task_id;
  if (!finalTaskId) {
    const task = inspectionStore.createTask({
      warehouse_id,
      route_id,
      status: 'in_progress'
    });
    finalTaskId = task.id;
    inspectionStore.updateTaskStatus(finalTaskId, 'in_progress', new Date().toISOString());
  }
  
  const inspectionResult = {
    id: uuidv4(),
    task_id: finalTaskId,
    route_id,
    warehouse_id,
    result_hash: resultHash,
    total_points: waypoints.length,
    passed_points: waypoints.length - result.stats.critical,
    has_forbidden_zone_violation: result.stats.byType[ViolationTypes.FORBIDDEN_ZONE] > 0,
    has_blind_zone_miss: result.stats.byType[ViolationTypes.BLIND_ZONE_MISS] > 0,
    has_height_violation: result.stats.byType[ViolationTypes.HEIGHT_LIMIT] > 0
  };
  
  const saveResult = inspectionStore.saveResult(inspectionResult, result.violations, false);
  
  if (!saveResult.success) {
    return res.status(409).json(saveResult);
  }
  
  const report = generateReport(
    { ...inspectionResult, violations: result.violations },
    warehouse,
    route,
    shelves,
    { dataVersion: warehouse.version }
  );
  
  inspectionStore.saveReport(report);
  
  res.json({
    success: true,
    data: {
      taskId: finalTaskId,
      resultId: inspectionResult.id,
      reportId: report.id,
      inspection: result,
      result: inspectionResult,
      report
    }
  });
});

router.post('/inspections/validate', (req, res) => {
  const { warehouse_id, route_id, route_version } = req.body;
  
  const warehouse = warehouseStore.getWarehouse(warehouse_id);
  if (!warehouse) {
    return res.status(404).json({ success: false, error: '仓库不存在' });
  }
  
  const route = routeStore.getRoute(route_id, route_version ? parseInt(route_version) : null);
  if (!route) {
    return res.status(404).json({ success: false, error: '航线不存在' });
  }
  
  const shelves = shelfStore.getShelvesByWarehouse(warehouse_id);
  const forbiddenZones = zoneStore.getForbiddenZones(warehouse_id);
  const blindZones = zoneStore.getBlindZones(warehouse_id);
  const waypoints = route.waypoints || [];
  
  const result = runInspection(waypoints, warehouse, forbiddenZones, blindZones, shelves, config);
  
  const warnings = [];
  waypoints.forEach((wp, idx) => {
    if (wp.z === config.warehouse.droneMaxAltitude || wp.z === config.warehouse.droneMinAltitude) {
      warnings.push({
        type: 'BOUNDARY_WARNING',
        waypoint: idx + 1,
        height: wp.z,
        message: `航点 ${idx + 1} 高度 ${wp.z}m 处于边界值，3D视图将显示警告标记`
      });
    }
  });
  
  res.json({
    success: true,
    data: {
      inspection: result,
      boundaryWarnings: warnings
    }
  });
});

router.get('/inspections/results/:id', (req, res) => {
  const { id } = req.params;
  const result = inspectionStore.getResult(id);
  if (!result) {
    return res.status(404).json({ success: false, error: '巡检结果不存在' });
  }
  res.json({ success: true, data: result });
});

router.get('/inspections/results', (req, res) => {
  const { warehouse_id, limit = 50 } = req.query;
  if (!warehouse_id) {
    return res.status(400).json({ success: false, error: '缺少warehouse_id参数' });
  }
  const results = inspectionStore.getResultsByWarehouse(warehouse_id, parseInt(limit));
  res.json({ success: true, data: results });
});

router.get('/inspections/history', (req, res) => {
  const { route_id, warehouse_id, limit = 10 } = req.query;
  if (!route_id || !warehouse_id) {
    return res.status(400).json({ success: false, error: '缺少route_id或warehouse_id参数' });
  }
  const history = inspectionStore.getTaskHistory(route_id, warehouse_id, parseInt(limit));
  res.json({ success: true, data: history });
});

router.get('/inspections/reports/:resultId', (req, res) => {
  const { resultId } = req.params;
  const { format = 'json' } = req.query;
  
  const report = inspectionStore.getReport(resultId);
  if (!report) {
    const result = inspectionStore.getResult(resultId);
    if (!result) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    
    const warehouse = warehouseStore.getWarehouse(result.warehouse_id);
    const route = routeStore.getRoute(result.route_id);
    const shelves = shelfStore.getShelvesByWarehouse(result.warehouse_id);
    
    const newReport = generateReport(result, warehouse, route, shelves);
    inspectionStore.saveReport(newReport);
    
    if (format === 'text') {
      return res.type('text/plain').send(formatReportAsText(newReport));
    }
    return res.json({ success: true, data: newReport, generated: true });
  }
  
  if (format === 'text') {
    return res.type('text/plain').send(formatReportAsText(report.content));
  }
  
  res.json({ success: true, data: report.content });
});

router.post('/tasks', (req, res) => {
  const task = inspectionStore.createTask(req.body);
  res.json({ success: true, data: task });
});

router.get('/tasks/:id', (req, res) => {
  const task = inspectionStore.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  res.json({ success: true, data: task });
});

router.put('/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const task = inspectionStore.updateTaskStatus(id, status, new Date().toISOString());
  res.json({ success: true, data: task });
});

module.exports = router;
