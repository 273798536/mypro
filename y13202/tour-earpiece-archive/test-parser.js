// 测试解析逻辑的脚本
import { parseRehearsalText } from './src/utils/textParser.js';
import { DEMO_RAW_TEXT } from './src/data/demo.js';

const result = parseRehearsalText(DEMO_RAW_TEXT, []);

console.log('=== 导入结果 ===');
console.log(`总行数: ${result.totalLines}`);
console.log(`成功: ${result.success.length}`);
console.log(`失败: ${result.failed.length}`);
console.log(`问题总数: ${result.issues.length}`);

console.log('\n=== 问题类型统计 ===');
const issueMap = new Map();
for (const iss of result.issues) {
  const bucket = issueMap.get(iss.type) || { count: 0, errors: 0, warnings: 0, infos: 0 };
  bucket.count++;
  if (iss.severity === 'error') bucket.errors++;
  else if (iss.severity === 'warning') bucket.warnings++;
  else bucket.infos++;
  issueMap.set(iss.type, bucket);
}

const ISSUE_TYPE_LABEL = {
  duplicate_song_alias: '曲名别名重复',
  missing_field: '字段缺失',
  date_format_unclear: '日期格式/非法',
  hidden_auth_in_note: '授权藏于备注',
  duplicate_record: '重复记录',
  late_note_added: '后补备注',
  format_unrecognized: '格式无法识别',
};

for (const [type, stats] of issueMap.entries()) {
  console.log(`${ISSUE_TYPE_LABEL[type] || type}: ${stats.count}个 (错误${stats.errors}/警告${stats.warnings}/提示${stats.infos})`);
}

console.log('\n=== 归档成功列表 (前15行) ===');
for (let i = 0; i < Math.min(15, result.success.length); i++) {
  const item = result.success[i];
  const hasError = item.issues.some(iss => iss.severity === 'error');
  console.log(`#${item.rawLineNumber} ${item.songName} - ${item.artist || '(缺艺人)'} - ${item.authDeadline || '(无授权期)'}`);
  console.log(`  问题数: ${item.issues.length}, 有错误: ${hasError}`);
  if (item.issues.length > 0) {
    console.log(`  问题: ${item.issues.map(iss => ISSUE_TYPE_LABEL[iss.type] || iss.type).join(', ')}`);
  }
}

console.log('\n=== 第12行 (童话 光良) 详情 ===');
const line12 = result.success.find(item => item.rawLineNumber === 12);
if (line12) {
  console.log(`曲名: ${line12.songName}`);
  console.log(`艺人: ${line12.artist}`);
  console.log(`授权期限: ${line12.authDeadline}`);
  console.log(`授权期限原始值: ${line12.authDeadlineRaw}`);
  console.log(`有错误: ${line12.issues.some(iss => iss.severity === 'error')}`);
  console.log(`问题:`);
  for (const iss of line12.issues) {
    console.log(`  - ${ISSUE_TYPE_LABEL[iss.type] || iss.type} (${iss.severity}): ${iss.message}`);
  }
}

console.log('\n=== 失败列表 ===');
for (const fail of result.failed) {
  console.log(`#${fail.lineNumber}: ${fail.rawText}`);
  console.log(`  原因: ${fail.reason}`);
}

console.log('\n=== 第12行问题标签 ===');
if (line12) {
  for (const iss of line12.issues) {
    console.log(`  ${ISSUE_TYPE_LABEL[iss.type] || iss.type} (${iss.severity})`);
  }
}
