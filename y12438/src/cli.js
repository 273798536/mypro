#!/usr/bin/env node
const { Command } = require('commander');
const Table = require('cli-table3');
const chalk = require('chalk');
const { initDatabase, closeDatabase } = require('./database/db');
const ContractService = require('./services/contract-service');
const RefundService = require('./services/refund-service');
const { ConflictService } = require('./services/conflict-service');
const TransactionService = require('./services/transaction-service');
const PowerService = require('./services/power-service');

const program = new Command();

program
  .name('deposit-refund')
  .description('音乐节摊位押金清退系统 CLI')
  .version('1.0.0');

program
  .command('list')
  .description('列出所有清退记录')
  .option('-s, --status <status>', '按状态筛选 (pending/pending_conflict/completed)')
  .action(async (options) => {
    initDatabase();
    const refunds = RefundService.getAllRefunds(options.status);

    const table = new Table({
      head: [
        chalk.cyan('清退单号'),
        chalk.cyan('合同号'),
        chalk.cyan('商户'),
        chalk.cyan('摊位'),
        chalk.cyan('应收押金'),
        chalk.cyan('加电费用'),
        chalk.cyan('扣罚'),
        chalk.cyan('应退金额'),
        chalk.cyan('状态'),
        chalk.cyan('冲突')
      ],
      colWidths: [20, 14, 12, 8, 12, 12, 10, 12, 14, 8]
    });

    refunds.forEach(r => {
      const statusColor = r.refund_status === 'completed' ? chalk.green :
                         r.refund_status === 'pending_conflict' ? chalk.red : chalk.yellow;
      const conflictIcon = r.has_conflicts ? chalk.red('⚠') : chalk.green('✓');

      table.push([
        r.refund_no,
        r.contract_no,
        r.merchant_name,
        r.booth_id,
        `¥${r.total_deposit_received.toFixed(2)}`,
        `¥${r.total_power_charge.toFixed(2)}`,
        `¥${r.total_deductions.toFixed(2)}`,
        chalk.bold(`¥${r.refund_amount.toFixed(2)}`),
        statusColor(r.refund_status),
        conflictIcon
      ]);
    });

    console.log('\n' + chalk.bold.underline('📋 音乐节摊位押金清退一览') + '\n');
    console.log(table.toString());
    console.log(`\n共 ${refunds.length} 条记录\n`);
    closeDatabase();
  });

program
  .command('calc <contractNo>')
  .description('计算指定合同的押金清退')
  .option('-o, --operator <name>', '操作员名称', 'system')
  .action((contractNo, options) => {
    initDatabase();
    console.log('\n' + chalk.bold.underline('🧮 押金清退计算') + '\n');

    try {
      const result = RefundService.createRefundRecord(contractNo, options.operator);

      console.log(chalk.cyan(`合同号: ${result.contract_no}`));
      console.log(chalk.cyan(`商户: ${result.merchant_name} (${result.booth_id})`));
      console.log(chalk.cyan(`清退单号: ${result.refund_no}`));
      console.log();

      const detailTable = new Table({
        head: [chalk.cyan('项目'), chalk.cyan('金额'), chalk.cyan('说明')],
        colWidths: [20, 15, 50]
      });

      detailTable.push(
        ['合同约定押金', `¥${result.details.contract.deposit_amount.toFixed(2)}`, ''],
        ['实际收取押金', `¥${result.total_deposit_received.toFixed(2)}`, `${result.details.deposit_info.transaction_count}笔交易`],
        ['加电费用抵扣', `¥${result.total_power_charge.toFixed(2)}`, `${result.details.power_info.request_count}次加电`],
        ['扣罚金额', `¥${result.total_deductions.toFixed(2)}`, `${result.details.deductions.length}项扣罚`],
        [chalk.bold('应退金额'), chalk.bold.green(`¥${result.refund_amount.toFixed(2)}`), '']
      );

      console.log(detailTable.toString());
      console.log();

      if (result.has_conflicts) {
        console.log(chalk.red.bold('⚠  存在待处理冲突:'));
        result.details.conflicts.forEach((c, i) => {
          console.log(`  ${i + 1}. ${chalk.yellow(c.description)}`);
        });
        console.log();
      }

      console.log(chalk.gray(`证据摘要: ${result.evidence_summary}`));
      console.log();

    } catch (error) {
      console.log(chalk.red(`❌ 错误: ${error.message}`));
    }

    closeDatabase();
  });

