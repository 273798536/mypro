import { parseRehearsalText } from './src/utils/textParser.js';

const DEMO = `夜空中最亮的星（逃跑计划代表作）  逃跑计划    2024.12.31  正常记录，授权到年底
南方姑娘（赵雷民谣）    赵雷    2024/12/20    格式稍乱的日期
成都  赵雷  12月25日  日期只有月日，曲名和上面艺人重复构成别名检测
海阔天空(Beyond)    Beyond    20241231    紧凑日期格式
晴天  周杰伦    备注：授权到2025.03.15，之前群里说过   授权藏在备注里
稻香    周杰伦
七里香（周董经典）  周杰伦
光辉岁月    Beyond  2025.06.30  正常记录
【后来】  刘若英  2025-02-28  方括号别名
匆匆那年    王菲  备注：之前漏记的，后补授权至2024.11.30  后补备注
红豆（王菲）  王菲  2024.11.30  和上面别名重复
童话    光良  2024.abc  非法日期格式
演员    薛之谦  2025.01.15
丑八怪  薛之谦  2025.01.15  同艺人重复授权日
模特    李荣浩  备注：授权期限2025年4月30日，排练群里说的  授权藏备注中文格式
年少有为    2025.08.08  缺少艺人字段
不将就    李荣浩
消愁    毛不易  2024.09.10  已过期演示
像我这样的人  毛不易  2025.09.10
烟火里的尘埃  华晨宇
齐天（华晨宇）  华晨宇  2025.05.20  曲名别名重复
夜曲    周杰伦
青花瓷  周杰伦  2025.07.07  正常
东风破  周杰伦  备注：后补记录，补录 2025.02.14  后补备注标记
  2024.invalid.row  完全无效行测试`;

const result = parseRehearsalText(DEMO, []);

console.log('======== 导入结果统计 ========');
console.log(`总行数: ${result.totalLines}`);
console.log(`成功: ${result.success.length} 条`);
console.log(`失败: ${result.failed.length} 条`);
console.log(`问题总数: ${result.issues.length} 个\n`);

console.log('======== 问题类型统计 ========');
const typeMap = new Map();
for (const iss of result.issues) {
  const bucket = typeMap.get(iss.type) ?? { count: 0, errors: 0, warnings: 0, infos: 0 };
  bucket.count++;
  if (iss.severity === 'error') bucket.errors++;
  else if (iss.severity === 'warning') bucket.warnings++;
  else bucket.infos++;
  typeMap.set(iss.type, bucket);
}
for (const [type, v] of typeMap.entries()) {
  const parts = [];
  if (v.errors) parts.push(`错误${v.errors}`);
  if (v.warnings) parts.push(`警告${v.warnings}`);
  if (v.infos) parts.push(`提示${v.infos}`);
  console.log(`  ${type}: ${v.count}（${parts.join(' / ')}）`);
}
console.log('');

console.log('======== 失败明细表 ========');
for (const f of result.failed) {
  console.log(`  第${f.lineNumber}行 | ${f.rawText}`);
  console.log(`          原因: ${f.reason}`);
}
console.log('');

console.log('======== 典型记录校验 ========');

const item12 = result.success.find((i) => i.songName === '童话');
console.log(`[第12行 童话 光良 2024.abc]`);
if (item12) {
  console.log(`  songName=${item12.songName}, artist=${item12.artist}`);
  console.log(`  authDeadline=${item12.authDeadline}, authDeadlineRaw=${item12.authDeadlineRaw}`);
  console.log(`  issues 数量=${item12.issues.length}:`);
  for (const iss of item12.issues) {
    console.log(`    - [${iss.severity}] ${iss.type}: ${iss.message}`);
  }
  const hasError = item12.issues.some((i) => i.severity === 'error' && i.type === 'date_format_unclear');
  console.log(`  ✅ 包含 error 级 date_format_unclear: ${hasError ? 'YES' : 'NO ❌'}`);
} else {
  console.log('  ❌ 童话 没有出现在 success 列表！');
}
console.log('');

const item16 = result.success.find((i) => i.songName === '年少有为');
console.log(`[第16行 年少有为 缺艺人]`);
if (item16) {
  console.log(`  artist='${item16.artist}'`);
  const missingArtist = item16.issues.find((i) => i.relatedField === 'artist' && i.type === 'missing_field');
  console.log(`  ✅ missing_field(艺人): ${missingArtist ? `YES（${missingArtist.message}）` : 'NO ❌'}`);
  console.log(`  authDeadline=${item16.authDeadline}`);
}
console.log('');

const item6 = result.success.find((i) => i.songName === '稻香');
console.log(`[第6行 稻香 缺授权期限]`);
if (item6) {
  const missingAuth = item6.issues.find((i) => i.relatedField === 'authDeadline' && i.type === 'missing_field');
  console.log(`  ✅ missing_field(授权期限): ${missingAuth ? `YES（${missingAuth.message}）` : 'NO ❌'}`);
}
console.log('');

const item10 = result.success.find((i) => i.songName === '匆匆那年');
console.log(`[第10行 匆匆那年 后补备注]`);
if (item10) {
  const hasLateNote = item10.annotations.some((a) => a.isLateNote);
  const hasLateIssue = item10.issues.some((i) => i.type === 'late_note_added');
  console.log(`  ✅ 含后补批注: ${hasLateNote ? 'YES' : 'NO ❌'}`);
  console.log(`  ✅ 含 late_note_added 问题: ${hasLateIssue ? 'YES' : 'NO ❌'}`);
  console.log(`  authDeadline=${item10.authDeadline}, extractedFromNote=${item10.authExtractedFromNote}`);
}
console.log('');

console.log('======== 校验完成 ========');
