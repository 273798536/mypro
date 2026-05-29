import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ArrowLeft, ArrowRight, Check, Merge } from 'lucide-react';
import { diffConfigs } from '@/engine/gameEngine';
import { sampleRobotOverrides, sampleShelfOverrides } from '@/config/defaultScenario';
import type { ConfigDiff } from '@/engine/types';

export default function ConfigMerge() {
  const map = useGameStore(s => s.state.map);
  const [diffs, setDiffs] = useState<ConfigDiff[]>(() => diffConfigs(sampleRobotOverrides, sampleShelfOverrides, map));
  const [merged, setMerged] = useState(false);

  const allResolved = diffs.every(d => d.resolved !== null);

  function resolve(index: number, side: 'robot' | 'shelf') {
    setDiffs(prev => prev.map((d, i) => i === index ? { ...d, resolved: side } : d));
  }

  function handleMerge() {
    setMerged(true);
  }

  if (diffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Merge size={40} className="text-green-400 mb-4" />
        <p className="text-green-400 text-lg font-semibold">配置无冲突</p>
        <p className="text-zinc-500 text-sm mt-1">机器人配置与货架配置完全兼容</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Merge size={20} className="text-orange-400" />
        <h2 className="text-white text-lg font-semibold">配置合并 — 差异对比</h2>
      </div>

      <div className="grid grid-cols-[1fr_40px_1fr] gap-0 mb-4">
        <div className="text-center text-xs text-blue-400 font-semibold py-2 bg-blue-500/10 rounded-tl-lg">
          机器人配置
        </div>
        <div className="flex items-center justify-center bg-zinc-800">
          <ArrowLeft size={12} className="text-zinc-500" />
          <ArrowRight size={12} className="text-zinc-500" />
        </div>
        <div className="text-center text-xs text-green-400 font-semibold py-2 bg-green-500/10 rounded-tr-lg">
          货架配置
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {diffs.map((diff, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_40px_1fr_80px] gap-0 rounded-lg border overflow-hidden ${
              diff.resolved ? 'border-zinc-700 opacity-60' : 'border-orange-500/30'
            }`}
          >
            <div className={`p-3 text-sm ${diff.resolved === 'robot' ? 'bg-blue-500/20 text-blue-300' : 'bg-[#1a1a2e] text-zinc-300'}`}>
              <div className="text-xs text-zinc-500 mb-1">{diff.key}</div>
              <div className="font-mono">{String(diff.robotValue)}</div>
            </div>
            <div className="flex items-center justify-center bg-zinc-800/50">
              <span className="text-zinc-600 text-lg">≠</span>
            </div>
            <div className={`p-3 text-sm ${diff.resolved === 'shelf' ? 'bg-green-500/20 text-green-300' : 'bg-[#1a1a2e] text-zinc-300'}`}>
              <div className="text-xs text-zinc-500 mb-1">{diff.key}</div>
              <div className="font-mono">{String(diff.shelfValue)}</div>
            </div>
            <div className="flex items-center justify-center gap-1 bg-zinc-800/30">
              {diff.resolved ? (
                <span className="text-xs text-zinc-400">
                  {diff.resolved === 'robot' ? '← 机器人' : '货架 →'}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => resolve(i, 'robot')}
                    className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => resolve(i, 'shelf')}
                    className="px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-500 text-white transition-colors"
                  >
                    →
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs">
          已解决 {diffs.filter(d => d.resolved).length}/{diffs.length} 项差异
        </span>
        <button
          onClick={handleMerge}
          disabled={!allResolved || merged}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            merged
              ? 'bg-green-600/20 text-green-400 border border-green-500/30'
              : allResolved
              ? 'bg-orange-600 hover:bg-orange-500 text-white'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {merged ? (
            <>
              <Check size={14} />
              已合并
            </>
          ) : (
            <>
              <Merge size={14} />
              合并配置
            </>
          )}
        </button>
      </div>
    </div>
  );
}
