import { useState } from 'react';
import { Layers, Plus, Save, Eye, X } from 'lucide-react';
import type { SectionFrame } from '@shared/types';

interface Props {
  sections: SectionFrame[];
  currentFrame: number;
  onFrameClick: (frameIdx: number) => void;
  onAddSection: (section: SectionFrame) => Promise<boolean>;
}

export default function SectionViewer({ sections, currentFrame, onFrameClick, onAddSection }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newFrameIdx, setNewFrameIdx] = useState(currentFrame);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const currentSection = sections.find((s) => s.frameIndex === currentFrame);

  const renderHeatmap = (data: number[], w = 180, h = 50) => {
    const cols = 10;
    const rows = Math.ceil(data.length / cols);
    const cellW = w / cols;
    const cellH = h / rows;
    return (
      <svg width={w} height={h} className="rounded">
        {data.map((v, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const intensity = v / 100;
          const r = Math.floor(15 + intensity * 239);
          const g = Math.floor(23 + (1 - intensity) * 120);
          const b = Math.floor(42 + (1 - intensity) * 30);
          return (
            <rect
              key={i}
              x={col * cellW}
              y={row * cellH}
              width={cellW}
              height={cellH}
              fill={`rgb(${r},${g},${b})`}
            />
          );
        })}
      </svg>
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onAddSection({
      frameIndex: newFrameIdx,
      timestamp: newFrameIdx * 300,
      note: newNote || '手动补录剖切帧',
      data: Array.from({ length: 50 }, () => Math.random() * 100),
    });
    setSaving(false);
    setShowAdd(false);
    setNewNote('');
  };

  return (
    <div className="card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-safety-blue" />
          <h3 className="font-mono text-sm font-semibold text-white">剖切查看器</h3>
          <span className="text-xs text-slate-400">{sections.length} 帧</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-safety-blue/15 text-safety-blue hover:bg-safety-blue/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          补录剖面
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {currentSection ? (
          <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-safety-orange" />
                <span className="font-mono text-sm text-white">当前帧 #{currentFrame}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">T+{currentSection.timestamp}s</span>
            </div>
            <div className="flex gap-3">
              {renderHeatmap(currentSection.data)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 leading-relaxed">{currentSection.note}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  {currentSection.data.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      数据点数: {currentSection.data.length}
                    </span>
                  )}
                  {currentSection.note.includes('透明遮挡') && (
                    <span className="px-2 py-0.5 rounded bg-safety-red/20 text-safety-red">
                      透明遮挡风险
                    </span>
                  )}
                  {currentSection.note.includes('正常') && (
                    <span className="px-2 py-0.5 rounded bg-safety-green/20 text-safety-green">
                      正常
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-850/50 p-6 text-center">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">帧 #{currentFrame} 暂无剖切数据</p>
            <button
              onClick={() => {
                setNewFrameIdx(currentFrame);
                setShowAdd(true);
              }}
              className="mt-3 text-xs text-safety-blue hover:underline"
            >
              + 立即补录此帧
            </button>
          </div>
        )}

        <div>
          <div className="text-xs font-mono text-slate-400 mb-2 px-1">全部剖切帧</div>
          <div className="grid grid-cols-4 gap-2">
            {sections.map((s) => {
              const active = s.frameIndex === currentFrame;
              return (
                <button
                  key={s.frameIndex}
                  onClick={() => onFrameClick(s.frameIndex)}
                  className={`rounded p-2 text-left border transition-all ${
                    active
                      ? 'border-safety-orange bg-safety-orange/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-300">#{s.frameIndex}</span>
                    {s.note.includes('透明遮挡') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-safety-red" />
                    )}
                  </div>
                  <div className="rounded overflow-hidden">{renderHeatmap(s.data, 120, 30)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-mono font-semibold text-white">补录剖切帧</h4>
              <button
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">帧编号</label>
                <input
                  type="number"
                  value={newFrameIdx}
                  onChange={(e) => setNewFrameIdx(parseInt(e.target.value, 10) || 0)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">剖切备注</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  placeholder="描述剖切情况，如：剖切正常纹理清晰 / 局部透明遮挡..."
                  className="input-field text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs">
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? '保存中...' : '保存补录'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              提示：补录后时间回放会自动同步更新该帧内容。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
