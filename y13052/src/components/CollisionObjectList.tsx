import { MapPin, AlertTriangle, FileText, LocateFixed } from 'lucide-react';
import type { CollisionObject, InspectionPhoto } from '../../shared/types.js';
import { RiskBadge, ObjectTypeBadge } from '@/components/StatusBadge.js';

export default function CollisionObjectList({
  objects, photos, highlightObjectId, selectedForLink, onSelectForLink, onJumpToPhoto,
}: {
  objects: CollisionObject[];
  photos: InspectionPhoto[];
  highlightObjectId: string | null;
  selectedForLink: string[];
  onSelectForLink: (id: string) => void;
  onJumpToPhoto: (photoId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {objects.map((o, idx) => {
        const photo = photos.find((p) => p.id === o.sourcePhotoId);
        const isHighlight = highlightObjectId === o.id;
        const isSelected = selectedForLink.includes(o.id);
        return (
          <div
            key={o.id}
            className={`eng-card p-3 border-l-[3px] transition-all ${
              isHighlight
                ? 'border-l-amber-500 ring-2 ring-amber-300 shadow-engineering-hover'
                : isSelected
                  ? 'border-l-marine-500 ring-2 ring-marine-300'
                  : 'border-l-marine-400'
            }`}
            style={{ animation: `staggerFade 0.4s ease-out ${idx * 60}ms both` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-marine-600" />
                    {o.name}
                  </span>
                  <ObjectTypeBadge type={o.type} />
                  <RiskBadge level={o.riskLevel} />
                </div>
                <p className="text-xs text-slate-600 mt-1">{o.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <LocateFixed className="w-3 h-3" />
                    {o.coordinates.lng.toFixed(4)}, {o.coordinates.lat.toFixed(4)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    原始第 {o.sourceRow} 行
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {selectedForLink.length > 0 && (
                  <button
                    onClick={() => onSelectForLink(o.id)}
                    className={`w-6 h-6 border-2 flex items-center justify-center rounded-sm text-xs ${
                      isSelected
                        ? 'bg-marine-600 border-marine-600 text-white'
                        : 'bg-white border-slate-300 text-transparent hover:border-marine-400'
                    }`}
                  >
                    ✓
                  </button>
                )}
                {photo && (
                  <button
                    onClick={() => onJumpToPhoto(photo.id)}
                    className="eng-btn !px-2 !py-1 text-xs"
                    title="追溯到来源巡检照片"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    追溯照片
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
