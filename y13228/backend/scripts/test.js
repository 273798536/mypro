const db = require('../src/db');
const trackService = require('../src/services/trackService');
const anomalyService = require('../src/services/anomalyService');
const alignService = require('../src/services/alignService');

let passed = 0, failed = 0;
function assert(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${detail ? ' - ' + detail : ''}`); }
}

console.log('[TEST] 运行核心功能测试...\n');

console.log('1. 曲目CRUD测试');
const t = trackService.createTrack({
  track_name: '测试曲目',
  track_aliases: '别名A,别名B',
  file_name: '测试曲目.mp3',
  source: '测试来源',
  program_order: 99,
  is_encore: 0,
}, 'test_operator');
assert('创建曲目', !!t && !!t.id);

const fetched = trackService.getTrack(t.id);
assert('获取曲目', !!fetched && fetched.track_name === '测试曲目');

const updated = trackService.updateTrack(t.id, { remark: '运营主管新增备注', status: 'confirmed' }, '运营主管', '前端改备注');
assert('更新曲目（含历史）', updated && updated.remark === '运营主管新增备注' && updated.status === 'confirmed');

const history = trackService.getTrackHistory(t.id);
assert('历史记录写入', history.length >= 2, `实际${history.length}条`);

const historyFields = history.map(h => h.field_name);
assert('备注历史保留', historyFields.includes('remark'), `字段列表:${historyFields.join(',')}`);
assert('状态历史保留', historyFields.includes('status'));

trackService.deleteTrack(t.id);
assert('删除曲目', !trackService.getTrack(t.id));

console.log('\n2. CSV字段别名识别测试');
const csvService = require('../src/services/csvService');
const header1 = ['曲目名称', '文件名', '演出顺序', '是否返场', '备注说明'];
const mapping1 = csvService.detectField(header1);
assert('字段别名映射-曲名', mapping1[0] === 'track_name');
assert('字段别名映射-文件名', mapping1[1] === 'file_name');
assert('字段别名映射-顺序', mapping1[2] === 'program_order');
assert('字段别名映射-返场', mapping1[3] === 'is_encore');
assert('字段别名映射-备注', mapping1[4] === 'remark');

const header2 = ['歌曲名', '音频文件', '返场曲', '授权备注'];
const mapping2 = csvService.detectField(header2);
assert('字段别名-歌曲名→曲名', mapping2[0] === 'track_name');
assert('字段别名-音频文件→文件名', mapping2[1] === 'file_name');
assert('字段别名-返场曲→is_encore', mapping2[2] === 'is_encore');
assert('字段别名-授权备注→auth_remark', mapping2[3] === 'auth_remark');

console.log('\n3. 异常检测测试');
const testTracks = [
  trackService.createTrack({ track_name: '曲A', track_aliases: '共同别名', file_name: 'A.mp3', source: '来源A', program_order: 1 }, 'tester'),
  trackService.createTrack({ track_name: '曲B', track_aliases: '共同别名', file_name: 'B.mp3', source: '来源B', program_order: 2 }, 'tester'),
  trackService.createTrack({ track_name: '曲C', track_aliases: '', file_name: '', source: '' }, 'tester'),
  trackService.createTrack({ track_name: '曲D', track_aliases: '', file_name: '完全不对的文件名.mp3', source: '来源D' }, 'tester'),
];

const result = anomalyService.runAllChecks();
assert('别名冲突检测', result.alias_conflicts >= 1, `检测到${result.alias_conflicts}个冲突`);
assert('文件名缺失检测', result.file_mismatch >= 1, `检测到${result.file_mismatch}个文件名问题`);
assert('来源缺失检测', result.source_missing >= 1, `检测到${result.source_missing}个来源缺失`);

const conflicts = anomalyService.listConflicts({ resolved: 0 });
assert('冲突单独拎出', conflicts.length >= 1, `${conflicts.length}个冲突记录`);

testTracks.forEach(tr => trackService.deleteTrack(tr.id));
db.prepare(`DELETE FROM alias_conflicts WHERE alias_name = '共同别名'`).run();

console.log('\n4. 授权备注对齐测试');
const authTrack = trackService.createTrack({
  track_name: '授权对齐测试曲',
  file_name: '',
  source: '',
  status: 'pending',
  auth_remark: '团长授权加演-AUTH2026TEST',
}, 'tester');

const alignResult = alignService.realignByAuthRemark('团长授权加演', '测试用户');
assert('授权对齐-匹配', alignResult.aligned >= 1, `对齐${alignResult.aligned}条`);

const after = trackService.getTrack(authTrack.id);
assert('授权对齐-来源补齐', after.source === '授权备注对齐', `实际source=${after.source}`);
assert('授权对齐-状态确认', after.status === 'confirmed', `实际status=${after.status}`);
trackService.deleteTrack(authTrack.id);

console.log('\n5. 导出CSV测试');
const csv = csvService.exportTracksToCsv({});
assert('曲目CSV导出内容非空', csv && csv.length > 100);
assert('曲目CSV含BOM头', csv.charCodeAt(0) === 0xFEFF || csv.startsWith('\uFEFF'));

const conflictCsv = csvService.exportConflictsToCsv();
assert('冲突CSV导出', typeof conflictCsv === 'string');

console.log('\n6. 统计信息测试');
const stats = trackService.getStatistics();
assert('统计字段完整', ['total','encore','pending','confirmed','openAlerts','conflictCount'].every(k => typeof stats[k] === 'number'));

console.log(`\n[TEST] 完成：通过 ${passed}，失败 ${failed}`);
process.exit(failed > 0 ? 1 : 0);
