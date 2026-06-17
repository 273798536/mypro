const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');

function getBatch(batchId) {
  const db = require('../db/database');
  return db.prepare('SELECT * FROM inspection_batches WHERE id = ?').get(batchId);
}

router.get('/:batchId/json', (req, res) => {
  try {
    const batch = getBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, error: '批次不存在' });
    const version = req.query.version ? parseInt(req.query.version) : null;
    const data = exportService.exportJson(req.params.batchId, version);
    const filename = `${batch.batch_no}_v${data.batch.exported_version}_数据导出.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/csv', (req, res) => {
  try {
    const batch = getBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, error: '批次不存在' });
    const version = req.query.version ? parseInt(req.query.version) : null;
    const type = req.query.type;
    const result = exportService.exportCsv(req.params.batchId, version);

    if (type) {
      const typeMap = {
        'batch': '_批次信息.csv',
        'buoy': '1_浮标数据.csv',
        'tide': '2_潮汐表.csv',
        'weather': '3_气象预报.csv',
        'violation': '4_禁航区越界.csv',
        'photo': '5_巡检照片.csv',
        'aquaculture': '6_养殖日志.csv',
        'duplicate': '7_重复上报追踪.csv',
        'risk': '8_风险评估.csv',
        'review': '9_复核操作记录.csv'
      };
      const fileKey = typeMap[type];
      if (!fileKey || !result.files[fileKey]) {
        return res.status(400).json({ success: false, error: '未知类型: ' + type + ' 可选: ' + Object.keys(typeMap).join('/') });
      }
      const filename = `${batch.batch_no}_v${result.version}_${fileKey}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(result.files[fileKey]);
    }

    const lines = [
      `# 港区危险品泊位检查 - CSV数据导出`,
      `# 批次号: ${batch.batch_no}`,
      `# 批次名称: ${batch.name}`,
      `# 导出时间: ${new Date().toLocaleString('zh-CN')}`,
      `# 导出版本: v${result.version}`,
      `# 共 ${Object.keys(result.files).length} 个CSV文件，每个文件以 --- 分隔`,
      ``,
    ];

    for (const [name, content] of Object.entries(result.files)) {
      lines.push(`===== FILE: ${name} =====`);
      lines.push(content);
      lines.push('');
    }

    const filename = `${batch.batch_no}_v${result.version}_CSV导出包.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send('\uFEFF' + lines.join('\n'));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/report', (req, res) => {
  try {
    const batch = getBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, error: '批次不存在' });
    const version = req.query.version ? parseInt(req.query.version) : null;
    const result = exportService.exportReportTxt(req.params.batchId, version);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.reportNo + '.txt')}"`);
    res.send('\uFEFF' + result.content);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:batchId/files_list', (req, res) => {
  try {
    const batch = getBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, error: '批次不存在' });
    const version = req.query.version ? parseInt(req.query.version) : null;
    const csvResult = exportService.exportCsv(req.params.batchId, version);
    const jsonData = exportService.exportJson(req.params.batchId, version);

    res.json({
      success: true,
      data: {
        batch_no: batch.batch_no,
        exported_version: jsonData.batch.exported_version,
        available_files: {
          json: [
            { name: '完整数据包', url: `/api/export/${batch.id}/json`, size_kb: Math.round(JSON.stringify(jsonData).length / 1024) }
          ],
          csv: Object.keys(csvResult.files).map(f => ({
            name: f,
            lines: csvResult.files[f].split('\n').length,
            single_url: `/api/export/${batch.id}/csv?type=${f.includes('批次') ? 'batch' : f.includes('浮标') ? 'buoy' : f.includes('潮汐') ? 'tide' : f.includes('气象') ? 'weather' : f.includes('越界') ? 'violation' : f.includes('照片') ? 'photo' : f.includes('养殖') ? 'aquaculture' : f.includes('重复') ? 'duplicate' : f.includes('风险') ? 'risk' : 'review'}`
          })),
          report: jsonData.report ? [
            { name: jsonData.report.report_no + '.txt', url: `/api/export/${batch.id}/report` }
          ] : []
        },
        total_files: 1 + Object.keys(csvResult.files).length + (jsonData.report ? 1 : 0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
