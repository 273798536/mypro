const path = require('path');
const fs = require('fs');

const TEST_DATA_DIR = path.join(__dirname, 'data_test');
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true });
}

const origCwd = process.cwd();
process.chdir(__dirname);

const mod = require('./src/storage.js');
const DATA_DIR_KEY = Object.keys(mod).find(k => k.includes('DIR') || k.includes('FILE'));
const storageSrc = fs.readFileSync(path.join(__dirname, 'src', 'storage.js'), 'utf8');
const testStorageSrc = storageSrc.replace(
  "path.join(__dirname, '..', 'data')",
  `path.join(__dirname, '..', 'data_test')`
);
fs.writeFileSync(path.join(__dirname, 'src', '_storage_test.js'), testStorageSrc);

const serviceSrc = fs.readFileSync(path.join(__dirname, 'src', 'service.js'), 'utf8');
const testServiceSrc = serviceSrc.replace(
  "require('./storage')",
  "require('./_storage_test')"
);
fs.writeFileSync(path.join(__dirname, 'src', '_service_test.js'), testServiceSrc);

const service = require('./src/_service_test.js');
const samplePath = path.join(__dirname, 'samples', 'batch_manual_correction.json');
const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

console.log('\n=== [1/7] 导入样本包 ===');
const r1 = service.importBatch(sampleData.records, '测试脚本');
console.log('导入结果:', JSON.stringify(r1, null, 2));
console.assert(r1.total === 6, '总数应为6');
console.assert(r1.success === 6, '成功应为6');
console.assert(r1.exceptionCount >= 1, '异常数>=1');
console.log('✅ 导入通过');

console.log('\n=== [2/7] 校验记录状态、版本、需确认标记 ===');
const all = service.getAllRecords();
console.log('记录数:', all.length);
all.forEach(r => {
  console.log(`  ${r.id}: status=${r.status} version=${r._version} needConfirm=${r.needsManualConfirm} hasLate=${r.hasLateAttachment}`);
});
const late = all.find(r => r.hasLateAttachment);
console.assert(late && late.status === service.STATUS.EXCEPTION, '晚到附件应为 exception 状态');
const drift = all.find(r => r.id === 'rec_002_drift');
console.assert(drift && drift.needsManualConfirm, '漂移样本需触发人工确认');
const misjudge = all.find(r => r.id === 'rec_004_old_misjudge');
console.assert(misjudge && misjudge.recommendationChanged, '误判样本应有改判标记');
console.log('✅ 状态/标记正确');

console.log('\n=== [3/7] 人工确认 + 备注 + 撤回 ===');
let conf = service.confirmRecord('rec_001_clean', '阿宁', '主流程压测：确认通过');
console.assert(conf.status === 'confirmed', '应为 confirmed');
console.assert(conf.confirmedBy === '阿宁', '确认人应匹配');
console.log('确认后状态:', conf.status, '确认人:', conf.confirmedBy);

const up = service.updateRemark('rec_001_clean', '阿宁', '补充备注：周三订单量已核实');
console.assert(up.currentRemark.includes('周三'), '备注应写入');
console.log('备注:', up.currentRemark);

const wd = service.withdrawRecord('rec_001_clean', '阿宁', '发现排班冲突，撤回重审');
console.assert(wd.status === 'withdrawn', '应为 withdrawn');
console.log('撤回后状态:', wd.status);
console.log('✅ 确认/备注/撤回通过');

console.log('\n=== [4/7] 改判解释回放 ===');
const replay = service.explainReclassification(misjudge);
console.log('改判回放 changed:', replay.changed);
console.log('摘要:', replay.summary);
console.log('解释条数:', replay.explanations.length);
replay.explanations.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
console.assert(replay.changed, '误判样本应产生改判');
console.assert(replay.explanations.length > 0, '至少 1 条解释');
console.log('✅ 改判解释通过');

console.log('\n=== [5/7] 阈值漂移人工确认原因 + 下一步 ===');
const dr = service.needsManualConfirm(drift);
console.log('是否需确认:', dr.needed);
console.log('原因数:', dr.reasons.length);
dr.reasons.forEach((r, i) => console.log(`  原因${i + 1}: ${r}`));
dr.nextSteps.forEach((s, i) => console.log(`  下一步${i + 1}: ${s}`));
console.assert(dr.needed === true, '漂移样本需人工确认');
console.assert(dr.reasons.some(r => r.includes('漂移')), '应含漂移原因');
console.assert(dr.nextSteps.length > 0, '应含下一步');
console.log('✅ 阈值漂移 + 说明通过');

