const Booth = require('../src/models/Booth');
const AppState = require('../src/models/AppState');
const db = require('../src/models/db');

console.log('🌱 开始填充音乐节摊位清单归档演示数据...\n');

db.exec('DELETE FROM booth_notes');
db.exec('DELETE FROM booth_history');
db.exec('DELETE FROM booths');
db.exec('DELETE FROM app_state');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('booths', 'booth_notes', 'booth_history', 'app_state')");

console.log('🧹 已清空旧数据\n');

const booth1 = Booth.create({
  booth_number: 'A-01',
  label_name: '星海音乐厂牌',
  contact_person: '李老师',
  phone: '13800138001',
  song_name: '夏夜晚风',
  song_alias: '夏夜',
  rehearsal_info: '6月15日 14:00 主舞台彩排 已完成',
  authorization_note: '曲目授权已通过邮件确认，编号：AUTH-2026-001',
  status: 'approved',
  final_conclusion: '摊位布置完整，人员到位，曲目授权齐全，允许入场。学生进步明显，台风比上次稳很多，音准问题已改善。',
  manual_annotation: '小孟批注：重点关注设备调试，上次出现过电流声问题。建议提前30分钟到场做最后检查。',
  delivery_checklist: '✓ 帐篷 ×1 | ✓ 桌椅 ×2 | ✓ 宣传物料 | ✓ 设备清单 | ✓ 应急联系卡',
}, 'demo_init');

console.log(`✅ 正常记录已创建：摊位 ${booth1.booth_number} - ${booth1.label_name}`);
console.log(`   └─ 曲目：${booth1.song_name} (${booth1.song_alias})`);
console.log(`   └─ 状态：${booth1.status}`);
console.log(`   └─ 已关联：排练备注 + 授权备注 + 最终结论 + 人工批注 + 交付清单\n`);

Booth.addNote(booth1.id, 'rehearsal', '彩排时学生紧张忘词一次，但即兴处理很好，临场反应有进步', '小孟');
Booth.addNote(booth1.id, 'authorization', '授权文件已核对，与交付清单编号一致', '小孟');

console.log('📝 已为正常记录添加备注\n');

const booth2 = Booth.create({
  booth_number: 'B-03',
  label_name: '晨曦独立音乐',
  contact_person: '王同学',
  phone: '13900139002',
  song_name: '夏夜序曲',
  song_alias: '夏夜',
  rehearsal_info: '6月14日 10:00 副舞台彩排',
  authorization_note: '授权待补充，已催办',
  status: 'reviewing',
  final_conclusion: null,
  manual_annotation: null,
  delivery_checklist: null,
}, 'demo_init');

console.log(`⚠️  重复别名记录已创建：摊位 ${booth2.booth_number} - ${booth2.label_name}`);
console.log(`   └─ 曲目：${booth2.song_name} (${booth2.song_alias})`);
console.log(`   └─ 别名 "夏夜" 与摊位 A-01 重复！`);
console.log(`   └─ 状态：${booth2.status}（待补充授权和结论）\n`);

Booth.addNote(booth2.id, 'issue', '曲名别名与A-01冲突，需确认是否为同一首歌或同名不同曲', '小孟');
Booth.addNote(booth2.id, 'rehearsal', '彩排时间待确认，学生表示可能需要调整', '小孟');

console.log('📝 已为重复别名记录添加问题备注\n');

const booth3 = Booth.create({
  booth_number: 'C-07',
  label_name: '律动工作室',
  contact_person: '张老师',
  phone: '13700137003',
  song_name: '城市节拍',
  song_alias: '节拍',
  rehearsal_info: '6月13日 16:00 已完成',
  authorization_note: '已签署纸质授权书',
  status: 'pending',
  final_conclusion: null,
  manual_annotation: '小孟批注：节奏部分学生进步很大，从40拍提升到55拍。',
  delivery_checklist: null,
}, 'demo_init');

