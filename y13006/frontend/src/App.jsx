import React, { useState, useEffect, useCallback } from 'react';
import {
  getRecords, getEmails, addRemark, getRemarks, exportRecords,
  getImportPackages, importEmail, supplementRecord, syncExport, getImportLogs, resetDatabase
} from './api.js';

const STATUS_LABELS = {
  normal: '正常',
  supplementary: '补录',
  suspended: '挂起',
  abnormal: '异常',
  duplicate: '重复'
};

const STATUS_CLASSES = {
  normal: 'status-normal',
  supplementary: 'status-supplementary',
  suspended: 'status-suspended',
  abnormal: 'status-abnormal',
  duplicate: 'status-duplicate'
};

const ACTION_LABELS = {
  created: '新建',
  updated: '更新',
  skipped: '跳过(去重)',
  suspended: '挂起',
  error: '异常'
};

const ACTION_CLASSES = {
  created: 'status-normal',
  updated: 'status-supplementary',
  skipped: 'status-duplicate',
  suspended: 'status-suspended',
  error: 'status-abnormal'
};

function App() {
  const [activeTab, setActiveTab] = useState('records');
  const [records, setRecords] = useState([]);
  const [emails, setEmails] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState('');
  const [operator, setOperator] = useState('项目经理-李明');
  const [loading, setLoading] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [packages, setPackages] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importLogs, setImportLogs] = useState([]);
  const [supplementData, setSupplementData] = useState({ tax_amount: '', exchange_rate: '', amount: '' });
  const [supplementing, setSupplementing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'records' || activeTab === 'export') {
        const data = await getRecords(filterStatus);
        setRecords(data);
      }
      if (activeTab === 'emails') {
        const data = await getEmails();
        setEmails(data);
      }
      if (activeTab === 'export') {
        const data = await exportRecords();
        setExportData(data);
      }
      if (activeTab === 'import') {
        const pkgs = await getImportPackages();
        setPackages(pkgs);
        const logs = await getImportLogs();
        setImportLogs(logs);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载数据失败: ' + (err.response?.data?.detail || err.message), 'error');
    }
  }, [activeTab, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = async (record) => {
    setSelectedRecord(record);
    try {
      const data = await getRemarks(record.id);
      setRemarks(data);
    } catch (err) {
      setRemarks([]);
    }
    setNewRemark('');
    if (record.status === 'suspended') {
      setSupplementData({
        tax_amount: record.tax_amount ?? '',
        exchange_rate: record.exchange_rate ?? '',
        amount: record.amount ?? ''
      });
    }
  };

  const closeDetail = () => {
    setSelectedRecord(null);
    setRemarks([]);
    setNewRemark('');
    setSupplementData({ tax_amount: '', exchange_rate: '', amount: '' });
  };

  const submitRemark = async () => {
    if (!newRemark.trim() || !selectedRecord) return;
    setLoading(true);
    try {
      await addRemark(selectedRecord.id, {
        remark_content: newRemark,
        operator: operator
      });
      const data = await getRemarks(selectedRecord.id);
      setRemarks(data);
      const updated = await getRecords(filterStatus);
      setRecords(updated);
      setNewRemark('');
      showToast('备注已保存，导出预览中将标记"待同步"', 'success');
    } catch (err) {
      showToast('添加备注失败: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (pkgIndex) => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importEmail(pkgIndex, operator);
      setImportResult(result);
      await loadData();
      const actionSummary = [];
      if (result.created > 0) actionSummary.push(`新建${result.created}条`);
      if (result.skipped > 0) actionSummary.push(`跳过(去重)${result.skipped}条`);
      if (result.suspended > 0) actionSummary.push(`挂起${result.suspended}条`);
      if (result.errors > 0) actionSummary.push(`异常${result.errors}条`);
      showToast(`导入完成: ${actionSummary.join('、')}`, result.errors > 0 ? 'warning' : 'success');
    } catch (err) {
      showToast('导入失败: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSupplement = async () => {
    if (!selectedRecord) return;
    setSupplementing(true);
    try {
      const payload = {
        operator: operator
      };
      if (supplementData.tax_amount !== '') payload.tax_amount = parseFloat(supplementData.tax_amount);
      if (supplementData.exchange_rate !== '') payload.exchange_rate = parseFloat(supplementData.exchange_rate);
      if (supplementData.amount !== '') payload.amount = parseFloat(supplementData.amount);

      const updatedRecord = await supplementRecord(selectedRecord.id, payload);
      setSelectedRecord(updatedRecord);
      const updatedRemarks = await getRemarks(selectedRecord.id);
      setRemarks(updatedRemarks);
      const recs = await getRecords(filterStatus);
      setRecords(recs);
      showToast(`凭证${updatedRecord.voucher_number}补录完成，状态已变更为"补录"`, 'success');
    } catch (err) {
      showToast('补录失败: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSupplementing(false);
    }
  };

  const handleSyncExport = async () => {
    setSyncing(true);
    try {
      const result = await syncExport();
      showToast(result.message, 'success');
      if (activeTab === 'export') {
        const data = await exportRecords();
        setExportData(data);
      }
    } catch (err) {
      showToast('同步失败: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleResetDatabase = async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      const result = await resetDatabase();
      setImportResult(null);
      await loadData();
      showToast(result.message, 'success');
    } catch (err) {
      showToast('重置失败: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setResetting(false);
    }
  };

  const formatAmount = (val) => {
    if (val === null || val === undefined) return '-';
    const neg = val < 0;
    const formatted = Math.abs(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + formatted;
  };

  const formatDate = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('zh-CN');
  };

  const stats = {
    total: records.length,
    normal: records.filter(r => r.status === 'normal').length,
    supplementary: records.filter(r => r.status === 'supplementary').length,
    suspended: records.filter(r => r.status === 'suspended').length,
    abnormal: records.filter(r => r.status === 'abnormal').length
  };

  return (
    <div className="app-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <header className="app-header">
        <h1>ABS 现金流异常回放</h1>
        <p>审批邮件解析 · 税费汇率分离 · 异常记录挂起 · 人工备注同步 · 重复导入去重 · 晚到凭证补录</p>
      </header>

      <div className="tabs">
        {[
          { key: 'records', label: '现金流记录' },
          { key: 'import', label: '导入操作' },
          { key: 'emails', label: '审批邮件' },
          { key: 'export', label: '导出预览' }
        ].map(t => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'records' && (
        <>
          <div className="stats-cards">
            <div className="stat-card stat-total">
              <div className="label">总记录数</div>
              <div className="value">{stats.total}</div>
            </div>
            <div className="stat-card stat-normal">
              <div className="label">正常记录</div>
              <div className="value">{stats.normal}</div>
            </div>
            <div className="stat-card stat-suspended">
              <div className="label">挂起（凭证晚到）</div>
              <div className="value">{stats.suspended}</div>
            </div>
            <div className="stat-card stat-abnormal">
              <div className="label">异常 / 补录</div>
              <div className="value">{stats.abnormal + stats.supplementary}</div>
            </div>
          </div>

          <div className="filter-bar">
            <span style={{ fontSize: '14px', color: '#606266' }}>状态筛选：</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="normal">正常</option>
              <option value="supplementary">补录</option>
              <option value="suspended">挂起</option>
              <option value="abnormal">异常</option>
            </select>
          </div>

          <div className="record-table">
            <table>
              <thead>
                <tr>
                  <th>凭证号</th>
                  <th>状态</th>
                  <th>交易日期</th>
                  <th>金额</th>
                  <th>币种</th>
                  <th>对手方</th>
                  <th>原始列(税费/汇率)</th>
                  <th>解析后税费</th>
                  <th>解析后汇率</th>
                  <th>邮件行号</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: '#909399', padding: '40px' }}>
                    暂无记录，请先在"导入操作"中导入审批邮件
                  </td></tr>
                ) : records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.voucher_number || '-'}</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASSES[r.status] || 'status-normal'}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td>{formatDate(r.transaction_date)}</td>
                    <td className={r.amount < 0 ? 'amount-negative' : 'amount-positive'}>
                      {formatAmount(r.amount)}
                    </td>
                    <td>{r.currency || '-'}</td>
                    <td>{r.counterparty || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#606266' }}>
                      {r.raw_mixed_tax_rate_column || '-'}
                    </td>
                    <td>{r.tax_amount !== null && r.tax_amount !== undefined ? r.tax_amount.toLocaleString() : '-'}</td>
                    <td>{r.exchange_rate !== null && r.exchange_rate !== undefined ? r.exchange_rate : '-'}</td>
                    <td>{r.original_row_number || '-'}</td>
                    <td>
                      {r.is_manual_remark_updated && <span className="remark-tag">已备注</span>}
                    </td>
                    <td>
                      <button className="btn btn-default" onClick={() => openDetail(r)}>
                        详情/备注
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'import' && (
        <>
          <div className="filter-bar" style={{ justifyContent: 'space-between' }}>
            <div className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              可导入审批邮件包
            </div>
            <button
              className="btn btn-danger"
              disabled={resetting}
              onClick={() => setShowResetConfirm(true)}
            >
              {resetting ? '重置中...' : '重置数据库'}
            </button>
          </div>

          {showResetConfirm && (
            <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
              <div className="modal" style={{ width: '420px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>确认重置数据库</h3>
                  <button className="close-btn" onClick={() => setShowResetConfirm(false)}>×</button>
                </div>
                <div className="modal-body">
                  <p style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    将<strong>清空所有记录、邮件、备注和导入日志</strong>，表结构重建为空库。
                  </p>
                  <p style={{ fontSize: '13px', color: '#909399', marginTop: '8px' }}>
                    重置后请按顺序导入邮件包来验证完整流程：正常记录→晚到附件→异常数据→重复导入去重。
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-default" onClick={() => setShowResetConfirm(false)}>取消</button>
                  <button className="btn btn-danger" onClick={handleResetDatabase}>确认重置</button>
                </div>
              </div>
            </div>
          )}
          {packages.length === 0 ? (
            <div className="empty-state">暂无可导入的审批邮件包</div>
          ) : (
            packages.map(pkg => (
              <div key={pkg.index} className="import-package-card">
                <div className="package-header">
                  <div className="package-subject">{pkg.subject}</div>
                  <div className="package-meta">
                    <span>发件人: {pkg.sender}</span>
                    <span>发送: {pkg.sent_at}</span>
                    <span>含 {pkg.row_count} 行数据</span>
                    {pkg.is_attachment_late && (
                      <span className="status-badge status-suspended">含晚到附件</span>
                    )}
                  </div>
                </div>
                <div className="package-rows">
                  <table>
                    <thead>
                      <tr>
                        <th>行号</th>
                        <th>凭证号</th>
                        <th>对手方</th>
                        <th>金额</th>
                        <th>币种</th>
                        <th>原始税费/汇率</th>
                        <th>附件状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.rows.map((row, ri) => (
                        <tr key={ri}>
                          <td>{row.row_number}</td>
                          <td style={{ fontWeight: 500 }}>{row.voucher_number}</td>
                          <td>{row.counterparty || '-'}</td>
                          <td>{row.amount !== null && row.amount !== undefined ? formatAmount(row.amount) : '-'}</td>
                          <td>{row.currency || '-'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.raw_mixed_tax_rate || '-'}</td>
                          <td>
                            {row.attachment_arrived ? (
                              <span className="status-badge status-normal">已到达</span>
                            ) : (
                              <span className="status-badge status-suspended">晚到({row.attachment_file})</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="package-actions">
                  <button
                    className="btn btn-primary"
                    disabled={importing}
                    onClick={() => handleImport(pkg.index)}
                  >
                    {importing ? '导入中...' : '导入此邮件包'}
                  </button>
                  <button
                    className="btn btn-warning"
                    disabled={importing}
                    onClick={() => handleImport(pkg.index)}
                    title="再次导入同一邮件包，验证正常记录不翻倍、人工备注不被覆盖"
                  >
                    {importing ? '导入中...' : '重复导入(验证去重)'}
                  </button>
                </div>
              </div>
            ))
          )}

          {importResult && (
            <div className="import-result-panel">
              <div className="section-title">导入结果（批次号: {importResult.batch_no}）</div>
              <div className="result-summary">
                <span className="result-item result-created">新建: {importResult.created}</span>
                <span className="result-item result-skipped">跳过(去重): {importResult.skipped}</span>
                <span className="result-item result-suspended">挂起: {importResult.suspended}</span>
                <span className="result-item result-error">异常: {importResult.errors}</span>
              </div>
              <div className="result-details">
                {importResult.details.map((d, i) => (
                  <div key={i} className={`result-detail-row result-${d.status}`}>
                    <span className={`status-badge ${STATUS_CLASSES[d.status] || 'status-normal'}`}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                    <span className="result-voucher">{d.voucher ? `凭证${d.voucher}` : ''}</span>
                    <span className="result-detail-text">{d.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="section-title" style={{ marginTop: '24px' }}>最近导入日志</div>
          <div className="record-table">
            <table>
              <thead>
                <tr>
                  <th>批次号</th>
                  <th>操作</th>
                  <th>行号</th>
                  <th>详情</th>
                  <th>操作人</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {importLogs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#909399', padding: '20px' }}>暂无导入日志</td></tr>
                ) : importLogs.slice(0, 30).map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.batch_no}</td>
                    <td>
                      <span className={`status-badge ${ACTION_CLASSES[log.action] || 'status-normal'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td>{log.original_row_number || '-'}</td>
                    <td style={{ fontSize: '12px', maxWidth: '500px' }}>{log.detail || '-'}</td>
                    <td>{log.imported_by || '-'}</td>
                    <td style={{ fontSize: '12px' }}>{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'emails' && (
        <>
          {emails.length === 0 ? (
            <div className="empty-state">
              <p>暂无审批邮件数据，请先在"导入操作"中导入审批邮件</p>
            </div>
          ) : (
            emails.map(e => (
              <div key={e.id} className={`email-card ${e.status === 'suspended' ? 'suspended' : ''}`}>
                <div className="email-subject">
                  {e.subject}
                  <span style={{ marginLeft: '12px' }} className={`status-badge ${STATUS_CLASSES[e.status] || 'status-normal'}`}>
                    {STATUS_LABELS[e.status] || e.status}
                  </span>
                  {e.is_attachment_late && (
                    <span className="status-badge status-suspended" style={{ marginLeft: '8px' }}>
                      附件晚到
                    </span>
                  )}
                </div>
                <div className="email-meta">
                  <span>Message-ID: {e.email_message_id}</span>
                  <span>发件人: {e.sender}</span>
                  <span>收件人: {e.recipient}</span>
                  <span>发送时间: {formatDate(e.sent_at)}</span>
                  <span>接收时间: {formatDate(e.received_at)}</span>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activeTab === 'export' && (
        <>
          <div className="filter-bar">
            <span style={{ fontSize: '14px', color: '#606266' }}>
              以下是导出数据预览（含人工备注同步标记）：
            </span>
            <button
              className="btn btn-primary"
              disabled={syncing}
              onClick={handleSyncExport}
            >
              {syncing ? '同步中...' : '同步所有备注到导出'}
            </button>
          </div>
          <div className="record-table">
            <table>
              <thead>
                <tr>
                  <th>凭证号</th>
                  <th>交易日期</th>
                  <th>金额</th>
                  <th>币种</th>
                  <th>对手方</th>
                  <th>税费</th>
                  <th>汇率</th>
                  <th>原始列</th>
                  <th>状态</th>
                  <th>人工备注</th>
                  <th>导出同步</th>
                </tr>
              </thead>
              <tbody>
                {exportData?.data?.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: '#909399', padding: '40px' }}>暂无导出数据</td></tr>
                ) : (exportData?.data || []).map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 500 }}>{r.voucher_number || '-'}</td>
                    <td>{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className={r.amount < 0 ? 'amount-negative' : 'amount-positive'}>
                      {formatAmount(r.amount)}
                    </td>
                    <td>{r.currency || '-'}</td>
                    <td>{r.counterparty || '-'}</td>
                    <td>{r.tax_amount !== null && r.tax_amount !== undefined ? r.tax_amount : '-'}</td>
                    <td>{r.exchange_rate !== null && r.exchange_rate !== undefined ? r.exchange_rate : '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.raw_tax_rate || '-'}</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASSES[r.status] || 'status-normal'}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '12px' }}>{r.manual_remarks || '-'}</td>
                    <td>
                      {r.export_synced ? (
                        <span className="export-synced">✓ 已同步</span>
                      ) : (
                        <span className="export-unsynced">⚠ 待同步</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedRecord && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>记录详情 - {selectedRecord.voucher_number || '未知凭证'}</h3>
              <button className="close-btn" onClick={closeDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>基本信息</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>状态</label>
                    <div className="value">
                      <span className={`status-badge ${STATUS_CLASSES[selectedRecord.status] || 'status-normal'}`}>
                        {STATUS_LABELS[selectedRecord.status] || selectedRecord.status}
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>邮件原始行号</label>
                    <div className="value">{selectedRecord.original_row_number || '-'}</div>
                  </div>
                  <div className="detail-item">
                    <label>交易日期</label>
                    <div className="value">{formatDate(selectedRecord.transaction_date)}</div>
                  </div>
                  <div className="detail-item">
                    <label>金额</label>
                    <div className={`value ${selectedRecord.amount < 0 ? 'amount-negative' : 'amount-positive'}`}>
                      {formatAmount(selectedRecord.amount)} {selectedRecord.currency}
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>对手方</label>
                    <div className="value">{selectedRecord.counterparty || '-'}</div>
                  </div>
                  <div className="detail-item">
                    <label>创建时间</label>
                    <div className="value">{formatDate(selectedRecord.created_at)}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>税费与汇率（混列解析）</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>邮件原始列值</label>
                    <div className="value" style={{ fontFamily: 'monospace' }}>
                      {selectedRecord.raw_mixed_tax_rate_column || '-'}
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>解析后税费</label>
                    <div className="value">
                      {selectedRecord.tax_amount !== null && selectedRecord.tax_amount !== undefined
                        ? selectedRecord.tax_amount.toLocaleString()
                        : '无法解析'}
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>解析后汇率</label>
                    <div className="value">
                      {selectedRecord.exchange_rate !== null && selectedRecord.exchange_rate !== undefined
                        ? selectedRecord.exchange_rate
                        : '无法解析'}
                    </div>
                  </div>
                </div>
              </div>

              {(selectedRecord.status === 'abnormal' || selectedRecord.status === 'suspended' || selectedRecord.status === 'supplementary') && selectedRecord.abnormal_reason && (
                <div className="detail-section">
                  <h4 style={{ color: selectedRecord.status === 'abnormal' ? '#f56c6c' : selectedRecord.status === 'suspended' ? '#e6a23c' : '#67c23a' }}>
                    {selectedRecord.status === 'abnormal' ? '异常原因' : selectedRecord.status === 'suspended' ? '挂起原因' : '补录说明'}
                  </h4>
                  <div className="abnormal-cell" style={{ padding: '12px', background: '#f5f7fa', borderRadius: '6px' }}>
                    {selectedRecord.abnormal_reason}
                  </div>
                </div>
              )}

              {selectedRecord.status === 'suspended' && (
                <div className="detail-section">
                  <h4 style={{ color: '#e6a23c' }}>补录操作（凭证晚到，请确认后补录）</h4>
                  <div className="supplement-form">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>补录税费</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="输入实际税费金额"
                          value={supplementData.tax_amount}
                          onChange={(e) => setSupplementData(prev => ({ ...prev, tax_amount: e.target.value }))}
                        />
                      </div>
                      <div className="detail-item">
                        <label>补录汇率</label>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="输入实际汇率"
                          value={supplementData.exchange_rate}
                          onChange={(e) => setSupplementData(prev => ({ ...prev, exchange_rate: e.target.value }))}
                        />
                      </div>
                      <div className="detail-item">
                        <label>补录金额</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="如需修正金额"
                          value={supplementData.amount}
                          onChange={(e) => setSupplementData(prev => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                      <div className="detail-item">
                        <label>操作人</label>
                        <input
                          type="text"
                          value={operator}
                          onChange={(e) => setOperator(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '12px' }}
                      disabled={supplementing}
                      onClick={handleSupplement}
                    >
                      {supplementing ? '补录中...' : '确认补录（凭证已到达）'}
                    </button>
                    <p style={{ fontSize: '12px', color: '#909399', marginTop: '8px' }}>
                      补录后记录状态将变更为"补录"，附件标记为已到达，关联邮件状态自动更新。
                    </p>
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h4>人工备注</h4>
                {remarks.length === 0 ? (
                  <div style={{ color: '#909399', fontSize: '13px' }}>暂无备注</div>
                ) : (
                  <div className="remark-list">
                    {remarks.map(rm => (
                      <div key={rm.id} className="remark-item">
                        <div className="remark-meta">
                          {rm.operator} · {formatDate(rm.created_at)}
                          {rm.is_export_synced ? (
                            <span className="export-synced">✓ 导出已同步</span>
                          ) : (
                            <span className="export-unsynced">⚠ 待同步</span>
                          )}
                        </div>
                        <div className="remark-content">{rm.remark_content}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="remark-form">
                  <input
                    type="text"
                    placeholder="操作人姓名"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                  />
                  <textarea
                    placeholder="添加备注，保存后将同步到导出结果..."
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={closeDetail}>
                关闭
              </button>
              <button
                className="btn btn-primary"
                onClick={submitRemark}
                disabled={loading || !newRemark.trim()}
              >
                {loading ? '保存中...' : '保存备注'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
