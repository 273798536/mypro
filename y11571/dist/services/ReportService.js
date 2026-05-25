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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = exports.ReportService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FileStorage_1 = require("../storage/FileStorage");
const CheckService_1 = require("./CheckService");
class ReportService {
    generateReport() {
        const tickets = FileStorage_1.storage.getTickets();
        const slaRules = FileStorage_1.storage.getSLARules();
        const compensations = FileStorage_1.storage.getCompensationApprovals();
        const importErrors = FileStorage_1.storage.getImportErrors();
        const checkResult = CheckService_1.checkService.runAllChecks();
        const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'pending');
        const escalatedTickets = tickets.filter((t) => t.status === 'escalated');
        const pendingApprovals = compensations.filter((c) => c.status === 'pending');
        const totalCompensation = compensations
            .filter((c) => c.status === 'approved')
            .reduce((sum, c) => sum + c.amount, 0);
        return {
            summary: {
                totalTickets: tickets.length,
                openTickets: openTickets.length,
                escalatedTickets: escalatedTickets.length,
                slaViolations: checkResult.slaViolations.length,
                totalCompensation,
                pendingApprovals: pendingApprovals.length,
            },
            tickets,
            slaViolations: checkResult.slaViolations,
            pendingCompensations: pendingApprovals,
            failedRecords: importErrors,
            assignmentConflicts: checkResult.assignmentConflicts,
        };
    }
    generateTextReport() {
        const report = this.generateReport();
        const lines = [];
        lines.push('='.repeat(60));
        lines.push('客服工单升级巡检报表');
        lines.push('='.repeat(60));
        lines.push('');
        lines.push('【汇总信息】');
        lines.push(`  总工单数: ${report.summary.totalTickets}`);
        lines.push(`  处理中工单: ${report.summary.openTickets}`);
        lines.push(`  已升级工单: ${report.summary.escalatedTickets}`);
        lines.push(`  SLA违规数: ${report.summary.slaViolations}`);
        lines.push(`  已批补偿总额: ¥${report.summary.totalCompensation.toFixed(2)}`);
        lines.push(`  待审批补偿: ${report.summary.pendingApprovals}`);
        lines.push('');
        if (report.slaViolations.length > 0) {
            lines.push('【SLA违规清单】');
            lines.push('  ' + '-'.repeat(56));
            lines.push(`  ${"工单号".padEnd(15)} ${"规则名称".padEnd(20)} ${"截止时间".padEnd(20)}`);
            lines.push('  ' + '-'.repeat(56));
            for (const violation of report.slaViolations.slice(0, 10)) {
                const ticket = report.tickets.find((t) => t.id === violation.ticketId);
                const ticketNo = ticket?.ticketNo || 'N/A';
                lines.push(`  ${ticketNo.padEnd(15)} ${violation.ruleName.padEnd(20)} ${violation.deadline.slice(0, 19).padEnd(20)}`);
            }
            if (report.slaViolations.length > 10) {
                lines.push(`  ... 还有 ${report.slaViolations.length - 10} 条记录`);
            }
            lines.push('');
        }
        if (report.assignmentConflicts.length > 0) {
            lines.push('【转派冲突清单（多次转派需关注责任划分）】');
            lines.push('  ' + '-'.repeat(70));
            lines.push(`  ${"工单号".padEnd(15)} ${"转派次数".padEnd(10)} ${"涉及责任人".padEnd(25)} ${"补偿金额".padEnd(10)}`);
            lines.push('  ' + '-'.repeat(70));
            for (const conflict of report.assignmentConflicts) {
                const responsible = conflict.timeoutResponsible.join(',') || '-';
                lines.push(`  ${conflict.ticketNo.padEnd(15)} ${String(conflict.transfers.length).padEnd(10)} ${responsible.padEnd(25)} ¥${String(conflict.compensationAmount).padEnd(8)}`);
            }
            lines.push('');
        }
        if (report.pendingCompensations.length > 0) {
            lines.push('【待审批补偿清单】');
            lines.push('  ' + '-'.repeat(60));
            lines.push(`  ${"工单号".padEnd(20)} ${"金额".padEnd(12)} ${"原因".padEnd(28)}`);
            lines.push('  ' + '-'.repeat(60));
            for (const comp of report.pendingCompensations) {
                const ticket = report.tickets.find((t) => t.id === comp.ticketId);
                const ticketNo = ticket?.ticketNo || comp.ticketId.slice(0, 8);
                const reason = comp.reason.slice(0, 25) + (comp.reason.length > 25 ? '...' : '');
                lines.push(`  ${ticketNo.padEnd(20)} ¥${String(comp.amount).padEnd(10)} ${reason.padEnd(28)}`);
            }
            lines.push('');
        }
        if (report.failedRecords.length > 0) {
            lines.push('【导入失败清单】');
            lines.push('  ' + '-'.repeat(70));
            lines.push(`  ${"原始行号".padEnd(10)} ${"记录类型".padEnd(15)} ${"错误类型".padEnd(18)} ${"错误信息".padEnd(25)}`);
            lines.push('  ' + '-'.repeat(70));
            for (const err of report.failedRecords.slice(0, 15)) {
                const msg = err.errorMessage.slice(0, 22) + (err.errorMessage.length > 22 ? '...' : '');
                lines.push(`  ${String(err.originalRowNumber).padEnd(10)} ${err.recordType.padEnd(15)} ${err.errorType.padEnd(18)} ${msg.padEnd(25)}`);
            }
            if (report.failedRecords.length > 15) {
                lines.push(`  ... 还有 ${report.failedRecords.length - 15} 条失败记录`);
            }
            lines.push('');
        }
        lines.push('='.repeat(60));
        lines.push(`报表生成时间: ${new Date().toLocaleString()}`);
        lines.push('='.repeat(60));
        return lines.join('\n');
    }
    saveReportToFile(filePath) {
        const report = this.generateTextReport();
        const fileName = `report_${Date.now()}.txt`;
        const actualPath = filePath || path.join(FileStorage_1.storage.getExportDir(), fileName);
        fs.writeFileSync(actualPath, report, 'utf-8');
        return actualPath;
    }
}
exports.ReportService = ReportService;
exports.reportService = new ReportService();
//# sourceMappingURL=ReportService.js.map