Booth.update(booth3.id, { status: 'reviewing' }, '小孟', '初检通过，进入复核阶段');

setTimeout(() => {
  Booth.update(booth3.id, {
    status: 'approved',
    final_conclusion: '整体合格，学生节奏感进步明显，可以正常演出。',
    delivery_checklist: '✓ 帐篷 ×1 | ✓ 桌椅 ×1 | ? 宣传物料待补',
  }, '小孟', '主管复核通过，最终确认');
}, 500);

console.log(`✅ 第三笔记录已创建并模拟操作历史：摊位 ${booth3.booth_number}`);
console.log(`   └─ 模拟小孟修改判断：pending → reviewing → approved`);
console.log(`   └─ 操作历史已留存，下一班可查看完整修改轨迹\n`);

const booth4 = Booth.create({
  booth_number: 'D-12',
  label_name: '青春旋律社',
  contact_person: '赵同学',
  phone: null,
  song_name: null,
  song_alias: null,
  rehearsal_info: null,
  authorization_note: null,
  status: 'pending',
  final_conclusion: null,
  manual_annotation: null,
  delivery_checklist: null,
}, 'demo_init');

console.log(`⚠️  不完整记录已创建：摊位 ${booth4.booth_number} - ${booth4.label_name}`);
console.log(`   └─ 缺少联系电话、曲目、授权等信息`);
console.log(`   └─ 用于演示异常检测能力\n`);

const booth5 = Booth.create({
  booth_number: 'E-05',
  label_name: '夜航船乐队',
  contact_person: '周队长',
  phone: '13600136005',
  song_name: '灯塔',
  song_alias: 'Lighthouse',
  rehearsal_info: '6月12日 19:00 主舞台，效果良好',
  authorization_note: '乐队自有原创，已签署版权声明',
  status: 'approved',
  final_conclusion: '原创曲目，演出经验丰富，设备自备，一切就绪。',
  manual_annotation: '主唱学生进步最大，高音稳定性明显提升，建议加一个返听。',
  delivery_checklist: '✓ 全部自备，无需主办方提供',
}, 'demo_init');

Booth.addNote(booth5.id, 'rehearsal', '学生原创作品，配合默契，比上次排练好很多', '小孟');

console.log(`✅ 额外完整记录：摊位 ${booth5.booth_number} - ${booth5.label_name}\n`);

AppState.setState('processing_status', {
  current_phase: 'archive_review',
  last_operator: '小孟',
  pending_review_count: 2,
  flagged_issues: ['曲名别名重复检测'],
});

AppState.setState('page_summary', {
  total_count: 5,
  status_count: { pending: 2, reviewing: 1, approved: 2, rejected: 0 },
  with_conclusion: 3,
  with_linked_notes: 4,
  issue_count: 2,
  duplicate_count: 1,
  last_updated: new Date().toISOString(),
});

AppState.setState('last_scan_time', new Date().toISOString());
AppState.setState('demo_mode', true);

console.log('💾 应用状态已持久化（处理状态 + 页面摘要）');
console.log('   └─ 服务重启后仍可读取\n');

console.log('═══════════════════════════════════════════════');
console.log('🎪 音乐节摊位清单归档 - 演示数据填充完成');
console.log('═══════════════════════════════════════════════');
console.log(`总计 ${5} 条记录：`);
console.log(`  ✓ 正常完整记录：2 条（A-01, E-05）`);
console.log(`  ⚠  曲名别名重复：1 条（B-03 别名"夏夜"与 A-01 冲突）`);
console.log(`  📝 含操作历史：1 条（C-07 模拟小孟多次修改判断）`);
console.log(`  ❌ 不完整记录：1 条（D-12 缺少关键字段）`);
console.log('');
console.log('所有数据已保存到 SQLite，服务重启后不丢失。');
console.log('运行 npm start 启动后端服务。\n');
