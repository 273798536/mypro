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
const cli_table3_1 = __importDefault(require("cli-table3"));
const DataStore_1 = require("../models/DataStore");
const SampleDataLoader_1 = require("../data/SampleDataLoader");
const CheckService_1 = require("../algorithms/CheckService");
const ReportExporter_1 = require("../exporters/ReportExporter");
const DataIO_1 = require("../utils/DataIO");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const program = new commander_1.Command();
let lastReport = null;
const DATA_FILE = path.join(DataIO_1.dataIO.getDataDir(), 'current_data.json');
function saveData() {
    const bundle = DataStore_1.dataStore.exportBundle();
    fs.writeFileSync(DATA_FILE, JSON.stringify(bundle, null, 2), 'utf-8');
}
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const content = fs.readFileSync(DATA_FILE, 'utf-8');
            const bundle = JSON.parse(content);
            DataStore_1.dataStore.importBundle(bundle, 'persisted');
            return true;
        }
        catch (e) {
            console.warn(chalk_1.default.yellow('⚠️  数据文件损坏，将使用空数据'));
        }
    }
    return false;
}
loadData();
program
    .name('course-check')
    .description('课程先修图检查CLI工具 - 检测循环依赖、替代课冲突、学期超载')
    .version('1.0.0');
program
    .command('import')
    .description('导入数据')
    .option('-s, --sample', '导入内置样例数据（含异常）')
    .option('-c, --clean', '导入干净的样例数据（无异常）')
    .option('-f, --file <path>', '从JSON文件导入')
    .option('--source <name>', '数据源名称', 'manual')
    .action(async (options) => {
    try {
        if (options.sample) {
            const { data, description } = (0, SampleDataLoader_1.getSampleDataWithDescription)();
            DataStore_1.dataStore.importBundle(data, options.source || 'sample_data');
            DataIO_1.dataIO.saveSnapshot(data, 'sample');
            console.log(chalk_1.default.green('✅ 样例数据导入成功！'));
            console.log(chalk_1.default.gray(description));
        }
        else if (options.clean) {
            const data = (0, SampleDataLoader_1.getCleanSampleData)();
            DataStore_1.dataStore.importBundle(data, options.source || 'clean_sample');
            DataIO_1.dataIO.saveSnapshot(data, 'clean');
            console.log(chalk_1.default.green('✅ 干净样例数据导入成功！'));
        }
        else if (options.file) {
            const data = DataIO_1.dataIO.importFromFile(options.file);
            DataStore_1.dataStore.importBundle(data, options.source || options.file);
            DataIO_1.dataIO.saveSnapshot(data, 'imported');
            console.log(chalk_1.default.green(`✅ 从文件 ${options.file} 导入成功！`));
        }
        else {
            console.log(chalk_1.default.yellow('⚠️  请指定导入方式：--sample, --clean, 或 --file <path>'));
            return;
        }
        const bundle = DataStore_1.dataStore.exportBundle();
        console.log(chalk_1.default.cyan(`\n📊 数据统计：`));
        console.log(`  课程: ${bundle.courses.length} 门`);
        console.log(`  先修关系: ${bundle.prerequisites.length} 条`);
        console.log(`  学期计划: ${bundle.semesterPlans.length} 个`);
        console.log(`  替代课程: ${bundle.alternativeCourses.length} 条`);
        console.log(`  学生信息: ${bundle.studentGrades.length} 人`);
        saveData();
        console.log(chalk_1.default.gray(`\n💾 数据已保存`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 导入失败：${error.message}`));
        process.exit(1);
    }
});
program
    .command('check')
    .description('执行课程先修关系检查')
    .option('--no-detail', '不显示详细异常信息')
    .option('--explain <id>', '解释指定的异常')
    .action(async (options) => {
    try {
        const bundle = DataStore_1.dataStore.exportBundle();
        if (bundle.courses.length === 0) {
            console.log(chalk_1.default.yellow('⚠️  没有数据，请先使用 import 命令导入数据'));
            return;
        }
        DataStore_1.dataStore.recordCheck();
        const checkService = new CheckService_1.CheckService(bundle.courses, bundle.prerequisites, bundle.semesterPlans, bundle.alternativeCourses, bundle.studentGrades, DataStore_1.dataStore.getSource());
        console.log(chalk_1.default.cyan('🔍 正在执行检查...\n'));
        const report = checkService.runCheck();
        lastReport = report;
        if (options.explain) {
            const explanation = checkService.explainAnomaly(options.explain);
            if (explanation) {
                console.log(chalk_1.default.magenta('\n📋 异常详情解释：\n'));
                console.log(explanation);
            }
            else {
                console.log(chalk_1.default.red(`❌ 未找到ID为 ${options.explain} 的异常`));
            }
            return;
        }
        printSummary(report);
        if (options.detail !== false) {
            printAnomalies(report);
        }
        printRecommendations(report);
        DataIO_1.dataIO.saveReport(report, 'check_result', 'json');
        console.log(chalk_1.default.gray(`\n💾 检查结果已保存到 reports 目录`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 检查失败：${error.message}`));
        process.exit(1);
    }
});
program
    .command('export')
    .description('导出检查报告')
    .option('-f, --format <type>', '导出格式：json, html, text', 'html')
    .option('-o, --output <path>', '输出文件路径')
    .action(async (options) => {
    try {
        let report = lastReport;
        if (!report) {
            const bundle = DataStore_1.dataStore.exportBundle();
            if (bundle.courses.length === 0) {
                console.log(chalk_1.default.yellow('⚠️  没有数据，请先导入数据并执行检查'));
                return;
            }
            const checkService = new CheckService_1.CheckService(bundle.courses, bundle.prerequisites, bundle.semesterPlans, bundle.alternativeCourses, bundle.studentGrades, DataStore_1.dataStore.getSource());
            report = checkService.runCheck();
            lastReport = report;
        }
        const exporter = new ReportExporter_1.ReportExporter(report);
        let filePath;
        if (options.output) {
            if (options.format === 'json') {
                DataIO_1.dataIO.exportToFile(report, options.output);
                filePath = options.output;
            }
            else if (options.format === 'html') {
                const html = exporter.exportToHTML();
                DataIO_1.dataIO.saveReport(html, 'custom', 'html');
                filePath = options.output;
            }
            else {
                const text = exporter.exportToText();
                DataIO_1.dataIO.saveReport(text, 'custom', 'html');
                filePath = options.output;
            }
        }
        else {
            if (options.format === 'json') {
                filePath = DataIO_1.dataIO.saveReport(report, 'report', 'json');
            }
            else if (options.format === 'html') {
                const html = exporter.exportToHTML();
                filePath = DataIO_1.dataIO.saveReport(html, 'report', 'html');
            }
            else {
                const text = exporter.exportToText();
                filePath = DataIO_1.dataIO.saveReport(text, 'report', 'html');
            }
        }
        DataStore_1.dataStore.recordExport(options.format, filePath);
        console.log(chalk_1.default.green(`✅ 报告已导出到：${filePath}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 导出失败：${error.message}`));
        process.exit(1);
    }
});
program
    .command('history')
    .description('查看操作历史')
    .option('-n, --limit <number>', '显示最近N条记录', '20')
    .option('--snapshots', '列出所有数据快照')
    .option('--reports', '列出所有报告')
    .action(async (options) => {
    try {
        if (options.snapshots) {
            const snapshots = DataIO_1.dataIO.listSnapshots();
            if (snapshots.length === 0) {
                console.log(chalk_1.default.yellow('⚠️  暂无快照'));
            }
            else {
                console.log(chalk_1.default.cyan('📸 数据快照列表：\n'));
                snapshots.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
            }
            return;
        }
        if (options.reports) {
            const reports = DataIO_1.dataIO.listReports();
            if (reports.length === 0) {
                console.log(chalk_1.default.yellow('⚠️  暂无报告'));
            }
            else {
                console.log(chalk_1.default.cyan('📄 报告列表：\n'));
                reports.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
            }
            return;
        }
        const history = DataStore_1.dataStore.getHistory().slice(0, parseInt(options.limit));
        if (history.length === 0) {
            console.log(chalk_1.default.yellow('⚠️  暂无操作历史'));
            return;
        }
        const table = new cli_table3_1.default({
            head: [chalk_1.default.cyan('时间'), chalk_1.default.cyan('操作'), chalk_1.default.cyan('描述'), chalk_1.default.cyan('数据源')],
            colWidths: [25, 10, 40, 20],
            wordWrap: true,
        });
        const actionColors = {
            import: chalk_1.default.green,
            modify: chalk_1.default.yellow,
            check: chalk_1.default.blue,
            export: chalk_1.default.magenta,
        };
        history.forEach(record => {
            const color = actionColors[record.action] || chalk_1.default.white;
            table.push([
                new Date(record.timestamp).toLocaleString('zh-CN'),
                color(record.action),
                record.description,
                record.dataSource,
            ]);
        });
        console.log(chalk_1.default.cyan('📜 操作历史记录：\n'));
        console.log(table.toString());
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 获取历史失败：${error.message}`));
        process.exit(1);
    }
});
program
    .command('list')
    .description('列出当前数据')
    .option('-t, --type <type>', '数据类型：courses, prerequisites, plans, alternatives, students, all', 'all')
    .action(async (options) => {
    try {
        const bundle = DataStore_1.dataStore.exportBundle();
        const type = options.type.toLowerCase();
        if (type === 'courses' || type === 'all') {
            printCourses(bundle.courses);
        }
        if (type === 'prerequisites' || type === 'all') {
            printPrerequisites(bundle.prerequisites, bundle.courses);
        }
        if (type === 'plans' || type === 'all') {
            printSemesterPlans(bundle.semesterPlans, bundle.courses);
        }
        if (type === 'alternatives' || type === 'all') {
            printAlternatives(bundle.alternativeCourses, bundle.courses);
        }
        if (type === 'students' || type === 'all') {
            printStudents(bundle.studentGrades);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 列出数据失败：${error.message}`));
        process.exit(1);
    }
});
program
    .command('explain [courseId]')
    .description('解释课程路径或异常')
    .option('-p, --path <from-to>', '解释课程路径，如：CS101-CS301')
    .option('-a, --anomaly <id>', '解释指定异常ID')
    .option('--all-paths <from-to>', '显示所有可能的路径')
    .action(async (courseId, options) => {
    try {
        const bundle = DataStore_1.dataStore.exportBundle();
        if (bundle.courses.length === 0) {
            console.log(chalk_1.default.yellow('⚠️  没有数据，请先导入数据'));
            return;
        }
        const checkService = new CheckService_1.CheckService(bundle.courses, bundle.prerequisites, bundle.semesterPlans, bundle.alternativeCourses, bundle.studentGrades, DataStore_1.dataStore.getSource());
        if (courseId) {
            const course = bundle.courses.find(c => c.id === courseId || c.id === courseId.toUpperCase());
            if (!course) {
                console.log(chalk_1.default.red(`❌ 未找到课程 ${courseId}`));
                return;
            }
            console.log(chalk_1.default.magenta(`\n📋 课程 ${course.name} (${course.id}) 解释：\n`));
            const explainer = new (require('../utils/PathExplainer').PathExplainer)(bundle.courses, bundle.prerequisites, bundle.alternativeCourses);
            console.log(explainer.explainCourse(course.id));
        }
        if (options.path) {
            const [from, to] = options.path.split('-');
            if (!from || !to) {
                console.log(chalk_1.default.red('❌ 路径格式错误，请使用：课程ID-课程ID，如 CS101-CS301'));
                return;
            }
            const explanation = checkService.explainPath(from.trim(), to.trim());
            console.log(chalk_1.default.magenta('\n📋 路径解释：\n'));
            console.log(explanation);
        }
        if (options.allPaths) {
            const [from, to] = options.allPaths.split('-');
            if (!from || !to) {
                console.log(chalk_1.default.red('❌ 路径格式错误，请使用：课程ID-课程ID，如 CS101-CS301'));
                return;
            }
            const explainer = new (require('../utils/PathExplainer').PathExplainer)(bundle.courses, bundle.prerequisites, bundle.alternativeCourses);
            console.log(chalk_1.default.magenta('\n📋 所有路径：\n'));
            console.log(explainer.explainAllPaths(from.trim(), to.trim()));
        }
        if (options.anomaly) {
            const explanation = checkService.explainAnomaly(options.anomaly);
            if (explanation) {
                console.log(chalk_1.default.magenta('\n📋 异常详情解释：\n'));
                console.log(explanation);
            }
            else {
                console.log(chalk_1.default.red(`❌ 未找到ID为 ${options.anomaly} 的异常，请先执行 check 命令`));
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 解释失败：${error.message}`));
        process.exit(1);
    }
});
program
    .command('topology')
    .description('显示拓扑排序结果')
    .action(async () => {
    try {
        const bundle = DataStore_1.dataStore.exportBundle();
        if (bundle.courses.length === 0) {
            console.log(chalk_1.default.yellow('⚠️  没有数据，请先导入数据'));
            return;
        }
        const checkService = new CheckService_1.CheckService(bundle.courses, bundle.prerequisites, bundle.semesterPlans, bundle.alternativeCourses, bundle.studentGrades, DataStore_1.dataStore.getSource());
        const order = checkService.getTopologicalOrder();
        const cycles = checkService.getCycles();
        const courseMap = new Map(bundle.courses.map(c => [c.id, c]));
        console.log(chalk_1.default.cyan('🔗 拓扑排序结果：\n'));
        if (order.length > 0) {
            const names = order.map(id => {
                const c = courseMap.get(id);
                return c ? chalk_1.default.blue(c.name) : chalk_1.default.gray(id);
            });
            console.log(`  ${names.join(' ' + chalk_1.default.gray('→') + ' ')}\n`);
        }
        else {
            console.log(chalk_1.default.red('  ⚠️  由于存在循环依赖，无法生成完整的拓扑排序\n'));
        }
        if (cycles.length > 0) {
            console.log(chalk_1.default.red('🔴 检测到的循环：\n'));
            cycles.forEach((cycle, index) => {
                const names = cycle.map(id => {
                    const c = courseMap.get(id);
                    return c ? chalk_1.default.red(c.name) : chalk_1.default.gray(id);
                });
                console.log(`  #${index + 1}: ${names.join(' ' + chalk_1.default.red('→') + ' ')}\n`);
            });
        }
        else {
            console.log(chalk_1.default.green('✅ 未检测到循环依赖\n'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ 拓扑排序失败：${error.message}`));
        process.exit(1);
    }
});
function printSummary(report) {
    console.log(chalk_1.default.cyan('='.repeat(60)));
    console.log(chalk_1.default.cyan('📊 检查结果概览'));
    console.log(chalk_1.default.cyan('='.repeat(60)));
    const table = new cli_table3_1.default({
        colWidths: [30, 30],
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    });
    table.push([chalk_1.default.white('课程总数'), chalk_1.default.bold(report.summary.totalCourses)], [chalk_1.default.white('先修关系数'), chalk_1.default.bold(report.summary.totalPrerequisites)], [chalk_1.default.white('异常总数'), getColoredValue(report.summary.anomaliesCount, report.summary.anomaliesCount > 0)], [chalk_1.default.white('  循环依赖'), getColoredValue(report.summary.cyclesCount, report.summary.cyclesCount > 0)], [chalk_1.default.white('  替代课冲突'), getColoredValue(report.summary.conflictsCount, report.summary.conflictsCount > 0)], [chalk_1.default.white('  学期超载'), getColoredValue(report.summary.overloadsCount, report.summary.overloadsCount > 0)]);
    console.log(table.toString());
    console.log();
}
function printAnomalies(report) {
    if (report.anomalies.length === 0) {
        console.log(chalk_1.default.green('✅ 未检测到任何异常！\n'));
        return;
    }
    console.log(chalk_1.default.cyan('='.repeat(60)));
    console.log(chalk_1.default.cyan('⚠️  异常详情'));
    console.log(chalk_1.default.cyan('='.repeat(60)));
    console.log();
    const typeNames = {
        cycle: chalk_1.default.red('🔴 循环依赖'),
        alternative_conflict: chalk_1.default.yellow('🟠 替代课程冲突'),
        semester_overload: chalk_1.default.blue('🟡 学期超载/冲突'),
    };
    const grouped = {};
    report.anomalies.forEach(a => {
        if (!grouped[a.type])
            grouped[a.type] = [];
        grouped[a.type].push(a);
    });
    for (const [type, list] of Object.entries(grouped)) {
        console.log(`${typeNames[type]} (${list.length} 项)`);
        console.log('-'.repeat(60));
        list.forEach((anomaly, index) => {
            const severityColor = anomaly.severity === 'error' ? chalk_1.default.red :
                anomaly.severity === 'warning' ? chalk_1.default.yellow : chalk_1.default.blue;
            console.log(`\n  ${severityColor(`#${index + 1} ${anomaly.title}`)} [${anomaly.severity.toUpperCase()}]`);
            console.log(`  ID: ${chalk_1.default.gray(anomaly.id)}`);
            console.log(`  描述: ${anomaly.description}`);
            if (anomaly.path && anomaly.path.length > 1) {
                const courseMap = new Map(report.dataSnapshot.courses.map(c => [c.id, c]));
                const pathNames = anomaly.path.map(id => {
                    const c = courseMap.get(id);
                    return c ? c.name : id;
                });
                console.log(`  路径: ${pathNames.join(' → ')}`);
            }
            console.log(`  来源: ${chalk_1.default.gray(anomaly.source)}`);
        });
        console.log();
    }
}
function printRecommendations(report) {
    console.log(chalk_1.default.cyan('='.repeat(60)));
    console.log(chalk_1.default.cyan('💡 建议措施'));
    console.log(chalk_1.default.cyan('='.repeat(60)));
    console.log();
    report.recommendations.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r}`);
    });
    console.log();
}
function printCourses(courses) {
    if (courses.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  暂无课程数据'));
        return;
    }
    console.log(chalk_1.default.cyan('\n📚 课程清单：\n'));
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan('ID'), chalk_1.default.cyan('名称'), chalk_1.default.cyan('学分'), chalk_1.default.cyan('学院'), chalk_1.default.cyan('学期'), chalk_1.default.cyan('来源')],
        colWidths: [12, 20, 8, 15, 10, 18],
    });
    courses.forEach(c => {
        table.push([c.id, c.name, c.credits, c.department, c.semester || '-', c.source]);
    });
    console.log(table.toString());
}
function printPrerequisites(prerequisites, courses) {
    if (prerequisites.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  暂先修关系数据'));
        return;
    }
    console.log(chalk_1.default.cyan('\n🔗 先修关系：\n'));
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan('先修课'), chalk_1.default.cyan(''), chalk_1.default.cyan('后续课'), chalk_1.default.cyan('类型'), chalk_1.default.cyan('来源')],
        colWidths: [25, 5, 25, 10, 20],
    });
    prerequisites.forEach(p => {
        const pre = courseMap.get(p.prerequisiteId);
        const post = courseMap.get(p.courseId);
        table.push([
            pre ? `${pre.name} (${p.prerequisiteId})` : p.prerequisiteId,
            '→',
            post ? `${post.name} (${p.courseId})` : p.courseId,
            p.type === 'required' ? '必修' : '共修',
            p.source,
        ]);
    });
    console.log(table.toString());
}
function printSemesterPlans(plans, courses) {
    if (plans.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  暂无学期计划'));
        return;
    }
    console.log(chalk_1.default.cyan('\n📅 学期计划：\n'));
    const courseMap = new Map(courses.map(c => [c.id, c]));
    plans.forEach(plan => {
        const totalCredits = plan.courses.reduce((sum, cid) => {
            const c = courseMap.get(cid);
            return sum + (c?.credits || 0);
        }, 0);
        console.log(chalk_1.default.bold(`  ${plan.studentGrade}年级 第${plan.semester}学期`));
        console.log(`  学分: ${totalCredits}/${plan.maxCredits} | 来源: ${plan.source}`);
        console.log(`  课程: ${plan.courses.map((cid) => {
            const c = courseMap.get(cid);
            return c ? `${c.name}(${c.credits})` : cid;
        }).join(', ')}\n`);
    });
}
function printAlternatives(alternatives, courses) {
    if (alternatives.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  暂无替代课程'));
        return;
    }
    console.log(chalk_1.default.cyan('\n🔄 替代课程：\n'));
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan('原课程'), chalk_1.default.cyan(''), chalk_1.default.cyan('替代课程'), chalk_1.default.cyan('原因'), chalk_1.default.cyan('来源')],
        colWidths: [25, 5, 25, 20, 20],
    });
    alternatives.forEach(a => {
        const orig = courseMap.get(a.originalId);
        const alt = courseMap.get(a.alternativeId);
        table.push([
            orig ? `${orig.name} (${a.originalId})` : a.originalId,
            '⇄',
            alt ? `${alt.name} (${a.alternativeId})` : a.alternativeId,
            a.reason,
            a.source,
        ]);
    });
    console.log(table.toString());
}
function printStudents(students) {
    if (students.length === 0) {
        console.log(chalk_1.default.yellow('⚠️  暂无学生数据'));
        return;
    }
    console.log(chalk_1.default.cyan('\n👨‍🎓 学生信息：\n'));
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan('学号'), chalk_1.default.cyan('姓名'), chalk_1.default.cyan('年级'), chalk_1.default.cyan('已修课程'), chalk_1.default.cyan('来源')],
        colWidths: [10, 10, 8, 35, 18],
        wordWrap: true,
    });
    students.forEach(s => {
        table.push([s.id, s.name, `${s.gradeLevel}年级`, s.completedCourses.join(', ') || '-', s.source]);
    });
    console.log(table.toString());
}
function getColoredValue(value, isError) {
    if (isError) {
        return chalk_1.default.red.bold(String(value));
    }
    return chalk_1.default.green.bold(String(value));
}
program.parseAsync(process.argv).catch(error => {
    console.error(chalk_1.default.red(`❌ 错误：${error.message}`));
    process.exit(1);
});
//# sourceMappingURL=index.js.map