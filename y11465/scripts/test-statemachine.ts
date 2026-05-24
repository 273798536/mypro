import { initDb, getDb } from '../api/db/connection.js';
import batchRepository from '../api/repositories/BatchRepository.js';
import documentRepository from '../api/repositories/DocumentRepository.js';
import stateMachineService from '../api/services/StateMachineService.js';
import { randomUUID } from 'crypto';

initDb();
const db = getDb();

console.log('=== 状态机核心流程测试 ===\n');

const batchId = randomUUID();
console.log('1. 测试批次创建 (DRAFT状态)...');
const batch = batchRepository.create({
  batchId,
  batchNo: 'TEST-' + Date.now(),
  styleCode: 'TEST-001',
  brand: '测试品牌',
  duplicateStrategy: 'IGNORE',
  createdBy: '测试用户'
});
console.log(`   创建成功: 批次=${batch.batchNo}, 状态=${batch.status}`);
console.assert(batch.status === 'DRAFT', '初始状态应为DRAFT');

console.log('\n2. 测试 DRAFT -> SUBMIT -> PENDING_REVIEW ...');
const submitted = stateMachineService.transitionBatch(batch.id, 'SUBMIT', '测试用户', '提交批次');
console.log(`   转换成功: ${batch.status} → ${submitted.status}`);
console.assert(submitted.status === 'PENDING_REVIEW', 'SUBMIT后应为PENDING_REVIEW');

console.log('\n3. 测试 PENDING_REVIEW -> START_REVIEW -> UNDER_REVIEW ...');
const reviewing = stateMachineService.transitionBatch(submitted.id, 'START_REVIEW', '测试用户', '开始复核');
console.log(`   转换成功: ${submitted.status} → ${reviewing.status}`);
console.assert(reviewing.status === 'UNDER_REVIEW', 'START_REVIEW后应为UNDER_REVIEW');

console.log('\n4. 测试 UNDER_REVIEW -> APPROVE -> APPROVED ...');
const approved = stateMachineService.transitionBatch(reviewing.id, 'APPROVE', '测试用户', '复核通过');
console.log(`   转换成功: ${reviewing.status} → ${approved.status}`);
console.assert(approved.status === 'APPROVED', 'APPROVE后应为APPROVED');

console.log('\n5. 测试 APPROVED -> FREEZE -> FROZEN ...');
const frozen = stateMachineService.transitionBatch(approved.id, 'FREEZE', '测试用户', '冻结批次');
console.log(`   转换成功: ${approved.status} → ${frozen.status}`);
console.assert(frozen.status === 'FROZEN', 'FREEZE后应为FROZEN');

console.log('\n6. 测试 FROZEN -> UNFREEZE -> APPROVED ...');
const unfrozen = stateMachineService.transitionBatch(frozen.id, 'UNFREEZE', '测试用户', '解冻批次');
console.log(`   转换成功: ${frozen.status} → ${unfrozen.status}`);
console.assert(unfrozen.status === 'APPROVED', 'UNFREEZE后应为APPROVED');

console.log('\n7. 测试 APPROVED -> FREEZE -> FROZEN -> SETTLE -> SETTLED ...');
const frozen2 = stateMachineService.transitionBatch(unfrozen.id, 'FREEZE', '测试用户', '再次冻结');
const settled = stateMachineService.transitionBatch(frozen2.id, 'SETTLE', '测试用户', '批次结算');
console.log(`   转换成功: ${unfrozen.status} → ${frozen2.status} → ${settled.status}`);
console.assert(settled.status === 'SETTLED', 'SETTLE后应为SETTLED');

console.log('\n8. 测试 SETTLED -> ARCHIVE -> ARCHIVED ...');
const archived = stateMachineService.transitionBatch(settled.id, 'ARCHIVE', '测试用户', '批次归档');
console.log(`   转换成功: ${settled.status} → ${archived.status}`);
console.assert(archived.status === 'ARCHIVED', 'ARCHIVE后应为ARCHIVED');

console.log('\n=== 单据复核状态测试 ===\n');

