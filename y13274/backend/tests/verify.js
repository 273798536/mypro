const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '../storage/bus-bays.json');
if (fs.existsSync(STORAGE_FILE)) {
  fs.unlinkSync(STORAGE_FILE);
  console.log('🧹 已清理旧数据文件\n');
}

const bayService = require('../src/services/bayService');
const reportService = require('../src/services/reportService');
const mockBays = require('../src/data/mockBays');
const { BAY_STATUS, BAY_STATUS_LABEL } = require('../src/models/constants');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   错误: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || '断言失败');
}

console.log('========== 公交港湾公示清单 - 验证测试 ==========\n');

console.log('--- 1. 数据初始化 ---');
test('导入模拟数据', () => {
  const bays = bayService.importBays(mockBays, 'test');
  assert(bays.length === 6, `期望6条记录，实际${bays.length}条`);
});

test('数据持久化到文件', () => {
  assert(fs.existsSync(STORAGE_FILE), '数据文件不存在');
  const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
  const data = JSON.parse(content);
  assert(data.length === 6, '文件中数据条数不符');
});

console.log('\n--- 2. 状态与数据一致性 ---');
test('清单接口状态与明细一致', () => {
  const list = bayService.listBays();
  for (const bay of list) {
    const detail = bayService.getBay(bay.id);
    assert(bay.status === detail.status, `ID ${bay.id}: 列表状态${bay.status} != 明细状态${detail.status}`);
  }
});

test('坐标偏移的记录状态为异常', () => {
  const bays = bayService.listBays();
  const coordMismatch = bays.find(b => b.name.includes('解放路图书馆站'));
  assert(coordMismatch, '找不到解放路图书馆站');
  assert(coordMismatch.status === BAY_STATUS.COORDINATE_MISMATCH, '状态应为 coordinate_mismatch');
  assert(reportService.isAbnormalStatus(coordMismatch.status), '应被判定为异常状态');
});

test('名称不一致的记录状态为异常', () => {
  const bays = bayService.listBays();
  const nameMismatch = bays.find(b => b.name.includes('人民路百货大楼站'));
  assert(nameMismatch, '找不到人民路百货大楼站');
  assert(nameMismatch.status === BAY_STATUS.NAME_MISMATCH, '状态应为 name_mismatch');
});

console.log('\n--- 3. 材料关联与名称不一致 ---');
test('名称不一致的材料与结论关联', () => {
  const bays = bayService.listBays();
  const bay = bays.find(b => b.status === BAY_STATUS.NAME_MISMATCH);
  assert(bay, '找不到名称不一致的点位');
  
  const inconsistentMaterials = bay.materials.filter(m => !m.isNameConsistent);
  assert(inconsistentMaterials.length > 0, '应有名称不一致的材料');
  assert(bay.status === BAY_STATUS.NAME_MISMATCH, '材料名称不一致应反映到点位状态上');
});

test('添加名称不一致的材料自动更新状态', () => {
  const bays = bayService.listBays();
  const normalBay = bays.find(b => b.status === BAY_STATUS.APPROVED);
  assert(normalBay, '找不到已通过的点位');
  
  const result = bayService.addMaterial(normalBay.id, {
    name: '某某站（旧名）',
    source: 'gis',
    isNameConsistent: false,
    nameRemark: '测试：旧名称材料'
  }, 'test');
  
  assert(result.bay.status === BAY_STATUS.NAME_MISMATCH, '添加名称不一致材料后状态应更新');
  assert(result.bay.history.length > normalBay.history.length, '应新增历史记录');
  
  bayService.removeMaterial(normalBay.id, result.material.id, 'test');
  const reverted = bayService.getBay(normalBay.id);
  assert(reverted.materials.length === normalBay.materials.length, '移除材料后数量应恢复');
});

