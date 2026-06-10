import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { detectReagentIssues, parseReagentRemark, checkReagentExpiry } from '@/utils/reagent';
import type { DataQualityIssue, Reagent } from '@/types';
import { Banner } from '@/components/Banner';
import { FlaskConical, AlertTriangle, Merge, Plus, Trash2, Edit3, Check, X, FileSearch } from 'lucide-react';

type FieldKey = keyof Reagent;

function ReagentPage() {
  const { reagents, initializeWithMock, addReagent, updateReagent, deleteReagent, mergeDuplicateReagents } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Reagent>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReagent, setNewReagent] = useState<Partial<Reagent>>({});
  const [filter, setFilter] = useState<'all' | 'issues' | 'expired'>('all');

  initializeWithMock();

  const issues: DataQualityIssue[] = useMemo(() => detectReagentIssues(reagents), [reagents]);

  const reagentIssuesMap = useMemo(() => {
    const map = new Map<string, DataQualityIssue[]>();
    issues.forEach((issue) => {
      (issue.reagentId || '').split(',').forEach((id) => {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push(issue);
      });
    });
    return map;
  }, [issues]);

  const filteredReagents = useMemo(() => {
    if (filter === 'all') return reagents;
    if (filter === 'issues') return reagents.filter((r) => reagentIssuesMap.has(r.id));
    if (filter === 'expired') return reagents.filter((r) => checkReagentExpiry(r.expiryDate) !== 'ok');
    return reagents;
  }, [reagents, filter, reagentIssuesMap]);

  const stats = useMemo(() => ({
    total: reagents.length,
    withIssues: new Set(issues.map((i) => i.reagentId?.split(',')).flat().filter(Boolean)).size,
    expired: reagents.filter((r) => checkReagentExpiry(r.expiryDate) === 'expired').length,
  }), [reagents, issues]);

  const startEdit = (r: Reagent) => {
    setEditingId(r.id);
    setEditDraft(r);
  };

  const saveEdit = () => {
    if (editingId && editDraft) {
      updateReagent(editingId, editDraft);
    }
    setEditingId(null);
    setEditDraft({});
  };

  const handleAdd = () => {
    if (!newReagent.code || !newReagent.name) {
      alert('试剂编号和名称为必填');
      return;
    }
    addReagent({
      code: newReagent.code || '',
      name: newReagent.name || '',
      batchNo: newReagent.batchNo || '',
      purity: newReagent.purity || '',
      expiryDate: newReagent.expiryDate || '',
      remark: newReagent.remark || '',
      status: 'available',
    });
    setNewReagent({});
    setShowAddForm(false);
  };

  const renderCell = (r: Reagent, field: FieldKey) => {
    const isEditing = editingId === r.id;
    const rIssues = reagentIssuesMap.get(r.id) || [];
    const fieldIssue = rIssues.find((i) => i.field === field);
    const baseCls = `table-td ${fieldIssue && fieldIssue.type === 'empty' ? 'bg-status-failBg/40' : ''}`;

    if (!isEditing) {
      const value = r[field];
      if (field === 'expiryDate') {
        const status = checkReagentExpiry(value as string);
        return (
          <td className={baseCls}>
            <span className={status === 'expired' ? 'text-status-fail font-medium' : status === 'warning' ? 'text-status-review font-medium' : ''}>
              {value || <span className="text-slate-300">—</span>}
            </span>
            {status === 'expired' && <span className="ml-2 text-[10px] text-status-fail">已过期</span>}
            {status === 'warning' && <span className="ml-2 text-[10px] text-status-review">即将过期</span>}
          </td>
        );
      }
      if (field === 'remark') {
        const parsed = parseReagentRemark(value as string);
        return (
          <td className={baseCls}>
            {value ? (
              <div className="group relative inline-block">
                <span className="truncate max-w-[180px] inline-block">
                  {String(value)}
                </span>
                {Object.keys(parsed).length > 0 && (
                  <div className="hidden group-hover:block absolute z-10 left-0 top-full mt-1 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl min-w-[200px] whitespace-normal">
                    <p className="font-semibold mb-1.5 text-slate-200">备注中解析的结构化信息：</p>
                    {parsed.concentration && <p>浓度：{parsed.concentration}</p>}
                    {parsed.batchNo && <p>批号：{parsed.batchNo}</p>}
                    {parsed.expiryDate && <p>有效期：{parsed.expiryDate}</p>}
                    {parsed.storageCondition && <p>保存条件：{parsed.storageCondition}</p>}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>
        );
      }
      if (field === 'code') {
        const dupIssue = rIssues.find((i) => i.type === 'duplicate');
        return (
          <td className={baseCls}>
            <div className="flex items-center gap-1.5">
              {dupIssue && (
                <span title="检测到重复编号">
                  <Merge className="w-3.5 h-3.5 text-status-review" />
                </span>
              )}
              <span className="font-mono text-xs font-medium">{value}</span>
            </div>
          </td>
        );
      }
      return (
        <td className={baseCls}>
          {value || <span className="text-slate-300">—</span>}
        </td>
      );
    }

    const val = (editDraft[field] as string) || '';
    return (
      <td className="table-td">
        <input
          className="w-full px-2 py-1.5 border border-primary-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
          type={field === 'expiryDate' ? 'date' : 'text'}
          value={val}
          onChange={(e) => setEditDraft((d) => ({ ...d, [field]: e.target.value }))}
        />
      </td>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-slate-400 font-medium">试剂总数</p>
          <p className="text-2xl font-serif font-bold text-primary-900 mt-1">{stats.total}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400 font-medium">存在数据质量问题</p>
          <p className="text-2xl font-serif font-bold text-status-review mt-1">{stats.withIssues}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400 font-medium">已过期试剂</p>
          <p className="text-2xl font-serif font-bold text-status-fail mt-1">{stats.expired}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400 font-medium">问题条目数</p>
          <p className="text-2xl font-serif font-bold text-slate-600 mt-1">{issues.length}</p>
        </div>
      </div>

      {issues.length > 0 && (
        <Banner
          type="warning"
          title={`检测到 ${issues.length} 项数据质量问题`}
          message="包含空值、重复编号、备注混写结构化数据，建议立即处理"
          details={issues.map((i, idx) => `${idx + 1}. [${i.type === 'empty' ? '空值' : i.type === 'duplicate' ? '重复' : '备注混写'}] ${i.description}`).join('\n')}
          expandable
        />
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-primary-700" />
            <h3 className="text-base font-semibold text-slate-800 font-serif">试剂台账</h3>
            <div className="flex items-center gap-1 ml-4">
              {(['all', 'issues', 'expired'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f
                      ? 'bg-primary-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'issues' ? '有问题' : '已过期'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {issues.some((i) => i.type === 'duplicate') && (
              <button className="btn-secondary flex items-center gap-1.5 text-sm py-2" onClick={mergeDuplicateReagents}>
                <Merge className="w-4 h-4" />
                合并重复条目
              </button>
            )}
            <button className="btn-primary flex items-center gap-1.5 text-sm py-2" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4" />
              新增试剂
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="p-5 bg-primary-50/40 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label-text">试剂编号 *</label>
                <input className="input-field text-sm" value={newReagent.code || ''} onChange={(e) => setNewReagent({ ...newReagent, code: e.target.value })} placeholder="例：R-CuSO4-001" />
              </div>
              <div>
                <label className="label-text">名称 *</label>
                <input className="input-field text-sm" value={newReagent.name || ''} onChange={(e) => setNewReagent({ ...newReagent, name: e.target.value })} placeholder="例：五水合硫酸铜" />
              </div>
              <div>
                <label className="label-text">批号</label>
                <input className="input-field text-sm" value={newReagent.batchNo || ''} onChange={(e) => setNewReagent({ ...newReagent, batchNo: e.target.value })} />
              </div>
              <div>
                <label className="label-text">纯度</label>
                <input className="input-field text-sm" value={newReagent.purity || ''} onChange={(e) => setNewReagent({ ...newReagent, purity: e.target.value })} placeholder="例：AR ≥99.0%" />
              </div>
              <div>
                <label className="label-text">有效期</label>
                <input type="date" className="input-field text-sm" value={newReagent.expiryDate || ''} onChange={(e) => setNewReagent({ ...newReagent, expiryDate: e.target.value })} />
              </div>
              <div>
                <label className="label-text">备注</label>
                <input className="input-field text-sm" value={newReagent.remark || ''} onChange={(e) => setNewReagent({ ...newReagent, remark: e.target.value })} placeholder="保存条件/浓度等" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost text-sm py-2" onClick={() => setShowAddForm(false)}>取消</button>
              <button className="btn-primary text-sm py-2" onClick={handleAdd}>确认添加</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th w-10"></th>
                <th className="table-th">试剂编号</th>
                <th className="table-th">名称</th>
                <th className="table-th">批号</th>
                <th className="table-th">纯度</th>
                <th className="table-th">有效期</th>
                <th className="table-th">备注</th>
                <th className="table-th w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReagents.map((r) => {
                const rIssues = reagentIssuesMap.get(r.id) || [];
                const isEditing = editingId === r.id;
                return (
                  <tr key={r.id} className={`hover:bg-slate-50/60 ${rIssues.length > 0 ? 'bg-status-reviewBg/20' : ''}`}>
                    <td className="table-td pl-4">
                      {rIssues.length > 0 && (
                        <div className="group relative">
                          <AlertTriangle className="w-4 h-4 text-status-review" />
                          <div className="hidden group-hover:block absolute z-10 left-0 top-full mt-1 bg-slate-800 text-white text-xs rounded-lg p-2.5 shadow-xl min-w-[180px] whitespace-normal">
                            {rIssues.map((i, idx) => (
                              <p key={idx}>• {i.description}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    {renderCell(r, 'code')}
                    {renderCell(r, 'name')}
                    {renderCell(r, 'batchNo')}
                    {renderCell(r, 'purity')}
                    {renderCell(r, 'expiryDate')}
                    {renderCell(r, 'remark')}
                    <td className="table-td">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button onClick={saveEdit} className="p-1.5 rounded-md hover:bg-status-passBg text-status-pass transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditDraft({}); }} className="p-1.5 rounded-md hover:bg-status-failBg text-status-fail transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(r)} className="p-1.5 rounded-md hover:bg-primary-50 text-primary-700 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (confirm('确定删除该试剂？')) deleteReagent(r.id); }} className="p-1.5 rounded-md hover:bg-status-failBg text-status-fail transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredReagents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">暂无符合条件的试剂</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReagentPage;
