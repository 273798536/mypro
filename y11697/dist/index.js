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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const solver_1 = require("./core/solver");
const validator_1 = require("./core/validator");
const comparison_1 = require("./core/comparison");
const exporter_1 = require("./core/exporter");
const io_1 = require("./utils/io");
const display_1 = require("./cli/display");
const program = new commander_1.Command();
program
    .name('schedule')
    .description('诊所组合优化排班器 CLI')
    .version('1.0.0');
program
    .command('generate')
    .description('生成排班方案')
    .option('-i, --input <dir>', '输入目录', './input')
    .option('-o, --output <dir>', '输出目录', './output')
    .option('-s, --start <date>', '开始日期 (YYYY-MM-DD)')
    .option('-e, --end <date>', '结束日期 (YYYY-MM-DD)')
    .option('-n, --name <name>', '方案名称', '排班方案')
    .option('--iterations <number>', '迭代次数', '1000')
    .option('--no-coverage-priority', '不优先保证科室覆盖')
    .action(async (options) => {
    console.log(chalk_1.default.bold('🏥 诊所组合优化排班器'));
    console.log(chalk_1.default.gray('正在读取输入数据...'));
    const inputData = (0, io_1.readInputData)(options.input);
    if (!inputData) {
        console.error(chalk_1.default.red('❌ 无法读取输入数据，请检查输入目录'));
        process.exit(1);
    }
    const { doctors, departments, leaveRequests, shiftRequirements, fatigueRules, lockedShifts } = inputData;
    const startDate = options.start || shiftRequirements[0]?.date;
    const endDate = options.end || shiftRequirements[shiftRequirements.length - 1]?.date;
    if (!startDate || !endDate) {
        console.error(chalk_1.default.red('❌ 无法确定排班日期范围，请提供 --start 和 --end 参数'));
        process.exit(1);
    }
    console.log(chalk_1.default.green(`✅ 读取到 ${doctors.length} 名医生, ${departments.length} 个科室`));
    console.log(chalk_1.default.green(`✅ 排班周期: ${startDate} 至 ${endDate}`));
    console.log(chalk_1.default.gray('\n正在生成排班方案...'));
    const solver = new solver_1.ScheduleSolver(doctors, departments, leaveRequests, shiftRequirements, fatigueRules, lockedShifts, {
        maxIterations: parseInt(options.iterations),
        prioritizeCoverage: options.coveragePriority,
    });
    const schedule = solver.solve(startDate, endDate, options.name);
    const outputPath = (0, io_1.writeSchedule)(options.output, schedule);
    console.log(chalk_1.default.green(`\n✅ 排班方案已保存至: ${outputPath}`));
    (0, display_1.displayScheduleTable)(schedule, doctors);
    if (schedule.score) {
        (0, display_1.displayScore)(schedule.score);
    }
    (0, display_1.displayViolations)(schedule.violations);
    const errorCount = schedule.violations.filter(v => v.severity === 'error').length;
    if (errorCount > 0) {
        console.log(chalk_1.default.yellow(`\n⚠️  注意：存在 ${errorCount} 个严重冲突，请查看详情后手动调整`));
    }
});
program
    .command('validate')
    .description('验证现有排班方案')
    .option('-i, --input <dir>', '输入目录', './input')
    .option('-f, --file <filename>', '排班文件名称')
    .option('--details', '显示详细冲突信息')
    .action(async (options) => {
    const inputData = (0, io_1.readInputData)(options.input);
    if (!inputData) {
        console.error(chalk_1.default.red('❌ 无法读取输入数据'));
        process.exit(1);
    }
    let schedule = null;
    if (options.file) {
        schedule = (0, io_1.readSchedule)('./output', options.file);
    }
    else {
        const schedules = (0, io_1.listSchedules)('./output');
        if (schedules.length > 0) {
            schedule = (0, io_1.readSchedule)('./output', schedules[0]);
        }
    }
    if (!schedule) {
        console.error(chalk_1.default.red('❌ 无法找到排班文件'));
        process.exit(1);
    }
    const validator = new validator_1.ScheduleValidator(inputData.doctors, inputData.departments, inputData.leaveRequests, inputData.shiftRequirements, inputData.fatigueRules);
    const violations = validator.validate(schedule.entries, schedule.startDate, schedule.endDate);
    (0, display_1.displayScheduleTable)(schedule, inputData.doctors);
    (0, display_1.displayViolations)(violations);
    if (options.details && violations.length > 0) {
        for (const v of violations) {
            (0, display_1.displayViolationDetails)(v);
        }
    }
});
program
    .command('list')
    .description('列出所有排班方案')
    .option('-o, --output <dir>', '输出目录', './output')
    .action(async (options) => {
    const schedules = (0, io_1.listSchedules)(options.output);
    if (schedules.length === 0) {
        console.log(chalk_1.default.yellow('暂无排班方案'));
        return;
    }
    console.log(chalk_1.default.bold('\n📋 排班方案列表:'));
    for (let i = 0; i < schedules.length; i++) {
        const schedule = (0, io_1.readSchedule)(options.output, schedules[i]);
        if (schedule) {
            const errors = schedule.violations.filter(v => v.severity === 'error').length;
            const warnings = schedule.violations.filter(v => v.severity === 'warning').length;
            const score = schedule.score?.totalScore.toFixed(1) || 'N/A';
            console.log(`  ${i + 1}. ${schedule.name}`);
            console.log(`     文件: ${schedules[i]}`);
            console.log(`     周期: ${schedule.startDate} - ${schedule.endDate}`);
            console.log(`     评分: ${score} | 错误: ${errors} | 警告: ${warnings}`);
            console.log();
        }
    }
});
program
    .command('compare')
    .description('比较两个排班方案')
    .option('-o, --output <dir>', '输出目录', './output')
    .argument('<fileA>', '第一个排班文件')
    .argument('<fileB>', '第二个排班文件')
    .action(async (fileA, fileB, options) => {
    const scheduleA = (0, io_1.readSchedule)(options.output, fileA);
    const scheduleB = (0, io_1.readSchedule)(options.output, fileB);
    if (!scheduleA || !scheduleB) {
        console.error(chalk_1.default.red('❌ 无法读取排班文件'));
        process.exit(1);
    }
    const comparison = (0, comparison_1.compareSchedules)(scheduleA, scheduleB);
    (0, display_1.displayComparison)(comparison);
});
program
    .command('export')
    .description('导出排班方案')
    .option('-o, --output <dir>', '输出目录', './output')
    .option('-f, --file <filename>', '排班文件名称')
    .option('-t, --type <type>', '导出类型: ical, csv, doctor-ical', 'ical')
    .option('-d, --doctor <id>', '医生ID (用于 doctor-ical 类型)')
    .option('-i, --input <dir>', '输入目录 (用于获取医生和科室信息)', './input')
    .action(async (options) => {
    const inputData = (0, io_1.readInputData)(options.input);
    if (!inputData) {
        console.error(chalk_1.default.red('❌ 无法读取输入数据'));
        process.exit(1);
    }
    let schedule = null;
    if (options.file) {
        schedule = (0, io_1.readSchedule)(options.output, options.file);
    }
    else {
        const schedules = (0, io_1.listSchedules)(options.output);
        if (schedules.length > 0) {
            schedule = (0, io_1.readSchedule)(options.output, schedules[0]);
        }
    }
    if (!schedule) {
        console.error(chalk_1.default.red('❌ 无法找到排班文件'));
        process.exit(1);
    }
    (0, io_1.ensureDir)(path.join(options.output, 'exports'));
    let outputPath = '';
    let content = '';
    switch (options.type) {
        case 'ical':
            content = (0, exporter_1.exportToICal)(schedule, inputData.doctors, inputData.departments);
            outputPath = path.join(options.output, 'exports', `schedule_${schedule.id}.ics`);
            break;
        case 'csv':
            content = (0, exporter_1.exportToCsv)(schedule, inputData.doctors, inputData.departments);
            outputPath = path.join(options.output, 'exports', `schedule_${schedule.id}.csv`);
            break;
        case 'doctor-ical':
            if (!options.doctor) {
                console.error(chalk_1.default.red('❌ 请提供医生ID (--doctor)'));
                process.exit(1);
            }
            const doctor = inputData.doctors.find(d => d.id === options.doctor);
            content = (0, exporter_1.exportDoctorICal)(schedule, options.doctor, doctor, inputData.departments);
            outputPath = path.join(options.output, 'exports', `doctor_${options.doctor}_${schedule.id}.ics`);
            break;
        default:
            console.error(chalk_1.default.red('❌ 不支持的导出类型'));
            process.exit(1);
    }
    fs.writeFileSync(outputPath, content);
    console.log(chalk_1.default.green(`✅ 已导出至: ${outputPath}`));
});
program
    .command('lock')
    .description('锁定特定班次（手动锁班）')
    .option('-i, --input <dir>', '输入目录', './input')
    .option('-o, --output <dir>', '输出目录', './output')
    .option('-f, --file <filename>', '排班文件名称')
    .option('-d, --doctor <id>', '医生ID')
    .option('--date <date>', '日期 (YYYY-MM-DD)')
    .option('--shift <type>', '班次类型: morning, afternoon, night, off')
    .option('--dept <id>', '科室ID')
    .option('--reason <text>', '锁定原因')
    .action(async (options) => {
    if (!options.doctor || !options.date || !options.shift) {
        console.error(chalk_1.default.red('❌ 请提供医生ID、日期和班次类型'));
        process.exit(1);
    }
    let schedule = null;
    if (options.file) {
        schedule = (0, io_1.readSchedule)(options.output, options.file);
    }
    else {
        const schedules = (0, io_1.listSchedules)(options.output);
        if (schedules.length > 0) {
            schedule = (0, io_1.readSchedule)(options.output, schedules[0]);
        }
    }
    if (!schedule) {
        console.error(chalk_1.default.red('❌ 无法找到排班文件'));
        process.exit(1);
    }
    const entryIndex = schedule.entries.findIndex(e => e.doctorId === options.doctor && e.date === options.date);
    if (entryIndex === -1) {
        console.error(chalk_1.default.red('❌ 找不到对应的排班记录'));
        process.exit(1);
    }
    const now = new Date().toISOString();
    schedule.entries[entryIndex] = {
        ...schedule.entries[entryIndex],
        shiftType: options.shift,
        departmentId: options.dept || schedule.entries[entryIndex].departmentId,
        isLocked: true,
        source: 'manual_lock',
    };
    schedule.auditTrail.push({
        timestamp: now,
        action: 'shift_locked',
        changes: [
            { field: 'shiftType', newValue: options.shift },
            { field: 'isLocked', newValue: true },
            { field: 'reason', newValue: options.reason },
        ],
        source: 'manual',
    });
    schedule.updatedAt = now;
    schedule.version += 1;
    const lockedShiftsPath = path.join(options.input, 'locked-shifts.json');
    let existingLocks = [];
    if (fs.existsSync(lockedShiftsPath)) {
        existingLocks = JSON.parse(fs.readFileSync(lockedShiftsPath, 'utf-8'));
    }
    const newLock = {
        doctorId: options.doctor,
        date: options.date,
        shiftType: options.shift,
        reason: options.reason,
        lockedAt: now,
        source: 'manual',
    };
    existingLocks.push(newLock);
    (0, io_1.writeJsonFile)(lockedShiftsPath, existingLocks);
    const inputData = (0, io_1.readInputData)(options.input);
    const validator = new validator_1.ScheduleValidator(inputData.doctors, inputData.departments, inputData.leaveRequests, inputData.shiftRequirements, inputData.fatigueRules);
    schedule.violations = validator.validate(schedule.entries, schedule.startDate, schedule.endDate);
    const outputPath = (0, io_1.writeSchedule)(options.output, schedule);
    console.log(chalk_1.default.green(`✅ 班次已锁定，新方案保存至: ${outputPath}`));
    (0, display_1.displayViolations)(schedule.violations.filter(v => v.doctorId === options.doctor && v.date === options.date));
});
program
    .command('init')
    .description('初始化示例输入文件')
    .option('-i, --input <dir>', '输入目录', './input')
    .action(async (options) => {
    (0, io_1.ensureDir)(options.input);
    const doctors = [
        { id: 'doc1', name: '张医生', departments: ['dept1', 'dept2'], skills: ['general'], maxWeeklyHours: 40, source: 'doctors.json' },
        { id: 'doc2', name: '李医生', departments: ['dept1'], skills: ['general'], maxWeeklyHours: 40, source: 'doctors.json' },
        { id: 'doc3', name: '王医生', departments: ['dept2'], skills: ['specialist'], maxWeeklyHours: 36, preferences: { preferredShifts: ['morning'] }, source: 'doctors.json' },
        { id: 'doc4', name: '赵医生', departments: ['dept1', 'dept2'], skills: ['general'], maxWeeklyHours: 40, preferences: { avoidedShifts: ['night'] }, source: 'doctors.json' },
    ];
    const departments = [
        { id: 'dept1', name: '内科', requiredSkills: ['general'], source: 'departments.json' },
        { id: 'dept2', name: '外科', requiredSkills: ['general'], source: 'departments.json' },
    ];
    const leaveRequests = [
        { id: 'leave1', doctorId: 'doc1', startDate: '2024-01-03', endDate: '2024-01-05', type: 'vacation', reason: '年假', source: 'leave-requests.json' },
    ];
    const shiftRequirements = [];
    for (let day = 1; day <= 7; day++) {
        const date = `2024-01-${String(day).padStart(2, '0')}`;
        shiftRequirements.push({ date, shiftType: 'morning', departmentId: 'dept1', requiredDoctors: 1, source: 'shift-requirements.json' });
        shiftRequirements.push({ date, shiftType: 'afternoon', departmentId: 'dept1', requiredDoctors: 1, source: 'shift-requirements.json' });
        shiftRequirements.push({ date, shiftType: 'night', departmentId: 'dept1', requiredDoctors: 1, source: 'shift-requirements.json' });
        shiftRequirements.push({ date, shiftType: 'morning', departmentId: 'dept2', requiredDoctors: 1, source: 'shift-requirements.json' });
        shiftRequirements.push({ date, shiftType: 'night', departmentId: 'dept2', requiredDoctors: 1, source: 'shift-requirements.json' });
    }
    const fatigueRules = {
        maxConsecutiveShifts: 5,
        maxConsecutiveNights: 2,
        minHoursBetweenShifts: 12,
        nightShiftRecoveryDays: 1,
        weeklyHourLimit: 40,
        source: 'fatigue-rules.json',
    };
    const lockedShifts = [];
    (0, io_1.writeJsonFile)(path.join(options.input, 'doctors.json'), doctors);
    (0, io_1.writeJsonFile)(path.join(options.input, 'departments.json'), departments);
    (0, io_1.writeJsonFile)(path.join(options.input, 'leave-requests.json'), leaveRequests);
    (0, io_1.writeJsonFile)(path.join(options.input, 'shift-requirements.json'), shiftRequirements);
    (0, io_1.writeJsonFile)(path.join(options.input, 'fatigue-rules.json'), fatigueRules);
    (0, io_1.writeJsonFile)(path.join(options.input, 'locked-shifts.json'), lockedShifts);
    console.log(chalk_1.default.green(`✅ 示例输入文件已创建在: ${options.input}`));
    console.log(chalk_1.default.gray('  - doctors.json: 医生名单'));
    console.log(chalk_1.default.gray('  - departments.json: 科室'));
    console.log(chalk_1.default.gray('  - leave-requests.json: 请假单'));
    console.log(chalk_1.default.gray('  - shift-requirements.json: 班次需求'));
    console.log(chalk_1.default.gray('  - fatigue-rules.json: 疲劳规则'));
    console.log(chalk_1.default.gray('  - locked-shifts.json: 锁定班次'));
    console.log(chalk_1.default.yellow('\n💡 运行 "schedule generate" 生成第一个排班方案'));
});
program.parseAsync(process.argv).catch(console.error);
//# sourceMappingURL=index.js.map