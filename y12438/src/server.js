const express = require('express');
const path = require('path');
const { initDatabase, closeDatabase } = require('./database/db');
const RefundService = require('./services/refund-service');
const ContractService = require('./services/contract-service');
const { ConflictService } = require('./services/conflict-service');

const app = express();
const PORT = process.env.PORT || 3000;

initDatabase();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/refunds', (req, res) => {
  const { status } = req.query;
  const refunds = RefundService.getAllRefunds(status);
  res.json({ success: true, data: refunds });
});

app.get('/api/refunds/:refundNo', (req, res) => {
  const data = RefundService.getRefundWithEvidence(req.params.refundNo);
  if (!data) {
    return res.status(404).json({ success: false, error: '清退记录不存在' });
  }
  res.json({ success: true, data });
});

app.post('/api/refunds/:contractNo/calculate', (req, res) => {
  try {
    const { operator } = req.body;
    const result = RefundService.createRefundRecord(req.params.contractNo, operator || 'system');
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/refunds/:refundNo/confirm', (req, res) => {
  try {
    const { operator } = req.body;
    RefundService.confirmRefund(req.params.refundNo, operator || 'system');
    res.json({ success: true, message: '清退已确认' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/contracts', (req, res) => {
  const contracts = ContractService.getAllContracts();
  res.json({ success: true, data: contracts });
});

app.get('/api/contracts/:contractNo', (req, res) => {
  const data = ContractService.getContractFullData(req.params.contractNo);
  if (!data) {
    return res.status(404).json({ success: false, error: '合同不存在' });
  }
  res.json({ success: true, data });
});

app.get('/api/conflicts', (req, res) => {
  const conflicts = ConflictService.getUnresolvedConflicts();
  res.json({ success: true, data: conflicts });
});

app.post('/api/conflicts/:conflictNo/resolve', (req, res) => {
  try {
    const { resolution, resolvedBy } = req.body;
    ConflictService.resolveConflict(req.params.conflictNo, resolution, resolvedBy || 'admin');
    res.json({ success: true, message: '冲突已解决' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/refunds/:refundNo/corrections', (req, res) => {
  try {
    const { correctionType, originalValue, correctedValue, reason, operator, approvedBy } = req.body;
    const result = RefundService.addManualCorrection(
      req.params.refundNo,
      correctionType,
      parseFloat(originalValue),
      parseFloat(correctedValue),
      reason,
      operator || 'admin',
      approvedBy || 'supervisor'
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/summary', (req, res) => {
  const allRefunds = RefundService.getAllRefunds();
  const conflicts = ConflictService.getUnresolvedConflicts();
  const contracts = ContractService.getAllContracts();

  const summary = {
    total_contracts: contracts.length,
    total_refunds: allRefunds.length,
    pending_refunds: allRefunds.filter(r => r.refund_status === 'pending').length,
    conflict_refunds: allRefunds.filter(r => r.refund_status === 'pending_conflict').length,
    completed_refunds: allRefunds.filter(r => r.refund_status === 'completed').length,
    unresolved_conflicts: conflicts.length,
    total_deposit: allRefunds.reduce((sum, r) => sum + r.total_deposit_received, 0),
    total_power_charge: allRefunds.reduce((sum, r) => sum + r.total_power_charge, 0),
    total_deductions: allRefunds.reduce((sum, r) => sum + r.total_deductions, 0),
    total_refund_amount: allRefunds.reduce((sum, r) => sum + r.refund_amount, 0)
  };

  res.json({ success: true, data: summary });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 音乐节摊位押金清退看板已启动`);
  console.log(`📊 看板地址: http://localhost:${PORT}/dashboard`);
  console.log(`🔌 API 服务: http://localhost:${PORT}/api`);
  console.log(`\n📋 可用接口:`);
  console.log(`  GET  /api/summary          - 汇总数据`);
  console.log(`  GET  /api/refunds           - 清退列表`);
  console.log(`  GET  /api/refunds/:no       - 清退详情+证据链`);
  console.log(`  GET  /api/contracts         - 合同列表`);
  console.log(`  GET  /api/contracts/:no     - 合同详情`);
  console.log(`  GET  /api/conflicts         - 冲突列表`);
  console.log();
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  closeDatabase();
  server.close();
  process.exit(0);
});
