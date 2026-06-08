import type { Screenshot } from '@/types';
import { formatDateTime } from '@/utils/helpers';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ScreenshotCompareProps {
  oldScreenshots: Screenshot[];
  newScreenshots: Screenshot[];
}

export default function ScreenshotCompare({ oldScreenshots, newScreenshots }: ScreenshotCompareProps) {
  const maxLen = Math.max(oldScreenshots.length, newScreenshots.length);
  const pairs: Array<[Screenshot | undefined, Screenshot | undefined]> = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push([oldScreenshots[i], newScreenshots[i]]);
  }

  if (maxLen === 0) {
    return (
      <div className="text-center py-8 text-space-400">
        <p className="text-sm">两个版本均无截图</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {pairs.map(([oldSc, newSc], idx) => {
        const bothExist = oldSc && newSc;
        const judgmentChanged = bothExist && oldSc!.judgment !== newSc!.judgment;
        const descChanged = bothExist && oldSc!.description !== newSc!.description;

        return (
          <div key={idx} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-space-400">
                <ArrowLeft className="w-3.5 h-3.5 text-rose-400" />
                <span>旧版本 - 截图 #{idx + 1}</span>
              </div>
              {oldSc ? (
                <div className="card overflow-hidden">
                  <div className="aspect-video bg-space-900">
                    <img src={oldSc.url} alt={oldSc.description} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className={`text-sm text-space-100 ${descChanged ? 'text-rose-300 line-through' : ''}`}>
                      {oldSc.description}
                    </div>
                    {oldSc.judgment && (
                      <div className={`text-xs mt-2 px-2.5 py-1.5 rounded-r border-l-2 ${
                        judgmentChanged
                          ? 'text-rose-300 bg-rose-950/30 border-rose-600/60 line-through'
                          : 'text-space-300 bg-space-900/50 border-space-600/40'
                      }`}>
                        <span className="font-medium">结论：</span>{oldSc.judgment}
                      </div>
                    )}
                    <div className="text-xs text-space-500 mt-2">{formatDateTime(oldSc.timestamp)}</div>
                  </div>
                </div>
              ) : (
                <div className="card p-6 text-center text-sm text-space-500 italic">
                  此版本无该截图
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-space-400">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>新版本 - 截图 #{idx + 1}</span>
              </div>
              {newSc ? (
                <div className="card overflow-hidden">
                  <div className="aspect-video bg-space-900 relative">
                    <img src={newSc.url} alt={newSc.description} className="w-full h-full object-cover" />
                    {(judgmentChanged || descChanged) && (
                      <div className="absolute top-2 right-2 text-xs bg-emerald-600/90 text-white px-2 py-0.5 rounded">
                        已变更
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className={`text-sm text-space-100 ${descChanged ? 'text-emerald-300 font-medium' : ''}`}>
                      {newSc.description}
                    </div>
                    {newSc.judgment && (
                      <div className={`text-xs mt-2 px-2.5 py-1.5 rounded-r border-l-2 ${
                        judgmentChanged
                          ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/60 font-medium'
                          : 'text-space-300 bg-space-900/50 border-space-600/40'
                      }`}>
                        <span className="font-medium">结论：</span>{newSc.judgment}
                      </div>
                    )}
                    <div className="text-xs text-space-500 mt-2">{formatDateTime(newSc.timestamp)}</div>
                  </div>
                </div>
              ) : (
                <div className="card p-6 text-center text-sm text-space-500 italic">
                  此版本已删除该截图
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
