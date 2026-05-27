import * as XLSX from 'xlsx';
import type { RefundRequest, Contract, RefundCalculation } from '../types';
import { formatCurrency, formatDate } from './calculationEngine';

export function exportToExcel(data: unknown[], filename: string, sheetName = 'Sheet1'): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function generateRefundDocument(request: RefundRequest): Record<string, unknown>[] {
  const { contract, calculation } = request;
  if (!contract) return [];

  return [
    {
      '项目': '退款单',
      '内容': '',
      '金额': '',
    },
    {
      '项目': '退款单号',
      '内容': request.id,
      '金额': '',
    },
    {
      '项目': '合同编号',
      '内容': contract.contractNo,
      '金额': '',
    },
    {
      '项目': '客户姓名',
      '内容': contract.customerName,
      '金额': '',
    },
    {
      '项目': '合同总金额',
      '内容': '',
      '金额': calculation.contractTotal,
    },
    {
      '项目': '已核销项目金额',
      '内容': '',
      '金额': calculation.verifiedTotal,
    },
    {
      '项目': '未核销项目金额',
      '内容': '',
      '金额': calculation.unverifiedTotal,
    },
    {
      '项目': '手续费总额',
      '内容': '',
      '金额': calculation.totalFee,
    },
    {
      '项目': '客户承担手续费',
      '内容': '',
      '金额': calculation.customerFeeShare,
    },
    {
      '项目': '赠品总价值',
      '内容': '',
      '金额': calculation.giftTotalValue,
    },
    {
      '项目': '赠品扣回金额',
      '内容': '',
      '金额': calculation.giftDeduction,
    },
    {
      '项目': '基础退款金额',
      '内容': '',
      '金额': calculation.baseRefund,
    },
    {
      '项目': '手续费扣减',
      '内容': '',
      '金额': calculation.feeDeduction,
    },
    {
      '项目': '最终退款金额',
      '内容': '',
      '金额': calculation.finalRefund,
    },
    {
      '项目': '实际退款金额',
      '内容': '',
      '金额': calculation.actualRefund,
    },
    {
      '项目': '创建时间',
      '内容': formatDate(request.createdAt),
      '金额': '',
    },
  ];
}

export function generateSettlementDocument(
  request: RefundRequest,
  settlementNo: string
): Record<string, unknown>[] {
  const { contract, calculation } = request;
  if (!contract) return [];

  return [
    {
      '项目': '结算单',
      '内容': '',
      '金额': '',
    },
    {
      '项目': '结算单号',
      '内容': settlementNo,
      '金额': '',
    },
    {
      '项目': '退款单号',
      '内容': request.id,
      '金额': '',
    },
    {
      '项目': '合同编号',
      '内容': contract.contractNo,
      '金额': '',
    },
    {
      '项目': '客户姓名',
      '内容': contract.customerName,
      '金额': '',
    },
    {
      '项目': '合同总金额',
      '内容': formatCurrency(calculation.contractTotal),
      '金额': calculation.contractTotal,
    },
    {
      '项目': '已消费金额',
      '内容': formatCurrency(calculation.verifiedTotal),
      '金额': calculation.verifiedTotal,
    },
    {
      '项目': '已付款金额',
      '内容': formatCurrency(calculation.paidAmount),
      '金额': calculation.paidAmount,
    },
    {
      '项目': '应退金额',
      '内容': formatCurrency(calculation.finalRefund),
      '金额': calculation.finalRefund,
    },
    {
      '项目': '实际退款',
      '内容': formatCurrency(calculation.actualRefund),
      '金额': calculation.actualRefund,
    },
    {
      '项目': '结算状态',
      '内容': '已完成',
      '金额': '',
    },
    {
      '项目': '结算日期',
      '内容': new Date().toLocaleDateString('zh-CN'),
      '金额': '',
    },
  ];
}

export function exportRefundExcel(request: RefundRequest): void {
  const data = generateRefundDocument(request);
  exportToExcel(data, `退款单_${request.id}`, '退款单');
}

export function exportSettlementExcel(
  request: RefundRequest,
  settlementNo: string
): void {
  const data = generateSettlementDocument(request, settlementNo);
  exportToExcel(data, `结算单_${settlementNo}`, '结算单');
}

export function exportCalculationBreakdown(
  contract: Contract,
  calculation: RefundCalculation
): void {
  const data = [
    { '项目': '合同总金额', '金额': calculation.contractTotal, '说明': '合同约定的总金额' },
    { '项目': '已核销项目', '金额': calculation.verifiedTotal, '说明': '客户已完成并确认的项目' },
    { '项目': '未核销项目', '金额': calculation.unverifiedTotal, '说明': '待确认的项目' },
    { '项目': '手续费总额', '金额': calculation.totalFee, '说明': '分期产生的全部手续费' },
    { '项目': '客户承担手续费', '金额': calculation.customerFeeShare, '说明': '按约定客户需承担的部分' },
    { '项目': '门店承担手续费', '金额': calculation.storeFeeShare, '说明': '按约定门店需承担的部分' },
    { '项目': '赠品总价值', '金额': calculation.giftTotalValue, '说明': '赠送项目的总价值' },
    { '项目': '已归还赠品价值', '金额': calculation.giftReturnedValue, '说明': '客户已退回的赠品' },
    { '项目': '赠品扣回金额', '金额': calculation.giftDeduction, '说明': '未归还赠品需扣回的金额' },
    { '项目': '基础退款', '金额': calculation.baseRefund, '说明': '合同金额 - 已核销金额' },
    { '项目': '手续费扣减', '金额': calculation.feeDeduction, '说明': '客户需承担的手续费' },
    { '项目': '最终应退金额', '金额': calculation.finalRefund, '说明': '计算得出的退款金额' },
    { '项目': '客户已付款', '金额': calculation.paidAmount, '说明': '客户实际已支付的金额' },
    { '项目': '实际退款金额', '金额': calculation.actualRefund, '说明': '最终应退与已付款的较小值' },
  ];
  exportToExcel(data, `计算明细_${contract.contractNo}`, '计算明细');
}
