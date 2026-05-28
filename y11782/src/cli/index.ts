#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { dataStore } from '../models/DataStore';
import { getSampleData, getCleanSampleData, getSampleDataWithDescription } from '../data/SampleDataLoader';
import { CheckService } from '../algorithms/CheckService';
import { ReportExporter } from '../exporters/ReportExporter';
import { dataIO } from '../utils/DataIO';
import { CheckReport, DataBundle } from '../models/types';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();
let lastReport: CheckReport | null = null;
const DATA_FILE = path.join(dataIO.getDataDir(), 'current_data.json');

function saveData(): void {
  const bundle = dataStore.exportBundle();
  fs.writeFileSync(DATA_FILE, JSON.stringify(bundle, null, 2), 'utf-8');
}

function loadData(): boolean {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const bundle = JSON.parse(content) as DataBundle;
      dataStore.importBundle(bundle, 'persisted');
      return true;
    } catch (e) {
      console.warn(chalk.yellow('⚠️  数据文件损坏，将使用空数据'));
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
        const { data, description } = getSampleDataWithDescription();
        dataStore.importBundle(data, options.source || 'sample_data');
        dataIO.saveSnapshot(data, 'sample');
        console.log(chalk.green('✅ 样例数据导入成功！'));
        console.log(chalk.gray(description));
      } else if (options.clean) {
        const data = getCleanSampleData();
        dataStore.importBundle(data, options.source || 'clean_sample');
        dataIO.saveSnapshot(data, 'clean');
        console.log(chalk.green('✅ 干净样例数据导入成功！'));
      } else if (options.file) {
        const data = dataIO.importFromFile(options.file);
        dataStore.importBundle(data, options.source || options.file);
        dataIO.saveSnapshot(data, 'imported');
        console.log(chalk.green(`✅ 从文件 ${options.file} 导入成功！`));
      } else {
        console.log(chalk.yellow('⚠️  请指定导入方式：--sample, --clean, 或 --file <path>'));
        return;
      }

      const bundle = dataStore.exportBundle();
      console.log(chalk.cyan(`\n📊 数据统计：`));
      console.log(`  课程: ${bundle.courses.length} 门`);
      console.log(`  先修关系: ${bundle.prerequisites.length} 条`);
      console.log(`  学期计划: ${bundle.semesterPlans.length} 个`);
      console.log(`  替代课程: ${bundle.alternativeCourses.length} 条`);
      console.log(`  学生信息: ${bundle.studentGrades.length} 人`);

      saveData();
      console.log(chalk.gray(`\n💾 数据已保存`));
    } catch (error) {
      console.error(chalk.red(`❌ 导入失败：${(error as Error).message}`));
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
      const bundle = dataStore.exportBundle();

      if (bundle.courses.length === 0) {
        console.log(chalk.yellow('⚠️  没有数据，请先使用 import 命令导入数据'));
        return;
      }

      dataStore.recordCheck();
      const checkService = new CheckService(
        bundle.courses,
        bundle.prerequisites,
        bundle.semesterPlans,
        bundle.alternativeCourses,
        bundle.studentGrades,
        dataStore.getSource()
      );

      console.log(chalk.cyan('🔍 正在执行检查...\n'));

      const report = checkService.runCheck();
      lastReport = report;

      if (options.explain) {
        const explanation = checkService.explainAnomaly(options.explain);
        if (explanation) {
          console.log(chalk.magenta('\n📋 异常详情解释：\n'));
          console.log(explanation);
        } else {
          console.log(chalk.red(`❌ 未找到ID为 ${options.explain} 的异常`));
        }
        return;
      }

      printSummary(report);

      if (options.detail !== false) {
        printAnomalies(report);
      }

      printRecommendations(report);

      dataIO.saveReport(report, 'check_result', 'json');
      console.log(chalk.gray(`\n💾 检查结果已保存到 reports 目录`));
    } catch (error) {
      console.error(chalk.red(`❌ 检查失败：${(error as Error).message}`));
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
        const bundle = dataStore.exportBundle();
        if (bundle.courses.length === 0) {
          console.log(chalk.yellow('⚠️  没有数据，请先导入数据并执行检查'));
          return;
        }

        const checkService = new CheckService(
          bundle.courses,
          bundle.prerequisites,
          bundle.semesterPlans,
          bundle.alternativeCourses,
          bundle.studentGrades,
          dataStore.getSource()
        );
        report = checkService.runCheck();
        lastReport = report;
      }

      const exporter = new ReportExporter(report);
      let filePath: string;

      if (options.output) {
        if (options.format === 'json') {
          dataIO.exportToFile(report as unknown as Parameters<typeof dataIO.exportToFile>[0], options.output);
          filePath = options.output;
        } else if (options.format === 'html') {
          const html = exporter.exportToHTML();
          dataIO.saveReport(html, 'custom', 'html');
          filePath = options.output;
        } else {
          const text = exporter.exportToText();
          dataIO.saveReport(text, 'custom', 'html');
          filePath = options.output;
        }
      } else {
        if (options.format === 'json') {
          filePath = dataIO.saveReport(report, 'report', 'json');
        } else if (options.format === 'html') {
          const html = exporter.exportToHTML();
          filePath = dataIO.saveReport(html, 'report', 'html');
        } else {
          const text = exporter.exportToText();
          filePath = dataIO.saveReport(text, 'report', 'html');
        }
      }

      dataStore.recordExport(options.format, filePath);
      console.log(chalk.green(`✅ 报告已导出到：${filePath}`));
    } catch (error) {
      console.error(chalk.red(`❌ 导出失败：${(error as Error).message}`));
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
        const snapshots = dataIO.listSnapshots();
        if (snapshots.length === 0) {
          console.log(chalk.yellow('⚠️  暂无快照'));
        } else {
          console.log(chalk.cyan('📸 数据快照列表：\n'));
          snapshots.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        }
        return;
      }

      if (options.reports) {
        const reports = dataIO.listReports();
        if (reports.length === 0) {
          console.log(chalk.yellow('⚠️  暂无报告'));
        } else {
          console.log(chalk.cyan('📄 报告列表：\n'));
          reports.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
        }
        return;
      }

      const history = dataStore.getHistory().slice(0, parseInt(options.limit));

      if (history.length === 0) {
        console.log(chalk.yellow('⚠️  暂无操作历史'));
        return;
      }

      const table = new Table({
        head: [chalk.cyan('时间'), chalk.cyan('操作'), chalk.cyan('描述'), chalk.cyan('数据源')],
        colWidths: [25, 10, 40, 20],
        wordWrap: true,
      });

      const actionColors: Record<string, chalk.Chalk> = {
        import: chalk.green,
        modify: chalk.yellow,
        check: chalk.blue,
        export: chalk.magenta,
      };

      history.forEach(record => {
        const color = actionColors[record.action] || chalk.white;
        table.push([
          new Date(record.timestamp).toLocaleString('zh-CN'),
          color(record.action),
          record.description,
          record.dataSource,
        ]);
      });

      console.log(chalk.cyan('📜 操作历史记录：\n'));
      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red(`❌ 获取历史失败：${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('列出当前数据')
  .option('-t, --type <type>', '数据类型：courses, prerequisites, plans, alternatives, students, all', 'all')
  .action(async (options) => {
    try {
      const bundle = dataStore.exportBundle();

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
    } catch (error) {
      console.error(chalk.red(`❌ 列出数据失败：${(error as Error).message}`));
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
      const bundle = dataStore.exportBundle();

      if (bundle.courses.length === 0) {
        console.log(chalk.yellow('⚠️  没有数据，请先导入数据'));
        return;
      }

      const checkService = new CheckService(
        bundle.courses,
        bundle.prerequisites,
        bundle.semesterPlans,
        bundle.alternativeCourses,
        bundle.studentGrades,
        dataStore.getSource()
      );

      if (courseId) {
        const course = bundle.courses.find(c => c.id === courseId || c.id === courseId.toUpperCase());
        if (!course) {
          console.log(chalk.red(`❌ 未找到课程 ${courseId}`));
          return;
        }
        console.log(chalk.magenta(`\n📋 课程 ${course.name} (${course.id}) 解释：\n`));
        const explainer = new (require('../utils/PathExplainer').PathExplainer)(
          bundle.courses,
          bundle.prerequisites,
          bundle.alternativeCourses
        );
        console.log(explainer.explainCourse(course.id));
      }

      if (options.path) {
        const [from, to] = options.path.split('-');
        if (!from || !to) {
          console.log(chalk.red('❌ 路径格式错误，请使用：课程ID-课程ID，如 CS101-CS301'));
          return;
        }
        const explanation = checkService.explainPath(from.trim(), to.trim());
        console.log(chalk.magenta('\n📋 路径解释：\n'));
        console.log(explanation);
      }

      if (options.allPaths) {
        const [from, to] = options.allPaths.split('-');
        if (!from || !to) {
          console.log(chalk.red('❌ 路径格式错误，请使用：课程ID-课程ID，如 CS101-CS301'));
          return;
        }
        const explainer = new (require('../utils/PathExplainer').PathExplainer)(
          bundle.courses,
          bundle.prerequisites,
          bundle.alternativeCourses
        );
        console.log(chalk.magenta('\n📋 所有路径：\n'));
        console.log(explainer.explainAllPaths(from.trim(), to.trim()));
      }

      if (options.anomaly) {
        const explanation = checkService.explainAnomaly(options.anomaly);
        if (explanation) {
          console.log(chalk.magenta('\n📋 异常详情解释：\n'));
          console.log(explanation);
        } else {
          console.log(chalk.red(`❌ 未找到ID为 ${options.anomaly} 的异常，请先执行 check 命令`));
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ 解释失败：${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('topology')
  .description('显示拓扑排序结果')
  .action(async () => {
    try {
      const bundle = dataStore.exportBundle();

      if (bundle.courses.length === 0) {
        console.log(chalk.yellow('⚠️  没有数据，请先导入数据'));
        return;
      }

      const checkService = new CheckService(
        bundle.courses,
        bundle.prerequisites,
        bundle.semesterPlans,
        bundle.alternativeCourses,
        bundle.studentGrades,
        dataStore.getSource()
      );

      const order = checkService.getTopologicalOrder();
      const cycles = checkService.getCycles();

      const courseMap = new Map(bundle.courses.map(c => [c.id, c]));

      console.log(chalk.cyan('🔗 拓扑排序结果：\n'));

      if (order.length > 0) {
        const names = order.map(id => {
          const c = courseMap.get(id);
          return c ? chalk.blue(c.name) : chalk.gray(id);
        });
        console.log(`  ${names.join(' ' + chalk.gray('→') + ' ')}\n`);
      } else {
        console.log(chalk.red('  ⚠️  由于存在循环依赖，无法生成完整的拓扑排序\n'));
      }

      if (cycles.length > 0) {
        console.log(chalk.red('🔴 检测到的循环：\n'));
        cycles.forEach((cycle, index) => {
          const names = cycle.map(id => {
            const c = courseMap.get(id);
            return c ? chalk.red(c.name) : chalk.gray(id);
          });
          console.log(`  #${index + 1}: ${names.join(' ' + chalk.red('→') + ' ')}\n`);
        });
      } else {
        console.log(chalk.green('✅ 未检测到循环依赖\n'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ 拓扑排序失败：${(error as Error).message}`));
      process.exit(1);
    }
  });

function printSummary(report: CheckReport): void {
  console.log(chalk.cyan('='.repeat(60)));
  console.log(chalk.cyan('📊 检查结果概览'));
  console.log(chalk.cyan('='.repeat(60)));

  const table = new Table({
    colWidths: [30, 30],
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  table.push(
    [chalk.white('课程总数'), chalk.bold(report.summary.totalCourses)],
    [chalk.white('先修关系数'), chalk.bold(report.summary.totalPrerequisites)],
    [chalk.white('异常总数'), getColoredValue(report.summary.anomaliesCount, report.summary.anomaliesCount > 0)],
    [chalk.white('  循环依赖'), getColoredValue(report.summary.cyclesCount, report.summary.cyclesCount > 0)],
    [chalk.white('  替代课冲突'), getColoredValue(report.summary.conflictsCount, report.summary.conflictsCount > 0)],
    [chalk.white('  学期超载'), getColoredValue(report.summary.overloadsCount, report.summary.overloadsCount > 0)]
  );

  console.log(table.toString());
  console.log();
}

function printAnomalies(report: CheckReport): void {
  if (report.anomalies.length === 0) {
    console.log(chalk.green('✅ 未检测到任何异常！\n'));
    return;
  }

  console.log(chalk.cyan('='.repeat(60)));
  console.log(chalk.cyan('⚠️  异常详情'));
  console.log(chalk.cyan('='.repeat(60)));
  console.log();

  const typeNames: Record<string, string> = {
    cycle: chalk.red('🔴 循环依赖'),
    alternative_conflict: chalk.yellow('🟠 替代课程冲突'),
    semester_overload: chalk.blue('🟡 学期超载/冲突'),
  };

  const grouped: Record<string, typeof report.anomalies> = {};
  report.anomalies.forEach(a => {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  });

  for (const [type, list] of Object.entries(grouped)) {
    console.log(`${typeNames[type]} (${list.length} 项)`);
    console.log('-'.repeat(60));

    list.forEach((anomaly, index) => {
      const severityColor = anomaly.severity === 'error' ? chalk.red :
                           anomaly.severity === 'warning' ? chalk.yellow : chalk.blue;

      console.log(`\n  ${severityColor(`#${index + 1} ${anomaly.title}`)} [${anomaly.severity.toUpperCase()}]`);
      console.log(`  ID: ${chalk.gray(anomaly.id)}`);
      console.log(`  描述: ${anomaly.description}`);

      if (anomaly.path && anomaly.path.length > 1) {
        const courseMap = new Map(report.dataSnapshot.courses.map(c => [c.id, c]));
        const pathNames = anomaly.path.map(id => {
          const c = courseMap.get(id);
          return c ? c.name : id;
        });
        console.log(`  路径: ${pathNames.join(' → ')}`);
      }

      console.log(`  来源: ${chalk.gray(anomaly.source)}`);
    });

    console.log();
  }
}

function printRecommendations(report: CheckReport): void {
  console.log(chalk.cyan('='.repeat(60)));
  console.log(chalk.cyan('💡 建议措施'));
  console.log(chalk.cyan('='.repeat(60)));
  console.log();

  report.recommendations.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r}`);
  });
  console.log();
}

