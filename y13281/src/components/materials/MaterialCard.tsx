import { useState } from 'react';
import { Image, Ruler, FileText, User, Clock, Volume2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { InspectionMaterial, MaterialType } from '../../types';
import { cn } from '../../lib/utils';
import { ChangeMarker } from './ChangeMarker';

interface MaterialCardProps {
  material: InspectionMaterial;
}

const typeConfig: Record<MaterialType, { icon: typeof Image; label: string; color: string }> = {
  photo: { icon: Image, label: '照片', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
  boundary: { icon: Ruler, label: '边界', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
  note: { icon: FileText, label: '说明', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
};

export function MaterialCard({ material }: MaterialCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = typeConfig[material.type];
  const TypeIcon = config.icon;
  const isNoteType = material.type === 'note';
  const hasImage = material.imageUrl && material.imageUrl.length > 0;

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden transition-all duration-300',
        isNoteType
          ? 'bg-gradient-to-br from-amber-500/10 via-slate-800/80 to-slate-800/80 border-amber-500/20'
          : 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
      )}
    >
      {material.caliberChanged && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-0 right-0 z-10"
        >
          <div
            className={cn(
              'w-0 h-0 transition-all duration-300',
              'border-t-[48px] border-l-[48px]',
              'border-t-rose-500 border-l-transparent'
            )}
          />
          <div className="absolute top-1 right-1 transform rotate-45">
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-white whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" />
              <span>口径已改</span>
            </div>
          </div>
        </button>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border',
              config.color
            )}
          >
            <TypeIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-100 text-sm truncate">{material.title}</h3>
              <span
                className={cn(
                  'flex-shrink-0 text-xs px-1.5 py-0.5 rounded border',
                  config.color
                )}
              >
                {config.label}
              </span>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{material.description}</p>

            {hasImage && !isNoteType && (
              <div className="mb-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50">
                <img
                  src={material.imageUrl}
                  alt={material.title}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-cyan-300 font-medium">{material.noiseValue} dB</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{material.submittedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{material.submittedAt}</span>
              </div>
            </div>
          </div>
        </div>

        {material.caliberChanged && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-medium text-rose-300">口径变更详情</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-rose-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-rose-400" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                    <div className="text-xs text-slate-500 mb-1.5 font-medium">原始口径</div>
                    <div className="text-slate-300 line-through opacity-70 font-mono text-sm">
                      {material.originalCaliber}
                    </div>
                  </div>
                  <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/30">
                    <div className="text-xs text-rose-400 mb-1.5 font-medium">当前口径</div>
                    <div className="text-rose-300 font-mono text-sm font-semibold">
                      {material.currentCaliber}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-medium text-slate-400 mb-3">变更历史</div>
                  <ChangeMarker materialId={material.id} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