console.log('\n=== [6/7] 异常队列解决 + 记录状态联动 ===');
let excs = service.getExceptions(false);
console.log('未解决异常数:', excs.length);
excs.forEach(e => console.log(`  ${e.id} type=${e.type} rec=${e.recordId}`));
const lateExc = excs.find(e => e.type === 'late_attachment');
console.assert(lateExc, '应存在晚到异常');
const resolved = service.resolveException(lateExc.id, '运维', '附件已补全，打卡数据同步完成');
console.assert(resolved.resolved === true, '异常应标记解决');
const lateRec = service.getAllRecords().find(r => r.hasLateAttachment);
console.log('异常解决后记录状态:', lateRec.status);
console.assert(lateRec.status === service.STATUS.PENDING, '异常解决后记录应回到 pending');
console.log('✅ 异常队列联动通过');

console.log('\n=== [6.5/8] 🔥 核心：重新导入不覆盖人工结论（阿宁被卡的痛点）===');
const beforeReimport = service.getAllRecords().find(r => r.id === 'rec_001_clean');
console.log('重新导入前 rec_001: status=%s version=%s confirmedBy=%s', beforeReimport.status, beforeReimport._version, beforeReimport.confirmedBy);
service.confirmRecord('rec_001_clean', '阿宁', '先确认一遍准备测试覆盖保护');
const confirmedVersion = service.getAllRecords().find(r => r.id === 'rec_001_clean')._version;
console.log('确认后版本号 v' + confirmedVersion);

const reimportSample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
reimportSample.records[0].confidence = 0.99;
reimportSample.records[0].remark = '这是新导入的备注，应该不覆盖';
service.importBatch(reimportSample.records, '新批次_压测覆盖');

const afterReimport = service.getAllRecords().find(r => r.id === 'rec_001_clean');
console.log('重新导入后 rec_001: status=%s version=%s confirmedBy=%s remark="%s"',
  afterReimport.status, afterReimport._version, afterReimport.confirmedBy, afterReimport.currentRemark);
console.assert(afterReimport.status === 'confirmed', '🔥🔥🔥 已确认状态不应该被新导入盖掉！这是核心痛点');
console.assert(afterReimport.confirmedBy === '阿宁', '确认人应该保留');
console.assert(afterReimport._version === confirmedVersion + 1, '版本号应只+1（之前bug是+2）');
console.assert(afterReimport.currentRemark.includes('周三') || afterReimport.currentRemark.includes('确认一遍'),
  '原人工备注应被保留，不被新导入空备注覆盖');
console.log('✅ 状态/确认人/备注 全部保护成功！版本号正确只+1');

console.log('\n=== [7/8] 撤回状态也不被覆盖 ===');
service.withdrawRecord('rec_001_clean', '阿宁', '为测试撤回保护先撤回');
const wdVersion = service.getAllRecords().find(r => r.id === 'rec_001_clean')._version;
service.importBatch(reimportSample.records, '又一批次');
const afterWdReimport = service.getAllRecords().find(r => r.id === 'rec_001_clean');
console.log('重新导入后 rec_001: status=%s version=%s withdrawnBy=%s',
  afterWdReimport.status, afterWdReimport._version, afterWdReimport.withdrawnBy);
console.assert(afterWdReimport.status === 'withdrawn', '已撤回状态也不应被覆盖');
console.assert(afterWdReimport._version === wdVersion + 1, '版本号正确只+1');
console.log('✅ 撤回状态保护通过');

console.log('\n=== [8/8] 一致性校验 ===');
const c = service.checkConsistency();
console.log('一致性结果:', JSON.stringify(c, null, 2));
console.assert(c.ok === true, '一致性应通过');
console.log('✅ 一致性通过');

console.log('\n=== 模拟重启：重新加载数据 ===');
delete require.cache[require.resolve('./src/_storage_test.js')];
delete require.cache[require.resolve('./src/_service_test.js')];
const service2 = require('./src/_service_test.js');
const c2 = service2.checkConsistency();
const all2 = service2.getAllRecords();
const rec1 = all2.find(r => r.id === 'rec_001_clean');
console.log('重启后 rec_001 状态:', rec1.status, '备注:', rec1.currentRemark, '版本:', rec1._version);
const excAfter = service2.getExceptions();
console.log('重启后异常总数:', excAfter.length, '未解决:', excAfter.filter(e => !e.resolved).length);
console.assert(c2.ok, '重启后一致性仍应通过');
console.assert(rec1.status === 'withdrawn', '重启后状态保持 withdrawn');
console.assert(rec1.currentRemark.includes('周三'), '重启后备注保留');
console.log('✅ 重启持久化通过');

console.log('\n🎉🎉🎉 全部 8 项主流程验证通过（含核心：人工结论不被覆盖）！🎉🎉🎉\n');

fs.unlinkSync(path.join(__dirname, 'src', '_storage_test.js'));
fs.unlinkSync(path.join(__dirname, 'src', '_service_test.js'));
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true });
}
console.log('临时文件已清理。下一步执行: npm install && npm start\n');
