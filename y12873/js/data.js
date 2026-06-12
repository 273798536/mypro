// 数据模块：网箱、浮标、风险通报、历史版本、审计链、去重逻辑

export function createStore() {
  const state = {
    selectedId: null,
    selectedFilter: { risk: 'all', status: 'all', review: 'all' },
    clipDepth: 100,
    autoRotate: true,
    currentBatch: 'BATCH-20260612-A',
  };

  const buoys = [
    { id: 'B01', name: '浮标 B01', x: -60, y: 0, z: -40, cageId: 'C1' },
    { id: 'B02', name: '浮标 B02', x: -20, y: 0, z: -40, cageId: 'C1' },
    { id: 'B03', name: '浮标 B03', x: 20, y: 0, z: -40, cageId: 'C2' },
    { id: 'B04', name: '浮标 B04', x: 60, y: 0, z: -40, cageId: 'C2' },
    { id: 'B05', name: '浮标 B05', x: -60, y: 0, z: 40, cageId: 'C3' },
    { id: 'B06', name: '浮标 B06', x: -20, y: 0, z: 40, cageId: 'C3' },
    { id: 'B07', name: '浮标 B07', x: 20, y: 0, z: 40, cageId: 'C4' },
    { id: 'B08', name: '浮标 B08', x: 60, y: 0, z: 40, cageId: 'C4' },
  ];

  const cages = [
    {
      id: 'C1',
      name: '1 号网箱',
      species: '大黄鱼',
      x: -40, z: -40,
      width: 40, depth: 40, height: 18,
    },
    {
      id: 'C2',
      name: '2 号网箱',
      species: '美国红鱼',
      x: 40, z: -40,
      width: 40, depth: 40, height: 18,
    },
    {
      id: 'C3',
      name: '3 号网箱',
      species: '真鲷',
      x: -40, z: 40,
      width: 40, depth: 40, height: 18,
    },
    {
      id: 'C4',
      name: '4 号网箱',
      species: '黑鲷',
      x: 40, z: 40,
      width: 40, depth: 40, height: 18,
    },
  ];

  // 读取 - 按 (网箱ID + 深度层) 为 key
  const readings = {
    'C1-shallow': { do: 2.4, temp: 26.8, salinity: 31.2, status: 'ok', risk: 'high' },
    'C1-mid':     { do: 3.8, temp: 25.5, salinity: 31.5, status: 'ok', risk: 'mid' },
    'C1-deep':    { do: 1.9, temp: 24.2, salinity: 32.0, status: 'ok', risk: 'high' },
    'C2-shallow': { do: 6.2, temp: 27.1, salinity: 30.8, status: 'ok', risk: 'low' },
    'C2-mid':     { do: 5.5, temp: 25.8, salinity: 31.1, status: 'ok', risk: 'low' },
    'C2-deep':    { do: 4.2, temp: 24.5, salinity: 31.6, status: 'hold', risk: 'mid' },
    'C3-shallow': { do: 4.8, temp: 26.5, salinity: 31.0, status: 'recollect', risk: 'mid' },
    'C3-mid':     { do: 3.2, temp: 25.2, salinity: 31.3, status: 'hold', risk: 'mid' },
    'C3-deep':    { do: null, temp: null, salinity: null, status: 'recollect', risk: 'high' },
    'C4-shallow': { do: 7.1, temp: 27.0, salinity: 30.9, status: 'ok', risk: 'low' },
    'C4-mid':     { do: 6.5, temp: 25.7, salinity: 31.2, status: 'ok', risk: 'low' },
    'C4-deep':    { do: 5.8, temp: 24.4, salinity: 31.7, status: 'ok', risk: 'low' },
  };

  // 风险通报 - 按(网箱ID + 风险等级 + 批次)合并去重
  // reviewState: pending | approved | none
  const alerts = [
    {
      id: 'AL-C1-HIGH',
      cageId: 'C1',
      risk: 'high',
      title: '1 号网箱底层溶氧严重不足',
      summary: '深度 12-18m 处 DO 均值 1.9 mg/L，低于警戒线 3 mg/L，存在大面积缺氧风险。',
      dataStatus: { ok: 2, hold: 0, recollect: 1 },
      reviewState: 'pending',
      importCount: 3,
      firstImport: '2026-06-10 08:24',
      lastUpdated: '2026-06-12 09:15',
      buoyIds: ['B01', 'B02'],
      auditTrail: [
        { time: '2026-06-10 08:24', actor: '系统导入', action: '首次导入 BATCH-20260610-A', changes: [{ field: '状态', from: '-', to: '待确认' }], reason: '浮标 B01/B02 采集数据' },
        { time: '2026-06-11 10:02', actor: '系统导入', action: '重复导入 BATCH-20260610-A (去重合并)', changes: [{ field: '导入次数', from: '1', to: '2' }], reason: '同一批次数据二次导入，已自动归档不生成新通报' },
        { time: '2026-06-12 09:15', actor: '李教练', action: '人工修正', changes: [{ field: '风险等级', from: '中危', to: '高危' }, { field: '溶氧值', from: '3.2 mg/L', to: '1.9 mg/L' }], reason: '现场潜水复核：底层水流动性差，实测 DO 仅 1.9 mg/L，上调风险等级。' },
      ],
      corrections: {
        risk: { from: 'mid', to: 'high', by: '李教练', at: '2026-06-12 09:15', reason: '现场潜水复核：底层水流动性差，实测 DO 仅 1.9 mg/L，上调风险等级。' },
      },
    },
    {
      id: 'AL-C2-MID',
      cageId: 'C2',
      risk: 'mid',
      title: '2 号网箱底层数据暂缓确认',
      summary: '底层 DO 4.2 mg/L，接近中危阈值；该层数据为单浮标采集，标注暂缓，待补采。',
      dataStatus: { ok: 2, hold: 1, recollect: 0 },
      reviewState: 'pending',
      importCount: 1,
      firstImport: '2026-06-12 06:30',
      lastUpdated: '2026-06-12 06:30',
      buoyIds: ['B03', 'B04'],
      auditTrail: [
        { time: '2026-06-12 06:30', actor: '系统导入', action: '首次导入 BATCH-20260612-A', changes: [{ field: '状态', from: '-', to: '待确认' }], reason: '浮标 B03/B04 采集数据' },
      ],
      corrections: {},
    },
    {
      id: 'AL-C3-MID',
      cageId: 'C3',
      risk: 'mid',
      title: '3 号网箱数据待重采',
      summary: '浅层数据波动大、深层无有效读数；标注待重采，不参与当日风险结论。',
      dataStatus: { ok: 0, hold: 1, recollect: 2 },
      reviewState: 'approved',
      importCount: 2,
      firstImport: '2026-06-11 14:10',
      lastUpdated: '2026-06-12 07:40',
      buoyIds: ['B05', 'B06'],
      auditTrail: [
        { time: '2026-06-11 14:10', actor: '系统导入', action: '首次导入 BATCH-20260611-A', changes: [{ field: '状态', from: '-', to: '待确认' }], reason: '浮标 B05/B06 采集数据' },
        { time: '2026-06-12 07:40', actor: '王教练', action: '审核通过', changes: [{ field: '修正状态', from: '待确认', to: '已通过' }, { field: '数据状态', from: '待重采', to: '待重采(已确认)' }], reason: '已安排今日下午下潜重采；该通报当前结论不对外发布，仅作内部记录。' },
      ],
      corrections: {
        reviewState: { from: 'pending', to: 'approved', by: '王教练', at: '2026-06-12 07:40', reason: '已安排今日下午下潜重采；该通报当前结论不对外发布。' },
      },
    },
  ];

  // 历史版本时间轴
  const timeline = [
    { date: '06-12 09:15', label: '李教练人工修正 C1', tags: ['revise'], alertId: 'AL-C1-HIGH' },
    { date: '06-12 07:40', label: '王教练审核通过 C3', tags: ['approve'], alertId: 'AL-C3-MID' },
    { date: '06-12 06:30', label: '导入批次 20260612-A', tags: ['import'] },
    { date: '06-11 14:10', label: '导入批次 20260611-A', tags: ['import'] },
    { date: '06-11 10:02', label: '重复导入 20260610-A (已合并)', tags: ['dup', 'import'], alertId: 'AL-C1-HIGH' },
    { date: '06-10 08:24', label: '导入批次 20260610-A', tags: ['import'] },
  ];

  // 按批次合并去重：同一网箱 + 风险等级 + 数据源批次 → 只保留一条，importCount 累加
  function importBatch(batchData, batchId) {
    const result = { merged: 0, created: 0, duplicates: [] };
    batchData.forEach(item => {
      const key = `${item.cageId}-${item.risk}-${batchId}`;
      const existing = alerts.find(a => a.id === `AL-${key}`);
      if (existing) {
        existing.importCount += 1;
        existing.lastUpdated = new Date().toLocaleString('zh-CN');
        existing.auditTrail.push({
          time: new Date().toLocaleString('zh-CN'),
          actor: '系统导入',
          action: `重复导入 ${batchId} (去重合并)`,
          changes: [{ field: '导入次数', from: String(existing.importCount - 1), to: String(existing.importCount) }],
          reason: '同一批次数据二次导入，已自动归档不生成新通报',
        });
        result.merged += 1;
        result.duplicates.push(key);
      } else {
        alerts.push({
          id: `AL-${key}`,
          cageId: item.cageId,
          risk: item.risk,
          title: item.title,
          summary: item.summary,
          dataStatus: item.dataStatus,
          reviewState: 'pending',
          importCount: 1,
          firstImport: new Date().toLocaleString('zh-CN'),
          lastUpdated: new Date().toLocaleString('zh-CN'),
          buoyIds: item.buoyIds || [],
          auditTrail: [{
            time: new Date().toLocaleString('zh-CN'),
            actor: '系统导入',
            action: `首次导入 ${batchId}`,
            changes: [{ field: '状态', from: '-', to: '待确认' }],
            reason: '浮标采集数据导入',
          }],
          corrections: {},
        });
        result.created += 1;
      }
    });
    return result;
  }

  function submitCorrection(alertId, field, from, to, reason, actor) {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return null;
    alert.corrections[field] = { from, to, by: actor, at: new Date().toLocaleString('zh-CN'), reason };
    if (field === 'risk') alert.risk = to;
    if (field === 'reviewState') alert.reviewState = to;
    alert.lastUpdated = new Date().toLocaleString('zh-CN');
    alert.auditTrail.push({
      time: new Date().toLocaleString('zh-CN'),
      actor,
      action: field === 'reviewState' ? '审核' : '人工修正',
      changes: [{ field, from, to }],
      reason,
    });
    return alert;
  }

  function getAlertById(id) { return alerts.find(a => a.id === id); }
  function getCageById(id) { return cages.find(c => c.id === id); }
  function getBuoyById(id) { return buoys.find(b => b.id === id); }

  function getFilteredAlerts() {
    return alerts.filter(a => {
      if (state.selectedFilter.risk !== 'all' && a.risk !== state.selectedFilter.risk) return false;
      if (state.selectedFilter.review !== 'all' && a.reviewState !== state.selectedFilter.review) return false;
      const statuses = Object.keys(a.dataStatus).filter(k => a.dataStatus[k] > 0);
      if (state.selectedFilter.status !== 'all' && !statuses.includes(state.selectedFilter.status)) return false;
      return true;
    });
  }

  return {
    state,
    cages,
    buoys,
    readings,
    alerts,
    timeline,
    importBatch,
    submitCorrection,
    getAlertById,
    getCageById,
    getBuoyById,
    getFilteredAlerts,
  };
}
