#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const readline = __importStar(require("readline"));
const analyzer_1 = require("./analyzer");
const store_1 = require("./store");
const samples_1 = require("./samples");
const corrector_1 = require("./corrector");
const exporter_1 = require("./exporter");
const program = new commander_1.Command();
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
    console.log(chalk_1.default.blue('\n🎷 开始分析...\n'));
    const result = (0, analyzer_1.analyzeSolo)(options.audio, options.title, options.chords, {
        artist: options.artist,
        dateRecorded: options.date,
        notes: options.notes,
    });
    if (!result.success || !result.analysis) {
        console.log(chalk_1.default.red('❌ 分析失败:'));
        result.errors.forEach(e => console.log(chalk_1.default.red(`  - ${e}`)));
        process.exit(1);
    }
    (0, store_1.addAnalysis)(result.analysis);
    console.log(chalk_1.default.green('✅ 分析完成!'));
    console.log(`  ID: ${result.analysis.id}`);
    console.log(`  标题: ${result.analysis.title}`);
    if (result.warnings.length > 0) {
        console.log(chalk_1.default.yellow('\n⚠️  警告:'));
        result.warnings.forEach(w => console.log(chalk_1.default.yellow(`  - ${w}`)));
    }
    if (result.analysis.beatDrifts.length > 0) {
        console.log(chalk_1.default.red('\n⚠️  检测到节拍漂移 (已单独标记):'));
        result.analysis.beatDrifts.forEach(d => {
            const severityColor = d.severity === 'minor' ? chalk_1.default.yellow : d.severity === 'moderate' ? chalk_1.default.hex('#FFA500') : chalk_1.default.red;
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
    const analyses = (0, store_1.loadAnalyses)();
    if (analyses.length === 0) {
        console.log(chalk_1.default.gray('暂无分析记录\n'));
        return;
    }
    const filtered = filterAnalyses(analyses, options.filter);
    console.log(chalk_1.default.blue(`\n📋 分析记录列表 (${filtered.length}/${analyses.length})\n`));
    const driftRecords = filtered.filter(a => a.beatDrifts.length > 0);
    const normalRecords = filtered.filter(a => a.beatDrifts.length === 0);
    if (driftRecords.length > 0) {
        console.log(chalk_1.default.red('⚠️  节拍漂移记录:'));
        console.log(chalk_1.default.red('─'.repeat(80)));
        driftRecords.forEach((a, i) => printAnalysisRow(a, i + 1));
        console.log('');
    }
    if (normalRecords.length > 0) {
        console.log(chalk_1.default.green('✅ 正常记录:'));
        console.log(chalk_1.default.green('─'.repeat(80)));
        normalRecords.forEach((a, i) => printAnalysisRow(a, i + 1, driftRecords.length + i + 1));
        console.log('');
    }
});
function filterAnalyses(analyses, filter) {
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
function printAnalysisRow(a, displayNum, absNum) {
    const num = absNum || displayNum;
    const statusColor = a.status === 'draft' ? chalk_1.default.yellow : a.status === 'corrected' ? chalk_1.default.blue : chalk_1.default.green;
    const statusText = a.status === 'draft' ? '草稿' : a.status === 'analyzed' ? '分析' : a.status === 'corrected' ? '修正' : '审核';
    const flags = [];
    if (a.hasMissingFields)
        flags.push(chalk_1.default.gray('缺字段'));
    if (a.isLateEntry)
        flags.push(chalk_1.default.magenta('晚补'));
    if (a.notes)
        flags.push(chalk_1.default.cyan('有备注'));
    console.log(String(num).padEnd(3) +
        statusColor(statusText.padEnd(4)) +
        chalk_1.default.white(a.title.substring(0, 20).padEnd(22)) +
        chalk_1.default.gray(a.audioFile.substring(0, 20).padEnd(22)) +
        (a.beatDrifts.length > 0 ? chalk_1.default.red(`漂移${a.beatDrifts.length}`) : chalk_1.default.green('  无  ')) +
        '  ' +
        flags.join(' '));
    console.log(chalk_1.default.gray(`   ID: ${a.id} | ${a.dateAnalyzed.substring(0, 10)}`));
}
program
    .command('show <id>')
    .description('显示详细分析报告')
    .action((id) => {
    const analysis = (0, store_1.getAnalysisById)(id);
    if (!analysis) {
        console.log(chalk_1.default.red(`❌ 未找到ID为 ${id} 的记录`));
        process.exit(1);
    }
    console.log((0, exporter_1.generateReport)(analysis));
});
program
    .command('correct <id>')
    .description('手动修正和弦进行')
    .option('-c, --chords <progression>', '新的和弦进行')
    .option('-n, --notes <text>', '更新备注')
    .option('-a, --author <name>', '修改人', 'teacher')
    .action((id, options) => {
    const analysis = (0, store_1.getAnalysisById)(id);
    if (!analysis) {
        console.log(chalk_1.default.red(`❌ 未找到ID为 ${id} 的记录`));
        process.exit(1);
    }
    let updated = analysis;
    if (options.chords) {
        const oldChords = analysis.chordProgression;
        updated = (0, corrector_1.updateChordProgression)(analysis, options.chords, options.author);
        const newChords = updated.chordProgression;
        console.log(chalk_1.default.blue('\n📝 和弦进行变更对比:'));
        console.log((0, corrector_1.createSideBySideComparison)(oldChords, newChords));
    }
    if (options.notes) {
        updated = (0, corrector_1.updateNotes)(updated, options.notes, options.author);
        console.log(chalk_1.default.blue('\n📝 备注已更新'));
    }
    (0, store_1.updateAnalysis)(id, updated);
    console.log(chalk_1.default.green('\n✅ 修正已保存'));
});
program
    .command('diff <id>')
    .description('查看和弦进行的历史版本对比')
    .action((id) => {
    const analysis = (0, store_1.getAnalysisById)(id);
    if (!analysis) {
        console.log(chalk_1.default.red(`❌ 未找到ID为 ${id} 的记录`));
        process.exit(1);
    }
    const history = (0, corrector_1.getChordHistory)(analysis);
    console.log(chalk_1.default.blue(`\n📜 和弦进行历史版本 (共${history.length}个版本)\n`));
    for (let i = 0; i < history.length; i++) {
        const v = history[i];
        console.log(chalk_1.default.cyan(`版本 ${v.version}:`));
        console.log(chalk_1.default.gray(`  时间: ${v.timestamp}`));
        console.log(chalk_1.default.gray(`  作者: ${v.author}`));
        console.log(`  和弦: ${(0, corrector_1.formatChordsForDisplay)(v.chords)}`);
        console.log('');
    }
    if (history.length >= 2) {
        console.log(chalk_1.default.blue('最新变更对比:'));
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        console.log((0, corrector_1.createSideBySideComparison)(prev.chords, last.chords));
    }
});
program
    .command('export <id>')
    .description('导出分析报告')
    .option('-f, --format <type>', '导出格式: text|json', 'text')
    .action((id, options) => {
    const analysis = (0, store_1.getAnalysisById)(id);
    if (!analysis) {
        console.log(chalk_1.default.red(`❌ 未找到ID为 ${id} 的记录`));
        process.exit(1);
    }
    let filepath;
    if (options.format === 'json') {
        filepath = (0, exporter_1.exportToJSON)(analysis);
    }
    else {
        filepath = (0, exporter_1.exportToText)(analysis);
    }
    console.log(chalk_1.default.green(`\n✅ 报告已导出至: ${filepath}`));
    console.log(chalk_1.default.gray(`  音频: ${analysis.audioFile}`));
    console.log(chalk_1.default.gray(`  和弦: ${analysis.chordProgression.length}个`));
    console.log('');
});
program
    .command('export-all')
    .description('导出所有记录的对应关系表')
    .action(() => {
    const analyses = (0, store_1.loadAnalyses)();
    if (analyses.length === 0) {
        console.log(chalk_1.default.gray('暂无分析记录\n'));
        return;
    }
    const filepath = (0, exporter_1.exportCorrespondence)(analyses);
    console.log(chalk_1.default.green(`\n✅ 对应关系表已导出至: ${filepath}`));
    console.log('');
});
program
    .command('init-samples')
    .description('初始化样例数据')
    .action(() => {
    const samples = (0, samples_1.getAllSamples)();
    samples.forEach(s => (0, store_1.addAnalysis)(s));
    console.log(chalk_1.default.green(`\n✅ 已添加 ${samples.length} 条样例数据`));
    console.log(chalk_1.default.gray('包括：缺字段记录、晚补记录、备注修改记录、节拍漂移记录'));
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
    const analyses = (0, store_1.loadAnalyses)();
    if (analyses.length === 0) {
        console.log(chalk_1.default.gray('暂无分析记录\n'));
        rl.close();
        return;
    }
    console.log(chalk_1.default.blue('\n🎹 交互式修正模式\n'));
    analyses.forEach((a, i) => {
        console.log(`${i + 1}. ${a.title} (ID: ${a.id}`);
    });
    rl.question('\n请选择要修正的记录编号: ', (answer) => {
        const idx = parseInt(answer) - 1;
        if (idx < 0 || idx >= analyses.length) {
            console.log(chalk_1.default.red('无效的编号'));
            rl.close();
            return;
        }
        const analysis = analyses[idx];
        console.log(chalk_1.default.blue(`\n当前和弦进行: ${(0, corrector_1.formatChordsForDisplay)(analysis.chordProgression)}`));
        rl.question('请输入新的和弦进行: ', (newChords) => {
            rl.question('请输入修改人: ', (author) => {
                const updated = (0, corrector_1.updateChordProgression)(analysis, newChords, author || 'teacher');
                (0, store_1.updateAnalysis)(analysis.id, updated);
                console.log(chalk_1.default.green('\n✅ 修正已保存'));
                console.log((0, corrector_1.createSideBySideComparison)(analysis.chordProgression, updated.chordProgression));
                rl.close();
            });
        });
    });
});
program.parse(process.argv);
