#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { runTrial } = require('../lib/trial');
const { formatReport } = require('../lib/reporter');

function parseArgs(argv) {
  const args = {
    filePath: null,
    threshold: Infinity,
    unit: null,
    baseline: null,
    showDetails: false,
    help: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--threshold' || arg === '-t') {
      i++;
      args.threshold = Number(argv[i]);
    } else if (arg === '--unit' || arg === '-u') {
      i++;
      args.unit = argv[i];
    } else if (arg === '--baseline' || arg === '-b') {
      i++;
      const baselinePath = argv[i];
      if (fs.existsSync(baselinePath)) {
        const raw = fs.readFileSync(baselinePath, 'utf-8');
        args.baseline = JSON.parse(raw);
      }
    } else if (arg === '--details' || arg === '-d') {
      args.showDetails = true;
    } else if (!arg.startsWith('-')) {
      args.filePath = arg;
    }
  }

  return args;
}

function printHelp() {
  const help = `
最短路径参数试算工具

用法:
  sptrial <文件路径> [选项]

选项:
  -t, --threshold <米>    设置距离阈值，超出会单独统计
  -u, --unit <单位>       期望单位，不匹配会单独统计 (m/km/里)
  -b, --baseline <文件>   基线结果 JSON 文件，用于跳变分析
  -d, --details           显示详细原文
  -h, --help              显示帮助

示例:
  sptrial ./samples/question-list.csv
  sptrial ./samples/question-list.csv -t 5000 -u km
  sptrial ./samples/question-list.csv -b ./baseline.json
`;
  console.log(help);
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.filePath) {
    console.error('错误: 请提供文件路径');
    printHelp();
    process.exit(1);
  }

  const filePath = path.resolve(args.filePath);
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件不存在: ${filePath}`);
    process.exit(1);
  }

  const result = runTrial(filePath, {
    threshold: args.threshold,
    expectedUnit: args.unit,
    baseline: args.baseline
  });

  const report = formatReport(result, {
    showBadRows: true,
    showSkipped: true,
    showDuplicates: true,
    showDetails: args.showDetails
  });

  console.log(report);

  if (!result.success) {
    process.exit(1);
  }
}

main();
