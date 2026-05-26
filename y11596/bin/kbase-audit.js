#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');

const initCommand = require('../lib/commands/init');
const importCommand = require('../lib/commands/import');
const checkCommand = require('../lib/commands/check');
const fixCommand = require('../lib/commands/fix');
const reportCommand = require('../lib/commands/report');
const historyCommand = require('../lib/commands/history');
const exportCommand = require('../lib/commands/export');
const queueCommand = require('../lib/commands/queue');
const roleCommand = require('../lib/commands/role');

const program = new Command();

program
  .name('kbase-audit')
  .description('客服知识库发布多源导入巡检 CLI 工具')
  .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(importCommand);
program.addCommand(checkCommand);
program.addCommand(fixCommand);
program.addCommand(reportCommand);
program.addCommand(historyCommand);
program.addCommand(exportCommand);
program.addCommand(queueCommand);
program.addCommand(roleCommand);

program.parse(process.argv);
