import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { Contract, PaymentNode, AcceptanceRecord, RefundRecord, CheckResult } from '../types';
import { DataStoreManager } from './store';

export interface CheckReport {
  batchId: string;
  checkedAt: string;
  checkedBy: string;
  totalChecks: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: CheckResult[];
}

export class DataChecker {
  private store: DataStoreManager;
  private user: string;

  constructor(workspace: string, user: string) {
    this.store = new DataStoreManager(workspace);
    this.user = user;
  }

  async runAllChecks(batchId?: string): Promise<CheckReport> {
    const contracts = await this.store.getContracts();
    const results: CheckResult[] = [];

    for (const contract of contracts) {
      const contractResults = await this.checkContract(contract, batchId || uuidv4());
      results.push(...contractResults);
    }

    const errorCount = results.filter(r => r.severity === 'error').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;
    const infoCount = results.filter(r => r.severity === 'info').length;

    return {
      batchId: batchId || uuidv4(),
      checkedAt: dayjs().toISOString(),
      checkedBy: this.user,
      totalChecks: results.length,
      errorCount,
      warningCount,
      infoCount,
      results,
    };
  }

  private async checkContract(contract: Contract, batchId: string): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    results.push(...this.checkContractBasicInfo(contract, batchId));

    const paymentNodes = await this.store.getPaymentNodesByContract(contract.contractNo);
    results.push(...this.checkPaymentNodes(contract, paymentNodes, batchId));

    const acceptanceRecords = await this.store.getAcceptanceRecordsByContract(contract.contractNo);
    results.push(...this.checkAcceptanceRecords(contract, acceptanceRecords, batchId));

    const refundRecords = await this.store.getRefundRecordsByContract(contract.contractNo);
    results.push(...this.checkRefundRecords(contract, refundRecords, paymentNodes, batchId));

    results.push(...this.checkAmountConsistency(contract, paymentNodes, acceptanceRecords, refundRecords, batchId));

    for (const result of results) {
      await this.store.addCheckResult(result);
    }

