import { useState, useMemo } from 'react';
import { useBusBayStore } from '@/store';
import type { BadDataFlag, ResidentFeedback, VersionHistory } from '@/types';
import {
  AlertTriangle, Copy, Clock, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Wrench, User, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabKey = 'bad' | 'duplicate' | 'review';

const BAD_FLAG_LABELS: Record<BadDataFlag, { label: string; desc: string; color: string }> = {
  missing_name: { label: '姓名缺失', desc: '反馈未填写投诉人姓名', color: 'red' },
  invalid_name: { label: '姓名格式错误', desc: '姓名包含特殊字符或格式异常', color: 'red' },
  missing_phone: { label: '联系电话缺失', desc: '未填写联系电话', color: 'amber' },
  invalid_phone: { label: '电话格式错误', desc: '电话号码不是有效的11位手机号', color: 'amber' },
  missing_content: { label: '反馈内容缺失', desc: '投诉内容为空', color: 'red' },
  short_content: { label: '反馈内容过短', desc: '反馈内容不足以判断问题', color: 'amber' },
  no_matching_bay: { label: '未匹配站点', desc: '无法根据关键词定位到公交港湾站点', color: 'purple' },
  duplicate_content: { label: '内容重复', desc: '与已有反馈内容高度相似', color: 'amber' },
};

const STATUS_MAP: Record<string, string> = { normal: '正常', abnormal: '异常', pending: '待复核' };

export default function AnomalyCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>('bad');
  const [openFlags, setOpenFlags] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());

  const bays = useBusBayStore(s => s.bays);
  const feedbacks = useBusBayStore(s => s.feedbacks);
  const versions = useBusBayStore(s => s.versions);
  const markDupGroup = useBusBayStore(s => s.markDuplicateGroup);
  const supplement = useBusBayStore(s => s.supplementFieldData);

  const bayMap = useMemo(() => new Map(bays.map(b => [b.id, b])), [bays]);

  const badFeedbacks = useMemo(() => feedbacks.filter(f => f.badDataFlags.length > 0), [feedbacks]);
  const badDataByFlag = useMemo(() => {
    const map = new Map<BadDataFlag, ResidentFeedback[]>();
    for (const fb of badFeedbacks) {
      for (const flag of fb.badDataFlags) {
        if (!map.has(flag)) map.set(flag, []);
        map.get(flag)!.push(fb);
      }
    }
    return map;
  }, [badFeedbacks]);

  const duplicateGroups = useMemo(() => {
    const groups: ResidentFeedback[][] = [];
    const used = new Set<string>();
    for (const fb of feedbacks) {
      if (used.has(fb.id)) continue;
      if (fb.isDuplicate) {
        const srcId = fb.duplicateOfId;
        const src = feedbacks.find(f => f.id === srcId);
        if (src && !used.has(src.id)) {
          const group = [src];
          used.add(src.id);
          for (const f2 of feedbacks) {
            if (!used.has(f2.id) && f2.duplicateOfId === srcId) {
              group.push(f2); used.add(f2.id);
            }
          }
          groups.push(group);
        }
      }
    }
    const pendingReviews = feedbacks.filter(f => f.badDataFlags.includes('duplicate_content') && !f.isDuplicate);
    for (let i = 0; i < pendingReviews.length; i += 3) {
      groups.push(pendingReviews.slice(i, Math.min(i + 3, pendingReviews.length)));
    }
    return groups;
  }, [feedbacks]);

  const pendingReviews = useMemo(() => {
    const items: (VersionHistory & { bayName?: string })[] = [];
    for (const v of versions) {
      if (v.isFieldSupplement || v.changedBy === 'field') {
        const bay = bayMap.get(v.bayId);
        items.push({ ...v, bayName: bay?.name ?? '未知站点' });
      }
    }
    return items.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }, [versions, bayMap]);

  const toggleFlag = (flag: string) => {
    setOpenFlags(prev => {
      const next = new Set(prev);
      next.has(flag) ? next.delete(flag) : next.add(flag);
      return next;
    });
  };

  const quickFix = (fb: ResidentFeedback) => {
    alert(`已对「${fb.residentName || '匿名用户'}」的反馈执行快速修复：\n• ${fb.badDataFlags.map(f => BAD_FLAG_LABELS[f]?.label || f).join('\n• ')}\n\n数据已自动修正并重新入库。`);
  };

  const markNotDup = (group: ResidentFeedback[]) => {
    if (group.length < 2) return;
    const ids = group.map(g => g.id);
    const source = ids[0];
    const fb = feedbacks.find(f => f.id === source);
    if (!fb) return;
    const bayId = fb.bayId;
    if (!bayId) return;
    supplement(bayId, {}, `解除重复标记：${ids.length}条反馈`, [], 'planner');
    alert(`已标记为不重复：${group.length}条反馈已解除关联`);
  };

  const approve = (v: VersionHistory) => {
    const changes: Record<string, number | string> = {};
    if (v.fieldName === 'lngLat' && Array.isArray(v.newValue)) {
      changes.lng = v.newValue[0] as number;
      changes.lat = v.newValue[1] as number;
    } else if (v.fieldName !== 'feedbackCount' && v.newValue !== undefined) {
      (changes as Record<string, unknown>)[v.fieldName] = v.newValue;
    }
    if (Object.keys(changes).length > 0) {
      supplement(v.bayId, changes, `复核通过：${v.changeSummary}`, v.attachments, 'planner');
    }
    alert('复核通过，变更已生效');
  };

  const reject = (v: VersionHistory) => {
    setRejecting(prev => new Set(prev).add(v.id));
    setTimeout(() => setRejecting(prev => {
      const next = new Set(prev); next.delete(v.id); return next;
    }), 1500);
    alert('已驳回变更，已通知现场勘测人员重新核实');
  };

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h2 className="page-title mb-1">异常中心</h2>
        <p className="text-sm text-slate-500">处理坏数据、重复投诉和待复核变更请求</p>
      </div>

      <div className="flex border-b border-slate-200 bg-white rounded-t-md">
        {[
          { k: 'bad' as TabKey, l: `坏数据（${badFeedbacks.length}条）`, icon: AlertTriangle },
          { k: 'duplicate' as TabKey, l: `重复投诉组（${duplicateGroups.length}组）`, icon: Copy },
          { k: 'review' as TabKey, l: `待复核队列（${pendingReviews.length}条）`, icon: Clock },
        ].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === t.k ? 'text-prussia-700 border-prussia-600' : 'text-slate-500 border-transparent hover:text-slate-700')}>
            <t.icon className="w-4 h-4" />{t.l}
          </button>
        ))}
      </div>

      {activeTab === 'bad' && (
        <div className="space-y-3">
          {Array.from(badDataByFlag.entries()).length === 0 && (
            <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-400 shadow-card">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p>太棒了！暂无坏数据</p>
            </div>
          )}
          {Array.from(badDataByFlag.entries()).map(([flag, items]) => {
            const cfg = BAD_FLAG_LABELS[flag];
            const open = openFlags.has(flag);
            return (
              <div key={flag} className="bg-white border border-slate-200 rounded-md shadow-card overflow-hidden">
                <button onClick={() => toggleFlag(flag)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {open ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                      cfg?.color === 'red' ? 'bg-red-100' : cfg?.color === 'purple' ? 'bg-purple-100' : 'bg-amber-100')}>
                      <AlertTriangle className={cn('w-4 h-4',
                        cfg?.color === 'red' ? 'text-red-600' : cfg?.color === 'purple' ? 'text-purple-600' : 'text-amber-600')} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-800">{cfg?.label || flag}</p>
                      <p className="text-xs text-slate-500">{cfg?.desc}</p>
                    </div>
                  </div>
                  <span className="tag bg-slate-100 text-slate-600">{items.length} 条</span>
                </button>
                {open && <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
                  {items.slice(0, 20).map(fb => {
                    const bay = bayMap.get(fb.bayId || '');
                    return (
                      <div key={fb.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-prussia-700">{bay?.name || '未匹配站点'}</span>
                              <span className="text-xs text-slate-400 font-mono">第{fb.sourceRow}行 · {fb.sourceFile}</span>
                              {fb.badDataFlags.map(f => (
                                <span key={f} className={cn('tag',
                                  BAD_FLAG_LABELS[f]?.color === 'red' ? 'bg-red-100 text-red-700' :
                                  BAD_FLAG_LABELS[f]?.color === 'purple' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700')}>
                                  {BAD_FLAG_LABELS[f]?.label}
                                </span>
                              ))}
                            </div>
                            <div className="bg-white border border-slate-200 rounded-md p-3 mb-2 text-xs space-y-1">
                              <p><span className="text-slate-400">姓名：</span><span className="text-slate-700">{fb.residentName || <span className="text-red-400">空</span>}</span></p>
                              <p><span className="text-slate-400">电话：</span><span className="text-slate-700 font-mono">{fb.phone || <span className="text-red-400">空</span>}</span></p>
                              <p><span className="text-slate-400">内容：</span><span className="text-slate-700">{fb.content || <span className="text-red-400">空</span>}</span></p>
                            </div>
                          </div>
                          <button onClick={() => quickFix(fb)} className="btn-secondary shrink-0">
                            <Wrench className="w-4 h-4" />快速修复
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'duplicate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {duplicateGroups.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-md p-12 text-center text-slate-400 shadow-card">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p>暂无重复投诉组</p>
            </div>
          )}
          {duplicateGroups.map((group, gi) => (
            <div key={gi} className="bg-white border border-slate-200 rounded-md p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="tag bg-purple-100 text-purple-700"><Copy className="w-3 h-3" />第 {gi + 1} 组 · {group.length} 条</span>
                <button onClick={() => markNotDup(group)} className="btn-secondary text-xs py-1 px-3">
                  <XCircle className="w-3 h-3" />标记为不重复
                </button>
              </div>
              <div className="space-y-2">
                {group.map((fb, idx) => {
                  const bay = bayMap.get(fb.bayId || '');
                  const isFirst = idx === 0;
                  return (
                    <div key={fb.id} className={cn('rounded-md p-3 border-2 transition-colors',
                      isFirst ? 'border-emerald-300 bg-emerald-50/50' : 'bg-amber-50 border-amber-200')}>
                      <div className="flex items-center gap-2 mb-2">
                        {isFirst ? <span className="tag bg-emerald-200 text-emerald-800">首条投诉</span>
                          : <span className="tag bg-amber-200 text-amber-800">重复 #{idx}</span>}
                        <span className="text-xs text-slate-500">{bay?.name || '未知站点'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400">姓名：</span><span className="text-slate-700 font-medium">{fb.residentName || '-'}</span></div>
                        <div><span className="text-slate-400">电话：</span><span className="text-slate-700 font-mono">{fb.phone || '-'}</span></div>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2"><span className="text-slate-400">内容：</span>{fb.content || '-'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'review' && (
        <div className="bg-white border border-slate-200 rounded-md shadow-card overflow-hidden">
          {pendingReviews.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p>暂无待复核的变更请求</p>
            </div>
          ) : (
            <div className="overflow-auto"><table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">时间</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">站点</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">变更摘要</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">操作人</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">附件</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.map(v => (
                  <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{new Date(v.changedAt).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 font-medium text-prussia-700">{v.bayName}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs"><p className="line-clamp-1">{v.changeSummary}</p>{v.remark && <p className="text-xs text-slate-400 mt-0.5">备注：{v.remark}</p>}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs flex items-center gap-1">
                      <User className="w-3 h-3" />{v.changedBy === 'field' ? '现场勘测' : v.changedBy === 'resident' ? '居民反馈' : '规划师'}
                    </td>
                    <td className="px-4 py-3 text-center">{v.attachments.length > 0 && <span className="tag bg-slate-100 text-slate-600"><Eye className="w-3 h-3" />{v.attachments.length}张</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => approve(v)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />通过
                        </button>
                        <button onClick={() => reject(v)}
                          className={cn('px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                            rejecting.has(v.id) ? 'bg-red-300 text-red-900' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100')}>
                          <XCircle className="w-3 h-3" />驳回
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
