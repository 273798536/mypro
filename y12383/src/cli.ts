#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { analyzeSolo, parseChordProgression } from './analyzer';
import { loadAnalyses, addAnalysis, updateAnalysis, getAnalysisById, saveAnalyses } from './store';
import { getAllSamples } from './samples';
import { updateChordProgression, updateNotes, createSideBySideComparison, formatChordsForDisplay, getChordHistory } from './corrector';
import { exportToText, exportToJSON, exportCorrespondence, generateReport } from './exporter';
import { SoloAnalysis, ListFilter } from './types';

const program = new Command();

program
  .name('jazz-analyze')
  .description('爵士即兴Solo结构分析命令行工具')
  .version('1.0.0');

program
  .command('analyze')
  .description('分析一个新的Solo录音')
  .requiredOption('-a, --audio <file>', '演奏音频文件')
  .requiredOption('-t, --title <name>', '曲目名称')
  .requiredOption('-c, --chords <progression>', '和弦进行，格式：Am7 | D7 | Gmaj7')
  .option('-r, --artist <name>', '演奏者')
  .option('-d, --date <date>', '录音日期')
  .option('-n, --notes <text>', '备注')
  .action((options) => {
    console.log(chalk.blue('\n🎷 开始分析...\n'));
    
    const result = analyzeSolo(
      options.audio,
      options.title,
      options.chords,
      {
        artist: options.artist,
        dateRecorded: options.date,
        notes: options.notes,
      }
    );
    
    if (!result.success || !result.analysis) {
      console.log(chalk.red('❌ 分析失败:'));
      result.errors.forEach(e => console.log(chalk.red(`  - ${e}`)));
      process.exit(1);
    }
    
    addAnalysis(result.analysis);
    
    console.log(chalk.green('✅ 分析完成!'));
    console.log(`  ID: ${result.analysis.id}`);
    console.log(`  标题: ${result.analysis.title}`);
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  警告:'));
      result.warnings.forEach(w => console.log(chalk.yellow(`  - ${w}`)));
    }
    
    if (result.analysis.beatDrifts.length > 0) {
      console.log(chalk.red('\n⚠️  检测到节拍漂移 (已单独标记):'));
      result.analysis.beatDrifts.forEach(d => {
        const severityColor = d.severity === 'minor' ? chalk.yellow : d.severity === 'moderate' ? chalk.hex('#FFA500') : chalk.red;
        console.log(severityColor(`  - 第${d.bar}小节第${d.beat}拍 - ${d.severity === 'minor' ? '轻微' : d.severity === 'moderate' ? '中等' : '严重'}`));
      });
    }
    
    console.log('');
  });

program
  .command('list')
  .description('列出所有分析记录')
  .option('-f, --filter <type>', '过滤类型: all|drift|normal|draft|corrected', 'all')
  .action((options) => {
    const analyses = loadAnalyses();
    
    if (analyses.length === 0) {
      console.log(chalk.gray('暂无分析记录\n'));
      return;
    }
    
    const filtered = filterAnalyses(analyses, options.filter);
    
    console.log(chalk.blue(`\n📋 分析记录列表 (${filtered.length}/${analyses.length})\n`));
    
    const driftRecords = filtered.filter(a => a.beatDrifts.length > 0);
    const normalRecords = filtered.filter(a => a.beatDrifts.length === 0);
    
    if (driftRecords.length > 0) {
      console.log(chalk.red('⚠️  节拍漂移记录:'));
      console.log(chalk.red('─'.repeat(80)));
      driftRecords.forEach((a, i) => printAnalysisRow(a, i + 1));
      console.log('');
    }
    
    if (normalRecords.length > 0) {
      console.log(chalk.green('✅ 正常记录:'));
      console.log(chalk.green('─'.repeat(80)));
      normalRecords.forEach((a, i) => printAnalysisRow(a, i + 1, driftRecords.length + i + 1));
      console.log('');
    }
  });

function filterAnalyses(analyses: SoloAnalysis[], filter: ListFilter): SoloAnalysis[] {
  switch (filter) {
    case 'drift':
      return analyses.filter(a => a.beatDrifts.length > 0);
    case 'normal':
      return analyses.filter(a => a.beatDrifts.length === 0);
    case 'draft':
      return analyses.filter(a => a.status === 'draft');
    case 'corrected':
      return analyses.filter(a => a.status === 'corrected' || a.status === 'reviewed');
    default:
      return analyses;
  }
}

function printAnalysisRow(a: SoloAnalysis, displayNum: number, absNum?: number): void {
  const num = absNum || displayNum;
  const statusColor = a.status === 'draft' ? chalk.yellow : a.status === 'corrected' ? chalk.blue : chalk.green;
  const statusText = a.status === 'draft' ? '草稿' : a.status === 'analyzed' ? '分析' : a.status === 'corrected' ? '修正' : '审核';
  
  const flags: string[] = [];
  if (a.hasMissingFields) flags.push(chalk.gray('缺字段'));
  if (a.isLateEntry) flags.push(chalk.magenta('晚补'));
  if (a.notes) flags.push(chalk.cyan('有备注'));
  
  console.log(
    String(num).padEnd(3) +
    statusColor(statusText.padEnd(4)) +
    chalk.white(a.title.substring(0, 20).padEnd(22)) +
    chalk.gray(a.audioFile.substring(0, 20).padEnd(22)) +
    (a.beatDrifts.length > 0 ? chalk.red(`漂移${a.beatDrifts.length}`) : chalk.green('  无  ')) +
    '  ' +
    flags.join(' ')
  );
  console.log(chalk.gray(`   ID: ${a.id} | ${a.dateAnalyzed.substring(0, 10)}`));
}

