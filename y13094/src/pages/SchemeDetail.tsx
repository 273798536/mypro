import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, Download, AlertTriangle, HardHat, ChevronRight } from 'lucide-react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import { CONCLUSION_LABELS } from '../../shared/types';
import type { ConclusionStatus } from '../../shared/types';
import TimelineView from '@/components/TimelineView';
import HistoryList from '@/components/HistoryList';
import RejudgeModal from '@/components/RejudgeModal';

const CONCLUSION_COLORS: Record<ConclusionStatus, string> = {
  pending: 'bg-[var(--color-info)]',
  approved: 'bg-[var(--color-success)]',
  rejected: 'bg-[var(--color-danger)]',
  revised: 'bg-[var(--color-accent)]',
};

function notify(msg: string) {
  try {
    window.alert(msg);
  } catch {
    console.log(msg);
  }
}

export default function SchemeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentDetail, detailLoading, fetchDetail, updateNote, openRejudgeModal, exportMarkdown } = useSchemeStore();
  const [noteValue, setNoteValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'history'>('timeline');
  const [noteSavedFlash, setNoteSavedFlash] = useState(false);

  useEffect(() => {
    if (id) fetchDetail(id);
  }, [id]);

  useEffect(() => {
    if (currentDetail) {
      setNoteValue(currentDetail.supplementaryNote);
    }
  }, [currentDetail?.supplementaryNote]);

  const handleSaveNote = async () => {
    if (!id || noteValue === currentDetail?.supplementaryNote) return;
    setSaving(true);
    try {
      await updateNote(id, noteValue, '老何');
      setNoteSavedFlash(true);
      setTimeout(() => setNoteSavedFlash(false), 1500);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleExportSingle = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const result = await exportMarkdown([id]);
      const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setExporting(false);
    }
  };

  const goBackToList = () => {
    const params = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) {
      if (k !== '_ctx') params.set(k, v);
    }
    navigate(`/?${params.toString()}`);
  };

  const filterSummary = searchParams.get('_ctx');

  if (detailLoading || !currentDetail) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = currentDetail;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)]">
      <div className="h-14 min-h-[56px] bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-5">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={goBackToList} className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors">
            <ArrowLeft size={16} />
            方案列表
          </button>
          {filterSummary && (
            <>
              <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
              <span className="text-[var(--color-text-muted)] text-xs">{decodeURIComponent(filterSummary)}</span>
            </>
          )}
          <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
          <span className="font-mono text-[var(--color-accent)]">{d.schemeNo}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSingle}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} className={exporting ? 'animate-spin' : ''} />
            {exporting ? '导出中...' : '导出'}
          </button>
          <button
            onClick={() => openRejudgeModal(d.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-md transition-colors"
          >
            <RefreshCw size={14} />
            改判
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="animate-fade-in bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <HardHat size={20} className="text-[var(--color-accent)]" />
              <h2 className="font-semibold text-base">{d.bridgeTunnelName}</h2>
              <span className={`${CONCLUSION_COLORS[d.conclusion]} text-white text-xs px-2 py-0.5 rounded font-medium`}>
                {CONCLUSION_LABELS[d.conclusion]}
              </span>
              {d.hasGap && (
                <span className="animate-pulse-warning flex items-center gap-1 bg-[var(--color-warning)]/20 text-[var(--color-warning)] text-xs px-2 py-0.5 rounded border border-[var(--color-warning)]/30">
                  <AlertTriangle size={12} />
                  存在缺段
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">方案编号</div>
                <div className="font-mono text-sm">{d.schemeNo}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">点位坐标</div>
                <div className="font-mono text-sm">{d.pointCoord}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">方案类型</div>
                <div className="text-sm">{d.schemeType}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">创建时间</div>
                <div className="font-mono text-sm">{d.createdAt}</div>
              </div>
            </div>

            {d.description && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">方案描述</div>
                <div className="text-sm text-[var(--color-text-secondary)]">{d.description}</div>
              </div>
            )}
          </div>

          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animationDelay: '100ms' }}>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                📝 后补备注
              </h3>
              <textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                rows={4}
                placeholder="填写后补备注，与最终结论联动..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                {noteSavedFlash && (
                  <span className="text-xs text-[var(--color-success)]">✓ 已保存</span>
                )}
                <button
                  onClick={handleSaveNote}
                  disabled={noteValue === d.supplementaryNote || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save size={14} />
                  {saving ? '保存中...' : '保存备注'}
                </button>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                📋 最终结论
              </h3>
              <div className="bg-[var(--color-bg)] rounded-lg p-3 min-h-[80px]">
                {d.finalConclusion ? (
                  <div className="text-sm text-[var(--color-text)]">{d.finalConclusion}</div>
                ) : (
                  <div className="text-sm text-[var(--color-text-muted)] italic">尚未形成最终结论</div>
                )}
              </div>
              {d.supplementaryNote && d.finalConclusion && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-accent)]">备注→结论联动：</span>
                    后补备注"{d.supplementaryNote}"→结论"{d.finalConclusion}"
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="animate-fade-in bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`text-sm pb-1 border-b-2 transition-colors ${
                  activeTab === 'timeline'
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-medium'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                时间轴
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`text-sm pb-1 border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-medium'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                历史记录
              </button>
            </div>

            {activeTab === 'timeline' ? (
              d.timeline.length > 0 ? (
                <TimelineView entries={d.timeline} />
              ) : (
                <div className="text-sm text-[var(--color-text-muted)] text-center py-8">暂无时间轴记录</div>
              )
            ) : (
              <HistoryList entries={d.history} />
            )}
          </div>
        </div>
      </div>

      <RejudgeModal />
    </div>
  );
}
