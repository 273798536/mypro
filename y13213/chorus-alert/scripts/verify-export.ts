import { buildMarkdownReport, defaultReportFileName } from '../src/utils/markdown';
import { mockRecords, generateMockHistory } from '../src/data/mockData';
import { defaultFilterCriteria, VersionSource } from '../src/types';
import type { FilterCriteria } from '../src/types';
import * as fs from 'fs';

const records = mockRecords;
const history = generateMockHistory(records);

const md1 = buildMarkdownReport(records, defaultFilterCriteria, history);
fs.writeFileSync('/tmp/chorus_export_full.md', md1, 'utf-8');

const oldMasterFilter: FilterCriteria = { versionSource: VersionSource.OLD_MASTER };
const oldMasterRecords = records.filter((r) => r.versionInfo?.source === 'old_master');
const md2 = buildMarkdownReport(oldMasterRecords, oldMasterFilter, history);
fs.writeFileSync('/tmp/chorus_export_oldmaster.md', md2, 'utf-8');

const lateFilter: FilterCriteria = { hasLateAttachment: true };
const lateRecords = records.filter((r) => r.screenshots.some((s) => s.isLate));
const md3 = buildMarkdownReport(lateRecords, lateFilter, history);
fs.writeFileSync('/tmp/chorus_export_late.md', md3, 'utf-8');

function validateReport(md: string, expectedCount: number, label: string): boolean {
  console.log(`\n=== ${label} 验证 ===`);
  console.log(`文件大小：${md.length} 字符`);

  const hasTitle = md.startsWith('# 合唱声部异常提醒报告');
  console.log(`标题存在：${hasTitle ? '✅' : '❌'}`);

  const hasFilterSection = md.includes('## 筛选条件');
  console.log(`筛选条件章节：${hasFilterSection ? '✅' : '❌'}`);

  const hasStatsSection = md.includes('## 概览统计');
  console.log(`概览统计章节：${hasStatsSection ? '✅' : '❌'}`);

  const hasDetailSection = md.includes('## 记录明细');
  console.log(`记录明细章节：${hasDetailSection ? '✅' : '❌'}`);

  const h3Count = (md.match(/^### /gm) || []).length;
  console.log(
    `记录条目数：${h3Count}（期望 ${expectedCount}）${h3Count === expectedCount ? '✅' : '❌'}`
  );

  const hasOldMasterTag = md.includes('旧版母带混入');
  console.log(`含旧版母带标记：${hasOldMasterTag ? '✅' : '❌'}`);

  const hasLateTag = md.includes('晚到附件');
  console.log(`含晚到附件标记：${hasLateTag ? '✅' : '❌'}`);

  const hasHistory = md.includes('操作历史');
  console.log(`含操作历史：${hasHistory ? '✅' : '❌'}`);

  const hasManualNotes = md.includes('人工备注');
  console.log(`含人工备注：${hasManualNotes ? '✅' : '❌'}`);

  const hasVersionSource = md.includes('版本来源标记');
  console.log(`含版本来源标记章节：${hasVersionSource ? '✅' : '❌'}`);

  const hasSuggestion = md.includes('处理建议');
  console.log(`含处理建议：${hasSuggestion ? '✅' : '❌'}`);

  const hasOverride = md.includes('人工判断覆盖');
  console.log(`含人工判断覆盖：${hasOverride ? '✅' : '❌'}`);

  return (
    hasTitle &&
    hasFilterSection &&
    hasStatsSection &&
    hasDetailSection &&
    h3Count === expectedCount
  );
}

const r1 = validateReport(md1, records.length, '全量导出（5条）');
const r2 = validateReport(md2, oldMasterRecords.length, '旧版母带筛选（1条）');
const r3 = validateReport(md3, lateRecords.length, '晚到附件筛选（1条）');

console.log('\n=== 导出文件名示例 ===');
console.log(defaultReportFileName());

console.log(`\n=== 总体结果：${r1 && r2 && r3 ? '✅ 全部通过' : '❌ 存在失败'} ===`);

if (!(r1 && r2 && r3)) {
  process.exit(1);
}
