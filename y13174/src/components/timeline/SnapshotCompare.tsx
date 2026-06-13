import { Camera, Hash, Calendar } from 'lucide-react';
import type { Snapshot } from '@/types';
import { formatDateTime } from '@/utils/formatters';

interface SnapshotCompareProps {
  snapshots: Snapshot[];
}

export default function SnapshotCompare({ snapshots }: SnapshotCompareProps) {
  if (snapshots.length === 0) {
    return (
      <div className="py-12 text-center">
        <Camera className="w-12 h-12 text-[#5a7aa0] mx-auto mb-3" />
        <p className="text-[#8ba7c7] text-sm">暂无截图快照</p>
      </div>
    );
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => b.version - a.version);
  const hasMultiple = sortedSnapshots.length >= 2;

  return (
    <div className="space-y-4">
      {hasMultiple && (
        <div className="flex items-center gap-2 text-[#8ba7c7] text-sm">
          <span className="inline-block w-2 h-2 bg-[#5a9fd4] rounded-full" />
          共 {snapshots.length} 个历史版本，并排展示对比
        </div>
      )}

      <div className={`grid gap-4 ${hasMultiple ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {sortedSnapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="bg-[#1e3a5f] border-2 border-[#2d5a8e] overflow-hidden relative"
          >
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-[#5a67d8] text-white text-xs font-mono font-bold px-2 py-1 border-2 border-indigo-400/50">
                v{snapshot.version}
              </span>
            </div>

            <div className="aspect-video bg-[#0f2440] border-b-2 border-[#2d5a8e] flex items-center justify-center relative">
              <div className="text-center">
                <Camera className="w-12 h-12 text-[#5a7aa0] mx-auto mb-2" />
                <p className="text-[#5a7aa0] text-xs font-mono">版本 v{snapshot.version} 截图</p>
                <div className="mt-3 w-3/4 mx-auto h-16 bg-[#1e3a5f] border border-[#2d5a8e]">
                  <svg viewBox="0 0 200 60" className="w-full h-full">
                    <polyline
                      points="0,30 30,25 60,35 90,20 120,40 150,28 180,33 200,30"
                      fill="none"
                      stroke="#5a9fd4"
                      strokeWidth="1.5"
                    />
                    <line x1="0" y1="15" x2="200" y2="15" stroke="#d69e2e" strokeWidth="0.5" strokeDasharray="3,3" />
                    <line x1="0" y1="45" x2="200" y2="45" stroke="#d69e2e" strokeWidth="0.5" strokeDasharray="3,3" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-white text-sm font-medium">{snapshot.description}</p>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2d5a8e]/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#5a7aa0]" />
                  <span className="text-[#8ba7c7] text-xs font-mono">
                    {formatDateTime(snapshot.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-[#5a7aa0]" />
                  <span className="text-[#5a9fd4] text-xs font-mono truncate" title={snapshot.dataHash}>
                    {snapshot.dataHash.slice(0, 10)}...
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMultiple && (
        <div className="mt-4 p-3 bg-[#1e3a5f]/50 border border-[#2d5a8e] text-[#8ba7c7] text-xs">
          <span className="text-[#5a9fd4]">提示：</span>
          各版本快照保留完整历史，可对比不同时间点的数据差异。数据哈希用于验证数据完整性。
        </div>
      )}
    </div>
  );
}
