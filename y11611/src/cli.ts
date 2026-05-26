import { Command } from 'commander';
import { DataStore } from './models/store';
import { AddressMerger } from './services/AddressMerger';
import { PriceService } from './services/PriceService';
import { TransactionClassifier } from './services/TransactionClassifier';
import { TaxCalculator } from './services/TaxCalculator';
import { ReportExporter } from './services/ReportExporter';
import { MockDataGenerator } from './services/MockDataGenerator';

const program = new Command();
const store = DataStore.getInstance();

program
  .name('crypto-tax-ledger')
  .description('加密钱包税务流水服务 - Web3社群会计工具')
  .version('1.0.0');

program
  .command('seed')
  .description('生成演示数据（包含收入、支出、内部转账、跨链桥、gas费等场景）')
  .action(async () => {
    console.log('=== 正在生成演示数据 ===');
    const generator = new MockDataGenerator();
    const result = generator.generateDemoData();
    console.log(`✅ 生成成功！`);
    console.log(`   Owner ID: ${result.ownerId}`);
    console.log(`   地址数: ${result.addresses.length}`);
    console.log(`   交易数: ${result.transactions}`);
    console.log(`   价格快照: ${result.prices}`);
    console.log('');
    console.log('💡 接下来运行: npm run process 来处理数据');
  });

program
  .command('process')
  .description('处理交易数据：地址归并、内部转账识别、跨链检测、税务计算')
  .option('-o, --owner <id>', '指定用户ID', 'first')
  .action(async (options) => {
    console.log('=== 开始处理交易数据 ===');
    
    let ownerId = options.owner;
    if (ownerId === 'first') {
      const owners = store.getAllOwners();
      if (owners.length === 0) {
        console.log('❌ 没有找到用户数据，请先运行: npm run seed');
        return;
      }
      ownerId = owners[0].id;
      console.log(`使用用户: ${owners[0].name} (${ownerId})`);
    }
    
    const merger = new AddressMerger();
    const classifier = new TransactionClassifier();
    const priceService = new PriceService();
    const taxCalculator = new TaxCalculator();

    console.log('\n[1/5] 检测内部转账...');
    const internalResult = classifier.detectInternalTransfers(ownerId);
    console.log(`   发现内部转账: ${internalResult.internalTransfers.length} 笔`);
    console.log(`   新标记: ${internalResult.marked} 笔`);

    console.log('\n[2/5] 检测跨链桥交易...');
    const bridgeResult = classifier.detectBridgeTransactions();
    console.log(`   发现跨链交易: ${bridgeResult.bridges.length} 笔`);
    console.log(`   潜在重复记账: ${bridgeResult.duplicates.length} 笔 ⚠️`);

    console.log('\n[3/5] 补全币价数据...');
    const priceResult = priceService.fillMissingPricesForTransactions();
    console.log(`   补全价格: ${priceResult.filled} 笔`);
    console.log(`   仍缺失: ${priceResult.stillMissing} 笔`);

    console.log('\n[4/5] 分类收入/支出...');
    const classifyResult = classifier.classifyIncomeExpense(ownerId);
    console.log(`   收入: ${classifyResult.income.length} 笔`);
    console.log(`   支出: ${classifyResult.expense.length} 笔`);
    console.log(`   内部转账: ${classifyResult.internal.length} 笔`);
    console.log(`   需要人工审核: ${classifyResult.needsReview.length} 笔 ⚠️`);

    console.log('\n[5/5] 计算税务记录...');
    const taxResult = taxCalculator.calculateTaxRecords(ownerId);
    console.log(`   生成税务记录: ${taxResult.records.length} 条`);
    console.log(`   总收入: $${taxResult.summary.totalIncomeUsd.toFixed(2)}`);
    console.log(`   资本利得: $${taxResult.summary.totalCapitalGainsUsd.toFixed(2)}`);
    console.log(`   资本损失: $${taxResult.summary.totalCapitalLossesUsd.toFixed(2)}`);
    console.log(`   Gas费用: $${taxResult.summary.totalGasFeesUsd.toFixed(2)}`);

    store.saveAll();
    
    console.log('\n=== 处理完成 ===');
    console.log('💡 运行 npm run report 查看完整报告');
    console.log('💡 运行 npm run export 导出CSV报表');
  });

