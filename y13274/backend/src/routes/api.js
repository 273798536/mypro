const express = require('express');
const router = express.Router();
const bayService = require('../services/bayService');
const reportService = require('../services/reportService');
const { BAY_STATUS } = require('../models/constants');

router.get('/bays', (req, res) => {
  const { status, keyword } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (keyword) filters.keyword = keyword;
  const bays = bayService.listBays(filters);
  res.json({
    success: true,
    data: bays.map(b => ({
      id: b.id,
      name: b.name,
      road: b.road,
      direction: b.direction,
      location: b.location,
      coordinates: b.coordinates,
      status: b.status,
      remark: b.remark,
      materialCount: b.materials.length,
      photoCount: b.photos.length,
      updatedAt: b.updatedAt
    })),
    total: bays.length
  });
});

router.get('/bays/statuses', (req, res) => {
  const statuses = Object.entries(BAY_STATUS).map(([key, value]) => ({
    key,
    value,
    label: {
      draft: '草稿',
      pending: '待审核',
      approved: '已通过',
      rejected: '未通过',
      needs_review: '需复核',
      coordinate_mismatch: '坐标偏移',
      name_mismatch: '名称不一致',
      photo_supplemented: '已补录照片'
    }[value] || value
  }));
  res.json({ success: true, data: statuses });
});

router.get('/bays/:id', (req, res) => {
  const bay = bayService.getBay(req.params.id);
  if (!bay) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.json({ success: true, data: bay });
});

router.post('/bays', (req, res) => {
  const operator = req.headers['x-operator'] || 'api';
  const bay = bayService.createBay(req.body, operator);
  res.status(201).json({ success: true, data: bay });
});

router.put('/bays/:id', (req, res) => {
  const operator = req.headers['x-operator'] || 'api';
  const bay = bayService.updateBay(req.params.id, req.body, operator);
  if (!bay) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.json({ success: true, data: bay });
});

router.put('/bays/:id/status', (req, res) => {
  const { status, remark } = req.body;
  const operator = req.headers['x-operator'] || 'api';
  if (!status) {
    return res.status(400).json({ success: false, message: '状态不能为空' });
  }
  const bay = bayService.changeStatus(req.params.id, status, remark, operator);
  if (!bay) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.json({ success: true, data: bay });
});

router.put('/bays/:id/remark', (req, res) => {
  const { remark } = req.body;
  const operator = req.headers['x-operator'] || 'api';
  const bay = bayService.updateRemark(req.params.id, remark || '', operator);
  if (!bay) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.json({ success: true, data: bay });
});

router.get('/bays/:id/history', (req, res) => {
  const history = bayService.getHistory(req.params.id);
  if (history === null) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.json({ success: true, data: history });
});

router.post('/bays/:id/materials', (req, res) => {
  const operator = req.headers['x-operator'] || 'api';
  const result = bayService.addMaterial(req.params.id, req.body, operator);
  if (!result) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.status(201).json({ success: true, data: result });
});

router.delete('/bays/:id/materials/:materialId', (req, res) => {
  const operator = req.headers['x-operator'] || 'api';
  const result = bayService.removeMaterial(req.params.id, req.params.materialId, operator);
  if (!result) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.json({ success: true, data: result });
});

router.post('/bays/:id/photos', (req, res) => {
  const operator = req.headers['x-operator'] || 'api';
  const result = bayService.addPhoto(req.params.id, req.body, operator);
  if (!result) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  res.status(201).json({ success: true, data: result });
});

router.get('/report', (req, res) => {
  const { status, keyword, format } = req.query;
  const operator = req.headers['x-operator'] || 'api';
  const filters = {};
  if (status) filters.status = status;
  if (keyword) filters.keyword = keyword;
  const bays = bayService.listBays(filters);
  const report = reportService.generateReport(bays, {
    title: '公交港湾公示清单',
    generator: operator
  });

  if (format === 'raw') {
    return res.json({ success: true, data: report });
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  const filename = encodeURIComponent('公交港湾公示清单.md');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
  res.send(report.content);
});

router.get('/report/:id', (req, res) => {
  const { format } = req.query;
  const bay = bayService.getBay(req.params.id);
  if (!bay) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  const report = reportService.generateSingleBayReport(bay);

  if (format === 'raw') {
    return res.json({ success: true, data: report });
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  const singleFilename = encodeURIComponent(`公交港湾-${bay.name}.md`);
  res.setHeader('Content-Disposition', `attachment; filename="${singleFilename}"; filename*=UTF-8''${singleFilename}`);
  res.send(report.content);
});

router.post('/data/reset', (req, res) => {
  const mockBays = require('../data/mockBays');
  const operator = req.headers['x-operator'] || 'system';
  const bays = bayService.resetAll(mockBays, operator);
  res.json({ success: true, data: bays, message: '数据已重置为模拟数据' });
});

router.get('/data/init', (req, res) => {
  const bays = bayService.listBays();
  if (bays.length === 0) {
    const mockBays = require('../data/mockBays');
    const operator = req.headers['x-operator'] || 'system';
    const created = bayService.importBays(mockBays, operator);
    return res.json({ success: true, data: created, initialized: true, message: '已初始化模拟数据' });
  }
  res.json({ success: true, data: bays, initialized: false, message: '数据已存在，无需初始化' });
});

module.exports = router;
