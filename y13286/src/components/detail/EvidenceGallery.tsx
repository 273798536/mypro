import { Image as ImageIcon, User, Clock, ZoomIn } from "lucide-react";
import { useState } from "react";
import type { EvidenceRecord } from "@/types";

interface Props {
  evidences: EvidenceRecord[];
}

export default function EvidenceGallery({ evidences }: Props) {
  const [preview, setPreview] = useState<EvidenceRecord | null>(null);

  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-4 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-ink-600" />
        证据截图与说明
        <span className="ml-2 text-xs font-normal text-slate-500">（点击可放大）</span>
      </h3>

      {evidences.length === 0 ? (
        <p className="text-sm text-slate-500 italic">该点位暂无证据截图。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {evidences.map((e, i) => (
            <div
              key={e.id}
              className="group rounded border border-ink-200 overflow-hidden hover:border-ink-400 transition-all card-hover cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${180 + i * 60}ms` }}
              onClick={() => setPreview(e)}
            >
              <div className="relative aspect-[4/3] bg-ink-100 overflow-hidden">
                <img
                  src={e.imageUrl}
                  alt={e.description}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-ink-800 leading-relaxed mb-2">{e.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {e.uploadedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {e.uploadedAt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 bg-ink-900/80 z-50 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-w-4xl w-full bg-white rounded-lg overflow-hidden shadow-2xl animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={preview.imageUrl} alt={preview.description} className="w-full" />
            <div className="p-4 border-t border-ink-100">
              <p className="text-sm text-ink-800 mb-1">{preview.description}</p>
              <p className="text-xs text-slate-500">
                {preview.uploadedBy} · {preview.uploadedAt}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
