const { Command } = require('commander');
const { isInitialized } = require('./database');
const initCommand = require('./commands/init');
const { importCommand, importBatchCommand } = require('./commands/import');
const { checkCommand } = require('./commands/check');
const { fixCommand } = require('./commands/fix');
const { reportCommand } = require('./commands/report');
const { historyCommand } = require('./commands/history');
const { exportCommand } = require('./commands/export');

const program = new Command();

program
  .name('wra')
  .description('仓库退供复核多源导入巡检CLI工具')
  .version('1.0.0');

function requireInit() {
  if (!isInitialized()) {
    console.error('❌ 工作目录未初始化，请先运行: wra init');
    process.exit(1);
  }
}

program
  .command('init')
  .description('初始化工作目录')
  .option('-n, --name <name>', '工作空间名称', 'default')
  .action(async (options) => {
    await initCommand(options);
  });

const importCmd = program
  .command('import')
  .description('导入数据')
  .action(async (options) => {
    console.log('请指定导入类型，使用 wra import --help 查看帮助');
    importCmd.help();
  });

importCmd
  .command('application <file>')
  .description('导入退供申请数据')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .option('--show-failures', '显示失败详情')
  .action(async (file, options) => {
    requireInit();
    await importCommand('application', file, options);
  });

importCmd
  .command('inspection <file>')
  .description('导入质检照片数据')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .option('--show-failures', '显示失败详情')
  .action(async (file, options) => {
    requireInit();
    await importCommand('inspection', file, options);
  });

importCmd
  .command('logistics <file>')
  .description('导入物流回单数据')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .option('--show-failures', '显示失败详情')
  .action(async (file, options) => {
    requireInit();
    await importCommand('logistics', file, options);
  });

importCmd
  .command('sms <file>')
  .description('导入短信截图数据')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .option('--show-failures', '显示失败详情')
  .action(async (file, options) => {
    requireInit();
    await importCommand('sms', file, options);
  });

importCmd
  .command('exception <file>')
  .description('导入异常照片数据')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .option('--show-failures', '显示失败详情')
  .action(async (file, options) => {
    requireInit();
    await importCommand('exception', file, options);
  });

importCmd
  .command('batch <files...>')
  .description('批量导入多个文件（自动识别类型）')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .action(async (files, options) => {
    requireInit();
    await importBatchCommand(files, options);
  });

program
  .command('check')
  .description('数据校验和一致性检查')
  .option('-b, --batch <batchNo>', '指定批次号')
  .option('-s, --sku <skuCode>', '指定SKU编码')
  .option('-d, --detail', '显示详细问题')
  .option('--failures', '查看导入失败记录')
  .option('--batches', '查看导入批次历史')
  .action(async (options) => {
    requireInit();
    await checkCommand(options);
  });

program
  .command('fix')
  .description('修改和改判操作')
  .argument('[action]', '操作类型: show|accept|reject|pending|status|judgment|field')
  .argument('[batchNo]', '批次号')
  .argument('[skuCode]', 'SKU编码')
  .argument('[value]', '值')
  .option('-f, --field <fieldName>', '字段名（field操作时需要）')
  .option('-o, --operator <name>', '操作人', 'system')
  .option('-n, --note <text>', '备注')
  .action(async (action, batchNo, skuCode, value, options) => {
    requireInit();
    await fixCommand(action, batchNo, skuCode, value, options);
  });

program
  .command('report')
  .description('生成报表')
  .argument('[view]', '视图类型: summary|by-batch|by-status|by-supplier', 'summary')
  .option('-b, --batch <batchNo>', '指定批次号')
  .option('-s, --sku <skuCode>', '指定SKU编码')
  .option('--supplier <supplierCode>', '指定供应商编码')
  .option('--status <status>', '指定状态')
  .option('-d, --detail', '显示明细列表')
  .option('-l, --limit <number>', '限制数量')
  .action(async (view, options) => {
    requireInit();
    await reportCommand(view, options);
  });

program
  .command('history')
  .description('查询变更历史')
  .argument('[action]', '操作类型: record|diff|logs', 'logs')
  .argument('[batchNo]', '批次号')
  .argument('[skuCode]', 'SKU编码')
  .option('-l, --limit <number>', '限制数量')
  .action(async (action, batchNo, skuCode, options) => {
    requireInit();
    await historyCommand(action, batchNo, skuCode, options);
  });

program
  .command('export')
  .description('导出数据')
  .argument('[format]', '导出格式: xlsx|csv|json', 'xlsx')
  .argument('[output]', '输出文件路径')
  .option('-b, --batch <batchNo>', '指定批次号')
  .option('-s, --sku <skuCode>', '指定SKU编码')
  .option('--supplier <supplierCode>', '指定供应商编码')
  .option('--status <status>', '指定状态')
  .option('--failures', '包含导入失败清单')
  .option('--history', '包含变更历史')
  .option('--batches', '包含导入批次信息')
  .action(async (format, output, options) => {
    requireInit();
    await exportCommand(format, output, options);
  });

program.addHelpText('after', `

示例:
  $ wra init                    # 初始化工作目录
  $ wra import application 退供申请.csv
  $ wra import inspection 质检照片.xlsx
  $ wra import logistics 物流回单.csv
  $ wra import sms 短信确认.csv
  $ wra import exception 异常照片.csv
  $ wra check                    # 数据校验
  $ wra check --failures        # 查看导入失败
  $ wra report summary          # 汇总报表
  $ wra report by-batch        # 按批次分组
  $ wra fix show BATCH001 SKU001  # 查看详情
  $ wra fix accept BATCH001 SKU001 50  # 供应商确认50个
  $ wra fix reject BATCH001 SKU001 10  # 供应商拒收10个
  $ wra fix pending BATCH001 SKU001 20  # 待确认20个
  $ wra history diff BATCH001 SKU001  # 查看变更对比
  $ wra history logs            # 查看系统日志
  $ wra export xlsx 导出.xlsx --failures --history
`);

program.parseAsync(process.argv).catch((error) => {
  console.error('❌', error.message);
  process.exit(1);
});
