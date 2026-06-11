import { useMemo } from 'react';
import { Maximize2 } from 'lucide-react';
import { useAppStore, getFilteredObjects } from '@/store/useAppStore';
import { sourceLabels, sourceColors } from '@/utils/helpers';
import { cn } from '@/lib/utils';

export default function OverlapList() {
  const { objects, layers, filterState, focusObject } = useAppStore();
  const visibleObjects = getFilteredObjects(objects, layers, filterState);

  const overlapGroups = useMemo(() => {
    const overlapObjs = visibleObjects.filter((o) => o.isOverlapping);
    if (overlapObjs.length === 0) return [];

    const visited = new Set<string>();
    const groups: typeof overlapObjs[] = [];

    for (const obj of overlapObjs) {
      if (visited.has(obj.id)) continue;
      const group: typeof overlapObjs = [];
      const queue = [obj];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (visited.has(cur.id)) continue;
        visited.add(cur.id);
        group.push(cur);
        for (const id of cur.overlappingWith) {
          const linked = overlapObjs.find((o) => o.id === id);
          if (linked && !visited.has(id)) queue.push(linked);
        }
      }
      if (group.length > 0) groups.push(group);
    }
    return groups;
  }, [visibleObjects]);

  if (overlapGroups.length === 0) return null;

  return (
    <div
      className={cn(
        'absolute left-4 top-4 z-20 w-72',
        'bg-slate-950/80 backdrop-blur border border-yellow-900/60 rounded-sm',
      )}
    >
      <div className="px-3 py-2 border-b border-yellow-900/50 flex items-center justify-between">
        <span className="text-sm font-semibold text-yellow-400">重叠对象（单独拎出）</span>
        <span className="text-xs text-slate-500">{overlapGroups.length}组</span>
      </div>

      <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
        {overlapGroups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            <div className="text-[10px] text-slate-500 px-1">第 {gi + 1} 组</div>
            {group.map((obj) => (
              <div
                key={obj.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-900/60 rounded-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm text-slate-200 truncate">{obj.name}</span>
                  <span
                    className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: `${sourceColors[obj.source]}20`,
                      color: sourceColors[obj.source],
                      border: `1px solid ${sourceColors[obj.source]}40`,
                    }}
                  >
                    {sourceLabels[obj.source]}
                  </span>
                </div>
                <button
                  onClick={() => focusObject(obj.id)}
                  className={cn(
                    'shrink-0 w-6 h-6 flex items-center justify-center',
                    'border border-yellow-800 text-yellow-500 hover:bg-yellow-950/50 transition-colors',
                  )}
                  title="跳转"
                >
                  <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
