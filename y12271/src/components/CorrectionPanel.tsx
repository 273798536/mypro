import { useCallback, useMemo, useState } from 'react';
import { useHallStore } from '@/stores/useHallStore';
import { useCorrectionStore } from '@/stores/useCorrectionStore';
import { useViewStore } from '@/stores/useViewStore';
import { Move, Camera, ArrowLeftRight, X, Save, RotateCcw } from 'lucide-react';
import SeatMap2D from '@/components/SeatMap2D';
import SoundField3D from '@/components/SoundField3D';

export default function CorrectionPanel() {
  const soundSources = useHallStore((s) => s.soundSources);
  const seats = useHallStore((s) => s.seats);
  const viewMode = useViewStore((s) => s.viewMode);
  const isDragMode = useCorrectionStore((s) => s.isDragMode);
  const setDragMode = useCorrectionStore((s) => s.setDragMode);
  const snapshots = useCorrectionStore((s) => s.snapshots);
  const isComparing = useCorrectionStore((s) => s.isComparing);
  const leftSnapshotId = useCorrectionStore((s) => s.leftSnapshotId);
  const rightSnapshotId = useCorrectionStore((s) => s.rightSnapshotId);
  const takeSnapshot = useCorrectionStore((s) => s.takeSnapshot);
  const startComparison = useCorrectionStore((s) => s.startComparison);
  const stopComparison = useCorrectionStore((s) => s.stopComparison);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  const handleTakeSnapshot = useCallback(() => {
    const rebverbMap: Record<string, number> = {};
    seats.forEach((s) => {
      rebverbMap[s.id] = s.reverbTime;
    });
    const id = takeSnapshot(soundSources, rebverbMap, `快照 ${snapshots.length + 1}`);
    return id;
  }, [soundSources, seats, takeSnapshot, snapshots.length]);

  const handleStartCompare = useCallback(() => {
    if (selectedLeft && selectedRight) {
      startComparison(selectedLeft, selectedRight);
    }
  }, [selectedLeft, selectedRight, startComparison]);

  const leftSnapshot = useMemo(
    () => snapshots.find((s) => s.id === leftSnapshotId),
    [snapshots, leftSnapshotId]
  );
  const rightSnapshot = useMemo(
    () => snapshots.find((s) => s.id === rightSnapshotId),
    [snapshots, rightSnapshotId]
  );

  const diffSeatIds = useMemo(() => {
    if (!leftSnapshot || !rightSnapshot) return new Set<string>();
    const diffs = new Set<string>();
    for (const seatId of Object.keys(leftSnapshot.seatReverbTimes)) {
      const left = leftSnapshot.seatReverbTimes[seatId];
      const right = rightSnapshot.seatReverbTimes[seatId];
      if (left !== undefined && right !== undefined && Math.abs(left - right) > 0.05) {
        diffs.add(seatId);
      }
    }
    return diffs;
  }, [leftSnapshot, rightSnapshot]);

  if (isComparing && leftSnapshot && rightSnapshot) {
    return (
      <div className="h-full flex flex-col bg-[#0d1b2a]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
          <h3 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
            <ArrowLeftRight size={14} className="text-amber-400" />
            新旧结果并排对比
          </h3>
          <button
            onClick={stopComparison}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 flex gap-0.5 min-h-0">
          <div className="flex-1 min-w-0">
            {viewMode === '2d' ? (
              <SeatMap2D
                snapshotData={leftSnapshot.seatReverbTimes}
                highlightDiffs={diffSeatIds}
                label="修正前"
              />
            ) : (
              <SoundField3D label="修正前" />
            )}
          </div>
          <div className="w-px bg-amber-500/30" />
          <div className="flex-1 min-w-0">
            {viewMode === '2d' ? (
              <SeatMap2D
                snapshotData={rightSnapshot.seatReverbTimes}
                highlightDiffs={diffSeatIds}
                label="修正后"
              />
            ) : (
              <SoundField3D label="修正后" />
            )}
          </div>
        </div>
        <div className="px-3 py-2 border-t border-gray-800 shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="text-amber-400">{diffSeatIds.size}</span>
            <span>个座位混响差异 &gt; 0.05s</span>
            <span className="text-gray-600">|</span>
            <span>左: {leftSnapshot.label}</span>
            <span>右: {rightSnapshot.label}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] h-full bg-[#0d1b2a] border-l border-gray-800 flex flex-col shrink-0">
      <div className="px-3 pt-3 pb-2 border-b border-gray-800">
        <h2 className="text-sm font-bold text-gray-200 mb-2">手动修正</h2>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          开启拖拽模式后，可在座位图上拖动声源位置。修正前先保存快照，修正后可并排对比新旧结果。
        </p>
      </div>

      <div className="px-3 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-gray-300 font-medium">声源拖拽模式</span>
          <button
            onClick={() => setDragMode(!isDragMode)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isDragMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            {isDragMode ? '拖拽中' : '开启'}
          </button>
        </div>
        {isDragMode && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
            <Move size={10} />
            在2D座位图上拖动黄色声源标记
          </div>
        )}
      </div>

      <div className="px-3 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-gray-300 font-medium">声源位置</span>
        </div>
        <div className="space-y-1.5">
          {soundSources.map((src) => (
            <div key={src.id} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-gray-400">{src.id}</span>
              <span className="text-gray-500">
                x={src.x.toFixed(1)} y={src.y.toFixed(1)} z={src.z.toFixed(1)}
              </span>
              <span className="text-gray-600 ml-auto">{src.powerLevel}dB</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-gray-300 font-medium">快照管理</span>
          <button
            onClick={handleTakeSnapshot}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors border border-amber-500/30"
          >
            <Camera size={10} />
            保存快照
          </button>
        </div>
        {snapshots.length === 0 ? (
          <div className="text-[10px] text-gray-600 py-2 text-center">
            尚无快照，修正前请先保存
          </div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800/50 text-[10px]"
              >
                <input
                  type="radio"
                  name="leftSnap"
                  checked={selectedLeft === snap.id}
                  onChange={() => setSelectedLeft(snap.id)}
                  className="w-2.5 h-2.5 accent-blue-500"
                />
                <input
                  type="radio"
                  name="rightSnap"
                  checked={selectedRight === snap.id}
                  onChange={() => setSelectedRight(snap.id)}
                  className="w-2.5 h-2.5 accent-amber-500"
                />
                <span className="text-gray-300 flex-1">{snap.label}</span>
                <span className="text-gray-600">
                  {new Date(snap.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
        {snapshots.length >= 2 && selectedLeft && selectedRight && selectedLeft !== selectedRight && (
          <button
            onClick={handleStartCompare}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-colors border border-blue-500/30"
          >
            <ArrowLeftRight size={12} />
            并排对比选中快照
          </button>
        )}
      </div>

      <div className="px-3 py-3 flex-1 overflow-y-auto">
        <div className="text-[10px] text-gray-500">
          <div className="font-medium text-gray-400 mb-1">操作流程</div>
          <ol className="space-y-0.5 list-decimal list-inside text-gray-500">
            <li>保存当前状态为"修正前"快照</li>
            <li>开启拖拽模式，调整声源位置</li>
            <li>保存调整后为"修正后"快照</li>
            <li>选中两个快照进行并排对比</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
