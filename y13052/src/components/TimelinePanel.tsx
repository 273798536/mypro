import { useState } from 'react';
import {
  Camera, FileText, AlertTriangle, CheckCircle2,
  Clock, Paperclip, RotateCcw, ChevronDown, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { TimelineEvent, InspectionPhoto, CollisionObject } from '../../shared/types.js';
import { formatDate } from '@/lib/api.js';

const iconMap: Record<string, LucideIcon> = {
  inspection: Camera,
  report: FileText,
  review: CheckCircle2,
  rejudge: RotateCcw,
  attachment: Paperclip,
  gap: AlertTriangle,
  create: FileText,
};

export default function TimelinePanel({
  events, photos, objects, onJump,
}: {
  events: TimelineEvent[];
  photos: InspectionPhoto[];
  objects: CollisionObject[];
  onJump: (photoId?: string, objectId?: string) => void;
}) {
  return (
    <div className="space-y-1 relative">
      {events.map((ev, idx) => (
        <TimelineNode
          key={ev.id}
          ev={ev}
          index={idx}
          photos={photos}
          objects={objects}
          onJump={onJump}
          isLast={idx === events.length - 1}
        />
      ))}
    </div>
  );
}

function TimelineNode({
  ev, index, photos, objects, onJump, isLast,
}: {
  ev: TimelineEvent;
  index: number;
  photos: InspectionPhoto[];
  objects: CollisionObject[];
  onJump: (photoId?: string, objectId?: string) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState<boolean>(!!ev.isGap);
  const Icon = iconMap[ev.type] || Clock;
  const photo = ev.photoId ? photos.find((p) => p.id === ev.photoId) : undefined;
  const object = ev.objectId ? objects.find((o) => o.id === ev.objectId) : undefined;
  const isGap = !!ev.isGap;

  return (
    <div
      className="relative pl-8 pb-5 animate-stagger-fade last:pb-0"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {!isLast && (
        <div
          className={`absolute left-[10px] top-4 bottom-0 w-px ${isGap ? 'timeline-gap-line' : 'timeline-line'}`}
          style={{ background: isGap ? undefined : undefined }}
        />
      )}

      <div
        className={`absolute left-0 top-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isGap
            ? 'bg-amber-500 border-amber-500 animate-breath'
            : ev.type === 'rejudge'
              ? 'bg-indigo-500 border-indigo-500'
              : 'bg-white border-marine-600'
        }`}
      >
        {isGap ? (
          <AlertTriangle className="w-2.5 h-2.5 text-white" />
        ) : (
          <div
            className={`w-2 h-2 rounded-full ${
              ev.type === 'rejudge' ? 'bg-white' : 'bg-marine-600'
            }`}
          />
        )}
      </div>

      <button
        className="w-full text-left group"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 py-0.5 group-hover:bg-marine-50/60 -mx-2 px-2 rounded-sm transition-colors">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <Icon
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isGap ? 'text-amber-600' : 'text-marine-600'
            }`}
          />
          <span
            className={`text-xs font-mono flex-shrink-0 ${
              isGap ? 'text-amber-700' : 'text-slate-500'
            }`}
          >
            {formatDate(ev.timestamp)}
          </span>
          <span
            className={`text-sm font-semibold truncate ${
              isGap ? 'text-amber-800' : 'text-slate-800'
            }`}
          >
            {ev.title}
          </span>
          {isGap && (
            <span className="eng-chip bg-amber-50 text-amber-700 border-amber-200 animate-breath flex-shrink-0 ml-auto">
              <AlertTriangle className="w-3 h-3" />
              缺段
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-1.5 ml-5 eng-card p-3 border-l-[3px] border-marine-500 bg-marine-50/30">
          <p className="text-sm text-slate-700 leading-relaxed">{ev.description}</p>

          {isGap && ev.gapReason && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-sm">
              <p className="text-xs text-amber-800 font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                追溯建议（点击跳转）
              </p>
              <p className="text-xs text-amber-700">{ev.gapReason}</p>
            </div>
          )}

          {(photo || object) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {photo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJump(photo.id, undefined);
                  }}
                  className="eng-chip bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  追溯照片 · 原始第{photo.rowNumber}行
                </button>
              )}
              {object && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJump(undefined, object.id);
                  }}
                  className="eng-chip bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  对象：{object.name} · 第{object.sourceRow}行
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