function printCourses(courses: any[]): void {
  if (courses.length === 0) {
    console.log(chalk.yellow('⚠️  暂无课程数据'));
    return;
  }

  console.log(chalk.cyan('\n📚 课程清单：\n'));
  const table = new Table({
    head: [chalk.cyan('ID'), chalk.cyan('名称'), chalk.cyan('学分'), chalk.cyan('学院'), chalk.cyan('学期'), chalk.cyan('来源')],
    colWidths: [12, 20, 8, 15, 10, 18],
  });

  courses.forEach(c => {
    table.push([c.id, c.name, c.credits, c.department, c.semester || '-', c.source]);
  });

  console.log(table.toString());
}

function printPrerequisites(prerequisites: any[], courses: any[]): void {
  if (prerequisites.length === 0) {
    console.log(chalk.yellow('⚠️  暂先修关系数据'));
    return;
  }

  console.log(chalk.cyan('\n🔗 先修关系：\n'));
  const courseMap = new Map(courses.map(c => [c.id, c]));

  const table = new Table({
    head: [chalk.cyan('先修课'), chalk.cyan(''), chalk.cyan('后续课'), chalk.cyan('类型'), chalk.cyan('来源')],
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

function printSemesterPlans(plans: any[], courses: any[]): void {
  if (plans.length === 0) {
    console.log(chalk.yellow('⚠️  暂无学期计划'));
    return;
  }

  console.log(chalk.cyan('\n📅 学期计划：\n'));
  const courseMap = new Map(courses.map(c => [c.id, c]));

  plans.forEach(plan => {
    const totalCredits = plan.courses.reduce((sum: number, cid: string) => {
      const c = courseMap.get(cid);
      return sum + (c?.credits || 0);
    }, 0);

    console.log(chalk.bold(`  ${plan.studentGrade}年级 第${plan.semester}学期`));
    console.log(`  学分: ${totalCredits}/${plan.maxCredits} | 来源: ${plan.source}`);
    console.log(`  课程: ${plan.courses.map((cid: string) => {
      const c = courseMap.get(cid);
      return c ? `${c.name}(${c.credits})` : cid;
    }).join(', ')}\n`);
  });
}

function printAlternatives(alternatives: any[], courses: any[]): void {
  if (alternatives.length === 0) {
    console.log(chalk.yellow('⚠️  暂无替代课程'));
    return;
  }

  console.log(chalk.cyan('\n🔄 替代课程：\n'));
  const courseMap = new Map(courses.map(c => [c.id, c]));

  const table = new Table({
    head: [chalk.cyan('原课程'), chalk.cyan(''), chalk.cyan('替代课程'), chalk.cyan('原因'), chalk.cyan('来源')],
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

function printStudents(students: any[]): void {
  if (students.length === 0) {
    console.log(chalk.yellow('⚠️  暂无学生数据'));
    return;
  }

  console.log(chalk.cyan('\n👨‍🎓 学生信息：\n'));

  const table = new Table({
    head: [chalk.cyan('学号'), chalk.cyan('姓名'), chalk.cyan('年级'), chalk.cyan('已修课程'), chalk.cyan('来源')],
    colWidths: [10, 10, 8, 35, 18],
    wordWrap: true,
  });

  students.forEach(s => {
    table.push([s.id, s.name, `${s.gradeLevel}年级`, s.completedCourses.join(', ') || '-', s.source]);
  });

  console.log(table.toString());
}

function getColoredValue(value: number, isError: boolean): string {
  if (isError) {
    return chalk.red.bold(String(value));
  }
  return chalk.green.bold(String(value));
}

program.parseAsync(process.argv).catch(error => {
  console.error(chalk.red(`❌ 错误：${error.message}`));
  process.exit(1);
});
