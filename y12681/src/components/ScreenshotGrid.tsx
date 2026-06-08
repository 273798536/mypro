import { useState } from 'react';
import { X, Eye } from 'lucide-react';
import type { Screenshot } from '@/types';
import { formatDateTime } from '@/utils/helpers';

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  editable?: boolean;
  onUpdate?: (id: string, updates: Partial<Screenshot>) => void;
}

export default function ScreenshotGrid({ screenshots, editable = false, onUpdate }: ScreenshotGridProps) {
  const [preview, setPreview] = useState<Screenshot | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-10 text-space-400 border border-dashed border-space-600/60 rounded-xl">
        <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无截图</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {screenshots.map((sc, idx) => (
          <div key={sc.id} className="card overflow-hidden group">
            <div className="relative aspect-video bg-space-900 overflow-hidden">
              <img
                src={sc.url}
                alt={sc.description}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-space-950/80 via-transparent to-transparent" />
              <div className="absolute top-2.5 left-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-space-950/80 text-gold-400 text-xs font-mono font-bold backdrop-blur-sm">
                  #{idx + 1}
                </span>
              </div>
              <button
                onClick={() => setPreview(sc)}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-md bg-space-950/80 text-space-200 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-gold-400"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {editingId === sc.id && editable ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    defaultValue={sc.description}
                    placeholder="截图描述"
                    className="input-field text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdate?.(sc.id, { description: (e.target as HTMLInputElement).value });
                        setEditingId(null);
                      }
                    }}
                    onBlur={(e) => {
                      onUpdate?.(sc.id, { description: e.target.value });
                      setEditingId(null);
                    }}
                    autoFocus
                  />
                  <input
                    type="text"
                    defaultValue={sc.judgment || ''}
                    placeholder="截图结论/判断"
                    className="input-field text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdate?.(sc.id, { judgment: (e.target as HTMLInputElement).value });
                        setEditingId(null);
                      }
                    }}
                    onBlur={(e) => {
                      onUpdate?.(sc.id, { judgment: e.target.value });
                      setEditingId(null);
                    }}
                  />
                </div>
              ) : (
                <>
                  <div
                    className={`text-sm text-space-100 font-medium ${editable ? 'cursor-pointer hover:text-gold-300' : ''}`}
                    onClick={() => editable && setEditingId(sc.id)}
                  >
                    {sc.description || '（无描述）'}
                    {editable && <span className="text-xs text-space-500 ml-2">点击编辑</span>}
                  </div>
                  {sc.judgment && (
                    <div className="text-xs text-amber-300 mt-2 bg-amber-950/30 border-l-2 border-amber-600/60 px-2.5 py-1.5 rounded-r">
                      <span className="font-medium">判断：</span>
                      {sc.judgment}
                    </div>
                  )}
                </>
              )}
              <div className="text-xs text-space-400 mt-3 pt-3 border-t border-space-700/40">
                {formatDateTime(sc.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-space-950/95 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-w-5xl w-full max-h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-space-100">{preview.description}</h3>
                <p className="text-sm text-space-400">{formatDateTime(preview.timestamp)}</p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="w-9 h-9 rounded-lg bg-space-800 hover:bg-space-700 text-space-200 hover:text-gold-400 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-space-700">
              <img
                src={preview.url}
                alt={preview.description}
                className="w-full h-full object-contain max-h-[70vh]"
              />
            </div>
            {preview.judgment && (
              <div className="mt-3 p-3 bg-amber-950/30 border border-amber-600/40 rounded-lg">
                <div className="text-xs text-amber-400 mb-1">截图结论</div>
                <div className="text-sm text-amber-200">{preview.judgment}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
