#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table3');
const ora = require('ora');

const Address = require('./models/Address');
const Task = require('./models/Task');
const OnChainInteraction = require('./models/OnChainInteraction');
const ExchangeTag = require('./models/ExchangeTag');
const CommunityList = require('./models/CommunityList');
const Whitelist = require('./models/Whitelist');
const FilterRule = require('./models/FilterRule');
const FilterReport = require('./models/FilterReport');
const AuditLog = require('./models/AuditLog');
const Cluster = require('./models/Cluster');
const ClusteringEngine = require('./engine/ClusteringEngine');
const RiskEngine = require('./engine/RiskEngine');
const ImportService = require('./services/ImportService');
const ExportService = require('./services/ExportService');

function printBanner() {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════╗
║        Web3 空投女巫过滤 CLI 系统                ║
║        Sybil Filter for Airdrop Screening         ║
╚══════════════════════════════════════════════════╝`));
  console.log(chalk.gray('  本地运行 · 数据持久化 · 可追溯审计\n'));
}

function printStats() {
  const summary = ExportService.getExportSummary();
  const table = new Table({
    head: [chalk.white('分类'), chalk.white('数量')],
    colWidths: [30, 15],
    style: { head: ['cyan'], border: ['gray'] }
  });

  table.push(['地址总数', summary.addresses]);
  table.push([chalk.red('高风险地址'), summary.highRisk]);
  table.push([chalk.yellow('中风险地址'), summary.mediumRisk]);
  table.push([chalk.green('低风险地址'), summary.lowRisk]);
  table.push([chalk.cyan('白名单地址'), summary.whitelisted]);
  table.push([chalk.magenta('交易所地址'), summary.exchange]);
  table.push(['地址聚类', summary.clusters]);

  console.log(table.toString());
  console.log();
}

async function handleImport() {
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '选择导入类型:',
      choices: [
        { name: '钱包地址列表', value: 'addresses' },
        { name: '任务记录', value: 'tasks' },
        { name: '链上交互', value: 'interactions' },
        { name: '交易所标签', value: 'exchange_tags' },
        { name: '社区贡献名单', value: 'community_lists' },
        { name: '白名单', value: 'whitelist' },
        { name: '返回主菜单', value: 'back' }
      ]
    }
  ]);

  if (type === 'back') return;

  const { filePath, source } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: '输入JSON文件路径:'
    },
    {
      type: 'input',
      name: 'source',
      message: '数据来源标签 (如: etherscan, 社区导出):',
      default: 'manual'
    }
  ]);

  const spinner = ora('正在导入...').start();
  try {
    const result = await ImportService.importFromFile(filePath, type, source);
    spinner.succeed(chalk.green(`导入完成: ${result.imported}条，跳过${result.skipped}条`));
    if (result.errors.length > 0) {
      console.log(chalk.yellow('错误详情:'));
      result.errors.slice(0, 5).forEach(e => console.log(chalk.gray(`  ${e}`)));
    }
  } catch (e) {
    spinner.fail(chalk.red(`导入失败: ${e.message}`));
  }
}

async function handleAddAddress() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'address', message: '钱包地址 (0x...):' },
    { type: 'input', name: 'label', message: '标签/备注 (可选):' },
    { type: 'input', name: 'source', message: '数据来源:', default: 'manual' }
  ]);

  if (Address.findByAddress(answers.address)) {
    console.log(chalk.yellow('地址已存在，已更新信息。'));
    const existing = Address.findByAddress(answers.address);
    Address.update(existing.id, {
      label: answers.label || existing.label,
      source: answers.source
    });
  } else {
    Address.create(answers);
    console.log(chalk.green('地址已添加。'));
  }

  AuditLog.create({
    action: 'address_add',
    entityType: 'address',
    address: answers.address.toLowerCase(),
    newValue: { address: answers.address, label: answers.label },
    reason: '手动添加地址'
  });
}

async function handleAddTask() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'address', message: '钱包地址:' },
    { type: 'input', name: 'taskType', message: '任务类型 (如: twitter_follow, discord_join):' },
    { type: 'input', name: 'taskName', message: '任务名称:' },
    { type: 'input', name: 'source', message: '数据来源:', default: 'manual' }
  ]);

  let addressId = null;
  const address = Address.findByAddress(answers.address);
  if (address) {
    addressId = address.id;
  } else {
    const newAddr = Address.create({
      address: answers.address,
      source: answers.source
    });
    addressId = newAddr.id;
  }

  Task.create({
    addressId,
    address: answers.address,
    taskType: answers.taskType,
    taskName: answers.taskName,
    source: answers.source
  });

  console.log(chalk.green('任务记录已添加。'));
}

async function handleAddWhitelist() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'address', message: '钱包地址:' },
    { type: 'input', name: 'reason', message: '加入白名单的原因:' },
    { type: 'input', name: 'addedBy', message: '操作人:', default: 'cli' }
  ]);

  const existing = Whitelist.findByAddress(answers.address);
  if (existing) {
    console.log(chalk.yellow('地址已在白名单中。'));
    return;
  }

  Whitelist.create({
    address: answers.address,
    reason: answers.reason,
    addedBy: answers.addedBy,
    source: 'manual'
  });

  const addr = Address.findByAddress(answers.address);
  if (addr) {
    Address.setWhitelist(addr.id, true);
  }

  AuditLog.create({
    action: 'whitelist_add',
    entityType: 'whitelist',
    address: answers.address.toLowerCase(),
    newValue: { reason: answers.reason },
    reason: answers.reason
  });

  console.log(chalk.green('已加入白名单。'));
}

async function handleAddExchangeTag() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'address', message: '钱包地址:' },
    { type: 'input', name: 'exchangeName', message: '交易所名称 (如: Binance, Coinbase):' },
    { type: 'input', name: 'source', message: '数据来源:', default: 'manual' }
  ]);

  ExchangeTag.create({
    address: answers.address,
    exchangeName: answers.exchangeName,
    source: answers.source
  });

  const addr = Address.findByAddress(answers.address);
  if (addr) {
    Address.setExchange(addr.id, true);
  }

  AuditLog.create({
    action: 'exchange_tag_add',
    entityType: 'exchange_tag',
    address: answers.address.toLowerCase(),
    newValue: { exchangeName: answers.exchangeName },
    reason: '标记交易所地址'
  });

  console.log(chalk.green('交易所标签已添加。'));
}

async function handleRunClustering() {
  const { threshold, minSize } = await inquirer.prompt([
    { type: 'input', name: 'threshold', message: '相似度阈值 (0-1):', default: '0.7' },
    { type: 'input', name: 'minSize', message: '最小聚类大小:', default: '2' }
  ]);

  const spinner = ora('正在执行地址聚类...').start();
  try {
    const result = await ClusteringEngine.runClustering({
      similarityThreshold: parseFloat(threshold),
      minClusterSize: parseInt(minSize)
    });
    spinner.succeed(chalk.green(`聚类完成: ${result.clusterCount}个聚类，${result.clusteredAddresses}个地址被聚类`));

    if (result.clusters.length > 0) {
      const table = new Table({
        head: [chalk.white('聚类'), chalk.white('地址数'), chalk.white('相似度'), chalk.white('类型')],
        style: { head: ['cyan'] }
      });
      result.clusters.slice(0, 10).forEach(c => {
        table.push([c.name, c.size, (c.similarityScore * 100).toFixed(0) + '%', c.clusterType]);
      });
      console.log(table.toString());
    }
  } catch (e) {
    spinner.fail(chalk.red(`聚类失败: ${e.message}`));
  }
}

async function handleRunRisk() {
  const { name, description } = await inquirer.prompt([
    { type: 'input', name: 'name', message: '报告名称:', default: `过滤报告_${new Date().toLocaleString()}` },
    { type: 'input', name: 'description', message: '报告描述 (可选):' }
  ]);

  const spinner = ora('正在执行风险评估...').start();
  try {
    const result = await RiskEngine.evaluateAll({
      reportName: name,
      description: description
    });
    spinner.succeed(chalk.green('风险评估完成！'));

    const s = result.summary;
    const table = new Table({
      head: [chalk.white('统计项'), chalk.white('数量')],
      style: { head: ['cyan'] }
    });
    table.push(['总地址数', s.total]);
    table.push([chalk.red('高风险'), s.highRisk]);
    table.push([chalk.yellow('中风险'), s.medium]);
    table.push([chalk.green('低风险'), s.low]);
    table.push([chalk.cyan('白名单'), s.whitelisted]);
    table.push([chalk.magenta('交易所'), s.exchange]);
    table.push(['已聚类', s.clustered]);
    console.log(table.toString());

    console.log(chalk.gray(`\n报告ID: ${result.report.id}`));
  } catch (e) {
    spinner.fail(chalk.red(`评估失败: ${e.message}`));
  }
}

async function handleViewAddresses() {
  const { filter } = await inquirer.prompt([
    {
      type: 'list',
      name: 'filter',
      message: '筛选显示:',
      choices: [
        { name: '全部地址', value: 'all' },
        { name: '高风险地址', value: 'high' },
        { name: '中风险地址', value: 'medium' },
        { name: '低风险地址', value: 'low' },
        { name: '白名单地址', value: 'whitelisted' },
        { name: '交易所地址', value: 'exchange' },
        { name: '返回', value: 'back' }
      ]
    }
  ]);

  if (filter === 'back') return;

  let addresses = Address.findAll();
  if (filter !== 'all') {
    if (filter === 'exchange') {
      addresses = addresses.filter(a => a.isExchange);
    } else {
      addresses = addresses.filter(a => a.riskLevel === filter);
    }
  }

  if (addresses.length === 0) {
    console.log(chalk.yellow('暂无匹配地址。'));
    return;
  }

  const table = new Table({
    head: [
      chalk.white('地址'),
      chalk.white('标签'),
      chalk.white('风险分'),
      chalk.white('风险等级'),
      chalk.white('白名单'),
      chalk.white('交易所'),
      chalk.white('聚类')
    ],
    style: { head: ['cyan'] },
    colWidths: [44, 12, 8, 10, 8, 8, 14]
  });

  addresses.slice(0, 30).forEach(a => {
    const colorMap = { high: 'red', medium: 'yellow', low: 'green', whitelisted: 'cyan', unknown: 'gray' };
    const level = RiskEngine.getRiskLevelText(a.riskLevel);
    table.push([
      a.address.substr(0, 10) + '...' + a.address.substr(-6),
      a.label || '-',
      a.riskScore,
      chalk[colorMap[a.riskLevel] || 'white'](level),
      a.isWhitelisted ? '✓' : '',
      a.isExchange ? '✓' : '',
      a.clusterId ? Cluster.findById(a.clusterId)?.name || a.clusterId.substr(0, 8) : '-'
    ]);
  });

  console.log(table.toString());
  if (addresses.length > 30) {
    console.log(chalk.gray(`... 还有${addresses.length - 30}条，建议使用导出功能查看全部。`));
  }
}

async function handleViewReport() {
  const reports = FilterReport.getLatest(10);
  if (reports.length === 0) {
    console.log(chalk.yellow('暂无过滤报告，请先执行风险评估。'));
    return;
  }

  const choices = reports.map(r => ({
    name: `${r.name} - 总计:${r.totalAddresses} 高风险:${r.highRiskCount} (${r.createdAt})`,
    value: r.id
  }));

  const { reportId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'reportId',
      message: '选择报告:',
      choices: [...choices, { name: '返回', value: 'back' }]
    }
  ]);

  if (reportId === 'back') return;

  const report = FilterReport.findById(reportId);
  if (!report) return;

  console.log(chalk.cyan(`\n报告: ${report.name}`));
  console.log(chalk.gray(`时间: ${report.createdAt}`));
  if (report.description) console.log(chalk.gray(`描述: ${report.description}`));

  const table = new Table({
    head: [chalk.white('统计项'), chalk.white('数量')],
    style: { head: ['cyan'] }
  });
  table.push(['总地址数', report.totalAddresses]);
  table.push([chalk.red('高风险'), report.highRiskCount]);
  table.push([chalk.yellow('中风险'), report.mediumRiskCount]);
  table.push([chalk.green('低风险'), report.lowRiskCount]);
  table.push([chalk.cyan('白名单'), report.whitelistedCount]);
  table.push([chalk.magenta('交易所'), report.exchangeCount]);
  table.push(['聚类地址', report.clusterCount]);
  console.log(table.toString());

  if (report.results && report.results.length > 0) {
    console.log(chalk.gray(`\n详细结果: (前10条高风险)`));
    const highRisk = report.results
      .filter(r => r.riskLevel === 'high')
      .slice(0, 10);

    highRisk.forEach(r => {
      console.log(`\n  ${chalk.red(r.address)}`);
      console.log(`  风险分: ${r.riskScore} | ${RiskEngine.getRiskLevelText(r.riskLevel)}`);
      if (r.warnings && r.warnings.length > 0) {
        r.warnings.forEach(w => console.log(`  ${chalk.yellow(w)}`));
      }
      if (r.riskFactors && r.riskFactors.length > 0) {
        console.log(chalk.gray(`  风险因素:`));
        r.riskFactors.forEach(f => console.log(chalk.gray(`    - ${f.ruleName}: ${f.description} (权重:${f.weight})`)));
      }
    });
  }
}

async function handleViewClusters() {
  const clusters = Cluster.findAll();
  if (clusters.length === 0) {
    console.log(chalk.yellow('暂无聚类结果，请先执行聚类分析。'));
    return;
  }

  const table = new Table({
    head: [chalk.white('聚类名称'), chalk.white('地址数'), chalk.white('相似度'), chalk.white('类型'), chalk.white('说明')],
    style: { head: ['cyan'] }
  });

  clusters.forEach(c => {
    table.push([c.name, c.size, (c.similarityScore * 100).toFixed(0) + '%', c.clusterType, c.notes || '-']);
  });

  console.log(table.toString());
}

async function handleViewAuditLog() {
  const logs = AuditLog.getRecent(30);
  if (logs.length === 0) {
    console.log(chalk.yellow('暂无操作记录。'));
    return;
  }

  const table = new Table({
    head: [chalk.white('时间'), chalk.white('操作'), chalk.white('对象'), chalk.white('原因')],
    style: { head: ['cyan'] },
    colWidths: [24, 22, 22, 30]
  });

  logs.forEach(log => {
    table.push([
      new Date(log.timestamp).toLocaleString(),
      log.action,
      log.entityType || '-',
      log.reason || '-'
    ]);
  });

  console.log(table.toString());
}

async function handleExport() {
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '选择导出类型:',
      choices: [
        { name: '全部地址', value: 'all' },
        { name: '符合空投条件的地址', value: 'eligible' },
        { name: '高风险地址', value: 'highRisk' },
        { name: '最新过滤报告', value: 'report' },
        { name: '地址聚类', value: 'clusters' },
        { name: '白名单', value: 'whitelist' },
        { name: '审计日志', value: 'audit' },
        { name: '完整快照 (全部数据)', value: 'snapshot' },
        { name: '返回', value: 'back' }
      ]
    }
  ]);

  if (type === 'back') return;

  const spinner = ora('正在导出...').start();
  try {
    let filePath;
    switch (type) {
      case 'all':
        filePath = ExportService.exportAddresses();
        break;
      case 'eligible':
        filePath = ExportService.exportEligibleAddresses();
        break;
      case 'highRisk':
        filePath = ExportService.exportHighRiskAddresses();
        break;
      case 'report':
        filePath = ExportService.exportLatestReport();
        break;
      case 'clusters':
        filePath = ExportService.exportClusters();
        break;
      case 'whitelist':
        filePath = ExportService.exportWhitelist();
        break;
      case 'audit':
        filePath = ExportService.exportAuditLog();
        break;
      case 'snapshot':
        filePath = ExportService.exportFullSnapshot();
        break;
    }
    spinner.succeed(chalk.green(`导出成功: ${filePath}`));
  } catch (e) {
    spinner.fail(chalk.red(`导出失败: ${e.message}`));
  }
}

async function handleManageRules() {
  const rules = FilterRule.findAll();
  const table = new Table({
    head: [chalk.white('ID'), chalk.white('规则'), chalk.white('权重'), chalk.white('启用'), chalk.white('分类')],
    style: { head: ['cyan'] }
  });

  rules.forEach(r => {
    table.push([r.id, r.name, r.weight, r.enabled ? '✓' : '✗', r.category]);
  });

  console.log(table.toString());

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '规则操作:',
      choices: [
        { name: '切换启用状态', value: 'toggle' },
        { name: '修改权重', value: 'weight' },
        { name: '新增规则', value: 'add' },
        { name: '返回', value: 'back' }
      ]
    }
  ]);

  if (action === 'back') return;

  if (action === 'toggle') {
    const { ruleId } = await inquirer.prompt([
      { type: 'input', name: 'ruleId', message: '输入规则ID:' }
    ]);
    FilterRule.toggle(ruleId);
    console.log(chalk.green('规则状态已切换。'));
  } else if (action === 'weight') {
    const { ruleId, weight } = await inquirer.prompt([
      { type: 'input', name: 'ruleId', message: '输入规则ID:' },
      { type: 'input', name: 'weight', message: '新权重:' }
    ]);
    FilterRule.update(ruleId, { weight: parseInt(weight) });
    console.log(chalk.green('权重已更新。'));
  } else if (action === 'add') {
    const { name, description, weight, category } = await inquirer.prompt([
      { type: 'input', name: 'name', message: '规则名称:' },
      { type: 'input', name: 'description', message: '规则描述:' },
      { type: 'input', name: 'weight', message: '权重 (正数增加风险，负数减少):', default: '10' },
      { type: 'input', name: 'category', message: '分类:', default: 'custom' }
    ]);
    FilterRule.create({
      name,
      description,
      weight: parseInt(weight),
      category
    });
    console.log(chalk.green('规则已添加。'));
  }
}

async function mainMenu() {
  printBanner();
  printStats();

  while (true) {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: '选择操作:',
        choices: [
          { name: '📥 导入数据', value: 'import' },
          { name: '➕ 添加地址', value: 'addAddress' },
          { name: '📝 添加任务记录', value: 'addTask' },
          { name: '🛡️ 加入白名单', value: 'whitelist' },
          { name: '🏦 标记交易所', value: 'exchange' },
          new inquirer.Separator(),
          { name: '🔍 执行地址聚类', value: 'cluster' },
          { name: '⚖️  执行风险评估', value: 'risk' },
          { name: '📋 查看地址列表', value: 'viewAddr' },
          { name: '📊 查看过滤报告', value: 'viewReport' },
          { name: '🔗 查看聚类结果', value: 'viewCluster' },
          new inquirer.Separator(),
          { name: '⚙️  管理过滤规则', value: 'rules' },
          { name: '📜 查看审计日志', value: 'audit' },
          { name: '📤 导出数据', value: 'export' },
          new inquirer.Separator(),
          { name: '❌ 退出', value: 'exit' }
        ]
      }
    ]);

    switch (choice) {
      case 'import':
        await handleImport();
        break;
      case 'addAddress':
        await handleAddAddress();
        break;
      case 'addTask':
        await handleAddTask();
        break;
      case 'whitelist':
        await handleAddWhitelist();
        break;
      case 'exchange':
        await handleAddExchangeTag();
        break;
      case 'cluster':
        await handleRunClustering();
        break;
      case 'risk':
        await handleRunRisk();
        break;
      case 'viewAddr':
        await handleViewAddresses();
        break;
      case 'viewReport':
        await handleViewReport();
        break;
      case 'viewCluster':
        await handleViewClusters();
        break;
      case 'rules':
        await handleManageRules();
        break;
      case 'audit':
        await handleViewAuditLog();
        break;
      case 'export':
        await handleExport();
        break;
      case 'exit':
        console.log(chalk.cyan('👋 再见！数据已持久化在 data/ 目录。'));
        process.exit(0);
    }

    console.log();
    printStats();
  }
}

FilterRule.initDefaults();
mainMenu().catch(e => {
  console.error(chalk.red('发生错误:'), e);
  process.exit(1);
});