console.log('\n--- 4. 照片补录与变更说明 ---');
test('补录照片有变更说明', () => {
  const bays = bayService.listBays();
  const bay = bays.find(b => b.photos.length > 0);
  assert(bay, '找不到有照片的点位');
  assert(bay.photos.some(p => p.changes), '照片应有变更说明');
});

test('补录照片后状态更新', () => {
  const bays = bayService.listBays();
  const draftBay = bays.find(b => b.status === BAY_STATUS.DRAFT);
  assert(draftBay, '找不到草稿状态的点位');
  
  const result = bayService.addPhoto(draftBay.id, {
    url: '/photos/test.jpg',
    uploader: '测试员',
    description: '测试补录照片',
    changes: '测试：补充了现场照片'
  }, 'test');
  
  assert(result.photo, '应返回照片对象');
  assert(result.bay.status === BAY_STATUS.PHOTO_SUPPLEMENTED, '补录照片后状态应更新为已补录');
  assert(result.bay.history.some(h => h.action === 'photo_add'), '应有照片补录的历史记录');
});

console.log('\n--- 5. Markdown报告生成 ---');
test('生成完整报告', () => {
  const bays = bayService.listBays();
  const report = reportService.generateReport(bays);
  assert(report.content, '报告内容不应为空');
  assert(report.content.includes('# 公交港湾公示清单'), '报告应有标题');
  assert(report.bayCount === bays.length, '报告点位数量应一致');
});

test('报告包含重点关注事项（异常项前置）', () => {
  const bays = bayService.listBays();
  const report = reportService.generateReport(bays);
  assert(report.content.includes('重点关注事项'), '应有重点关注事项章节');
  assert(report.content.includes('坐标偏移'), '应包含坐标偏移异常');
  assert(report.content.includes('名称不一致'), '应包含名称不一致异常');
});

test('报告中异常项不写得像正常通过', () => {
  const bays = bayService.listBays();
  const report = reportService.generateReport(bays);
  
  const abnormal = bays.filter(b => reportService.isAbnormalStatus(b.status));
  for (const bay of abnormal) {
    const idx = report.content.indexOf(bay.name);
    assert(idx !== -1, `报告中应包含 ${bay.name}`);
  }
  
  assert(report.content.includes('🔴 异常点位明细'), '异常点位应有明确标识');
  assert(report.content.includes('✅ 正常点位明细'), '正常点位应有明确标识');
});

test('报告包含材料名称不一致说明', () => {
  const bays = bayService.listBays();
  const report = reportService.generateReport(bays);
  assert(report.content.includes('材料名称不一致说明'), '应有材料名称不一致的说明');
  assert(report.content.includes('已关联至本条结论'), '应说明材料与结论的关联');
});

test('报告包含照片补录说明', () => {
  const bays = bayService.listBays();
  const photoBays = bays.filter(b => b.photos.length > 0);
  assert(photoBays.length > 0, '应有带照片的点位');
  
  const report = reportService.generateReport(bays);
  assert(report.content.includes('照片补录说明'), '应有照片补录说明');
  assert(report.content.includes('补录后地图点位信息'), '应说明补录后的变化');
});

test('单条点位报告生成', () => {
  const bays = bayService.listBays();
  const bay = bays[0];
  const report = reportService.generateSingleBayReport(bay);
  assert(report.content.includes(bay.name), '报告应包含点位名称');
  assert(report.status === bay.status, '报告状态应与点位一致');
});

console.log('\n--- 6. 历史记录与状态流转 ---');
test('状态变更有历史记录', () => {
  const bays = bayService.listBays();
  const bay = bays.find(b => b.status === BAY_STATUS.PENDING);
  assert(bay, '找不到待审核的点位');
  
  const updated = bayService.approve(bay.id, '测试审核通过', 'test');
  assert(updated.status === BAY_STATUS.APPROVED, '状态应变为已通过');
  
  const history = bayService.getHistory(bay.id);
  const statusChange = history.find(h => h.action === 'status_change' && h.afterStatus === BAY_STATUS.APPROVED);
  assert(statusChange, '应有状态变更的历史记录');
  assert(statusChange.remark.includes('测试审核通过'), '历史记录应包含备注');
});

