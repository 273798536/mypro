import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { complaintEvents, approvalRecords, historySnapshots, photoSupplements } from '@/data/mockData';
import { COMPLAINT_STATUS_LABELS, COMPLAINT_TYPE_LABELS, SOURCE_TYPE_LABELS } from '@/types';
import type { HistorySnapshot } from '@/types';
import { FileText, Camera, PenLine, ArrowRight, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { useState } from 'react';

function SourceBadge({ sourceType }: { sourceType: string }) {
  const config: Record<string, { icon: typeof FileText; color: string; label: string }> = {
    original: { icon: FileText, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: SOURCE_TYPE_LABELS.original },
    supplement: { icon: PenLine, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', label: SOURCE_TYPE_LABELS.supplement },
    screenshot: { icon: Camera, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', label: SOURCE_TYPE_LABELS.screenshot },
  };
  const c = config[sourceType] || config.original;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${c.color}`}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function VersionDiff({ snapshot }: { snapshot: HistorySnapshot[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!snapshot || snapshot.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {snapshot.map((snap) => (
        <div key={snap.id} className="rounded-lg border border-navy-600/50 overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 bg-navy-700/30 hover:bg-navy-700/50 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <ArrowRight size={12} className={`text-amber-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            <span className="text-xs text-amber-400">{snap.fieldChanged === 'content' ? '审批内容变更' : snap.fieldChanged === 'locationName' ? '地点名称修正' : snap.fieldChanged}</span>
            <span className="text-xs text-gray-500 ml-auto">{snap.changeDate}</span>
            {expanded ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
          </button>

          {expanded && (
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 p-2 rounded bg-red-900/20 border border-red-800/30">
                  <div className="text-xs text-red-400 mb-1">旧值</div>
                  <div className="text-xs text-gray-300 line-through">{snap.oldValue}</div>
                </div>
                <ArrowRight size={14} className="text-gray-500 mt-4 shrink-0" />
                <div className="flex-1 p-2 rounded bg-green-900/20 border border-green-800/30">
                  <div className="text-xs text-green-400 mb-1">新值</div>
                  <div className="text-xs text-gray-300">{snap.newValue}</div>
                </div>
              </div>
              <div className="p-2 rounded bg-navy-700/30 border border-gray-700/30">
                <div className="text-xs text-gray-400">
                  <span className="text-amber-400/80">变更原因：</span>
                  {snap.changeReason}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ApprovalPanel() {
  const selectedEventId = useAppStore((s) => s.selectedEventId);
  const selectedLocationId = useAppStore((s) => s.selectedLocationId);

  const filter = useAppStore((s) => s.filter);
  const timeRangeStart = useAppStore((s) => s.timeRangeStart);
  const timeRangeEnd = useAppStore((s) => s.timeRangeEnd);

  const filteredEvents = useMemo(() => {
    return complaintEvents.filter((evt) => {
      if (selectedLocationId && evt.locationId !== selectedLocationId) return false;
      if (filter.types.length > 0 && !filter.types.includes(evt.type)) return false;
      if (filter.statuses.length > 0 && !filter.statuses.includes(evt.status)) return false;
      if (evt.eventDate < timeRangeStart || evt.eventDate > timeRangeEnd) return false;
      return true;
    });
  }, [filter, timeRangeStart, timeRangeEnd, selectedLocationId]);

  const getLocationById = useAppStore((s) => s.getLocationById);

  if (!selectedEventId) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <h3 className="font-serif text-amber-400 text-sm font-semibold">审批台账溯源</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <FileText size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-xs text-gray-500">请先在时间线中选择一个事件</p>
            <p className="text-xs text-gray-600 mt-1">点击左侧事件卡片查看审批台账详情</p>
          </div>
        </div>
      </div>
    );
  }

  const evt = filteredEvents.find((e) => e.id === selectedEventId);
  if (!evt) return null;

  const approvals = approvalRecords.filter((a) => a.complaintId === selectedEventId);
  const photos = photoSupplements.filter((p) => p.complaintId === selectedEventId);
  const loc = getLocationById(evt.locationId);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h3 className="font-serif text-amber-400 text-sm font-semibold">审批台账溯源</h3>
        {loc && (
          <p className="text-xs text-gray-400 mt-1">
            {loc.canonicalName}
            {loc.aliases.filter(a => a !== loc.canonicalName).length > 0 && (
              <span className="text-gray-600 ml-1">
                （亦称：{loc.aliases.filter(a => a !== loc.canonicalName).join('、')}）
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="p-3 rounded-lg bg-navy-700/30 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">{evt.eventDate}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">
              {COMPLAINT_TYPE_LABELS[evt.type]}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${
              evt.status === 'processed' ? 'bg-status-processed/10 text-status-processed border-status-processed/20' :
              evt.status === 'pending' ? 'bg-status-pending/10 text-status-pending border-status-pending/20' :
              'bg-status-evidence/10 text-status-evidence border-status-evidence/20'
            }`}>
              {COMPLAINT_STATUS_LABELS[evt.status]}
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{evt.description}</p>
        </div>

        {photos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Image size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">现场照片补录</span>
            </div>
            {photos.map((photo) => (
              <div key={photo.id} className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 overflow-hidden">
                <div className="relative">
                  <img
                    src={photo.photoUrl}
                    alt={photo.changedDescription}
                    className="w-full h-32 object-cover opacity-80"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy-900/90 to-transparent px-3 py-2">
                    <p className="text-xs text-gray-300">{photo.changedDescription}</p>
                    <p className="text-xs text-gray-500 mt-0.5">补录于 {photo.supplementDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <FileText size={14} className="text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">审批记录（{approvals.length}条）</span>
        </div>

        {approvals.map((ar, idx) => {
          const snapshots = historySnapshots.filter((s) => s.approvalId === ar.id);
          return (
            <div key={ar.id} className="rounded-lg border border-navy-600/50 overflow-hidden">
              <div className="p-3 bg-navy-700/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">{ar.version}</span>
                    <SourceBadge sourceType={ar.sourceType} />
                  </div>
                  <span className="text-xs text-gray-500">{ar.recordDate}</span>
                </div>

                <div className="p-3 rounded bg-navy-900/60 border border-gray-700/20">
                  <p className="text-xs text-gray-300 leading-relaxed font-serif">{ar.content}</p>
                </div>

                {idx === 0 && approvals.length > 1 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-400/60">
                    <ArrowRight size={10} className="rotate-90" />
                    <span>下方有历史版本变更</span>
                  </div>
                )}
              </div>

              {snapshots.length > 0 && <VersionDiff snapshot={snapshots} />}
            </div>
          );
        })}

        {approvals.length > 1 && (
          <div className="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
            <div className="flex items-center gap-2 mb-1">
              <PenLine size={12} className="text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">版本追踪</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              该投诉事件审批台账共有 <span className="text-amber-400 font-bold">{approvals.length}</span> 个版本，
              展开「审批内容变更」可查看新旧版本对比和变更原因，确保旧方案不会覆盖新意见。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
