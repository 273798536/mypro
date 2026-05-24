const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { listContracts, getContract } = require('../models/Contract');
const { listPaymentNodes, calculateContractProgress } = require('../models/PaymentNode');
const { listAcceptanceEmails } = require('../models/AcceptanceEmail');
const { listConfirmations, listFailedRecords } = require('../models/Confirmation');

const EXPORT_DIR = path.join(process.cwd(), 'data', 'exports');

function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

function exportToCSV(data, fields, filename) {
  ensureExportDir();
  const parser = new Parser({ fields });
  const csv = parser.parse(data);
  const filePath = path.join(EXPORT_DIR, filename);
  fs.writeFileSync(filePath, csv, 'utf8');
  return filePath;
}

function exportContracts(filters = {}) {
  const contracts = listContracts(filters);
  const fields = [
    { label: '合同ID', value: 'id' },
    { label: '合同名称', value: 'contractName' },
    { label: '合同编号', value: 'contractNumber' },
    { label: '甲方', value: 'partyA' },
    { label: '乙方', value: 'partyB' },
    { label: '总金额', value: 'totalAmount' },
    { label: '币种', value: 'currency' },
    { label: '状态', value: 'status' },
    { label: '生效日期', value: 'effectiveDate' },
    { label: '创建时间', value: 'createdAt' }
  ];
  const filename = `contracts_${Date.now()}.csv`;
  return {
    filePath: exportToCSV(contracts, fields, filename),
    recordCount: contracts.length
  };
}

function exportPaymentNodes(filters = {}) {
  const nodes = listPaymentNodes(filters);
  const enriched = nodes.map(node => {
    const contract = getContract(node.contractId);
    return {
      ...node,
      contractName: contract ? contract.contractName : ''
    };
  });
  
  const fields = [
    { label: '节点ID', value: 'id' },
    { label: '合同ID', value: 'contractId' },
    { label: '合同名称', value: 'contractName' },
    { label: '节点名称', value: 'nodeName' },
    { label: '应付款金额', value: 'dueAmount' },
    { label: '币种', value: 'currency' },
    { label: '到期日', value: 'dueDate' },
    { label: '状态', value: 'status' },
    { label: '创建时间', value: 'createdAt' }
  ];
  const filename = `payment_nodes_${Date.now()}.csv`;
  return {
    filePath: exportToCSV(enriched, fields, filename),
    recordCount: enriched.length
  };
}

function exportReconciliationReport() {
  const contracts = listContracts();
  const reportData = contracts.map(contract => {
    const progress = calculateContractProgress(contract.id);
    const nodes = listPaymentNodes({ contractId: contract.id });
    const emails = listAcceptanceEmails({ contractId: contract.id });
    const confirmations = listConfirmations({ contractId: contract.id });
    
    return {
      contractId: contract.id,
      contractName: contract.contractName,
      totalAmount: contract.totalAmount,
      status: contract.status,
      totalNodes: progress.nodeCount,
      completedNodes: progress.completedNodeCount,
      completedAmount: progress.completed,
      pendingAmount: progress.pending,
      completionPercentage: progress.percentage,
      emailCount: emails.length,
      confirmationCount: confirmations.length,
      approvedConfirmations: confirmations.filter(c => c.status === 'approved').length
    };
  });
  
  const fields = [
    { label: '合同ID', value: 'contractId' },
    { label: '合同名称', value: 'contractName' },
    { label: '合同总金额', value: 'totalAmount' },
    { label: '合同状态', value: 'status' },
    { label: '付款节点数', value: 'totalNodes' },
    { label: '已完成节点数', value: 'completedNodes' },
    { label: '已确认金额', value: 'completedAmount' },
    { label: '待确认金额', value: 'pendingAmount' },
    { label: '完成百分比', value: 'completionPercentage' },
    { label: '验收邮件数', value: 'emailCount' },
    { label: '确认单数', value: 'confirmationCount' },
    { label: '已审批确认单数', value: 'approvedConfirmations' }
  ];
  
  const filename = `reconciliation_report_${Date.now()}.csv`;
  return {
    filePath: exportToCSV(reportData, fields, filename),
    recordCount: reportData.length,
    summary: {
      totalContracts: reportData.length,
      totalAmount: reportData.reduce((sum, r) => sum + r.totalAmount, 0),
      totalCompletedAmount: reportData.reduce((sum, r) => sum + r.completedAmount, 0)
    }
  };
}

function exportFailedRecords(filters = {}) {
  const records = listFailedRecords(filters);
  const fields = [
    { label: '记录ID', value: 'id' },
    { label: '实体类型', value: 'entityType' },
    { label: '错误信息', value: 'error' },
    { label: '错误代码', value: 'errorCode' },
    { label: '上报人', value: 'reportedBy' },
    { label: '上报时间', value: 'reportedAt' },
    { label: '是否已解决', value: 'resolved' }
  ];
  const filename = `failed_records_${Date.now()}.csv`;
  return {
    filePath: exportToCSV(records, fields, filename),
    recordCount: records.length
  };
}

function exportFullPlayback(contractId) {
  const contract = getContract(contractId);
  if (!contract) {
    return { success: false, error: '合同不存在' };
  }
  
  const nodes = listPaymentNodes({ contractId });
  const emails = listAcceptanceEmails({ contractId });
  const confirmations = listConfirmations({ contractId });
  const progress = calculateContractProgress(contractId);
  
  const playbackData = {
    exportTime: new Date().toISOString(),
    contract,
    progress,
    paymentNodes: nodes,
    acceptanceEmails: emails,
    confirmations,
    eventTimeline: [
      ...nodes.map(n => ({ type: 'paymentNode', date: n.dueDate, data: n })),
      ...emails.map(e => ({ type: 'acceptanceEmail', date: e.emailDate, data: e })),
      ...confirmations.map(c => ({ type: 'confirmation', date: c.confirmedAt, data: c }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date))
  };
  
  ensureExportDir();
  const filename = `playback_${contractId}_${Date.now()}.json`;
  const filePath = path.join(EXPORT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(playbackData, null, 2), 'utf8');
  
  return {
    success: true,
    filePath,
    data: playbackData
  };
}

module.exports = {
  exportContracts,
  exportPaymentNodes,
  exportReconciliationReport,
  exportFailedRecords,
  exportFullPlayback
};