    return results;
  }

  private checkContractBasicInfo(contract: Contract, batchId: string): CheckResult[] {
    const results: CheckResult[] = [];

    if (!contract.contractNo) {
      results.push(this.createError(batchId, contract, 'basic', '缺少合同编号', 'contractNo'));
    }

    if (!contract.startDate) {
      results.push(this.createError(batchId, contract, 'basic', '缺少开始日期', 'startDate'));
    }

    if (!contract.endDate) {
      results.push(this.createError(batchId, contract, 'basic', '缺少结束日期', 'endDate'));
    }

    if (contract.startDate && contract.endDate) {
      if (dayjs(contract.startDate).isAfter(contract.endDate)) {
        results.push(this.createError(
          batchId, contract, 'basic',
          '开始日期晚于结束日期',
          'dateRange',
          `${contract.startDate} - ${contract.endDate}`,
          '开始日期应早于结束日期'
        ));
      }
    }

    if (contract.totalAmount <= 0) {
      results.push(this.createWarning(
        batchId, contract, 'amount',
        '合同总金额异常',
        'totalAmount',
        contract.totalAmount,
        '总金额应大于0'
      ));
    }

    if (contract.supplementaryAgreements.length > 0) {
      results.push(this.createInfo(
        batchId, contract, 'supplementary',
        `存在${contract.supplementaryAgreements.length}份补充协议，请确认付款节点是否更新`,
        'supplementaryAgreements'
      ));
    }

    return results;
  }

  private checkPaymentNodes(
    contract: Contract,
    nodes: PaymentNode[],
    batchId: string
  ): CheckResult[] {
    const results: CheckResult[] = [];

    if (nodes.length === 0) {
      results.push(this.createWarning(
        batchId, contract, 'payment_node',
        '合同无付款节点记录',
        'paymentNodes'
      ));
      return results;
    }

    const totalPlanned = nodes.reduce((sum, n) => sum + n.plannedAmount, 0);
    if (Math.abs(totalPlanned - contract.totalAmount) > 0.01) {
      results.push(this.createError(
        batchId, contract, 'payment_amount',
        `付款节点总金额(${totalPlanned})与合同总金额(${contract.totalAmount})不一致`,
        'paymentTotal',
        totalPlanned,
        contract.totalAmount
      ));
    }

    nodes.forEach((node, index) => {
      if (!node.nodeId) {
        results.push(this.createError(
          batchId, contract, 'payment_node',
          `第${index + 1}个付款节点缺少节点ID`,
          'nodeId',
          undefined,
          undefined,
          node.originalLineNo,
          'PaymentNode',
          node.id
        ));
      }

      if (!node.plannedDate) {
        results.push(this.createError(
          batchId, contract, 'payment_node',
          `付款节点"${node.nodeName}"缺少计划日期`,
          'plannedDate',
          undefined,
          undefined,
          node.originalLineNo,
          'PaymentNode',
          node.id
        ));
      }

      if (node.plannedAmount <= 0) {
        results.push(this.createWarning(
          batchId, contract, 'payment_amount',
          `付款节点"${node.nodeName}"计划金额异常`,
          'plannedAmount',
          node.plannedAmount,
          '应大于0',
          node.originalLineNo,
          'PaymentNode',
          node.id
        ));
      }

      if (node.status === 'overdue') {
        results.push(this.createWarning(
          batchId, contract, 'payment_status',
          `付款节点"${node.nodeName}"已逾期`,
          'status',
          node.status,
          '请及时处理',
          node.originalLineNo,
          'PaymentNode',
          node.id
        ));
      }

      if (node.status === 'paid' && node.actualAmount === undefined) {
        results.push(this.createWarning(
          batchId, contract, 'payment_amount',
          `付款节点"${node.nodeName}"状态为已付款但缺少实际金额`,
          'actualAmount',
          node.actualAmount,
          '应有实际付款金额',
          node.originalLineNo,
          'PaymentNode',
          node.id
        ));
      }
    });

    return results;
  }

  private checkAcceptanceRecords(
    contract: Contract,
    records: AcceptanceRecord[],
    batchId: string
  ): CheckResult[] {
    const results: CheckResult[] = [];

    records.forEach((record, index) => {
      if (record.acceptanceResult === 'failed') {
        results.push(this.createError(
          batchId, contract, 'acceptance',
          `验收记录"${record.acceptanceId}"验收未通过`,
          'acceptanceResult',
          'failed',
          'passed',
          record.originalLineNo
        ));
      }

      if (record.acceptanceResult === 'conditional') {
        results.push(this.createWarning(
          batchId, contract, 'acceptance',
          `验收记录"${record.acceptanceId}"为有条件通过，请跟进后续处理`,
          'acceptanceResult',
          'conditional',
          undefined,
          record.originalLineNo
        ));
      }

      const unresolvedDisc = record.discrepancies.filter(d => !d.resolved);
      if (unresolvedDisc.length > 0) {
        results.push(this.createWarning(
          batchId, contract, 'discrepancy',
          `验收记录"${record.acceptanceId}"存在${unresolvedDisc.length}项未解决的盘点差异`,
          'discrepancies',
          unresolvedDisc.length,
          0,
          record.originalLineNo
        ));
      }
    });

    return results;
  }

  private checkRefundRecords(
    contract: Contract,
    refunds: RefundRecord[],
    paymentNodes: PaymentNode[],
    batchId: string
  ): CheckResult[] {
    const results: CheckResult[] = [];

    const totalRefund = refunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalPaid = paymentNodes
      .filter(n => n.status === 'paid')
      .reduce((sum, n) => sum + (n.actualAmount || 0), 0);

    if (totalRefund > totalPaid) {
      results.push(this.createError(
        batchId, contract, 'refund',
        `退款总金额(${totalRefund})超过已支付总金额(${totalPaid})`,
        'refundTotal',
        totalRefund,
        totalPaid
      ));
    }

    refunds.forEach((refund, index) => {
      if (refund.status === 'rejected') {
        results.push(this.createWarning(
          batchId, contract, 'refund',
          `退款记录"${refund.refundId}"已被拒绝`,
          'status',
          'rejected',
          undefined,
          refund.originalLineNo
        ));
      }
    });

    return results;
  }

  private checkAmountConsistency(
    contract: Contract,
    paymentNodes: PaymentNode[],
    acceptanceRecords: AcceptanceRecord[],
    refundRecords: RefundRecord[],
    batchId: string
  ): CheckResult[] {
    const results: CheckResult[] = [];

    const totalAccepted = acceptanceRecords.reduce((sum, r) => sum + r.acceptedAmount, 0);
    const totalPlanned = paymentNodes.reduce((sum, n) => sum + n.plannedAmount, 0);

    if (totalAccepted > totalPlanned && totalPlanned > 0) {
      results.push(this.createWarning(
        batchId, contract, 'consistency',
        `验收总金额(${totalAccepted})超过付款计划总金额(${totalPlanned})`,
        'acceptedVsPlanned',
        totalAccepted,
        totalPlanned
      ));
    }

    const totalRefund = refundRecords.reduce((sum, r) => sum + r.refundAmount, 0);
    const netAmount = contract.totalAmount - totalRefund;

    results.push(this.createInfo(
      batchId, contract, 'summary',
      `合同净额: ${netAmount} (原${contract.totalAmount} - 退款${totalRefund})`,
      'netAmount',
      netAmount
    ));

    return results;
  }

  private createError(
    batchId: string,
    contract: Contract,
    checkType: string,
    message: string,
    sourceField?: string,
    actualValue?: any,
    expectedValue?: any,
    originalLineNo?: number,
    entityType?: 'Contract' | 'PaymentNode' | 'AcceptanceRecord' | 'RefundRecord',
    entityId?: string
  ): CheckResult {
    return {
      id: uuidv4(),
      batchId,
      contractNo: contract.contractNo,
      checkType,
      severity: 'error',
      message,
      sourceField,
      expectedValue,
      actualValue,
      originalLineNo,
      resolved: false,
      entityType,
      entityId,
    };
  }

  private createWarning(
    batchId: string,
    contract: Contract,
    checkType: string,
    message: string,
    sourceField?: string,
    actualValue?: any,
    expectedValue?: any,
    originalLineNo?: number,
    entityType?: 'Contract' | 'PaymentNode' | 'AcceptanceRecord' | 'RefundRecord',
    entityId?: string
  ): CheckResult {
    return {
      id: uuidv4(),
      batchId,
      contractNo: contract.contractNo,
      checkType,
      severity: 'warning',
      message,
      sourceField,
      expectedValue,
      actualValue,
      originalLineNo,
      resolved: false,
      entityType,
      entityId,
    };
  }

  private createInfo(
    batchId: string,
    contract: Contract,
    checkType: string,
    message: string,
    sourceField?: string,
    actualValue?: any,
    originalLineNo?: number,
    entityType?: 'Contract' | 'PaymentNode' | 'AcceptanceRecord' | 'RefundRecord',
    entityId?: string
  ): CheckResult {
    return {
      id: uuidv4(),
      batchId,
      contractNo: contract.contractNo,
      checkType,
      severity: 'info',
      message,
      sourceField,
      actualValue,
      originalLineNo,
      resolved: false,
      entityType,
      entityId,
    };
  }

  async getUnresolvedChecks(batchId?: string): Promise<CheckResult[]> {
    const results = await this.store.getCheckResults(batchId);
    return results.filter(r => !r.resolved);
  }

  async getChecksBySeverity(severity: 'error' | 'warning' | 'info', batchId?: string): Promise<CheckResult[]> {
    const results = await this.store.getCheckResults(batchId);
    return results.filter(r => r.severity === severity && !r.resolved);
  }
}
