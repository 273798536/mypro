#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { getDB, persist, resetCache } = require('../src/models/storage');
const { createContract, listContracts, freezeContract, getContractVersions } = require('../src/models/Contract');
const { createPaymentNode, listPaymentNodes, updateNodeStatus } = require('../src/models/PaymentNode');
const { createAcceptanceEmail, listAcceptanceEmails, reviewAcceptanceEmail } = require('../src/models/AcceptanceEmail');
const { createConfirmation, listConfirmations, approveConfirmation, listFailedRecords } = require('../src/models/Confirmation');
const { exportReconciliationReport, exportFullPlayback } = require('../src/services/exportService');

const program = new Command();
const DEFAULT_USER = 'admin';

program
  .name('contract-cli')
  .description('法务合同履约验收回放链路 CLI 工具')
  .version('1.0.0')
  .option('-u, --user <userId>', '指定用户ID', DEFAULT_USER);

program
  .command('server')
  .description('启动 API 服务')
  .option('-p, --port <port>', '端口号', '3000')
  .action((options) => {
    process.env.PORT = options.port;
    require('../src/server');
  });

const contractCmd = program.command('contract').description('合同管理');

contractCmd
  .command('create')
  .description('创建合同')
  .requiredOption('--name <name>', '合同名称')
  .requiredOption('--partyA <party>', '甲方')
  .requiredOption('--partyB <party>', '乙方')
  .requiredOption('--amount <amount>', '总金额')
  .requiredOption('--pdf-hash <hash>', 'PDF哈希')
  .option('--idempotency-key <key>', '幂等键', () => `contract-${Date.now()}`)
  .action((options) => {
    const data = {
      idempotencyKey: options.idempotencyKey,
      contractName: options.name,
      partyA: options.partyA,
      partyB: options.partyB,
      totalAmount: options.amount,
      pdfHash: options.pdfHash
    };
    
    const result = createContract(data, program.opts().user);
    if (result.success) {
      console.log(chalk.green(`合同创建成功: ${result.data.id}`));
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(0);
    } else {
      console.log(chalk.red(`创建失败: ${result.error}`));
      process.exit(1);
    }
  });

contractCmd
  .command('list')
  .description('列出合同')
  .option('--status <status>', '按状态过滤')
  .action((options) => {
    const contracts = listContracts(options);
    console.log(chalk.blue(`共 ${contracts.length} 份合同:`));
    contracts.forEach(c => {
      console.log(`  ${chalk.cyan(c.id)} - ${c.contractName} - ${chalk.yellow(c.status)} - ¥${c.totalAmount.toLocaleString()}`);
    });
    process.exit(0);
  });

contractCmd
  .command('freeze <contractId>')
  .description('冻结合同')
  .action((contractId) => {
    const result = freezeContract(contractId, program.opts().user);
    if (result.success) {
      console.log(chalk.green(`合同已冻结: ${contractId}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`冻结失败: ${result.error}`));
      process.exit(1);
    }
  });

const nodeCmd = program.command('node').description('付款节点管理');

nodeCmd
  .command('create')
  .description('创建付款节点')
  .requiredOption('--contract <contractId>', '合同ID')
  .requiredOption('--name <name>', '节点名称')
  .requiredOption('--amount <amount>', '金额')
  .requiredOption('--due <date>', '到期日 (YYYY-MM-DD)')
  .option('--idempotency-key <key>', '幂等键', () => `node-${Date.now()}`)
  .action((options) => {
    const data = {
      idempotencyKey: options.idempotencyKey,
      contractId: options.contract,
      nodeName: options.name,
      dueAmount: options.amount,
      dueDate: options.due
    };
    
    const result = createPaymentNode(data, program.opts().user);
    if (result.success) {
      console.log(chalk.green(`付款节点创建成功: ${result.data.id}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`创建失败: ${result.error}`));
      process.exit(1);
    }
  });

nodeCmd
  .command('list')
  .description('列出付款节点')
  .option('--contract <contractId>', '按合同过滤')
  .action((options) => {
    const nodes = listPaymentNodes(options);
    console.log(chalk.blue(`共 ${nodes.length} 个付款节点:`));
    nodes.forEach(n => {
      console.log(`  ${chalk.cyan(n.id)} - ${n.nodeName} - ${chalk.yellow(n.status)} - ¥${n.dueAmount.toLocaleString()} - ${n.dueDate}`);
    });
    process.exit(0);
  });