program
  .command('trace <refundNo>')
  .description('追溯清退记录的完整证据链')
  .action((refundNo) => {
    initDatabase();
    console.log('\n' + chalk.bold.underline('🔍 清退记录证据追踪') + '\n');

    const fullData = RefundService.getRefundWithEvidence(refundNo);
    if (!fullData) {
      console.log(chalk.red('❌ 清退记录不存在'));
      closeDatabase();
      return;
    }

    const { refund, evidence_chain, deductions, corrections, conflicts, history } = fullData;

    console.log(chalk.cyan.bold(`清退单号: ${refund.refund_no}`));
    console.log(chalk.cyan(`合同: ${refund.contract_no} - ${refund.merchant_name} (${refund.booth_id})`));
    console.log(chalk.cyan(`应退金额: ¥${refund.refund_amount.toFixed(2)}`));
    console.log();

    console.log(chalk.bold.underline('📍 追溯路径:'));
    console.log(chalk.gray('  清退记录 → 押金账本 → 扣罚试算 → 证据追踪 → 历史记录'));
    console.log();

    console.log(chalk.bold('📄 原始材料 - 证据链'));
    const evidenceTable = new Table({
      head: [chalk.cyan('#'), chalk.cyan('证据类型'), chalk.cyan('来源'), chalk.cyan('数值'), chalk.cyan('照片')],
      colWidths: [5, 20, 40, 12, 30]
    });

    evidence_chain.forEach((e, i) => {
      evidenceTable.push([
        i + 1,
        e.evidence_type,
        e.source_description || e.source_table,
        `¥${e.evidence_value}`,
        e.photo_url ? chalk.blue(e.photo_url) : chalk.gray('无')
      ]);
    });
    console.log(evidenceTable.toString());
    console.log();

    if (deductions.length > 0) {
      console.log(chalk.bold('⚖️  扣罚试算'));
      const dedTable = new Table({
        head: [chalk.cyan('扣罚类型'), chalk.cyan('金额'), chalk.cyan('原因'), chalk.cyan('状态'), chalk.cyan('争议')],
        colWidths: [15, 10, 30, 12, 30]
      });

      deductions.forEach(d => {
        dedTable.push([
          d.deduction_type,
          `¥${d.amount.toFixed(2)}`,
          d.reason,
          d.trial_status === 'approved' ? chalk.green('已批准') :
          d.trial_status === 'contested' ? chalk.red('有争议') : chalk.yellow('待审核'),
          d.is_contested ? chalk.red(d.contest_remark) : chalk.gray('无')
        ]);
      });
      console.log(dedTable.toString());
      console.log();
    }

    if (corrections.length > 0) {
      console.log(chalk.bold('✏️  人工修正记录'));
      const corrTable = new Table({
        head: [chalk.cyan('修正类型'), chalk.cyan('原值'), chalk.cyan('修正值'), chalk.cyan('原因'), chalk.cyan('操作人')],
        colWidths: [12, 12, 12, 35, 12]
      });

      corrections.forEach(c => {
        corrTable.push([
          c.correction_type,
          `¥${c.original_value.toFixed(2)}`,
          `¥${c.corrected_value.toFixed(2)}`,
          c.reason,
          c.operator
        ]);
      });
      console.log(corrTable.toString());
      console.log();
    }

    if (conflicts.length > 0) {
      console.log(chalk.bold('⚠  冲突留痕'));
      const cfTable = new Table({
        head: [chalk.cyan('冲突类型'), chalk.cyan('描述'), chalk.cyan('状态'), chalk.cyan('解决方案')],
        colWidths: [20, 35, 10, 30]
      });

      conflicts.forEach(c => {
        cfTable.push([
          c.conflict_type,
          c.description,
          c.status === 'resolved' ? chalk.green('已解决') : chalk.red('待处理'),
          c.resolution || chalk.gray('待处理')
        ]);
      });
      console.log(cfTable.toString());
      console.log();
    }

    console.log(chalk.bold('📜 历史记录'));
    const histTable = new Table({
      head: [chalk.cyan('时间'), chalk.cyan('类型'), chalk.cyan('操作人'), chalk.cyan('处理结果')],
      colWidths: [25, 20, 12, 45]
    });

    history.forEach(h => {
      let result = '';
      try {
        const parsed = JSON.parse(h.processed_result);
        result = `应退¥${parsed.refund_amount.toFixed(2)}, 扣罚¥${parsed.total_deductions.toFixed(2)}`;
      } catch {
        result = h.processed_result;
      }
      histTable.push([
        h.operation_time,
        h.record_type,
        h.operator,
        result
      ]);
    });
    console.log(histTable.toString());
    console.log();

    console.log(chalk.green.bold('✅ 追溯完成: 所有证据均可从清退结论回溯至原始材料'));
    console.log();

    closeDatabase();
  });

