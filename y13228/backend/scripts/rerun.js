const anomalyService = require('../src/services/anomalyService');
const alignService = require('../src/services/alignService');
const trackService = require('../src/services/trackService');

console.log('[RERUN] ============ 重跑流程开始 ============');

console.log('\n[RERUN] 第1步：全量重新运行异常检测...');
const checks = anomalyService.runAllChecks();
console.log('[RERUN] 异常检测结果:', JSON.stringify(checks, null, 2));

console.log('\n[RERUN] 第2步：全量对齐文件名...');
const aligned = alignService.reconcileAll('系统重跑');
console.log('[RERUN] 文件名对齐:', JSON.stringify(aligned, null, 2));

console.log('\n[RERUN] 第3步：授权备注重新对齐 (pattern=团长授权加演)...');
const authAligned = alignService.realignByAuthRemark('团长授权加演', '系统重跑');
console.log('[RERUN] 授权备注对齐:', JSON.stringify(authAligned, null, 2));

console.log('\n[RERUN] ============ 重跑流程完成 ============');
const stats = trackService.getStatistics();
console.log('[RERUN] 当前状态统计:', JSON.stringify(stats, null, 2));