nodeCmd
  .command('status <nodeId> <status>')
  .description('更新节点状态')
  .action((nodeId, status) => {
    const result = updateNodeStatus(nodeId, status, program.opts().user);
    if (result.success) {
      console.log(chalk.green(`状态已更新: ${status}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`更新失败: ${result.error}`));
      process.exit(1);
    }
  });

const emailCmd = program.command('email').description('验收邮件管理');

emailCmd
  .command('create')
  .description('创建验收邮件')
  .requiredOption('--contract <contractId>', '合同ID')
  .requiredOption('--node <nodeId>', '付款节点ID')
  .requiredOption('--subject <subject>', '邮件主题')
  .requiredOption('--from <from>', '发件人')
  .requiredOption('--date <date>', '邮件日期')
  .option('--idempotency-key <key>', '幂等键', () => `email-${Date.now()}`)
  .action((options) => {
    const data = {
      idempotencyKey: options.idempotencyKey,
      contractId: options.contract,
      paymentNodeId: options.node,
      emailSubject: options.subject,
      emailFrom: options.from,
      emailDate: options.date
    };
    
    const result = createAcceptanceEmail(data, program.opts().user);
    if (result.success) {
      console.log(chalk.green(`验收邮件创建成功: ${result.data.id}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`创建失败: ${result.error}`));
      process.exit(1);
    }
  });

emailCmd
  .command('review <emailId> <result>')
  .description('复核验收邮件 (pass/reject)')
  .option('--notes <notes>', '复核意见')
  .action((emailId, result, options) => {
    const reviewResult = reviewAcceptanceEmail(emailId, result, options.notes || '', program.opts().user);
    if (reviewResult.success) {
      console.log(chalk.green(`复核完成: ${result}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`复核失败: ${reviewResult.error}`));
      process.exit(1);
    }
  });

const confirmCmd = program.command('confirm').description('二次确认单管理');

confirmCmd
  .command('create')
  .description('创建二次确认单')
  .requiredOption('--contract <contractId>', '合同ID')
  .requiredOption('--node <nodeId>', '付款节点ID')
  .requiredOption('--type <type>', '类型: secondary/supplement/adjustment')
  .requiredOption('--party <party>', '确认方')
  .option('--idempotency-key <key>', '幂等键', () => `confirm-${Date.now()}`)
  .action((options) => {
    const data = {
      idempotencyKey: options.idempotencyKey,
      contractId: options.contract,
      paymentNodeId: options.node,
      confirmationType: options.type,
      confirmingParty: options.party
    };
    
    const result = createConfirmation(data, program.opts().user);
    if (result.success) {
      console.log(chalk.green(`确认单创建成功: ${result.data.id}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`创建失败: ${result.error}`));
      process.exit(1);
    }
  });

confirmCmd
  .command('approve <confirmationId>')
  .description('审批确认单')
  .option('--notes <notes>', '审批意见')
  .action((confirmationId, options) => {
    const result = approveConfirmation(confirmationId, options.notes || '', program.opts().user);
    if (result.success) {
      console.log(chalk.green('审批通过'));
      process.exit(0);
    } else {
      console.log(chalk.red(`审批失败: ${result.error}`));
      process.exit(1);
    }
  });

const reportCmd = program.command('report').description('报表与导出');

reportCmd
  .command('reconciliation')
  .description('生成对账报表')
  .action(() => {
    const result = exportReconciliationReport();
    console.log(chalk.green(`对账报表已生成: ${result.filePath}`));
    console.log(chalk.blue(`合同总数: ${result.summary.totalContracts}`));
    console.log(chalk.blue(`总金额: ¥${result.summary.totalAmount.toLocaleString()}`));
    console.log(chalk.blue(`已确认金额: ¥${result.summary.totalCompletedAmount.toLocaleString()}`));
    process.exit(0);
  });

reportCmd
  .command('playback <contractId>')
  .description('导出合同完整回放数据')
  .action((contractId) => {
    const result = exportFullPlayback(contractId);
    if (result.success) {
      console.log(chalk.green(`回放数据已导出: ${result.filePath}`));
      process.exit(0);
    } else {
      console.log(chalk.red(`导出失败: ${result.error}`));
      process.exit(1);
    }
  });

reportCmd
  .command('failed')
  .description('查看失败记录')
  .action(() => {
    const records = listFailedRecords();
    console.log(chalk.blue(`共 ${records.length} 条失败记录:`));
    records.forEach(r => {
      console.log(`  ${chalk.red(r.id)} - ${r.entityType} - ${r.errorCode}`);
      console.log(`    ${r.error}`);
    });
    process.exit(0);
  });

program
  .command('reset')
  .description('重置数据库 (危险操作!)')
  .option('--force', '确认重置')
  .action((options) => {
    if (!options.force) {
      console.log(chalk.yellow('警告: 此操作将删除所有数据! 使用 --force 确认'));
      process.exit(1);
    }
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    resetCache();
    getDB();
    console.log(chalk.green('数据库已重置'));
    process.exit(0);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('错误:'), err.message);
  process.exit(1);
});
