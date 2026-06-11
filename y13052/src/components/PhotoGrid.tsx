import { useState } from 'react';
import { X, Camera, AlertCircle, MapPin } from 'lucide-react';
import type { InspectionPhoto, CollisionObject } from '../../shared/types.js';
import { formatDate } from '@/lib/api.js';

export default function PhotoGrid({
  photos, objects, highlightPhotoId, selectedForLink, onSelectForLink, onViewObject,
}: {
  photos: InspectionPhoto[];
  objects: CollisionObject[];
  highlightPhotoId: string | null;
  selectedForLink: string[];
  onSelectForLink: (id: string) => void;
  onViewObject: (objectId: string) => void;
}) {
  const [viewerPhoto, setViewerPhoto] = useState<InspectionPhoto | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((p, idx) => {
          const obj = p.objectId ? objects.find((o) => o.id === p.objectId) : undefined;
          const isHighlight = highlightPhotoId === p.id;
          const isSelected = selectedForLink.includes(p.id);
          return (
            <div
              key={p.id}
              className={`group relative overflow-hidden rounded-sm border-2 transition-all cursor-pointer ${
                isHighlight
                  ? 'border-amber-500 ring-2 ring-amber-300 shadow-engineering-hover scale-[1.02]'
                  : isSelected
                    ? 'border-marine-500 ring-2 ring-marine-300'
                    : 'border-slate-200 hover:border-marine-400 hover:shadow-engineering-hover hover:-translate-y-0.5'
              }`}
              style={{ animation: `staggerFade 0.4s ease-out ${idx * 60}ms both` }}
              onClick={() => setViewerPhoto(p)}
            >
              <div className="aspect-square bg-slate-100 overflow-hidden">
                <img
                  src={p.thumbnailUrl}
                  alt={p.originalNote}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="absolute inset-0 photo-card-overlay flex flex-col justify-end p-2.5 text-white">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded-sm">
                    第 {p.rowNumber} 行
                  </span>
                  {p.isLate && (
                    <span className="eng-chip bg-amber-500/90 text-white border-amber-400 text-[10px] animate-breath">
                      <AlertCircle className="w-3 h-3" />
                      晚到
                    </span>
                  )}
                </div>
                {obj && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewObject(obj.id);
                    }}
                    className="mt-1.5 text-[11px] font-medium bg-marine-500/80 hover:bg-marine-600 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1 w-fit"
                  >
                    <MapPin className="w-3 h-3" />
                    {obj.name}
                  </button>
                )}
              </div>

              {selectedForLink.length > 0 && (
                <div
                  className="absolute top-2 left-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectForLink(p.id);
                  }}
                >
                  <div
                    className={`w-5 h-5 border-2 flex items-center justify-center rounded-sm ${
                      isSelected ? 'bg-marine-600 border-marine-600 text-white' : 'bg-white/80 border-slate-400 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                </div>
              )}

              <div className="p-2 bg-white border-t border-slate-100">
                <p className="text-xs text-slate-600 line-clamp-2">{p.originalNote}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{formatDate(p.takenAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {viewerPhoto && (
        <Lightbox photo={viewerPhoto} objects={objects} onClose={() => setViewerPhoto(null)} onViewObject={onViewObject} />
      )}
    </>
  );
}

function Lightbox({
  photo, objects, onClose, onViewObject,
}: {
  photo: InspectionPhoto;
  objects: CollisionObject[];
  onClose: () => void;
  onViewObject: (objectId: string) => void;
}) {
  const obj = photo.objectId ? objects.find((o) => o.id === photo.objectId) : undefined;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-stagger-fade"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-sm shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 min-h-[300px]">
          <img src={photo.url} alt={photo.originalNote} className="max-w-full max-h-[70vh] object-contain" />
        </div>
        <div className="md:w-80 p-5 flex flex-col gap-3 border-l border-slate-200 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-marine-800 font-mono text-sm">巡检照片详情</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-sm text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <InfoRow label="原始行号" value={`第 ${photo.rowNumber} 行（二维表）`} mono />
            <InfoRow label="拍摄时间" value={formatDate(photo.takenAt)} mono />
            <InfoRow label="上传时间" value={formatDate(photo.uploadedAt)} mono />
            {photo.isLate && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                此照片上传晚于初始预审，属于晚到数据
              </div>
            )}
          </div>

          <div>
            <p className="eng-label mb-1.5">原始说明（巡检现场填写）</p>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm text-slate-700 leading-relaxed font-mono text-xs">
              <Camera className="w-3.5 h-3.5 inline-block mr-1 text-slate-500" />
              {photo.originalNote}
            </div>
          </div>

          {obj && (
            <div className="p-3 bg-marine-50 border border-marine-200 rounded-sm">
              <p className="text-xs font-semibold text-marine-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                关联碰撞对象
              </p>
              <p className="text-sm text-slate-700 font-medium">{obj.name}</p>
              <p className="text-xs text-slate-500 mt-1">来源第 {obj.sourceRow} 行 · {obj.description}</p>
              <button
                onClick={() => onViewObject(obj.id)}
                className="mt-2 eng-btn-primary !px-2 !py-1 text-xs"
              >
                定位该对象
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-slate-100 last:border-b-0">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-slate-700 text-right ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</span>
    </div>
  );
}
