#!/usr/bin/env node

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const DataAlignmentEngine = require('./alignment-engine');
const VestingTaxEngine = require('./vesting-tax-engine');
const TaxReportGenerator = require('./report-generator');

function loadCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件不存在 - ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件不存在 - ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function ensureOutputDir(outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

yargs(hideBin(process.argv))
  .command({
    command: 'process',
    describe: '处理Web3空投税务台账',
    builder: (y) => y
      .option('wallet', {
        alias: 'w',
        describe: '钱包流水CSV文件路径',
        type: 'string',
        demandOption: true,
        nargs: 1
      })
      .option('announcements', {
        alias: 'a',
        describe: '空投公告JSON文件路径',
        type: 'string',
        demandOption: true,
        nargs: 1
      })
      .option('prices', {
        alias: 'p',
        describe: '币价快照CSV文件路径',
        type: 'string',
        demandOption: true,
        nargs: 1
      })
      .option('wallets', {
        describe: '钱包地址列表(逗号分隔)',
        type: 'string',
        default: ''
      })
      .option('output', {
        alias: 'o',
        describe: '输出报告文件路径 (.html 或 .json)',
        type: 'string',
        default: './output/tax-report.html'
      })
      .option('strict', {
        describe: '严格模式: 币价缺口时不使用估算值',
        type: 'boolean',
        default: false
      })
      .option('price-gap-days', {
        describe: '币价插值最大允许缺口天数',
        type: 'number',
        default: 7
      })
      .option('time-window', {
        describe: '交易与公告匹配时间窗口(分钟)',
        type: 'number',
        default: 1440
      })
      .option('long-term-days', {
        describe: '长期持有判定天数',
        type: 'number',
        default: 365
      })
      .example([
        ['$0 process --wallet data/wallet.csv --announcements data/announcements.json --prices data/prices.csv', '基本处理流程'],
        ['$0 process -w data/wallet.csv -a data/ann.json -p data/prices.csv --strict --output report.html', '严格模式输出HTML报告'],
        ['$0 process -w data/wallet.csv -a data/ann.json -p data/prices.csv --wallets 0x123,0x456', '指定钱包地址']
      ]),
    handler: async (argv) => {
      console.log('📊 Web3空投税务台账处理中...\n');
      
      try {
        console.log('1/5 加载数据文件...');
        const transactions = loadCSV(argv.wallet);
        const announcements = loadJSON(argv.announcements);
        const prices = loadCSV(argv.prices);
        
        let walletAddresses = argv.wallets ? argv.wallets.split(',').map(a => a.trim()) : [];
        if (walletAddresses.length === 0) {
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
          const fromAddrs = [...new Set(transactions.map(t => (t.from || '').toLowerCase()).filter(a => a && a !== ZERO_ADDRESS))];
          const toAddrs = [...new Set(transactions.map(t => (t.to || '').toLowerCase()).filter(a => a && a !== ZERO_ADDRESS))];
          const allAddrs = [...new Set([...fromAddrs, ...toAddrs])];
          walletAddresses = allAddrs.filter(addr => {
            const asFrom = transactions.filter(t => (t.from || '').toLowerCase() === addr).length;
            const asTo = transactions.filter(t => (t.to || '').toLowerCase() === addr).length;
            return asFrom > 0 && asTo > 0;
          });
          if (walletAddresses.length === 0) {
            walletAddresses = allAddrs.slice(0, 2);
          }
          console.log(`   自动识别钱包地址: ${walletAddresses.length} 个`);
        }
        
        console.log('2/5 数据对齐引擎初始化...');
        const alignmentEngine = new DataAlignmentEngine({
          maxTimeWindowMinutes: argv.timeWindow,
          priceInterpolationMaxGapDays: argv.priceGapDays,
          strictMode: argv.strict
        });
        
        alignmentEngine
          .loadWalletTransactions(transactions, walletAddresses)
          .loadAirdropAnnouncements(announcements)
          .loadPriceSnapshots(prices);
        
        console.log('3/5 执行数据对齐...');
        const alignedData = alignmentEngine.alignAll();
        console.log(`   匹配空投交易: ${alignedData.airdropTransactions.filter(t => t.alignmentStatus === 'matched').length} 笔`);
        console.log(`   识别内部转账: ${alignedData.internalTransfers.length} 笔`);
        
        console.log('4/5 税务试算与锁仓追踪...');
        const taxEngine = new VestingTaxEngine(alignmentEngine, {
          longTermHoldingDays: argv.longTermDays
        });
        
        const result = taxEngine.processAll();
        console.log(`   生成税务记录: ${result.taxRecords.length} 条`);
        console.log(`   追踪锁仓事件: ${result.vestingEvents.length} 件`);
        
        console.log('5/5 生成税务报告...');
        ensureOutputDir(argv.output);
        
        const reportGenerator = new TaxReportGenerator();
        let reportContent;
        
        if (argv.output.endsWith('.json')) {
          reportContent = reportGenerator.generateJSON(result, alignedData);
          fs.writeFileSync(argv.output, JSON.stringify(reportContent, null, 2));
        } else {
          reportContent = reportGenerator.generateHTML(result, alignedData);
          fs.writeFileSync(argv.output, reportContent);
        }
        
        console.log('\n✅ 处理完成!');
        console.log(`📄 报告已生成: ${argv.output}`);
        console.log(`\n📈 处理摘要:`);
        console.log(`   空投总收入: $${result.summary.totalAirdropIncome.toFixed(2)}`);
        console.log(`   已解锁资产: ${result.summary.vestingSummary.totalUnlocked.toFixed(4)} 代币`);
        console.log(`   仍在锁仓: ${result.summary.vestingSummary.totalLocked.toFixed(4)} 代币`);
        console.log(`   提前解锁: ${result.summary.vestingSummary.totalEarlyUnlocked.toFixed(4)} 代币`);
        
        const flags = result.summary.flags;
        if (flags.priceGaps.length > 0 || flags.earlyUnlocks.length > 0 || 
            flags.duplicateTransfers.length > 0 || flags.withdrawalImpacts.length > 0) {
          console.log(`\n⚠️  注意事项:`);
          if (flags.priceGaps.length > 0) {
            console.log(`   - 币价缺口: ${flags.priceGaps.length} 处`);
          }
          if (flags.earlyUnlocks.length > 0) {
            console.log(`   - 锁仓提前解锁: ${flags.earlyUnlocks.length} 笔`);
          }
          if (flags.duplicateTransfers.length > 0) {
            console.log(`   - 疑似重复内部转账: ${flags.duplicateTransfers.length} 笔`);
          }
          if (flags.withdrawalImpacts.length > 0) {
            console.log(`   - 受公告撤回影响: ${flags.withdrawalImpacts.length} 条记录`);
          }
        }
        
      } catch (error) {
        console.error('\n❌ 处理失败:', error.message);
        console.error(error.stack);
        process.exit(1);
      }
    }
  })
  .command({
    command: 'recalculate',
    describe: '使用更新后的币价重新计算税务',
    builder: (y) => y
      .option('previous-result', {
        describe: '之前的结果JSON文件路径',
        type: 'string',
        demandOption: true
      })
      .option('new-prices', {
        describe: '新的币价快照CSV文件路径',
        type: 'string',
        demandOption: true
      })
      .option('output', {
        alias: 'o',
        describe: '输出报告文件路径',
        type: 'string',
        default: './output/updated-report.html'
      }),
    handler: (argv) => {
      console.log('🔄 重新计算税务...\n');
      console.log('此功能需要保存的会话状态,建议使用 process 命令重新处理完整数据');
      console.log('提示: 使用相同的输入参数运行 process 命令以获得一致结果');
    }
  })
  .command({
    command: 'validate',
    describe: '验证输入数据格式',
    builder: (y) => y
      .option('wallet', { describe: '钱包流水CSV', type: 'string' })
      .option('announcements', { describe: '空投公告JSON', type: 'string' })
      .option('prices', { describe: '币价快照CSV', type: 'string' }),
    handler: (argv) => {
      console.log('🔍 验证数据格式...\n');
      let valid = true;
      
      if (argv.wallet) {
        try {
          const data = loadCSV(argv.wallet);
          console.log(`✅ 钱包流水: ${data.length} 条记录`);
        } catch (e) {
          console.log(`❌ 钱包流水格式错误: ${e.message}`);
          valid = false;
        }
      }
      
      if (argv.announcements) {
        try {
          const data = loadJSON(argv.announcements);
          console.log(`✅ 空投公告: ${data.length} 条记录`);
        } catch (e) {
          console.log(`❌ 空投公告格式错误: ${e.message}`);
          valid = false;
        }
      }
      
      if (argv.prices) {
        try {
          const data = loadCSV(argv.prices);
          console.log(`✅ 币价快照: ${data.length} 条记录`);
        } catch (e) {
          console.log(`❌ 币价快照格式错误: ${e.message}`);
          valid = false;
        }
      }
      
      process.exit(valid ? 0 : 1);
    }
  })
  .command({
    command: 'example',
    describe: '生成示例数据文件',
    builder: (y) => y
      .option('type', {
        describe: '示例类型: basic | edge',
        type: 'string',
        default: 'basic',
        choices: ['basic', 'edge']
      })
      .option('output-dir', {
        describe: '输出目录',
        type: 'string',
        default: './data'
      }),
    handler: (argv) => {
      console.log(`📁 生成${argv.type === 'edge' ? '边界情况' : '基础'}示例数据...`);
      require('./example-generator')(argv.type, argv.outputDir);
      console.log(`✅ 示例数据已生成到 ${argv.outputDir}/`);
    }
  })
  .demandCommand(1, '请指定一个命令')
  .strict()
  .epilogue(`
📋 数据格式说明:

钱包流水CSV必需字段:
  hash, timestamp, from, to, tokenSymbol, amount, transactionType

空投公告JSON格式:
  [{
    "id": "ann-001",
    "projectName": "项目名称",
    "tokenSymbol": "TOKEN",
    "announcementDate": "2024-01-01",
    "distributionDate": "2024-01-15",
    "lockupEndDate": "2024-07-15",
    "status": "announced"
  }]

币价快照CSV必需字段:
  tokenSymbol, timestamp, priceUSD
  `)
  .help()
  .alias('help', 'h')
  .argv;
