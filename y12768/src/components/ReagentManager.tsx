import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Reagent, ReagentLedger } from '../types';

export function ReagentManager() {
  const { state, addReagent, addReagentLedger } = useApp();
  const [showReagentForm, setShowReagentForm] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [reagentForm, setReagentForm] = useState({
    name: '', batchNo: '', expiryDate: '', supplier: ''
  });
  const [ledgerForm, setLedgerForm] = useState({
    reagentId: state.reagents[0]?.id || '',
    testDate: new Date().toISOString().split('T')[0],
    usageAmount: 500,
    operator: '',
    remark: ''
  });

  const handleAddReagent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reagentForm.name || !reagentForm.batchNo) {
      alert('请填写试剂名称和批号');
      return;
    }
    addReagent(reagentForm);
    setReagentForm({ name: '', batchNo: '', expiryDate: '', supplier: '' });
    setShowReagentForm(false);
  };

  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerForm.reagentId || !ledgerForm.operator) {
      alert('请选择试剂并填写操作人员');
      return;
    }
    addReagentLedger(ledgerForm);
    setLedgerForm({
      reagentId: state.reagents[0]?.id || '',
      testDate: new Date().toISOString().split('T')[0],
      usageAmount: 500,
      operator: '',
      remark: ''
    });
    setShowLedgerForm(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          试剂库存
          <span className="card-subtitle">共 {state.reagents.length} 种试剂</span>
        </div>
        <button className="btn btn-primary mb-4" onClick={() => setShowReagentForm(true)}>
          + 新增试剂
        </button>
        {state.reagents.length === 0 ? (
          <div className="empty-state"><p>暂无试剂记录</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>试剂名称</th>
                <th>批号</th>
                <th>有效期</th>
                <th>供应商</th>
                <th>使用记录数</th>
              </tr>
            </thead>
            <tbody>
              {state.reagents.map(r => {
                const ledgerCount = state.reagentLedgers.filter(l => l.reagentId === r.id).length;
                const isExpired = r.expiryDate && new Date(r.expiryDate) < new Date();
                return (
                  <tr key={r.id} style={isExpired ? { background: '#fef2f2' } : undefined}>
                    <td>{r.name}</td>
                    <td><code>{r.batchNo}</code></td>
                    <td>
                      {r.expiryDate || '-'}
                      {isExpired && <span className="text-danger" style={{ marginLeft: 8 }}>已过期</span>}
                    </td>
                    <td>{r.supplier || '-'}</td>
                    <td>{ledgerCount} 条</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          试剂使用台账
          <span className="card-subtitle">共 {state.reagentLedgers.length} 条使用记录</span>
        </div>
        <button className="btn btn-primary mb-4" onClick={() => setShowLedgerForm(true)}>
          + 新增使用记录
        </button>
        {state.reagentLedgers.length === 0 ? (
          <div className="empty-state"><p>暂无使用记录</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>试剂</th>
                <th>使用日期</th>
                <th>用量(mL/g)</th>
                <th>操作人员</th>
                <th>关联评级记录</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {state.reagentLedgers.map(l => {
                const reagent = state.reagents.find(r => r.id === l.reagentId);
                const linkedRecords = state.records.filter(r => r.reagentLedgerIds.includes(l.id));
                return (
                  <tr key={l.id}>
                    <td>{reagent?.name || '未知试剂'} <code>{reagent?.batchNo}</code></td>
                    <td>{l.testDate}</td>
                    <td>{l.usageAmount}</td>
                    <td>{l.operator}</td>
                    <td>
                      {linkedRecords.length > 0 ? (
                        linkedRecords.map(r => (
                          <span key={r.id} className="source-tag initial" style={{ marginRight: 4 }}>
                            {r.sampleName}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">未关联</span>
                      )}
                    </td>
                    <td>{l.remark || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showReagentForm && (
        <div className="modal-backdrop" onClick={() => setShowReagentForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增试剂</h3>
              <button className="modal-close" onClick={() => setShowReagentForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddReagent}>
              <div className="modal-body">
                <div className="form-group">
                  <label>试剂名称<span className="required">*</span></label>
                  <input type="text" value={reagentForm.name}
                    onChange={e => setReagentForm({ ...reagentForm, name: e.target.value })}
                    placeholder="例如：氯化钠（分析纯）" />
                </div>
                <div className="form-group mt-4">
                  <label>批号<span className="required">*</span></label>
                  <input type="text" value={reagentForm.batchNo}
                    onChange={e => setReagentForm({ ...reagentForm, batchNo: e.target.value })}
                    placeholder="例如：NaCl-20260315" />
                </div>
                <div className="form-grid mt-4">
                  <div className="form-group">
                    <label>有效期</label>
                    <input type="date" value={reagentForm.expiryDate}
                      onChange={e => setReagentForm({ ...reagentForm, expiryDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>供应商</label>
                    <input type="text" value={reagentForm.supplier}
                      onChange={e => setReagentForm({ ...reagentForm, supplier: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReagentForm(false)}>取消</button>
                <button type="submit" className="btn btn-primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLedgerForm && (
        <div className="modal-backdrop" onClick={() => setShowLedgerForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增试剂使用记录</h3>
              <button className="modal-close" onClick={() => setShowLedgerForm(false)}>×</button>
            </div>
            <form onSubmit={handleAddLedger}>
              <div className="modal-body">
                <div className="form-group">
                  <label>试剂<span className="required">*</span></label>
                  <select value={ledgerForm.reagentId}
                    onChange={e => setLedgerForm({ ...ledgerForm, reagentId: e.target.value })}>
                    {state.reagents.map(r => (
                      <option key={r.id} value={r.id}>{r.name}（{r.batchNo}）</option>
                    ))}
                  </select>
                </div>
                <div className="form-grid mt-4">
                  <div className="form-group">
                    <label>使用日期<span className="required">*</span></label>
                    <input type="date" value={ledgerForm.testDate}
                      onChange={e => setLedgerForm({ ...ledgerForm, testDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>用量(mL/g)</label>
                    <input type="number" value={ledgerForm.usageAmount}
                      onChange={e => setLedgerForm({ ...ledgerForm, usageAmount: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="form-group mt-4">
                  <label>操作人员<span className="required">*</span></label>
                  <input type="text" value={ledgerForm.operator}
                    onChange={e => setLedgerForm({ ...ledgerForm, operator: e.target.value })} />
                </div>
                <div className="form-group mt-4">
                  <label>备注</label>
                  <input type="text" value={ledgerForm.remark}
                    onChange={e => setLedgerForm({ ...ledgerForm, remark: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLedgerForm(false)}>取消</button>
                <button type="submit" className="btn btn-primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