program
  .command('report')
  .description('显示数据处理报告和异常提示')
  .option('-o, --owner <id>', '指定用户ID', 'first')
  .action(async (options) => {
    console.log('=== 税务流水报告 ===\n');
    
    let ownerId = options.owner;
    if (ownerId === 'first') {
      const owners = store.getAllOwners();
      if (owners.length === 0) {
        console.log('❌ 没有找到用户数据，请先运行: npm run seed');
        return;
      }
      ownerId = owners[0].id;
    }

    const exporter = new ReportExporter();
    const report = exporter.generateSummaryReport(ownerId);

    console.log('📊 数据概览:');
    console.log(`   总交易数: ${report.overview.totalTransactions}`);
    console.log(`   内部转账: ${report.overview.internalTransfers} (已排除在计税外)`);
    console.log(`   跨链交易: ${report.overview.bridgeTransactions}`);
    console.log(`   带警告交易: ${report.overview.transactionsWithWarnings}`);

    console.log('\n💰 税务摘要:');
    for (const [category, amount] of Object.entries(report.taxSummary.byCategory)) {
      console.log(`   ${category}: $${amount.toFixed(2)}`);
    }
    console.log(`   计税总额: $${report.taxSummary.totalTaxableUsd.toFixed(2)}`);

    if (report.issues.length > 0) {
      console.log('\n⚠️  需要处理的问题:');
      for (const issue of report.issues) {
        const severityEmoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${severityEmoji} [${issue.type}] ${issue.message}`);
        console.log(`      涉及交易ID: ${issue.transactionIds.slice(0, 3).join(', ')}${issue.transactionIds.length > 3 ? '...' : ''}`);
      }
    } else {
      console.log('\n✅ 数据干净，没有需要处理的问题！');
    }

    console.log('\n📋 审计追踪:');
    const auditLogs = store.getAuditLogs();
    console.log(`   总操作记录: ${auditLogs.length}`);
    console.log(`   最近5条操作:`);
    auditLogs.slice(0, 5).forEach(log => {
      console.log(`     - ${log.timestamp.toLocaleString()}: ${log.action} ${log.entityType} (${log.reason})`);
    });
  });

program
  .command('check')
  .description('运行所有完整性检查，列出所有异常')
  .option('-o, --owner <id>', '指定用户ID', 'first')
  .action(async (options) => {
    console.log('=== 完整性检查 ===\n');
    
    let ownerId = options.owner;
    if (ownerId === 'first') {
      const owners = store.getAllOwners();
      if (owners.length === 0) {
        console.log('❌ 没有找到用户数据');
        return;
      }
      ownerId = owners[0].id;
    }

    const classifier = new TransactionClassifier();
    const checks = classifier.runAllChecks(ownerId);

    console.log('内部转账检测:', checks.internalTransfers);
    console.log('跨链交易:', checks.bridgeTransactions);
    console.log('跨链重复:', checks.bridgeDuplicates);
    console.log('未知地址:', checks.addressesToReview);
    console.log('待审核交易:', checks.transactionsToReview);

    const transactions = store.getTransactionsByOwner(ownerId);
    const withWarnings = transactions.filter(t => t.warnings.length > 0);
    
    if (withWarnings.length > 0) {
      console.log('\n📋 带警告的交易明细:');
      for (const tx of withWarnings.slice(0, 10)) {
        console.log(`   ${tx.txHash.substring(0, 20)}...`);
        console.log(`     类型: ${tx.type}, 金额: ${tx.amount} ${tx.tokenSymbol}`);
        console.log(`     警告: ${tx.warnings.join(', ')}`);
      }
      if (withWarnings.length > 10) {
        console.log(`   ... 还有 ${withWarnings.length - 10} 笔`);
      }
    }
  });

program
  .command('list')
  .description('列出数据：owners, addresses, transactions, warnings')
  .argument('[type]', '数据类型: owners|addresses|transactions|warnings|audit', 'owners')
  .action(async (type) => {
    switch (type) {
      case 'owners':
        console.log('=== 用户列表 ===');
        store.getAllOwners().forEach(owner => {
          const addresses = store.getAddressesByOwner(owner.id);
          console.log(`ID: ${owner.id}`);
          console.log(`  名称: ${owner.name}`);
          console.log(`  地址数: ${addresses.length}`);
          console.log('');
        });
        break;

      case 'addresses':
        console.log('=== 地址列表 ===');
        store.getAllAddresses().forEach(addr => {
          const owner = store.getOwner(addr.ownerId || '');
          console.log(`${addr.address.substring(0, 20)}...`);
          console.log(`  链: ${addr.chain}, 标签: ${addr.label}`);
          console.log(`  所属: ${owner?.name || '未分配'}`);
          console.log('');
        });
        break;

      case 'transactions':
        console.log('=== 交易列表 (最近10笔) ===');
        store.getAllTransactions()
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10)
          .forEach(tx => {
            console.log(`${tx.txHash.substring(0, 20)}...`);
            console.log(`  日期: ${new Date(tx.timestamp).toLocaleDateString()}`);
            console.log(`  类型: ${tx.type}, ${tx.amount} ${tx.tokenSymbol}`);
            console.log(`  内部: ${tx.isInternal}, 跨链: ${tx.isBridge}`);
            if (tx.warnings.length > 0) {
              console.log(`  ⚠️  警告: ${tx.warnings.join(', ')}`);
            }
            console.log('');
          });
        break;

      case 'warnings':
        console.log('=== 警告列表 ===');
        const warnings = store.getAllTransactions().filter(t => t.warnings.length > 0);
        warnings.forEach(tx => {
          console.log(`${tx.txHash.substring(0, 20)}...`);
          console.log(`  类型: ${tx.type}`);
          console.log(`  警告: ${tx.warnings.join(', ')}`);
          console.log('');
        });
        break;

      case 'audit':
        console.log('=== 审计日志 (最近20条) ===');
        store.getAuditLogs().slice(0, 20).forEach(log => {
          console.log(`${log.timestamp.toLocaleString()}`);
          console.log(`  ${log.action} ${log.entityType}`);
          console.log(`  原因: ${log.reason}, 操作人: ${log.operator}`);
          if (log.field) {
            console.log(`  ${log.field}: ${log.oldValue} → ${log.newValue}`);
          }
          console.log('');
        });
        break;

      default:
        console.log(`未知类型: ${type}`);
        console.log('可用类型: owners, addresses, transactions, warnings, audit');
    }
  });

program
  .command('export')
  .description('导出报表')
  .option('-o, --owner <id>', '指定用户ID', 'first')
  .option('-f, --format <format>', '导出格式: csv|json|all', 'all')
  .action(async (options) => {
    console.log('=== 导出报表 ===\n');
    
    let ownerId = options.owner;
    if (ownerId === 'first') {
      const owners = store.getAllOwners();
      if (owners.length === 0) {
        console.log('❌ 没有找到用户数据');
        return;
      }
      ownerId = owners[0].id;
    }

    const exporter = new ReportExporter();

    if (options.format === 'csv' || options.format === 'all') {
      const txPath = await exporter.exportTransactionsToCsv(ownerId);
      console.log(`✅ 交易流水CSV: ${txPath}`);
      
      const taxPath = await exporter.exportTaxRecordsToCsv(ownerId);
      console.log(`✅ 税务记录CSV: ${taxPath}`);
    }

    if (options.format === 'json' || options.format === 'all') {
      const jsonPath = exporter.exportToJson(ownerId);
      console.log(`✅ 完整数据JSON: ${jsonPath}`);
      
      const auditPath = exporter.exportAuditLog();
      console.log(`✅ 审计日志JSON: ${auditPath}`);
    }

    console.log('\n💡 所有文件已导出到 data/exports/ 目录');
  });

program
  .command('merge')
  .description('归并地址到同一用户')
  .argument('<addressIds...>', '要归并的地址ID列表')
  .option('-n, --name <name>', '新用户名称')
  .action(async (addressIds, options) => {
    console.log('=== 地址归并 ===\n');
    
    const merger = new AddressMerger();
    let targetOwnerId: string | undefined;

    if (options.name) {
      const owner = merger.getOrCreateOwner(options.name);
      targetOwnerId = owner.id;
      console.log(`使用用户: ${owner.name}`);
    }

    const result = merger.mergeAddresses(addressIds, targetOwnerId, 'cli_manual_merge');
    store.saveAll();

    console.log(`✅ 归并成功！`);
    console.log(`   用户: ${result.name}`);
    console.log(`   地址数: ${result.addresses.length}`);
  });

program
  .command('prices')
  .description('币价相关操作')
  .argument('<action>', '操作: fill|missing|list')
  .action(async (action) => {
    const priceService = new PriceService();

    switch (action) {
      case 'fill':
        console.log('补全币价数据...');
        const result = priceService.fillMissingPricesForTransactions();
        store.saveAll();
        console.log(`✅ 补全: ${result.filled}, 仍缺失: ${result.stillMissing}`);
        break;

      case 'missing':
        console.log('查询缺失币价的日期...');
        const missing = priceService.getMissingPriceDates(store.getAllTransactions());
        if (missing.length === 0) {
          console.log('✅ 没有缺失的币价数据');
        } else {
          missing.slice(0, 10).forEach(m => {
            console.log(`   ${m.symbol} @ ${new Date(m.timestamp).toLocaleDateString()}: ${m.count} 笔交易`);
          });
        }
        break;

      case 'list':
        console.log('币价快照列表 (最近10条)');
        store.getAllPrices()
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10)
          .forEach(p => {
            console.log(`   ${p.symbol}: $${p.priceUsd.toFixed(2)} @ ${new Date(p.timestamp).toLocaleDateString()} (${p.source})`);
          });
        break;

      default:
        console.log(`未知操作: ${action}`);
        console.log('可用操作: fill, missing, list');
    }
  });

program
  .command('clear')
  .description('清除所有数据')
  .option('-y, --yes', '确认清除')
  .action(async (options) => {
    if (!options.yes) {
      console.log('⚠️  此操作将清除所有数据！');
      console.log('   如需确认，请运行: npm run clear -- --yes');
      return;
    }
    store.clearAll();
    console.log('✅ 所有数据已清除');
  });

program.parseAsync(process.argv);