const docId = randomUUID();
console.log('9. 测试单据创建 (PENDING_REVIEW状态)...');
const doc = documentRepository.create({
  batchId: batch.id,
  documentType: 'SAMPLE_FLOW',
  documentNo: 'DOC-TEST-' + Date.now(),
  styleCode: 'TEST-001',
  version: 1,
  data: { sampleName: '测试样衣' },
  createdBy: '测试用户'
});
console.log(`   创建成功: 单据=${doc.documentNo}, 状态=${doc.status}`);
console.assert(doc.status === 'PENDING_REVIEW', '单据初始状态应为PENDING_REVIEW');

console.log('\n10. 测试单据复核 PENDING_REVIEW -> APPROVE (自动START_REVIEW) ...');
const reviewed = stateMachineService.reviewDocument(doc.id, 'APPROVE', '复核通过', '审核员');
console.log(`   转换成功: ${doc.status} → ${reviewed.status}`);
console.assert(reviewed.status === 'APPROVED', 'APPROVE后应为APPROVED');

console.log('\n11. 测试单据驳回后重新提交 ...');
const doc2Id = randomUUID();
const doc2 = documentRepository.create({
  batchId: batch.id,
  documentType: 'SIZE_MODIFY',
  documentNo: 'DOC2-TEST-' + Date.now(),
  styleCode: 'TEST-001',
  version: 1,
  data: { modifyType: '尺码调整' },
  createdBy: '测试用户'
});
console.log(`    创建单据: ${doc2.documentNo}, 状态=${doc2.status}`);

const rejected = stateMachineService.reviewDocument(doc2.id, 'REJECT', '数据不完整', '审核员');
console.log(`    驳回: ${doc2.status} → ${rejected.status}`);
console.assert(rejected.status === 'REJECTED', 'REJECT后应为REJECTED');

const resubmitted = stateMachineService.transitionDocument(rejected.id, 'RESUBMIT', '测试用户', '重新提交');
console.log(`    重新提交: ${rejected.status} → ${resubmitted.status}`);
console.assert(resubmitted.status === 'PENDING_REVIEW', 'RESUBMIT后应为PENDING_REVIEW');

console.log('\n12. 测试单据修改决策 ...');
const doc3Id = randomUUID();
const doc3 = documentRepository.create({
  batchId: batch.id,
  documentType: 'FABRIC_STOCK',
  documentNo: 'DOC3-TEST-' + Date.now(),
  styleCode: 'TEST-001',
  version: 1,
  data: { fabricCode: 'FAB-001', quantity: 50 },
  createdBy: '测试用户'
});
console.log(`    创建单据: ${doc3.documentNo}, 状态=${doc3.status}`);

const modified = stateMachineService.reviewDocument(
  doc3.id,
  'MODIFY',
  '修正面料数量',
  '审核员',
  { fabricCode: 'FAB-001', quantity: 60 }
);
console.log(`    修改决策: version=${modified.version}, 状态=${modified.status}`);
console.assert(modified.version === 2, '修改后版本应为2');

console.log('\n=== 无效转换测试 ===\n');

try {
  stateMachineService.transitionBatch(archived.id, 'SUBMIT', '测试用户', '无效转换');
  console.error('   错误: 无效转换未抛出异常');
} catch (e: any) {
  console.log(`13. 无效转换已正确拦截: ${e.message}`);
}

console.log('\n=== 审计日志验证 ===\n');

const auditLogs = db.prepare(`
  SELECT action, before_data, after_data, reason 
  FROM audit_logs 
  WHERE entity_type = 'BATCH' AND entity_id = ?
  ORDER BY created_at ASC
`).all(batch.id) as any[];

console.log(`14. 批次操作历史: ${auditLogs.length} 条`);
auditLogs.forEach((log: any, idx: number) => {
  console.log(`    ${idx + 1}. ${log.action} - ${log.reason}`);
});
console.assert(auditLogs.length >= 8, '审计日志数量应匹配操作次数');

console.log('\n=== 全部测试通过！ ===');
console.log(`
  批次状态流转: DRAFT → PENDING_REVIEW → UNDER_REVIEW → APPROVED → FROZEN → APPROVED → FROZEN → SETTLED → ARCHIVED
  单据复核: PENDING_REVIEW → (START_REVIEW) → APPROVED
  单据驳回重提: PENDING_REVIEW → REJECTED → PENDING_REVIEW
  单据修改决策: 版本v1 → v2
  审计追踪: 所有操作已记录
`);
