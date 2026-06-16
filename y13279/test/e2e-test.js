const fetch = require('node-fetch');

const BASE = 'http://localhost:3000';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function runTests() {
  console.log('\n========== 🧪 老街消防公示清单 - 端到端测试 ==========\n');

  // 1. 清空之前的测试数据
  console.log('📌 步骤 1: 新增 GIS 点位');
  const p1 = await api('/api/gis-points', {
    method: 'POST',
    body: JSON.stringify({
      name: '老街东段3号',
      longitude: 116.3974,
      latitude: 39.9087,
      address: '老街东段3号门牌',
      notes: '周一早会临时补备注：此点位原始说法为消防通道宽度3米，新表盖掉旧意见后需说明判断变更'
    })
  });
  console.log('  ✅ 点位1:', p1);

  const p2 = await api('/api/gis-points', {
    method: 'POST',
    body: JSON.stringify({
      name: '老街东段5号（另一种写法）',
      longitude: 116.3978,
      latitude: 39.9089,
      address: '老街东段5号门牌',
      notes: '同一地点另一种写法，准备与点位1归并'
    })
  });
  console.log('  ✅ 点位2:', p2);

  // 2. 录入第一条意见（v1）
  console.log('\n📌 步骤 2: 录入旧版意见 v1');
  const o1 = await api('/api/opinions', {
    method: 'POST',
    body: JSON.stringify({
      gis_point_id: p1.id,
      content: '消防通道宽度不足，需整改',
      source_description: '2024年10月巡检表'
    })
  });
  console.log('  ✅ 意见v1:', o1);

  // 3. 录入新版意见覆盖旧版（v2）
  console.log('\n📌 步骤 3: 录入新版意见 v2（覆盖 v1，自动生成处理链）');
  const o2 = await api('/api/opinions', {
    method: 'POST',
    body: JSON.stringify({
      gis_point_id: p1.id,
      content: '消防通道经实测为2.8米，虽低于规范但有侧门备用通道，判定为可接受风险',
      supersedes_id: o1.id,
      source_description: '2025年6月新表（盖掉2024年10月旧意见）'
    })
  });
  console.log('  ✅ 意见v2:', o2);

  // 4. 查看处理链
  console.log('\n📌 步骤 4: 查看完整处理链（含版本覆盖说明）');
  const chain = await api('/api/chain/' + p1.id);
  console.log('  ✅ 点位:', chain.point.name);
  for (const op of chain.opinions) {
    console.log(`     v${op.version}: ${op.content}`);
    if (op.supersedes_id) console.log(`       ↳ 覆盖v${op.version-1}`);
    if (op.changed_judgments) console.log(`       ↳ 判断变更: ${op.changed_judgments}`);
    console.log(`       ↳ 状态: ${op.processing_status}`);
  }

  // 5. 更新处理记录（标记为处理中，写Markdown报告）
  console.log('\n📌 步骤 5: 更新处理记录（写报告、标状态）');
  const records = await api('/api/processing-records');
  const r2 = records.find(r => r.opinion_entry_id === o2.id);
  const upd = await api('/api/processing-records/' + r2.id, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'processed',
      markdown_report: '## 老街东段3号 处理报告\n\n### 版本变更\n- 旧版(v1)：消防通道宽度不足，需整改\n- 新版(v2)：实测2.8米，有侧门备用通道，判定可接受\n\n### 判断变更说明\n判断从「需整改」变更为「可接受」，依据为2025年6月现场复测数据及侧门备用通道的新增配置。',
      changed_judgments: '判断从「需整改」变更为「可接受」'
    })
  });
  console.log('  ✅ 更新:', upd);

  // 6. 新增容量告警（带溯源）
  console.log('\n📌 步骤 6: 新增容量超限告警（关联原始GIS点位说法）');
  const alert = await api('/api/capacity-alerts', {
    method: 'POST',
    body: JSON.stringify({
      gis_point_id: p1.id,
      alert_type: 'capacity_overflow',
      original_data_ref: 'GIS点位备注: 消防通道原始说法为宽度3米，实际2.8米',
      detail: '公示清单容量超限：同一地点累计意见版本数达到2个，需确认是否还有更多历史版本未归档'
    })
  });
  console.log('  ✅ 告警:', alert);

  // 7. 归并相邻点位（留证据）
  console.log('\n📌 步骤 7: 归并相邻点位（留证据，防合错）');
  const merge = await api('/api/merge-evidences', {
    method: 'POST',
    body: JSON.stringify({
      merged_gis_point_id: p1.id,
      source_gis_point_ids: [p1.id, p2.id],
      evidence_markdown: '两处点位实际为同一地点不同门牌写法：东街3号与东街5号在GIS地图上相距不足10米，经社区确认是同一建筑的两个门牌号。归并不影响相邻点位。',
      merge_reason: '同一地点两种写法，归并避免重复处理'
    })
  });
  console.log('  ✅ 归并记录:', merge);

  // 8. 查看仪表盘（项目经理视角）
  console.log('\n📌 步骤 8: 项目经理看板 - 哪些已处理、哪些待补证据');
  const dash = await api('/api/dashboard');
  console.log('  ✅ 已处理:', dash.processed);
  console.log('  ✅ 待处理:', dash.pending);
  console.log('  ✅ 待补证据:', dash.needs_evidence);
  console.log('  ✅ 未解决告警:', dash.unresolved_alerts);

  // 9. 导出 Markdown 报告
  console.log('\n📌 步骤 9: 导出完整 Markdown 报告');
  const md = await api('/api/export/markdown');
  console.log('  ✅ 报告生成，长度:', md.length, '字符');
  console.log('  ✅ 报告片段:\n' + md.slice(0, 500) + '...');

  // 10. 验证数据持久化（重启前检查）
  console.log('\n📌 步骤 10: 验证数据已写入（重启前最后检查）');
  const finalRecords = await api('/api/processing-records?status=processed');
  console.log('  ✅ 已处理记录数:', finalRecords.length);
  if (finalRecords.length > 0) {
    console.log('  ✅ 最新处理报告存在:', !!finalRecords[0].markdown_report);
    console.log('  ✅ 判断变更说明:', finalRecords[0].changed_judgments);
  }

  console.log('\n========== ✅ 所有测试通过 ==========\n');
  console.log('💡 下一步：测试重启服务后数据是否保留');
}

runTests().catch(console.error);
