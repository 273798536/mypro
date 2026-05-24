const { reconcileAll } = require('../services/reconcileService');

console.log('=== 开始执行对账 ===\n');

const result = reconcileAll();

console.log('=== 对账结果 ===\n');

console.log('【变更单对账】');
console.log(`  总记录数: ${result.change_orders.total_records}`);
console.log(`  脏记录数: ${result.change_orders.dirty_records}`);
if (result.change_orders.records.length > 0) {
  console.log('  脏记录详情:');
  result.change_orders.records.forEach((r, i) => {
    console.log(`    ${i + 1}. [${r.dirty_type}] ${r.description}`);
  });
}

console.log('\n【对账单对账】');
console.log(`  总记录数: ${result.statements.total_records}`);
console.log(`  脏记录数: ${result.statements.dirty_records}`);
if (result.statements.records.length > 0) {
  console.log('  脏记录详情:');
  result.statements.records.forEach((r, i) => {
    console.log(`    ${i + 1}. [${r.dirty_type}] ${r.description}`);
  });
}

console.log('\n=== 对账完成 ===');