test('备注更新有历史记录', () => {
  const bays = bayService.listBays();
  const bay = bays[0];
  const oldHistoryLen = bay.history.length;
  
  const updated = bayService.updateRemark(bay.id, '这是一条测试备注', 'test');
  assert(updated.remark === '这是一条测试备注', '备注应更新');
  assert(updated.history.length === oldHistoryLen + 1, '应新增一条历史记录');
});

console.log('\n--- 7. 重启后数据一致性 ---');
test('数据文件与内存一致', () => {
  const memoryBays = bayService.listBays();
  const fileContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
  const fileBays = JSON.parse(fileContent);
  
  assert(memoryBays.length === fileBays.length, '内存与文件数据条数应一致');
  
  const fileMap = {};
  for (const fb of fileBays) fileMap[fb.id] = fb;
  
  for (const mb of memoryBays) {
    const fb = fileMap[mb.id];
    assert(fb, `文件中应存在ID为 ${mb.id} 的记录`);
    assert(mb.status === fb.status, `ID ${mb.id}: 状态应一致`);
    assert(mb.remark === fb.remark, `ID ${mb.id}: 备注应一致`);
    assert(mb.history.length === fb.history.length, `ID ${mb.id}: 历史记录数应一致`);
    assert(mb.materials.length === fb.materials.length, `ID ${mb.id}: 材料数应一致`);
    assert(mb.photos.length === fb.photos.length, `ID ${mb.id}: 照片数应一致`);
  }
});

test('重新加载存储后数据一致', () => {
  const JsonStorage = require('../src/utils/jsonStorage');
  const newStorage = new JsonStorage(STORAGE_FILE);
  const reloaded = newStorage.getAll();
  const original = bayService.listBays();
  
  assert(reloaded.length === original.length, '重新加载后数量应一致');
  
  const reloadedMap = {};
  for (const r of reloaded) reloadedMap[r.id] = r;
  
  for (const o of original) {
    const r = reloadedMap[o.id];
    assert(r, `重新加载后应存在ID为 ${o.id} 的记录`);
    assert(o.status === r.status, `ID ${o.id}: 状态应一致`);
    assert(o.materials.length === r.materials.length, `ID ${o.id}: 材料数应一致`);
    assert(o.photos.length === r.photos.length, `ID ${o.id}: 照片数应一致`);
    assert(o.history.length === r.history.length, `ID ${o.id}: 历史记录数应一致`);
  }
});

console.log('\n--- 8. 报告与接口状态一致性 ---');
test('接口状态与报告状态一致', () => {
  const bays = bayService.listBays();
  const report = reportService.generateReport(bays);
  
  const statusCounts = {};
  for (const bay of bays) {
    statusCounts[bay.status] = (statusCounts[bay.status] || 0) + 1;
  }
  
  for (const [status, count] of Object.entries(statusCounts)) {
    const label = BAY_STATUS_LABEL[status];
    if (count > 0) {
      assert(report.content.includes(label), `报告中应包含状态: ${label}`);
    }
  }
});

console.log('\n========== 测试结果 ==========');
console.log(`通过: ${passed} / ${passed + failed}`);
if (failed > 0) {
  console.log(`失败: ${failed}`);
  process.exit(1);
} else {
  console.log('🎉 所有测试通过！');
}

const reportFile = path.join(__dirname, '../storage/sample-report.md');
const bays = bayService.listBays();
const report = reportService.generateReport(bays, { title: '公交港湾公示清单（样例）', generator: '验证脚本' });
fs.writeFileSync(reportFile, report.content, 'utf-8');
console.log(`\n📄 样例报告已生成: ${reportFile}`);
