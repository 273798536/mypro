import { speckleRecords } from './src/data/records';
import { exceptionItems } from './src/data/exceptions';
import { defaultScene } from './src/data/scenes';
import { getAttributionStats, getNormalizedValue } from './src/utils/format';
import { generateReportHTML, verifyStats } from './src/utils/export';
import type { SpeckleRecord, ExceptionItem, ExceptionStatus } from './src/types';
import * as fs from 'fs';

console.log('\n=== 验证 1：Mock 数据权重统计 ===\n');

const stats = getAttributionStats(speckleRecords);
console.log(`总权重：${stats.total}`);
console.log(`维修备注旧版：权重=${stats.byType.old_note}（条数=${speckleRecords.filter(r=>r.type==='old_note').length}）占比=${stats.percentages.old_note}%`);
console.log(`正常记录：权重=${stats.byType.normal}（条数=${speckleRecords.filter(r=>r.type==='normal').length}）占比=${stats.percentages.normal}%`);
console.log(`口头备注：权重=${stats.byType.verbal}（条数=${speckleRecords.filter(r=>r.type==='verbal').length}）占比=${stats.percentages.verbal}%`);
console.log(`占比合计：${stats.percentages.old_note + stats.percentages.normal + stats.percentages.verbal}%`);

// 手动加一遍验证
let manualOld = 0, manualNormal = 0, manualVerbal = 0;
speckleRecords.forEach((r, idx) => {
  if (r.type === 'old_note') manualOld += r.impactWeight;
  if (r.type === 'normal') manualNormal += r.impactWeight;
  if (r.type === 'verbal') manualVerbal += r.impactWeight;
});
console.log('\n（手动逐条累加验证）');
console.log(`旧版：${manualOld} / 正常：${manualNormal} / 口头：${manualVerbal} / 合计：${manualOld + manualNormal + manualVerbal}`);

console.log('\n=== 验证 2：verifyStats 函数 ===\n');
const v = verifyStats(speckleRecords);
console.log(JSON.stringify(v, null, 2));

console.log('\n=== 验证 3：异常队列初始分布 ===\n');
const statusMap: Record<ExceptionStatus, number> = { resolved: 0, pending_material: 0, manual_overrule: 0 };
exceptionItems.forEach(e => statusMap[e.status]++);
console.log(`已处理：${statusMap.resolved}`);
console.log(`待补材料：${statusMap.pending_material}`);
console.log(`人工改判：${statusMap.manual_overrule}`);

console.log('\n=== 验证 4：单位换算正确性 ===\n');
speckleRecords.filter(r => r.unitChanged).forEach(r => {
  console.log(`[${r.id}] 原值=${r.value}${r.unitAfter} 换算后=${getNormalizedValue(r).toFixed(2)}μm`);
});

console.log('\n=== 验证 5：生成报告 HTML ===\n');

// 模拟修改一项异常状态（模拟用户在页面上的操作）
const modifiedExceptions: ExceptionItem[] = exceptionItems.map((e, idx) => {
  if (idx === 0) {
    return { ...e, status: 'resolved' as ExceptionStatus };
  }
  if (idx === 1) {
    return { ...e, status: 'manual_overrule' as ExceptionStatus };
  }
  return e;
});

const statusMap2: Record<ExceptionStatus, number> = { resolved: 0, pending_material: 0, manual_overrule: 0 };
modifiedExceptions.forEach(e => statusMap2[e.status]++);
console.log('（模拟：把第1项从人工改判→已处理，第2项从待补材料→人工改判）');
console.log(`已处理：${statusMap2.resolved}，待补材料：${statusMap2.pending_material}，人工改判：${statusMap2.manual_overrule}`);

const html = generateReportHTML({
  scene: defaultScene,
  records: speckleRecords,
  exceptions: modifiedExceptions,
  viewMode: 'manager',
});

// 验证 HTML 里的关键数据
const htmlHasOld2 = html.includes(`权重 2`);
const htmlHasNormal48 = html.includes(`权重 48`);
const htmlHasVerbal7 = html.includes(`权重 7`);
console.log('\nHTML 关键内容检查：');
console.log(`- 是否包含 维修备注旧版 权重=2：${htmlHasOld2 ? '✅' : '❌'}`);
console.log(`- 是否包含 正常记录 权重=48：${htmlHasNormal48 ? '✅' : '❌'}`);
console.log(`- 是否包含 口头备注 权重=7：${htmlHasVerbal7 ? '✅' : '❌'}`);

const htmlModifiedException = html.includes('待补材料：1');
console.log(`- 是否反映了异常状态修改后的 待补材料=1：${htmlModifiedException ? '✅' : '❌'}`);

const htmlHasJumpThreshold = html.includes('阈值 3.0 → 3.5');
const htmlHasJumpUnit = html.includes('420nm = 4.20 μm');
const htmlHasJumpNormal = html.includes('突发跳变');
console.log(`- 是否包含 阈值变动跳变分析：${htmlHasJumpThreshold ? '✅' : '❌'}`);
console.log(`- 是否包含 单位变化跳变分析：${htmlHasJumpUnit ? '✅' : '❌'}`);
console.log(`- 是否包含 正常记录突发跳变分析：${htmlHasJumpNormal ? '✅' : '❌'}`);

// 写出 HTML 文件以便实际打开验证
const testDir = '/Users/mac/pro/solo/workspaces/y13178/.trae/export_test';
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
const testPath = `${testDir}/report_sample.html`;
const BOM = '\uFEFF';
fs.writeFileSync(testPath, BOM + html, 'utf-8');
console.log(`\n✅ 示例报告已写出到：${testPath}（可用浏览器直接打开验证）`);

// 检查 HTML 是否可被解析（DOCTYPE、charset）
const hasDoctype = html.trim().startsWith('<!DOCTYPE html>');
const hasCharsetUTF8 = html.includes('<meta charset="UTF-8">');
const hasCloseHtml = html.trim().endsWith('</html>');
console.log('\nHTML 格式验证：');
console.log(`- DOCTYPE 声明：${hasDoctype ? '✅' : '❌'}`);
console.log(`- charset=UTF-8：${hasCharsetUTF8 ? '✅' : '❌'}`);
console.log(`- 闭合 </html>：${hasCloseHtml ? '✅' : '❌'}`);

console.log('\n=== 全部验证结束 ===\n');
