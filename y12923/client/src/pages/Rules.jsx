import React, { useState, useEffect } from 'react';
import { getRules, createRule, updateRule, deleteRule } from '../api.js';

const ruleTypeLabels = {
  political: '涉政',
  advertising: '违规广告',
  porn: '低俗色情',
  violence: '暴力恐怖',
  fraud: '诈骗信息',
  other: '其他'
};

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    rule_name: '',
    rule_pattern: '',
    rule_type: 'other',
    description: '',
    is_active: 1
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await getRules();
      setRules(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ rule_name: '', rule_pattern: '', rule_type: 'other', description: '', is_active: 1 });
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      rule_name: rule.rule_name,
      rule_pattern: rule.rule_pattern,
      rule_type: rule.rule_type,
      description: rule.description || '',
      is_active: rule.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateRule(editing.id, form);
      } else {
        await createRule(form);
      }
      setShowModal(false);
      loadRules();
    } catch (e) {
      alert('保存失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条规则吗？')) return;
    try {
      await deleteRule(id);
      loadRules();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleActive = async (rule) => {
    try {
      await updateRule(rule.id, { ...rule, is_active: rule.is_active === 1 ? 0 : 1 });
      loadRules();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>安全规则管理</h2>
          <button className="btn btn-primary" onClick={openNew}>+ 新增规则</button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>规则名称</th>
              <th>类型</th>
              <th>正则表达式</th>
              <th>描述</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td style={{ fontWeight: 500 }}>{r.rule_name}</td>
                <td>{ruleTypeLabels[r.rule_type] || r.rule_type}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 300, wordBreak: 'break-all' }}>
                  {r.rule_pattern}
                </td>
                <td>{r.description || '-'}</td>
                <td>
                  <span className={`badge ${r.is_active === 1 ? 'badge-pass' : 'badge-unconfirmed'}`}>
                    {r.is_active === 1 ? '启用' : '停用'}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{new Date(r.updated_at).toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(r)}>
                      {r.is_active === 1 ? '停用' : '启用'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => openEdit(r)}>编辑</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? '编辑规则' : '新增规则'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>规则名称</label>
                  <input type="text" value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>规则类型</label>
                  <select value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}>
                    {Object.entries(ruleTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>正则表达式（JavaScript 正则语法，不区分大小写）</label>
                <input
                  type="text"
                  value={form.rule_pattern}
                  onChange={e => setForm({ ...form, rule_pattern: e.target.value })}
                  placeholder="如: (违禁词1|违禁词2)"
                  required
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active === 1}
                    onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
                    style={{ marginRight: 6 }}
                  />
                  启用该规则
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
