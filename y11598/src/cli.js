#!/usr/bin/env node

const { reconcileAll } = require('./services/reconcileService');
const {
  exportChangeOrdersToCsv,
  exportSupplierStatementsToCsv,
  exportDirtyRecordsToCsv,
  exportAuditTrailToJson,
} = require('./services/exportService');

function printHelp() {
  console.log(`
客服知识库发布验收回放链路服务 CLI

用法:
  npm run cli -- <command> [options]

命令:
  reconcile             执行全量对账
  export <type>         导出数据
    types: change-orders | supplier-statements | dirty-records | audit-trails
  help                  显示帮助

示例:
  npm run cli -- reconcile
  npm run cli -- export change-orders
  npm run cli -- export dirty-records
`);
}

async function runReconcile() {
  console.log('开始全量对账...');
  const result = reconcileAll();
  console.log('\n对账结果:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n对账完成!');
}

async function runExport(type) {
  console.log(`开始导出 ${type}...`);
  let result;

  switch (type) {
    case 'change-orders':
      result = await exportChangeOrdersToCsv();
      break;
    case 'supplier-statements':
      result = await exportSupplierStatementsToCsv();
      break;
    case 'dirty-records':
      result = await exportDirtyRecordsToCsv();
      break;
    case 'audit-trails':
      result = exportAuditTrailToJson();
      break;
    default:
      console.log(`未知导出类型: ${type}`);
      printHelp();
      process.exit(1);
  }

  console.log(`导出完成!`);
  console.log(`文件: ${result.fileName}`);
  console.log(`路径: ${result.filePath}`);
  console.log(`数量: ${result.count} 条`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'reconcile':
      await runReconcile();
      break;
    case 'export':
      await runExport(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runReconcile,
  runExport,
};
