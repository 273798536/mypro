const db = require('../src/db');
const trackService = require('../src/services/trackService');
const anomalyService = require('../src/services/anomalyService');

console.log('[SEED] 开始导入示例数据...');

db.prepare(`DELETE FROM track_history`).run();
db.prepare(`DELETE FROM anomaly_alerts`).run();
db.prepare(`DELETE FROM alias_conflicts`).run();
db.prepare(`DELETE FROM tracks`).run();

const tracks = [
  { track_no: '01', track_name: '青花瓷', track_aliases: '青花、Blue White Porcelain', file_name: '01-青花瓷.mp3', source: '排练群截图-2026-06-01', source_type: 'screenshot', program_order: 1, is_encore: 0, status: 'confirmed', operator: '阿蓝', remark: '开场曲，无变化' },
  { track_no: '02', track_name: '晴天', track_aliases: 'Sunny Day、晴日', file_name: '02-晴天.flac', source: '曲目表v3.pdf', source_type: 'program_sheet', program_order: 2, is_encore: 0, status: 'confirmed', operator: '阿蓝' },
  { track_no: '03', track_name: '七里香', track_aliases: '7里香、Orange Jasmine', file_name: '03-七里香.wav', source: '排练群截图-2026-06-10', source_type: 'screenshot', program_order: 3, is_encore: 0, status: 'pending', operator: '系统' },
  { track_no: '04', track_name: '稻香', track_aliases: 'Rice Field、稻花香', file_name: '稻香-final.mp3', source: '运营提交截图', source_type: 'screenshot', program_order: 4, is_encore: 0, status: 'pending', operator: '运营主管' },
  { track_no: '05', track_name: '告白气球', track_aliases: '告白、Love Confession', file_name: '', source: '', source_type: 'manual', program_order: 5, is_encore: 0, status: 'pending', operator: '阿蓝', remark: '文件名待补充' },
  { track_no: '06', track_name: '简单爱', track_aliases: 'Simple Love', file_name: 'FILE_20260612_001.mp3', source: '旧排练群截图-2026-05', source_type: 'old_screenshot', program_order: 6, is_encore: 0, status: 'pending', operator: '阿蓝' },
  { track_no: 'EN1', track_name: '夜曲', track_aliases: '夜曲Serenade、Notturno', file_name: 'encore_01_夜曲.mp3', source: '返场曲目确认单', source_type: 'encore_sheet', program_order: null, is_encore: 1, status: 'confirmed', operator: '阿蓝', remark: '返场固定曲目' },
  { track_no: 'EN2', track_name: '东风破', track_aliases: '东风破、East Wind Breaks', file_name: 'encore_东风破.mp3', source: '排练群截图-2026-06-13', source_type: 'screenshot', program_order: null, is_encore: 1, status: 'pending', operator: '运营主管' },
  { track_no: '07', track_name: '菊花台', track_aliases: 'Chrysanthemum Terrace、菊花', file_name: '07-菊花台.mp3', source: '曲目表v3.pdf', source_type: 'program_sheet', program_order: 7, is_encore: 0, status: 'confirmed', operator: '阿蓝' },
  { track_no: '08', track_name: '千里之外', track_aliases: 'Miles Apart、Far Away', file_name: '08_千里之外.mp3', source: '曲目表v3.pdf', source_type: 'program_sheet', program_order: 8, is_encore: 0, status: 'confirmed', operator: '阿蓝' },
  { track_no: '09', track_name: '菊花', track_aliases: '菊花台', file_name: 'duplicate_check.mp3', source: '旧说法-已弃用', source_type: 'old_screenshot', program_order: 9, is_encore: 0, status: 'pending', operator: '阿蓝', remark: '疑似别名重复，已单独拎出待处理' },
  { track_no: '10', track_name: '发如雪', track_aliases: 'Hair Like Snow、发如雪Ice', file_name: '10-发如雪.mp3', source: '曲目表v3.pdf', source_type: 'program_sheet', program_order: 10, is_encore: 0, status: 'confirmed', operator: '阿蓝' },
  { track_no: 'EN3', track_name: '双截棍', track_aliases: 'Nunchakus', file_name: '', source: '阿蓝临时改判-2026-06-14电话', source_type: 'manual', program_order: null, is_encore: 1, status: 'pending', operator: '阿蓝', auth_remark: '团长授权加演-编号AUTH20260614', remark: '原清单未列，电话加演' },
];

let count = 0;
tracks.forEach(t => {
  trackService.createTrack(t, t.operator || 'system');
  count++;
});

const checks = anomalyService.runAllChecks();

console.log(`[SEED] 完成！导入 ${count} 条曲目`);
console.log('[SEED] 异常检测结果:', checks);
console.log('[SEED] 数据库文件位于 backend/data/theater_encore.db');
console.log('[SEED] 现在运行 npm run dev 启动服务即可');
