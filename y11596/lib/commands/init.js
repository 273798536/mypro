const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  WORKSPACE_CONFIG,
  ensureDir,
  getWorkspacePaths,
  writeJson,
  getWorkspaceRoot,
  generateId,
  getTimestamp
} = require('../utils/file-manager');

const initCommand = new Command('init')
  .description('初始化巡检项目')
  .option('-n, --name <name>', '项目名称', 'kbase-audit-project')
  .option('-d, --desc <description>', '项目描述', '')
  .option('-f, --force', '强制初始化（覆盖已有配置）')
  .action((options) => {
    const cwd = process.cwd();
    const existingRoot = getWorkspaceRoot(cwd);

    if (existingRoot && !options.force) {
      console.log(chalk.yellow('⚠️  检测到已存在的巡检项目:'), chalk.cyan(existingRoot));
      console.log(chalk.gray('使用 --force 参数强制重新初始化'));
      process.exit(1);
    }

    const root = cwd;
    const paths = getWorkspacePaths(root);

    ensureDir(path.join(root, WORKSPACE_CONFIG));
    ensureDir(paths.data);
    ensureDir(paths.history);
    ensureDir(paths.reports);
    ensureDir(paths.exports);
    ensureDir(paths.source);
    ensureDir(paths.parsed);
    ensureDir(paths.check);

    const config = {
      projectId: generateId(),
      projectName: options.name,
      description: options.desc,
      createdAt: getTimestamp(),
      version: '1.0.0',
      dataTypes: {
        change_order: {
          enabled: true,
          name: '变更单',
          idField: 'change_id'
        },
        review_opinion: {
          enabled: true,
          name: '审核意见',
          idField: 'review_id'
        },
        citation_record: {
          enabled: true,
          name: '客服引用记录',
          idField: 'citation_id'
        },
        scan_detail: {
          enabled: true,
          name: '扫码明细',
          idField: 'scan_id'
        }
      },
      checkRules: {
        requireReview: true,
        checkCitationAfterOffline: true,
        trackScanDetails: true
      }
    };

    writeJson(paths.config, config);

    const state = {
      version: '1.0.0',
      status: 'active',
      frozen: false,
      currentBatch: null,
      batches: [],
      lastCheck: null,
      lastExport: null,
      importStats: {
        change_order: { total: 0, valid: 0, invalid: 0 },
        review_opinion: { total: 0, valid: 0, invalid: 0 },
        citation_record: { total: 0, valid: 0, invalid: 0 },
        scan_detail: { total: 0, valid: 0, invalid: 0 }
      }
    };

    writeJson(paths.state, state);

    console.log(chalk.green('✅ 巡检项目初始化成功!'));
    console.log('');
    console.log(chalk.cyan('项目信息:'));
    console.log(`  项目名称: ${chalk.white(options.name)}`);
    console.log(`  项目ID: ${chalk.gray(config.projectId)}`);
    console.log(`  工作目录: ${chalk.gray(root)}`);
    console.log('');
    console.log(chalk.cyan('目录结构:'));
    console.log(`  ${chalk.gray(WORKSPACE_CONFIG)}/  - 配置和状态`);
    console.log(`  ${chalk.gray('data/')}/            - 数据目录`);
    console.log(`    ${chalk.gray('source/')}      - 原始源文件`);
    console.log(`    ${chalk.gray('parsed/')}      - 解析后数据`);
    console.log(`    ${chalk.gray('check/')}       - 检查结果`);
    console.log(`  ${chalk.gray('history/')}/         - 历史记录`);
    console.log(`  ${chalk.gray('reports/')}/         - 巡检报告`);
    console.log(`  ${chalk.gray('exports/')}/         - 导出数据`);
    console.log('');
    console.log(chalk.cyan('下一步:'));
    console.log(`  ${chalk.white('kbase-audit import --type change_order <文件路径>')}`);
  });

module.exports = initCommand;
