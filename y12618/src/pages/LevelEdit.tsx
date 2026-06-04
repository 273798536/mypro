import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  GitMerge,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { useStore } from '@/store';
import type { Violation } from '@/api';

export default function LevelEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentLevel,
    violations,
    affectedConclusions,
    conclusions,
    drafts,
    dedupResult,
    fixError,
    fetchLevel,
    fetchViolations,
    fetchConclusions,
    fetchDrafts,
    updateViolation,
    checkDedup,
    mergeDuplicates,
    createDraft,
    clearDedupResult,
    clearFixError,
    clearError,
    error,
    loading,
  } = useStore();

  const [editStatus, setEditStatus] = useState<Record<string, Violation['status']>>({});
  const [editDesc, setEditDesc] = useState<Record<string, string>>({});
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftStatus, setDraftStatus] = useState<'missing' | 'partial' | 'complete'>('missing');
  const [draftLinkedIds, setDraftLinkedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchLevel(id);
    fetchViolations(id);
    fetchConclusions(id);
    fetchDrafts(id);
    return () => {
      clearDedupResult();
      clearFixError();
    };
  }, [id, fetchLevel, fetchViolations, fetchConclusions, fetchDrafts, clearDedupResult, clearFixError]);

  const openViolations = violations.filter((v) => v.status === 'open');

  const handleFix = async (violationId: string) => {
    const status = editStatus[violationId] || 'fixed';
    const description = editDesc[violationId];
    await updateViolation(violationId, { status, description });
  };

  const handleCheckDedup = async () => {
    if (!id) return;
    await checkDedup(id);
  };

  const handleMerge = async (canonicalId: string, duplicateIds: string[]) => {
    await mergeDuplicates(canonicalId, duplicateIds);
  };

  const handleCreateDraft = async () => {
    if (!id || !draftName.trim()) return;
    await createDraft(id, {
      name: draftName,
      content: draftContent,
      status: draftStatus,
      linkedConclusionIds: draftLinkedIds,
    });
    setDraftName('');
    setDraftContent('');
    setDraftStatus('missing');
    setDraftLinkedIds([]);
    setShowDraftForm(false);
  };

  const toggleLinkedConclusion = (cid: string) => {
    setDraftLinkedIds((prev) =>
      prev.includes(cid) ? prev.filter((i) => i !== cid) : [...prev, cid]
    );
  };

  if (loading && !currentLevel) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-custom">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/level/${id}`)} className="btn-emboss-ghost p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            修正违例 - {currentLevel?.name}
          </h2>
        </div>
        <button
          onClick={handleCheckDedup}
          className="btn-emboss-secondary flex items-center gap-1.5 text-sm"
        >
          <GitMerge className="h-4 w-4" />
          去重检测
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-terracotta" />
          <span className="text-sm text-terracotta flex-1">{error}</span>
          <button onClick={() => clearError()} className="ml-auto">
            <X className="h-4 w-4 text-terracotta/60" />
          </button>
        </div>
      )}

      {fixError && (
        <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-terracotta" />
            <p className="text-sm font-medium text-terracotta">{fixError.message}</p>
            <button onClick={() => clearFixError()} className="ml-auto">
              <X className="h-4 w-4 text-terracotta/60" />
            </button>
          </div>
          {fixError.actionableHint && (
            <p className="text-xs text-terracotta/70 mb-3">{fixError.actionableHint}</p>
          )}
          {fixError.missingDraftNames.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-terracotta/80">缺失的标注草稿：</p>
              <div className="flex flex-wrap gap-2">
                {fixError.missingDraftNames.map((name, i) => (
                  <span key={i} className="badge-error flex items-center gap-1">
                    {name}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setShowDraftForm(true)}
                className="btn-emboss-danger flex items-center gap-1 text-xs mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                补录草稿
              </button>
            </div>
          )}
        </div>
      )}

      {dedupResult?.hasDuplicates && (
        <div className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-dark" />
            <p className="text-sm font-medium text-amber-dark">
              检测到 {dedupResult.groups.length} 组重复结论
            </p>
          </div>
          <div className="space-y-3">
            {dedupResult.groups.map((group, i) => (
              <div key={i} className="rounded-lg bg-white/60 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">{group.content}</p>
                  <button
                    onClick={() => handleMerge(group.canonicalId, group.duplicateIds)}
                    className="btn-emboss-primary flex items-center gap-1 text-xs"
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    合并
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-custom">
                  <span>主结论: {group.canonicalId.slice(0, 8)}...</span>
                  <span>· 重复: {group.duplicateIds.length} 条</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dedupResult && !dedupResult.hasDuplicates && (
        <div className="card-success flex items-center gap-2 py-3">
          <span className="text-moss text-sm">未检测到重复结论</span>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-serif text-lg font-semibold text-ink">违例修正</h3>
        {openViolations.length === 0 ? (
          <div className="card-success flex items-center gap-2 py-4">
            <span className="text-moss font-medium">所有违例已修正</span>
          </div>
        ) : (
          openViolations.map((v) => (
            <div key={v.id} className="card-violation">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-error">未修正</span>
                  <span className="text-sm font-medium text-ink">{v.violationType}</span>
                </div>
                <p className="text-xs text-slate-custom mb-2">{v.description}</p>
                {v.affectedConclusionIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.affectedConclusionIds.map((cid) => {
                      const c = affectedConclusions.find((ac) => ac.id === cid);
                      return (
                        <span key={cid} className="badge badge-warning text-[10px]">
                          {c?.content || cid.slice(0, 8)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-custom w-14">状态</label>
                  <select
                    className="select-field flex-1 text-sm"
                    value={editStatus[v.id] || 'fixed'}
                    onChange={(e) =>
                      setEditStatus((prev) => ({
                        ...prev,
                        [v.id]: e.target.value as Violation['status'],
                      }))
                    }
                  >
                    <option value="open">未修正</option>
                    <option value="fixed">已修正</option>
                    <option value="suppressed">已抑制</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-custom w-14">描述</label>
                  <input
                    type="text"
                    placeholder="修改描述..."
                    className="input-field flex-1 text-sm"
                    value={editDesc[v.id] || v.description}
                    onChange={(e) =>
                      setEditDesc((prev) => ({ ...prev, [v.id]: e.target.value }))
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleFix(v.id)}
                    disabled={loading}
                    className="btn-emboss-success flex items-center gap-1 text-xs disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-ink">草稿补录</h3>
          <button
            onClick={() => setShowDraftForm(!showDraftForm)}
            className="btn-emboss-ghost flex items-center gap-1 text-sm"
          >
            <Plus className="h-4 w-4" />
            新增草稿
          </button>
        </div>

        {showDraftForm && (
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-custom w-20">名称</label>
              <input
                type="text"
                className="input-field flex-1 text-sm"
                placeholder="草稿名称"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-custom w-20">内容</label>
              <textarea
                className="input-field flex-1 text-sm"
                placeholder="草稿内容"
                rows={2}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-custom w-20">状态</label>
              <select
                className="select-field flex-1 text-sm"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as 'missing' | 'partial' | 'complete')}
              >
                <option value="missing">缺失</option>
                <option value="partial">部分</option>
                <option value="complete">完整</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-custom block mb-2">关联结论</label>
              <div className="flex flex-wrap gap-2">
                {conclusions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleLinkedConclusion(c.id)}
                    className={`badge cursor-pointer transition-colors ${
                      draftLinkedIds.includes(c.id)
                        ? 'badge-success'
                        : 'bg-ink/5 text-slate-custom hover:bg-ink/10'
                    }`}
                  >
                    {c.content.length > 20 ? c.content.slice(0, 20) + '...' : c.content}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDraftForm(false)}
                className="btn-emboss-ghost text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreateDraft}
                disabled={!draftName.trim() || loading}
                className="btn-emboss-primary flex items-center gap-1 text-sm disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                保存草稿
              </button>
            </div>
          </div>
        )}

        {drafts.length > 0 && (
          <div className="space-y-2">
            {drafts.map((d) => (
              <div key={d.id} className="card flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{d.name}</span>
                    <span className={`badge ${
                      d.status === 'complete'
                        ? 'badge-success'
                        : d.status === 'partial'
                        ? 'badge-warning'
                        : 'badge-error'
                    }`}>
                      {d.status === 'complete' ? '完整' : d.status === 'partial' ? '部分' : '缺失'}
                    </span>
                  </div>
                  {d.content && (
                    <p className="text-xs text-slate-custom mt-0.5 truncate">{d.content}</p>
                  )}
                </div>
                {d.linkedConclusionIds.length > 0 && (
                  <span className="text-xs text-slate-custom/60">
                    {d.linkedConclusionIds.length} 结论
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