program
  .command('show <id>')
  .description('显示详细分析报告')
  .action((id) => {
    const analysis = getAnalysisById(id);
    if (!analysis) {
      console.log(chalk.red(`❌ 未找到ID为 ${id} 的记录`));
      process.exit(1);
    }
    
    console.log(generateReport(analysis));
  });

program
  .command('correct <id>')
  .description('手动修正和弦进行')
  .option('-c, --chords <progression>', '新的和弦进行')
  .option('-n, --notes <text>', '更新备注')
  .option('-a, --author <name>', '修改人', 'teacher')
  .action((id, options) => {
    const analysis = getAnalysisById(id);
    if (!analysis) {
      console.log(chalk.red(`❌ 未找到ID为 ${id} 的记录`));
      process.exit(1);
    }
    
    let updated = analysis;
    
    if (options.chords) {
      const oldChords = analysis.chordProgression;
      updated = updateChordProgression(analysis, options.chords, options.author);
      const newChords = updated.chordProgression;
      
      console.log(chalk.blue('\n📝 和弦进行变更对比:'));
      console.log(createSideBySideComparison(oldChords, newChords));
    }
    
    if (options.notes) {
      updated = updateNotes(updated, options.notes, options.author);
      console.log(chalk.blue('\n📝 备注已更新'));
    }
    
    updateAnalysis(id, updated);
    console.log(chalk.green('\n✅ 修正已保存'));
  });

program
  .command('diff <id>')
  .description('查看和弦进行的历史版本对比')
  .action((id) => {
    const analysis = getAnalysisById(id);
    if (!analysis) {
      console.log(chalk.red(`❌ 未找到ID为 ${id} 的记录`));
      process.exit(1);
    }
    const history = getChordHistory(analysis);
    console.log(chalk.blue(`\n📜 和弦进行历史版本 (共${history.length}个版本)\n`));
    for (let i = 0; i < history.length; i++) {
      const v = history[i];
      console.log(chalk.cyan(`版本 ${v.version}:`));
      console.log(chalk.gray(`  时间: ${v.timestamp}`));
      console.log(chalk.gray(`  作者: ${v.author}`));
      console.log(`  和弦: ${formatChordsForDisplay(v.chords)}`);
      console.log('');
    }
    if (history.length >= 2) {
      console.log(chalk.blue('最新变更对比:'));
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      console.log(createSideBySideComparison(prev.chords, last.chords));
    }
  });

program
  .command('export <id>')
  .description('导出分析报告')
  .option('-f, --format <type>', '导出格式: text|json', 'text')
  .action((id, options) => {
    const analysis = getAnalysisById(id);
    if (!analysis) {
      console.log(chalk.red(`❌ 未找到ID为 ${id} 的记录`));
      process.exit(1);
    }
    
    let filepath: string;
    if (options.format === 'json') {
      filepath = exportToJSON(analysis);
    } else {
      filepath = exportToText(analysis);
    }
    
    console.log(chalk.green(`\n✅ 报告已导出至: ${filepath}`));
    console.log(chalk.gray(`  音频: ${analysis.audioFile}`));
    console.log(chalk.gray(`  和弦: ${analysis.chordProgression.length}个`));
    console.log('');
  });

program
  .command('export-all')
  .description('导出所有记录的对应关系表')
  .action(() => {
    const analyses = loadAnalyses();
    if (analyses.length === 0) {
      console.log(chalk.gray('暂无分析记录\n'));
      return;
    }
    
    const filepath = exportCorrespondence(analyses);
    console.log(chalk.green(`\n✅ 对应关系表已导出至: ${filepath}`));
    console.log('');
  });

program
  .command('init-samples')
  .description('初始化样例数据')
  .action(() => {
    const samples = getAllSamples();
    samples.forEach(s => addAnalysis(s));
    console.log(chalk.green(`\n✅ 已添加 ${samples.length} 条样例数据`));
    console.log(chalk.gray('包括：缺字段记录、晚补记录、备注修改记录、节拍漂移记录'));
    console.log('');
  });

program
  .command('interactive')
  .description('交互式修正模式')
  .action(async () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const analyses = loadAnalyses();
    if (analyses.length === 0) {
      console.log(chalk.gray('暂无分析记录\n'));
      rl.close();
      return;
    }
    
    console.log(chalk.blue('\n🎹 交互式修正模式\n'));
    
    analyses.forEach((a, i) => {
      console.log(`${i + 1}. ${a.title} (ID: ${a.id}`);
    });
    
    rl.question('\n请选择要修正的记录编号: ', (answer) => {
      const idx = parseInt(answer) - 1;
      if (idx < 0 || idx >= analyses.length) {
        console.log(chalk.red('无效的编号'));
        rl.close();
        return;
      }
      
      const analysis = analyses[idx];
      console.log(chalk.blue(`\n当前和弦进行: ${formatChordsForDisplay(analysis.chordProgression)}`));
      
      rl.question('请输入新的和弦进行: ', (newChords) => {
        rl.question('请输入修改人: ', (author) => {
          const updated = updateChordProgression(analysis, newChords, author || 'teacher');
          updateAnalysis(analysis.id, updated);
          console.log(chalk.green('\n✅ 修正已保存'));
          console.log(createSideBySideComparison(analysis.chordProgression, updated.chordProgression));
          rl.close();
        });
      });
    });
  });

program.parse(process.argv);
