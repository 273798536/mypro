const BASE = 'http://localhost:3000';

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
function c(t, color) { return colors[color] + t + colors.reset; }
let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); console.log('  ' + c('✓ ', 'green') + name); pass++; }
  catch (e) { console.log('  ' + c('✗ ', 'red') + name + ': ' + e.message); fail++; process.exitCode = 1; }
}

async function json(path, opts = {}) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return await r.json();
}

(async () => {
  console.log(c('\n========================================', 'cyan'));
  console.log(c(' HTTP API 端到端测试', 'bold'));
  console.log(c('========================================', 'cyan') + '\n');

  // 重置数据库
  console.log(c('【0】重置数据库', 'bold'));
  await check('GET /api/resetdb 重置成功', async () => {
    const r = await json('/api/resetdb');
    if (!r.success) throw new Error(JSON.stringify(r));
  });

  // 1. 批次列表/创建
  console.log('\n' + c('【1】批次创建', 'bold'));
  let batchId;
  await check('POST /api/batches 创建新批次', async () => {
    const r = await json('/api/batches', {
      method: 'POST',
      body: { batch_no: 'HTTP-' + Date.now().toString().slice(-6), name: 'HTTP测试批次', description: '通过HTTP接口跑全链路' }
    });
    if (!r.success) throw new Error(JSON.stringify(r));
    batchId = r.data.id;
  });
  await check('GET /api/batches 能看到新批次', async () => {
    const r = await json('/api/batches');
    if (!r.success || !r.data.some(b => b.id === batchId)) throw new Error('列表中没有新批次');
  });

  // 2. 导入样例
  console.log('\n' + c('【2】导入样例材料', 'bold'));
  await check('POST /api/batches/:id/import/sample 一键导入', async () => {
    const r = await json(`/api/batches/${batchId}/import/sample`, { method: 'POST' });
    if (!r.success) throw new Error(JSON.stringify(r));
    const d = r.data.details;
    if (!(d.buoy.inserted > 0) || !(d.tide.inserted > 0)) throw new Error('导入数量异常');
  });
  await check('GET /api/batches/:id/materials 返回6类材料', async () => {
    const r = await json(`/api/batches/${batchId}/materials`);
    const m = r.data;
    if (m.buoyData.length !== 6 || m.tideTables.length !== 3 || m.inspectionPhotos.length !== 7)
      throw new Error('材料数量不对');
  });

  // 3. 复核
  console.log('\n' + c('【3】复核进度 + 操作', 'bold'));
  await check('GET /api/review/:id/summary 返回 pending 统计', async () => {
    const r = await json(`/api/review/${batchId}/summary`);
    if (!r.success || r.data.pendingItems !== 25) throw new Error('pending 数量应为 25，实际 ' + r.data.pendingItems);
  });
  let buoyId;
  await check('GET materials 拿到 FB-011 id', async () => {
    const r = await json(`/api/batches/${batchId}/materials`);
    const item = r.data.buoyData.find(b => b.buoy_id === 'FB-011');
    if (!item) throw new Error('找不到FB-011');
    buoyId = item.id;
  });
  await check('POST /api/review/:id/buoy/:bid 浮标单独复核', async () => {
    const r = await json(`/api/review/${batchId}/buoy/${buoyId}`, {
      method: 'POST',
      body: { updates: { water_depth: 11.5, review_status: 'approved' }, reviewer: '测试员', comment: '修正水深' }
    });
    if (!r.success) throw new Error(JSON.stringify(r));
  });
  await check('POST /api/review/:id/item 通用单条复核（越界记录）', async () => {
    const m = (await json(`/api/batches/${batchId}/materials`)).data;
    const violId = m.restrictedZoneViolations[0].id;
    const r = await json(`/api/review/${batchId}/item`, {
      method: 'POST',
      body: { material_type: 'violation', item_id: violId, review_result: 'rejected', reviewer: '测试员', comment: '驳回' }
    });
    if (!r.success) throw new Error(JSON.stringify(r));
  });

  // 先 approve 所有 pending 项（approveAll 相当于 25 条 /item POST）
  console.log('  → 批量调用 /item approve 剩余 pending...');
  const beforeM = (await json(`/api/batches/${batchId}/materials`)).data;
  const types = [
    { type: 'buoy', rows: beforeM.buoyData },
    { type: 'tide', rows: beforeM.tideTables },
    { type: 'weather', rows: beforeM.weatherForecasts },
    { type: 'violation', rows: beforeM.restrictedZoneViolations },
    { type: 'photo', rows: beforeM.inspectionPhotos },
    { type: 'aquaculture', rows: beforeM.aquacultureLogs }
  ];
  for (const t of types) {
    for (const row of t.rows) {
      if (row.review_status === 'pending') {
        await json(`/api/review/${batchId}/item`, {
          method: 'POST',
          body: { material_type: t.type, item_id: row.id, review_result: 'approved', reviewer: 'approveAll' }
        });
      }
    }
  }
  await check('POST /api/review/:id/submit 升级版本', async () => {
    const r = await json(`/api/review/${batchId}/submit`, {
      method: 'POST', body: { reviewer: '张工', comment: 'HTTP复核通过' }
    });
    if (!r.success) throw new Error(JSON.stringify(r));
    if (r.data.newVersion !== 2) throw new Error('版本应升级到v2');
  });

  // 4. 风险评估
  console.log('\n' + c('【4】风险评估', 'bold'));
  await check('POST /api/risk/:id/assess', async () => {
    const r = await json(`/api/risk/${batchId}/assess`, { method: 'POST', body: { assessor: 'HTTP评估员' } });
    if (!r.success) throw new Error(JSON.stringify(r));
    // assessRisk service 返回 camelCase 字段 (riskScore/riskLevel)
    const score = r.data.risk_score ?? r.data.riskScore;
    if (score === undefined || score === null) throw new Error('缺少分值 ' + JSON.stringify(r.data));
  });
  await check('GET /api/risk/:id/latest 返回最新评估', async () => {
    const r = await json(`/api/risk/${batchId}/latest`);
    if (!r.success || !r.data.risk_level) throw new Error(JSON.stringify(r));
  });

  // 5. 报告生成
  console.log('\n' + c('【5】报告生成', 'bold'));
  await check('POST /api/report/:id/generate', async () => {
    const r = await json(`/api/report/${batchId}/generate`, { method: 'POST', body: { generated_by: 'HTTP测试' } });
    if (!r.success) throw new Error(JSON.stringify(r));
  });
  await check('GET /api/report/:id/latest 返回报告', async () => {
    const r = await json(`/api/report/${batchId}/latest`);
    if (!r.success || !r.data.report_no) throw new Error(JSON.stringify(r));
  });

  // 6. 导出
  console.log('\n' + c('【6】导出接口', 'bold'));
  await check('GET /api/export/:id/json 返回完整数据', async () => {
    const resp = await fetch(BASE + `/api/export/${batchId}/json`);
    const r = await resp.json();
    // export/json 直接返回原始导出数据（非{success,data}包装）
    if (!r.export_info || !r.batch || !r.materials) throw new Error('返回结构异常');
    const m = r.materials;
    if (!(m.buoy_data.length > 0 && m.tide_tables.length > 0)) throw new Error('材料为空');
    if (!r.risk_assessment) throw new Error('缺风险评估');
    if (!r.report) throw new Error('缺报告信息');
  });
  await check('GET /api/export/:id/csv?type=buoy 返回带BOM的CSV', async () => {
    const resp = await fetch(BASE + `/api/export/${batchId}/csv?type=buoy`);
    const buf = Buffer.from(await resp.arrayBuffer());
    // UTF-8 BOM = EF BB BF (首3字节)
    const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
    const text = buf.toString('utf8');
    if (!hasBom) throw new Error('无BOM头, 首字节: ' + buf.slice(0,3).toString('hex'));
    if (!resp.headers.get('content-type').includes('text/csv')) throw new Error('Content-Type 不是 text/csv');
    if (!text.includes('FB-003')) throw new Error('CSV内容缺失浮标数据');
  });
  await check('GET /api/export/:id/report 返回带BOM的文本报告', async () => {
    const resp = await fetch(BASE + `/api/export/${batchId}/report`);
    const buf = Buffer.from(await resp.arrayBuffer());
    const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
    const text = buf.toString('utf8');
    if (!hasBom) throw new Error('报告无BOM, 首字节: ' + buf.slice(0,3).toString('hex'));
    const cd = resp.headers.get('content-disposition') || '';
    if (!cd.includes('attachment')) throw new Error('未触发下载:' + cd);
    if (!text.includes('港区危险品泊位检查报告')) throw new Error('报告内容缺失标题');
  });

  console.log('\n' + c('===== HTTP测试总结 =====', 'bold'));
  console.log(c('  通过: ' + pass + ' / ' + (pass + fail), fail === 0 ? 'green' : 'yellow'));
  console.log(c('  失败: ' + fail, fail === 0 ? 'green' : 'red'));
  if (fail === 0) console.log(c('  HTTP API 全链路可用 ✅', 'green'));
})();
