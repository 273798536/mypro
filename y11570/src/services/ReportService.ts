import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TicketDao } from '../daos/TicketDao';
import { TicketStateMachine } from '../state-machine/TicketStateMachine';
import { BatchService } from './BatchService';
import { OperationsViewService } from './OperationsViewService';
import {
  Ticket,
  Batch,
  InventoryDifference,
  StateTransition,
  TimeoutRecord,
  AssignmentRecord,
  CompensationApproval,
  SLARule,
  FailedRecord
} from '../types';

export interface ReportOptions {
  includeTicketDetails?: boolean;
  includeInventory?: boolean;
  includeTimeouts?: boolean;
  includeAssignments?: boolean;
  includeTransitions?: boolean;
  includeCompensation?: boolean;
  includeResponsibility?: boolean;
  format?: 'markdown' | 'html';
}

export interface GeneratedReport {
  reportId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  reportType: string;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  summary: {
    ticketCount: number;
    batchCount: number;
    inventoryDiffCount: number;
    totalCompensation: number;
    timeoutCount: number;
  };
}

export class ReportService {
  private dao: TicketDao;
  private stateMachine: TicketStateMachine;
  private batchService: BatchService;
  private operationsViewService: OperationsViewService;
  private reportsDir: string;

  constructor(
    dao: TicketDao,
    stateMachine: TicketStateMachine,
    batchService: BatchService,
    operationsViewService: OperationsViewService
  ) {
    this.dao = dao;
    this.stateMachine = stateMachine;
    this.batchService = batchService;
    this.operationsViewService = operationsViewService;

    this.reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generateTicketReport(
    ticketId: string,
    options: ReportOptions,
    generatedBy: string
  ): Promise<GeneratedReport> {
    const ticket = await this.dao.getTicketById(ticketId);
    if (!ticket) {
      throw new Error(`工单不存在: ${ticketId}`);
    }

    const reportId = uuidv4();
    const timestamp = Date.now();
    const fileName = `ticket_report_${ticketId}_${timestamp}.md`;
    const filePath = path.join(this.reportsDir, fileName);

    const batch = ticket.batchId ? await this.dao.getBatchById(ticket.batchId) : null;
    const slaRule = ticket.slaRuleId ? await this.dao.getSLARuleById(ticket.slaRuleId) : null;
    const assignments = await this.dao.getAssignmentsByTicketId(ticketId);
    const transitions = await this.dao.getStateTransitionsByTicketId(ticketId);
    const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticketId);
    const approvals = await this.dao.getCompensationApprovalsByTicketId(ticketId);
    const inventoryDiffs = await this.dao.getInventoryDifferencesByTicketId(ticketId);

    let responsibility = null;
    if (options.includeResponsibility) {
      try {
        responsibility = await this.stateMachine.calculateFullResponsibility(ticketId);
      } catch (e) {
        responsibility = { error: '责任计算失败', message: (e as Error).message };
      }
    }

    let content = this.generateTicketMarkdown(
      ticket,
      batch,
      slaRule,
      assignments,
      transitions,
      timeouts,
      approvals,
      inventoryDiffs,
      responsibility,
      options
    );

    fs.writeFileSync(filePath, content, 'utf-8');

    const totalCompensation = ticket.totalCompensation || 0;

    return {
      reportId,
      fileName,
      filePath,
      fileUrl: `/reports/${fileName}`,
      reportType: 'ticket',
      title: `工单责任分析报告 - ${ticketId}`,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ticketCount: 1,
        batchCount: batch ? 1 : 0,
        inventoryDiffCount: inventoryDiffs.length,
        totalCompensation,
        timeoutCount: timeouts.length
      }
    };
  }

  async generateBatchReport(
    batchId: string,
    options: ReportOptions,
    generatedBy: string
  ): Promise<GeneratedReport> {
    const batch = await this.dao.getBatchById(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    const reportId = uuidv4();
    const timestamp = Date.now();
    const fileName = `batch_report_${batchId}_${timestamp}.md`;
    const filePath = path.join(this.reportsDir, fileName);

    const tickets = await this.dao.getTicketsByBatchId(batchId);

    let totalCompensation = 0;
    let totalTimeouts = 0;
    let totalInventoryDiffs = 0;

    const ticketDetails = [];
    for (const ticket of tickets) {
      totalCompensation += ticket.totalCompensation || 0;
      const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticket.id);
      totalTimeouts += timeouts.length;
      const inventoryDiffs = await this.dao.getInventoryDifferencesByTicketId(ticket.id);
      totalInventoryDiffs += inventoryDiffs.length;
      ticketDetails.push({ ticket, timeouts, inventoryDiffs });
    }

    const content = this.generateBatchMarkdown(
      batch,
      ticketDetails,
      { totalCompensation, totalTimeouts, totalInventoryDiffs },
      options
    );

    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      reportId,
      fileName,
      filePath,
      fileUrl: `/reports/${fileName}`,
      reportType: 'batch',
      title: `批次处理报告 - ${batch.name || batchId}`,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ticketCount: tickets.length,
        batchCount: 1,
        inventoryDiffCount: totalInventoryDiffs,
        totalCompensation,
        timeoutCount: totalTimeouts
      }
    };
  }

  async generateOperationsReport(
    filters: { startDate?: string; endDate?: string; status?: string },
    options: ReportOptions,
    generatedBy: string
  ): Promise<GeneratedReport> {
    const reportId = uuidv4();
    const timestamp = Date.now();
    const fileName = `operations_report_${timestamp}.md`;
    const filePath = path.join(this.reportsDir, fileName);

    const batches = await this.dao.getBatches();
    const tickets = await this.dao.getTickets(filters);
    const frozenTicketsResult = await this.operationsViewService.getFrozenTicketsComparison();

    let totalCompensation = 0;
    let totalTimeouts = 0;
    for (const ticket of tickets) {
      totalCompensation += ticket.totalCompensation || 0;
      const timeouts = await this.dao.getTimeoutRecordsByTicketId(ticket.id);
      totalTimeouts += timeouts.length;
    }

    const inventoryDiffResult = await this.batchService.getInventoryDifferences({});

    const failedRecordsResult = await this.operationsViewService.getFailedRecordsSummary();

    const content = this.generateOperationsMarkdown(
      filters,
      batches,
      tickets,
      frozenTicketsResult,
      inventoryDiffResult.summary,
      failedRecordsResult,
      { totalCompensation, totalTimeouts },
      options
    );

    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      reportId,
      fileName,
      filePath,
      fileUrl: `/reports/${fileName}`,
      reportType: 'operations',
      title: `运营汇总报告 - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        ticketCount: tickets.length,
        batchCount: batches.length,
        inventoryDiffCount: inventoryDiffResult.summary.totalRecords,
        totalCompensation,
        timeoutCount: totalTimeouts
      }
    };
  }

  private generateTicketMarkdown(
    ticket: Ticket,
    batch: Batch | null,
    slaRule: SLARule | null,
    assignments: AssignmentRecord[],
    transitions: StateTransition[],
    timeouts: TimeoutRecord[],
    approvals: CompensationApproval[],
    inventoryDiffs: InventoryDifference[],
    responsibility: any,
    options: ReportOptions
  ): string {
    const lines: string[] = [];
    const sessionSummary = ticket.sessionSummary;

    lines.push(`# 工单责任分析报告`);
    lines.push('');
    lines.push(`**工单ID**: ${ticket.id}`);
    lines.push(`**生成时间**: ${new Date().toLocaleString()}`);
    lines.push(`**当前状态**: ${ticket.status}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## 1. 基本信息');
    lines.push('');
    lines.push(`| 字段 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 工单ID | ${ticket.id} |`);
    lines.push(`| 客户ID | ${sessionSummary?.customerId || '-'} |`);
    lines.push(`| 问题类型 | ${sessionSummary?.issueType || '-'} |`);
    lines.push(`| 严重程度 | ${sessionSummary?.severity || '-'} |`);
    lines.push(`| 当前状态 | ${ticket.status} |`);
    lines.push(`| 会话摘要 | ${sessionSummary?.description || '-'} |`);
    lines.push(`| 补偿金额 | ${ticket.totalCompensation || 0} 元 |`);
    lines.push(`| 创建时间 | ${new Date(ticket.createdAt).toLocaleString()} |`);
    if (ticket.updatedAt) {
      lines.push(`| 更新时间 | ${new Date(ticket.updatedAt).toLocaleString()} |`);
    }
    lines.push('');

    if (batch) {
      lines.push('## 2. 所属批次');
      lines.push('');
      lines.push(`| 字段 | 值 |`);
      lines.push(`| --- | --- |`);
      lines.push(`| 批次ID | ${batch.id} |`);
      lines.push(`| 批次名称 | ${batch.name || '-'} |`);
      lines.push(`| 批次状态 | ${batch.status} |`);
      lines.push(`| 工单数 | ${batch.ticketCount} |`);
      lines.push(`| 总金额 | ${batch.totalAmount || 0} 元 |`);
      lines.push('');
    }

    if (slaRule) {
      lines.push('## 3. SLA 规则');
      lines.push('');
      lines.push(`| 字段 | 值 |`);
      lines.push(`| --- | --- |`);
      lines.push(`| 规则ID | ${slaRule.id} |`);
      lines.push(`| 工单类型 | ${slaRule.ticketType} |`);
      lines.push(`| 优先级 | ${slaRule.priority} |`);
      lines.push(`| 首次响应时效 | ${slaRule.firstResponseTime} 分钟 |`);
      lines.push(`| 解决时效 | ${slaRule.resolutionTime} 分钟 |`);
      lines.push(`| 升级阈值 | ${slaRule.escalationThreshold} 分钟 |`);
      lines.push('');
    }

    if (options.includeAssignments && assignments.length > 0) {
      lines.push('## 4. 转派记录');
      lines.push('');
      lines.push(`| 序号 | 从坐席 | 到坐席 | 类型 | 原因 | 转派人 | 时间 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
      assignments.forEach((a, i) => {
        lines.push(`| ${i + 1} | ${a.fromAgentId || '初始'} | ${a.toAgentId} | ${a.assignmentType} | ${a.reason || '-'} | ${a.assignedBy || '系统'} | ${new Date(a.assignedAt).toLocaleString()} |`);
      });
      lines.push('');
    }

    if (options.includeTimeouts && timeouts.length > 0) {
      lines.push('## 5. 超时记录');
      lines.push('');
      lines.push(`| 序号 | 超时类型 | 超时分钟 | 责任坐席 | 责任等级 | 时间 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- |`);
      timeouts.forEach((t, i) => {
        lines.push(`| ${i + 1} | ${t.timeoutType} | ${t.duration} | ${t.agentId} | ${t.blameLevel} | ${new Date(t.createdAt).toLocaleString()} |`);
      });
      lines.push('');
    }

    if (options.includeCompensation && approvals.length > 0) {
      lines.push('## 6. 补偿审批');
      lines.push('');
      lines.push(`| 序号 | 申请金额 | 审批金额 | 状态 | 原因 | 审批人 | 时间 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
      approvals.forEach((a, i) => {
        lines.push(`| ${i + 1} | ${a.requestedAmount} | ${a.approvedAmount ?? '-'} | ${a.status} | ${a.reason} | ${a.approverId || '-'} | ${new Date(a.createdAt).toLocaleString()} |`);
      });
      lines.push('');
    }

    if (options.includeInventory && inventoryDiffs.length > 0) {
      lines.push('## 7. 盘点差异');
      lines.push('');
      lines.push(`| 序号 | 商品ID | 期望 | 实际 | 差异 | 类型 | 原因 | 时间 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
      inventoryDiffs.forEach((d, i) => {
        const diffType = d.difference < 0 ? '盘亏' : d.difference > 0 ? '盘盈' : '无差异';
        lines.push(`| ${i + 1} | ${d.productId} | ${d.expectedQuantity} | ${d.actualQuantity} | ${d.difference} | ${diffType} | ${d.reason || '-'} | ${new Date(d.createdAt).toLocaleString()} |`);
      });
      lines.push('');
    }

    if (responsibility) {
      lines.push('## 8. 责任分析');
      lines.push('');

      if (responsibility.error) {
        lines.push(`> **错误**: ${responsibility.message}`);
        lines.push('');
      } else {
        lines.push(`### 8.1 原始材料可用性`);
        lines.push('');
        lines.push(`| 材料 | 可用 |`);
        lines.push(`| --- | --- |`);
        lines.push(`| 会话摘要 | ${responsibility.sources?.sessionSummary ? '✅' : '❌'} |`);
        lines.push(`| SLA规则 | ${responsibility.sources?.slaRule ? '✅' : '❌'} |`);
        lines.push(`| 补偿审批 | ${responsibility.sources?.compensationApprovals ? '✅' : '❌'} |`);
        lines.push(`| 盘点差异 | ${responsibility.sources?.inventoryDifferences ? '✅' : '❌'} |`);
        lines.push('');

        if (responsibility.assignmentResponsibility) {
          lines.push(`### 8.2 转派责任`);
          lines.push('');
          lines.push(`- 总分配次数: ${responsibility.assignmentResponsibility.totalAssignments || 0}`);
          lines.push(`- 总转派次数: ${responsibility.assignmentResponsibility.totalReassignments || 0}`);
          lines.push(`- 各坐席分配次数:`);
          if (responsibility.assignmentResponsibility.agentStats) {
            for (const [agent, stats] of Object.entries<any>(responsibility.assignmentResponsibility.agentStats)) {
              lines.push(`  - ${agent}: ${stats.assignments} 次分配, ${stats.timeouts} 次超时, 责任分 ${stats.blameScore}`);
            }
          }
          if (responsibility.assignmentResponsibility.bottleneckAgents?.length > 0) {
            lines.push('');
            lines.push(`- **瓶颈坐席:**`);
            for (const agent of responsibility.assignmentResponsibility.bottleneckAgents) {
              lines.push(`  - ${agent.agentId}: ${agent.timeouts} 次超时, 责任分 ${agent.blameScore}`);
            }
          }
          lines.push('');
        }

        if (responsibility.timeoutResponsibility) {
          lines.push(`### 8.3 超时责任`);
          lines.push('');
          lines.push(`- 总超时次数: ${responsibility.timeoutResponsibility.totalTimeouts || 0}`);
          lines.push(`- 总超时分钟: ${responsibility.timeoutResponsibility.totalDurationMinutes || 0}`);
          lines.push(`- 总责任分: ${responsibility.timeoutResponsibility.totalBlameScore || 0}`);
          if (responsibility.timeoutResponsibility.byAgent) {
            lines.push(`- 各坐席超时责任:`);
            for (const [agent, blame] of Object.entries<any>(responsibility.timeoutResponsibility.byAgent)) {
              lines.push(`  - ${agent}: 责任分 ${blame}`);
            }
          }
          if (responsibility.timeoutResponsibility.byType) {
            lines.push(`- 各超时类型:`);
            for (const [type, count] of Object.entries<any>(responsibility.timeoutResponsibility.byType)) {
              lines.push(`  - ${type}: ${count} 次`);
            }
          }
          lines.push('');
        }

        if (responsibility.inventoryResponsibility) {
          lines.push(`### 8.4 盘点差异责任`);
          lines.push('');
          lines.push(`- 差异总数: ${responsibility.inventoryResponsibility.totalRecords || 0}`);
          lines.push(`- 盘亏总数: ${responsibility.inventoryResponsibility.totalMissing || 0}`);
          lines.push(`- 盘盈总数: ${responsibility.inventoryResponsibility.totalExtra || 0}`);
          lines.push(`- 净差异: ${responsibility.inventoryResponsibility.netDifference || 0}`);
          lines.push(`- 未说明原因: ${responsibility.inventoryResponsibility.unresolvedCount || 0}`);
          lines.push('');
        }

        if (responsibility.compensationResponsibility) {
          lines.push(`### 8.5 补偿流程`);
          lines.push('');
          lines.push(`- 总申请次数: ${responsibility.compensationResponsibility.totalRequests || 0}`);
          lines.push(`- 已通过: ${responsibility.compensationResponsibility.approvedCount || 0}`);
          lines.push(`- 已拒绝: ${responsibility.compensationResponsibility.rejectedCount || 0}`);
          lines.push(`- 待审批: ${responsibility.compensationResponsibility.pendingCount || 0}`);
          lines.push(`- 申请总额: ${responsibility.compensationResponsibility.totalRequestedAmount || 0} 元`);
          lines.push(`- 审批总额: ${responsibility.compensationResponsibility.totalApprovedAmount || 0} 元`);
          lines.push(`- 通过率: ${responsibility.compensationResponsibility.approvalRate || '0%'}`);
          lines.push('');
          const stuck = responsibility.compensationResponsibility.stuckStep;
          if (stuck?.stuck) {
            lines.push(`### 8.6 补偿卡壳步骤`);
            lines.push('');
            lines.push(`- **卡壳步骤**: ${stuck.step || '未知'}`);
            if (stuck.reason) {
              lines.push(`- **原因**: ${stuck.reason}`);
            }
            lines.push('');
          }
        }

        if (responsibility.totalCompensation !== undefined) {
          lines.push(`### 8.7 补偿总额`);
          lines.push('');
          lines.push(`- **计算补偿**: ${responsibility.totalCompensation} 元`);
          lines.push(`- **已审批**: ${ticket.totalCompensation || 0} 元`);
          lines.push('');
        }

        if (responsibility.summary) {
          lines.push(`### 8.8 结论摘要`);
          lines.push('');
          lines.push(`- **主要责任人**: ${responsibility.summary.primaryResponsibleAgent || '未识别'}`);
          lines.push(`- **涉及坐席数**: ${responsibility.summary.totalAgentsInvolved || 0}`);
          lines.push(`- **总责任分**: ${responsibility.summary.totalBlameScore || 0}`);
          if (responsibility.summary.warnings?.length > 0) {
            lines.push(`- **警告**: ${responsibility.summary.warnings.join('; ')}`);
          }
          if (responsibility.summary.recommendations?.length > 0) {
            lines.push(`- **建议**: ${responsibility.summary.recommendations.join('; ')}`);
          }
          lines.push('');
        }
      }
    }

    if (options.includeTransitions && transitions.length > 0) {
      lines.push('## 9. 状态流转历史');
      lines.push('');
      lines.push(`| 序号 | 从状态 | 到状态 | 原因 | 操作人 | 时间 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- |`);
      transitions.forEach((t, i) => {
        lines.push(`| ${i + 1} | ${t.fromStatus || '-'} | ${t.toStatus} | ${t.reason || '-'} | ${t.operatorId || '-'} | ${new Date(t.createdAt).toLocaleString()} |`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(`*本报告由客服工单升级异常回执状态机系统自动生成*`);
    lines.push(`*报告生成时间: ${new Date().toLocaleString()}*`);

    return lines.join('\n');
  }

  private generateBatchMarkdown(
    batch: Batch,
    ticketDetails: { ticket: Ticket; timeouts: TimeoutRecord[]; inventoryDiffs: InventoryDifference[] }[],
    summary: { totalCompensation: number; totalTimeouts: number; totalInventoryDiffs: number },
    options: ReportOptions
  ): string {
    const lines: string[] = [];

    lines.push(`# 批次处理报告`);
    lines.push('');
    lines.push(`**批次ID**: ${batch.id}`);
    lines.push(`**批次名称**: ${batch.name || '未命名'}`);
    lines.push(`**生成时间**: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## 1. 批次概览');
    lines.push('');
    lines.push(`| 指标 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 批次ID | ${batch.id} |`);
    lines.push(`| 批次名称 | ${batch.name || '-'} |`);
    lines.push(`| 批次状态 | ${batch.status} |`);
    lines.push(`| 工单数 | ${batch.ticketCount} |`);
    lines.push(`| 冻结工单数 | ${batch.frozenCount || 0} |`);
    lines.push(`| 已结算工单数 | ${batch.settledCount || 0} |`);
    lines.push(`| 总金额 | ${batch.totalAmount || 0} 元 |`);
    lines.push(`| 创建人 | ${batch.createdBy} |`);
    lines.push(`| 创建时间 | ${new Date(batch.createdAt).toLocaleString()} |`);
    lines.push('');

    lines.push('## 2. 汇总统计');
    lines.push('');
    lines.push(`| 指标 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 工单总数 | ${ticketDetails.length} |`);
    lines.push(`| 超时总数 | ${summary.totalTimeouts} |`);
    lines.push(`| 盘点差异数 | ${summary.totalInventoryDiffs} |`);
    lines.push(`| 补偿总额 | ${summary.totalCompensation} 元 |`);
    lines.push('');

    if (options.includeTicketDetails && ticketDetails.length > 0) {
      lines.push('## 3. 工单明细');
      lines.push('');
      lines.push(`| 序号 | 工单ID | 客户ID | 问题类型 | 状态 | 补偿 | 超时 | 差异 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
      ticketDetails.forEach((d, i) => {
        const ss = d.ticket.sessionSummary;
        lines.push(`| ${i + 1} | ${d.ticket.id} | ${ss?.customerId || '-'} | ${ss?.issueType || '-'} | ${d.ticket.status} | ${d.ticket.totalCompensation || 0} | ${d.timeouts.length} | ${d.inventoryDiffs.length} |`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(`*本报告由客服工单升级异常回执状态机系统自动生成*`);

    return lines.join('\n');
  }

  private generateOperationsMarkdown(
    filters: any,
    batches: Batch[],
    tickets: Ticket[],
    frozenTickets: any[],
    inventorySummary: any,
    failedRecordsSummary: any,
    totals: { totalCompensation: number; totalTimeouts: number },
    options: ReportOptions
  ): string {
    const lines: string[] = [];

    lines.push(`# 运营汇总报告`);
    lines.push('');
    lines.push(`**生成时间**: ${new Date().toLocaleString()}`);
    if (filters.startDate || filters.endDate) {
      lines.push(`**时间范围**: ${filters.startDate || '不限'} 至 ${filters.endDate || '不限'}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## 1. 全局概览');
    lines.push('');
    lines.push(`| 指标 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 批次总数 | ${batches.length} |`);
    lines.push(`| 工单总数 | ${tickets.length} |`);
    lines.push(`| 超时总数 | ${totals.totalTimeouts} |`);
    lines.push(`| 补偿总额 | ${totals.totalCompensation} 元 |`);
    lines.push(`| 冻结工单数 | ${frozenTickets.length} |`);
    lines.push(`| 盘点差异数 | ${inventorySummary.totalRecords || 0} |`);
    lines.push(`| 失败记录数 | ${failedRecordsSummary.totalFailed || 0} |`);
    lines.push('');

    if (frozenTickets.length > 0) {
      lines.push('## 2. 冻结工单');
      lines.push('');
      lines.push(`| 工单ID | 批次ID | 冻结前状态 | 当前状态 | 冻结原因 | 冻结人 | 冻结时间 |`);
      lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
      frozenTickets.forEach(t => {
        lines.push(`| ${t.ticketId} | ${t.batchId || '-'} | ${t.statusBeforeFrozen} | ${t.currentStatus} | ${t.frozenReason} | ${t.frozenBy} | ${new Date(t.frozenAt).toLocaleString()} |`);
      });
      lines.push('');
    }

    lines.push('## 3. 盘点差异汇总');
    lines.push('');
    lines.push(`| 指标 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 记录总数 | ${inventorySummary.totalRecords || 0} |`);
    lines.push(`| 盘亏总数 | ${inventorySummary.totalMissing || 0} |`);
    lines.push(`| 盘盈总数 | ${inventorySummary.totalExtra || 0} |`);
    lines.push(`| 净差异 | ${inventorySummary.netDifference || 0} |`);
    lines.push(`| 未说明原因 | ${inventorySummary.unresolvedCount || 0} |`);
    lines.push('');

    lines.push('## 4. 失败记录汇总');
    lines.push('');
    lines.push(`| 指标 | 值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 总失败数 | ${failedRecordsSummary.totalFailed || 0} |`);
    lines.push(`| 已重试 | ${failedRecordsSummary.retried || 0} |`);
    if (failedRecordsSummary.byErrorCode) {
      for (const [code, count] of Object.entries<number>(failedRecordsSummary.byErrorCode)) {
        lines.push(`| ${code} | ${count} |`);
      }
    }
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push(`*本报告由客服工单升级异常回执状态机系统自动生成*`);

    return lines.join('\n');
  }

  getReportFilePath(fileName: string): string {
    return path.join(this.reportsDir, fileName);
  }

  async listReports(): Promise<{ fileName: string; generatedAt: number; size: number }[]> {
    if (!fs.existsSync(this.reportsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.reportsDir);
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const stat = fs.statSync(path.join(this.reportsDir, f));
        return {
          fileName: f,
          generatedAt: stat.birthtime.getTime(),
          size: stat.size
        };
      })
      .sort((a, b) => b.generatedAt - a.generatedAt);
  }
}

export default ReportService;
