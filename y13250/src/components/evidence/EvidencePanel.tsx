import { useState } from 'react';
import { useStore } from '@/store';
import { mergeStatusMeta } from '../common/StatusBadge';
import { Files, MessageSquarePlus, GitBranch, UserCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MergeEvidence } from '@/types';

function EvidenceCard({ ev }: { ev: MergeEvidence }) {
  const typeMap: Record<MergeEvidence['type'], { label: string; cls: string }> = {
    name_similarity: { label: '名称相似', cls: 'bg-accent-merged/15 text-accent-merged border-accent-merged/30' },
    containment: { label: '名称包含', cls: 'bg-accent-merged/25 text-accent-export border-accent-export/30' },
    alias: { label: '别名/简称', cls: 'bg-accent-normal/15 text-accent-normal border-accent-normal/30' },
    location_proximity: { label: '位置相近', cls: 'bg-accent-pending/15 text-accent-pending border-accent-pending/30' },
    manual_note: { label: '人工佐证', cls: 'bg-accent-caliber/15 text-accent-caliber border-accent-caliber/30' },
  };
  const meta = typeMap[ev.type];
  return (
    <div className="rounded-lg border border-border bg-bg-card p-3">
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn('text-[11px] px-2 py-0.5 rounded border', meta.cls)}>{meta.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-bg p-2.5 border border-border/60">
          <div className="text-[10px] text-text-dim mb-1 uppercase tracking-wider">写法 A</div>
          <div className="text-xs text-text font-medium leading-snug">{ev.writingA}</div>
          <div className="mt-1.5 text-[10px] text-text-muted truncate">📄 {ev.materialRefA}</div>
        </div>
        <div className="rounded-md bg-bg p-2.5 border border-border/60">
          <div className="text-[10px] text-text-dim mb-1 uppercase tracking-wider">写法 B</div>
          <div className="text-xs text-text font-medium leading-snug">{ev.writingB}</div>
          <div className="mt-1.5 text-[10px] text-text-muted truncate">📄 {ev.materialRefB}</div>
        </div>
      </div>
    </div>
  );
}

function RemarkTimeline() {
  const remarks = useStore(s => s.remarks);
  const selectedMergeId = useStore(s => s.selectedMergeId);
  const selectedPointId = useStore(s => s.selectedPointId);
  const related = remarks.filter(r =>
    (selectedMergeId && r.mergeId === selectedMergeId) || (selectedPointId && r.pointId === selectedPointId),
  ).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const addRemark = useStore(s => s.addRemark);
  const [author, setAuthor] = useState('算法值班人');
  const [content, setContent] = useState('');

  const submit = () => {
    if (!content.trim()) return;
    addRemark({ mergeId: selectedMergeId || undefined, pointId: selectedPointId || undefined }, author, content);
    setContent('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <MessageSquarePlus className="w-4 h-4 text-accent-merged" />
          <span className="text-xs font-bold text-text">历史备注 · 时间轴</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-bg-hover text-text-muted">{related.length} 条</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[100px] max-h-[180px]">
        {related.length === 0 && (
          <div className="text-[11px] text-text-dim text-center py-4">暂无备注，可在下方补充</div>
        )}
        {related.map(r => (
          <div key={r.id} className="relative pl-5">
            <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-accent-merged/70 ring-2 ring-bg-card" />
            <div className="absolute left-2 top-3 bottom-[-8px] w-px bg-border" />
            <div className="rounded-md bg-bg border border-border/60 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <UserCircle className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-[11px] font-medium text-text">{r.author}</span>
                </div>
                <span className="text-[10px] text-text-dim font-mono">
                  {new Date(r.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs text-text-muted leading-relaxed">{r.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border space-y-2">
        <select
          value={author}
          onChange={e => setAuthor(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg border border-border text-text focus:outline-none focus:border-soft"
        >
          <option value="算法值班人">算法值班人</option>
          <option value="社区运营-阿宁">社区运营-阿宁</option>
          <option value="系统">系统</option>
        </select>
        <div className="flex items-end gap-2">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="写备注说明归并依据、沟通结论…（Enter 发送）"
            className="flex-1 px-2.5 py-2 text-xs rounded-md bg-bg border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-soft resize-none leading-relaxed"
          />
          <button
            onClick={submit}
            disabled={!content.trim()}
            className="shrink-0 px-3 py-2 rounded-md bg-accent-export text-white text-xs font-medium disabled:opacity-40 hover:bg-accent-export/85 transition-colors flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            备注
          </button>
        </div>
      </div>
    </div>
  );
}

export function EvidencePanel() {
  const selectedMergeId = useStore(s => s.selectedMergeId);
  const selectedPointId = useStore(s => s.selectedPointId);
  const merges = useStore(s => s.merges);
  const points = useStore(s => s.points);
  const merge = merges.find(m => m.id === selectedMergeId);
  const point = points.find(p => p.id === selectedPointId);

  return (
    <div className="h-full flex flex-col bg-bg-card/70 rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: '500ms' }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-caliber" />
          <h2 className="text-base font-bold tracking-wide">归并证据 · 备注区</h2>
        </div>
        <Files className="w-4 h-4 text-text-dim" />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!merge && !point && (
          <div className="flex flex-col items-center justify-center py-10 text-text-dim gap-2">
            <GitBranch className="w-8 h-8 opacity-40" />
            <div className="text-sm">请在图表或异常区选择归并组</div>
            <div className="text-[11px]">将在此展示归并证据链与历史备注</div>
          </div>
        )}
        {merge && (
          <>
            <div className="rounded-lg border border-border bg-bg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-bold text-text">{merge.canonicalName}</div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded border', mergeStatusMeta[merge.status].cls)}>
                  {mergeStatusMeta[merge.status].label}
                </span>
              </div>
              <div className="text-[11px] text-text-muted leading-relaxed mb-2">{merge.evidenceNote}</div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded bg-bg-card px-2 py-1.5">
                  <span className="text-text-dim">操作人：</span>
                  <span className="text-text">{merge.operator || '-'}</span>
                </div>
                <div className="rounded bg-bg-card px-2 py-1.5">
                  <span className="text-text-dim">时间：</span>
                  <span className="text-text font-mono">{merge.operateTime ? new Date(merge.operateTime).toLocaleDateString('zh-CN') : '-'}</span>
                </div>
                <div className="rounded bg-bg-card px-2 py-1.5 col-span-2">
                  <span className="text-text-dim">置信度：</span>
                  <span className="text-accent-merged font-mono">{(merge.confidence * 100).toFixed(0)}%</span>
                  <span className="mx-2 text-border">·</span>
                  <span className="text-text-dim">参与点位：</span>
                  <span className="text-text font-mono">{merge.pointIds.length} 个</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-text mb-2 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-accent-merged" />
                归并证据链（保留两种写法，不丢弃）
              </div>
              <div className="space-y-2">
                {merge.evidence.map(ev => (
                  <EvidenceCard key={ev.id} ev={ev} />
                ))}
              </div>
            </div>
            <RemarkTimeline />
          </>
        )}
        {point && !merge && (
          <>
            <div className="rounded-lg border border-border bg-bg p-3">
              <div className="text-sm font-bold text-text mb-1">{point.name}</div>
              <div className="text-[11px] text-text-muted">独立点位，未参与归并</div>
              <div className="text-[11px] text-text-dim mt-2">📍 {point.location}</div>
            </div>
            <RemarkTimeline />
          </>
        )}
      </div>
    </div>
  );
}