program
  .command('conflicts')
  .description('查看所有未解决的冲突')
  .action(() => {
    initDatabase();
    console.log('\n' + chalk.bold.underline('⚠️  待处理冲突列表') + '\n');

    const conflicts = ConflictService.getUnresolvedConflicts();

    if (conflicts.length === 0) {
      console.log(chalk.green('✅ 没有待处理的冲突'));
      closeDatabase();
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('冲突单号'),
        chalk.cyan('商户'),
        chalk.cyan('摊位'),
        chalk.cyan('冲突类型'),
        chalk.cyan('描述'),
        chalk.cyan('合同值'),
        chalk.cyan('流水值'),
        chalk.cyan('加电值')
      ],
      colWidths: [20, 12, 8, 20, 30, 12, 12, 12]
    });

    conflicts.forEach(c => {
      table.push([
        c.conflict_no,
        c.merchant_name,
        c.booth_id,
        chalk.red(c.conflict_type),
        c.description,
        c.contract_value || '-',
        c.transaction_value || '-',
        c.power_value || '-'
      ]);
    });

    console.log(table.toString());
    console.log(`\n共 ${conflicts.length} 个待处理冲突\n`);
    closeDatabase();
  });

program
  .command('contract <contractNo>')
  .description('查看合同完整数据')
  .action((contractNo) => {
    initDatabase();
    console.log('\n' + chalk.bold.underline('📑 合同完整数据') + '\n');

    const fullData = ContractService.getContractFullData(contractNo);
    if (!fullData) {
      console.log(chalk.red('❌ 合同不存在'));
      closeDatabase();
      return;
    }

    console.log(chalk.bold('基本信息:'));
    console.log(`  合同号: ${fullData.contract.contract_no}`);
    console.log(`  商户: ${fullData.contract.merchant_name}`);
    console.log(`  摊位: ${fullData.contract.booth_id}`);
    console.log(`  约定押金: ¥${fullData.contract.deposit_amount.toFixed(2)}`);
    console.log(`  包含电力: ${fullData.contract.power_included_kw}KW`);
    console.log();

    console.log(chalk.bold('💰 押金账本:'));
    const txTable = new Table({
      head: [chalk.cyan('流水号'), chalk.cyan('类型'), chalk.cyan('金额'), chalk.cyan('日期'), chalk.cyan('凭证')],
      colWidths: [20, 10, 12, 15, 35]
    });
    fullData.transactions.forEach(tx => {
      txTable.push([
        tx.transaction_no,
        tx.transaction_type,
        `¥${tx.amount.toFixed(2)}`,
        tx.transaction_date,
        tx.photo_url || chalk.gray('无凭证')
      ]);
    });
    console.log(txTable.toString());
    console.log();

    if (fullData.powerRequests.length > 0) {
      console.log(chalk.bold('⚡ 加电申请:'));
      const pwTable = new Table({
        head: [chalk.cyan('申请号'), chalk.cyan('功率'), chalk.cyan('天数'), chalk.cyan('金额'), chalk.cyan('现场照片')],
        colWidths: [20, 10, 8, 12, 35]
      });
      fullData.powerRequests.forEach(pr => {
        pwTable.push([
          pr.request_no,
          `${pr.request_kw}KW`,
          `${pr.usage_days}天`,
          `¥${pr.total_amount.toFixed(2)}`,
          pr.on_site_photo_url ? chalk.blue(pr.on_site_photo_url) : chalk.red('缺失')
        ]);
      });
      console.log(pwTable.toString());
      console.log();
    }

    closeDatabase();
  });

program
  .command('resolve <conflictNo> <resolution>')
  .description('解决冲突')
  .option('-b, --by <name>', '解决人', 'admin')
  .action((conflictNo, resolution, options) => {
    initDatabase();
    try {
      ConflictService.resolveConflict(conflictNo, resolution, options.by);
      console.log(chalk.green(`✅ 冲突 ${conflictNo} 已解决: ${resolution}`));
    } catch (error) {
      console.log(chalk.red(`❌ 错误: ${error.message}`));
    }
    closeDatabase();
  });

program
  .command('correct <refundNo> <type> <original> <corrected> <reason>')
  .description('人工修正清退金额')
  .option('-o, --operator <name>', '操作人', 'admin')
  .option('-a, --approved-by <name>', '审批人', 'supervisor')
  .action((refundNo, type, original, corrected, reason, options) => {
    initDatabase();
    try {
      const result = RefundService.addManualCorrection(
        refundNo, type, parseFloat(original), parseFloat(corrected),
        reason, options.operator, options.approvedBy
      );
      console.log(chalk.green(`✅ 人工修正已记录: ${result.correction_no}`));
      console.log(chalk.gray(`  原值: ¥${original} → 修正值: ¥${corrected}`));
    } catch (error) {
      console.log(chalk.red(`❌ 错误: ${error.message}`));
    }
    closeDatabase();
  });

program.parse(process.argv);
