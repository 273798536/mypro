const express = require('express');
const { stringify } = require('csv-stringify');
const store = require('../store/dataStore');

const router = express.Router();

router.get('/version/:id', (req, res) => {
  const version = store.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).json({ code: 1, message: '版本不存在' });
  }
  
  const snapshots = store.getSnapshots({ version_id: req.params.id });
  
  const statusMap = {
    'pending': '待处理',
    'confirmed': '已确认',
    'rejected': '已拒绝',
    'needs_evidence': '待补证据'
  };
  
  const anomalyMap = {
    'none': '无异常',
    'name_mismatch': '名称不一致',
    'duplicate_run_id': 'run_id重复'
  };
  
  const records = snapshots.map(s => ({
    '快照ID': s.id,
    '运行ID': s.run_id,
    '名称': s.name,
    '预期名称': s.expected_name,
    '状态': statusMap[s.status] || s.status,
    '异常类型': anomalyMap[s.anomaly_type] || s.anomaly_type,
    '异常详情': s.anomaly_detail,
    '指标分数': s.metric_score,
    'QPS': s.features?.qps || '-',
    '平均延迟(ms)': s.features?.avg_latency || '-',
    '错误率': s.features?.error_rate || '-',
    'P99延迟(ms)': s.features?.p99_latency || '-',
    '备注': s.notes || '',
    '创建时间': s.created_at,
    '更新时间': s.updated_at
  }));
  
  stringify(records, { header: true }, (err, output) => {
    if (err) {
      return res.status(500).json({ code: 1, message: 'CSV生成失败: ' + err.message });
    }
    
    const fileName = encodeURIComponent(`影子流量版本快照_${version.version_name}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.send('\uFEFF' + output);
  });
});

module.exports = router;
