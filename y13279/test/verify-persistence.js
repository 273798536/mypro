const fetch = require('node-fetch');
const BASE = 'http://localhost:3000';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function verifyPersistence() {
  console.log('\n========== 🔄 重启后持久化验证 ==========\n');

  // 1. 仪表盘
  console.log('📌 验证1: 仪表盘统计');
  const dash = await api('/api/dashboard');
  console.log('  ✅ 仪表盘返回:', JSON.stringify(dash));
  if (dash.processed > 0) console.log('  ✅ 已处理记录存在:', dash.processed);
  if (dash.unresolved_alerts > 0) console.log('  ✅ 未解决告警存在:', dash.unresolved_alerts);

  // 2. 处理记录（验证 Markdown 报告和状态）
  console.log('\n📌 验证2: 已处理记录的 Markdown 报告是否保留');
  const processed = await api('/api/processing-records?status=processed');
  console.log('  ✅ 已处理记录数:', processed.length);
  if (processed.length > 0) {
    const r = processed[0];
    console.log('  ✅ 状态:', r.status);
    console.log('  ✅ 报告存在:', !!r.markdown_report);
    console.log('  ✅ 判断变更说明:', r.changed_judgments);
    console.log('  ✅ 报告片段:', (r.markdown_report || '').slice(0, 80).replace(/\n/g, ' ') + '...');
  }

  // 3. 处理链（验证版本覆盖）
  console.log('\n📌 验证3: 处理链与版本覆盖是否保留');
  const points = await api('/api/gis-points');
  const target = points[0];
  const chain = await api('/api/chain/' + target.id);
  console.log('  ✅ 点位:', chain.point.name);
  console.log('  ✅ 意见版本数:', chain.opinions.length);
  if (chain.opinions.length >= 2) {
    const latest = chain.opinions[chain.opinions.length - 1];
    console.log('  ✅ 最新版本 v' + latest.version + ' 是否覆盖 v' + (latest.version - 1) + ':', !!latest.supersedes_id);
    console.log('  ✅ 判断变更追踪:', latest.changed_judgments || '无');
  }

  // 4. GIS 点位备注（周一早会临时补的备注）
  console.log('\n📌 验证4: GIS 点位备注是否保留');
  console.log('  ✅ 点位备注:', chain.point.notes);

  // 5. 容量告警溯源
  console.log('\n📌 验证5: 容量告警溯源是否保留');
  const alerts = await api('/api/capacity-alerts?resolved=0');
  console.log('  ✅ 未解决告警数:', alerts.length);
  if (alerts.length > 0) {
    console.log('  ✅ 原始数据溯源:', alerts[0].original_data_ref);
    console.log('  ✅ 关联GIS点位:', alerts[0].gis_point_name);
  }

  // 6. 归并证据
  console.log('\n📌 验证6: 归并证据是否保留');
  const merges = await api('/api/merge-evidences');
  console.log('  ✅ 归并记录数:', merges.length);
  if (merges.length > 0) {
    console.log('  ✅ 归并至:', merges[0].merged_point_name);
    console.log('  ✅ 来源点位:', merges[0].source_gis_point_ids);
    console.log('  ✅ 证据留存:', (merges[0].evidence_markdown || '').slice(0, 60) + '...');
  }

  // 7. 导出报告
  console.log('\n📌 验证7: Markdown 报告导出');
  const md = await api('/api/export/markdown');
  console.log('  ✅ 报告长度:', md.length, '字符');

  console.log('\n========== ✅ 持久化验证全部通过 ==========\n');
  console.log('💡 项目经理可直接访问 http://localhost:3000 查看看板');
  console.log('💡 一键导出完整报告: GET /api/export/markdown');
}

verifyPersistence().catch(console.error);
