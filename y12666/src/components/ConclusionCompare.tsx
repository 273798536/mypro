import { useMemo } from 'react';
import { X, Layers, Edit3, GitCompare, Sparkles } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import type { WakeResult } from '@/types';

export default function ConclusionCompare() {
  const show = useProjectStore((s) => s.showConclusionCompare);
  const setShow = useProjectStore((s) => s.setShowConclusionCompare);
  const conclusions = useProjectStore((s) => s.conclusions);
  const setHighlight = useProjectStore((s) => s.setHighlight);
  const generateConclusion = useProjectStore((s) => s.generateConclusion);
  const modifyTurbine = useProjectStore((s) => s.modifyTurbine);
  const currentModelVersion = useProjectStore((s) => s.currentModelVersion);
  const turbines = useProjectStore((s) => s.turbines);

  const hasBoth = conclusions.old && conclusions.new;

  const diffRows = useMemo(() => {
    if (!conclusions.old || !conclusions.new) return [];
    const mapOld = new Map(conclusions.old.wakeResults.map((r) => [r.turbineId, r]));
    const rows: Array<{
      turbineName: string;
      oldResult: WakeResult;
      newResult: WakeResult;
      diffPercent: number;
      isSignificant: boolean;
    }> = [];
    for (const nr of conclusions.new.wakeResults) {
      const or = mapOld.get(nr.turbineId);
      if (or) {
        const diff = nr.wakeLossPercent - or.wakeLossPercent;
        rows.push({
          turbineName: nr.turbineName,
          oldResult: or,
          newResult: nr,
          diffPercent: diff,
          isSignificant: Math.abs(diff) > 2,
        });
      }
    }
    return rows.sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent));
  }, [conclusions]);

  if (!show) return null;

  const simulateModelChange = () => {
    const wtg02 = turbines.find((t) => t.name === 'WTG-02');
    if (wtg02) {
      modifyTurbine(wtg02.id, { x: wtg02.x - 100, hubHeight: wtg02.hubHeight + 15 });
    }
    const wtg03 = turbines.find((t) => t.name === 'WTG-03');
    if (wtg03) {
      modifyTurbine(wtg03.id, { rotorDiameter: wtg03.rotorDiameter + 20 });
    }
    generateConclusion('new');
  };

  return (
    <div className="panel-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-engineering text-sm text-sea-mist font-semibold flex items-center gap-2">
          <GitCompare size={16} className="text-wake-teal" />
          新旧结论并排对比
        </span>
        <button onClick={() => setShow(false)} className="text-sea-mist/40 hover:text-sea-mist">
          <X size={14} />
        </button>
      </div>

      {!conclusions.old && !conclusions.new && (
        <div className="space-y-2">
          <div className="text-[11px] text-sea-mist/60 text-center py-3">
            尚未生成结论，请先基于当前模型生成基线结论
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => generateConclusion('old')}
              className="btn-secondary !py-1.5 text-[11px] flex items-center justify-center gap-1.5"
            >
              <Layers size={12} />
              生成旧模型结论
            </button>
            <button
              onClick={() => {
                simulateModelChange();
              }}
              className="btn-primary !py-1.5 text-[11px] flex items-center justify-center gap-1.5"
            >
              <Edit3 size={12} />
              修改模型并生成新结论
            </button>
          </div>
        </div>
      )}

      {(conclusions.old || conclusions.new) && !hasBoth && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {['old', 'new'].map((ver) => {
              const concl = conclusions[ver as 'old' | 'new'];
              return (
                <div
                  key={ver}
                  className={`rounded p-2.5 border ${
                    concl ? 'border-wake-teal/40 bg-wake-teal/10' : 'border-ocean-slate/50 bg-ocean-slate/30'
                  }`}
                >
                  <div className="text-[10px] font-engineering text-sea-mist/60 mb-1">
                    {ver === 'old' ? '旧模型' : '新模型'}
                  </div>
                  {concl ? (
                    <>
                      <div className="text-xl font-engineering text-sea-mist font-bold">
                        {concl.totalWakeLoss}%
                        <span className="text-[10px] text-sea-mist/50 ml-1 font-normal">平均尾流损失</span>
                      </div>
                      <div className="text-[10px] text-sea-mist/60 mt-1">
                        影响 {concl.affectedTurbines.length} 台风机
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-sea-mist/40 py-1">待生成</div>
                  )}
                </div>
              );
            })}
          </div>
          {!conclusions.new && (
            <button
              onClick={simulateModelChange}
              className="btn-alert w-full !py-1.5 text-[11px] flex items-center justify-center gap-1.5"
            >
              <Sparkles size={12} />
              修改三维模型并生成新结论
            </button>
          )}
          {!conclusions.old && (
            <button
              onClick={() => generateConclusion('old')}
              className="btn-primary w-full !py-1.5 text-[11px]"
            >
              先生成旧模型基线结论
            </button>
          )}
        </div>
      )}

      {hasBoth && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['old', 'new'] as const).map((ver) => {
              const concl = conclusions[ver]!;
              return (
                <div
                  key={ver}
                  className={`rounded p-2.5 border ${
                    ver === 'old'
                      ? 'border-wake-teal/40 bg-wake-teal/10'
                      : 'border-alert-orange/40 bg-alert-orange/10'
                  }`}
                >
                  <div className={`text-[10px] font-engineering font-semibold mb-1 ${ver === 'old' ? 'text-wake-teal' : 'text-alert-orange'}`}>
                    {ver === 'old' ? '旧模型结论' : '新模型结论'}
                  </div>
                  <div className="text-xl font-engineering text-sea-mist font-bold">
                    {concl.totalWakeLoss}%
                    <span className="text-[10px] text-sea-mist/50 ml-1 font-normal">平均损失</span>
                  </div>
                  <div className="text-[10px] text-sea-mist/60 mt-1">
                    影响 {concl.affectedTurbines.length} 台
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-sea-mist/60 font-semibold">
            风机尾流损失差异（按影响程度排序）
          </div>
          <div className="max-h-40 overflow-y-auto rounded border border-wake-teal/15">
            <table className="w-full text-[11px]">
              <thead className="bg-ocean-slate/60 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1 text-sea-mist/60 font-normal">风机</th>
                  <th className="text-right px-2 py-1 text-sea-mist/60 font-normal">旧</th>
                  <th className="text-right px-2 py-1 text-sea-mist/60 font-normal">新</th>
                  <th className="text-right px-2 py-1 text-sea-mist/60 font-normal">差值</th>
                </tr>
              </thead>
              <tbody>
                {diffRows.map((row) => (
                  <tr
                    key={row.turbineName}
                    className={`cursor-pointer transition-colors ${
                      row.isSignificant ? 'bg-alert-orange/10' : ''
                    } hover:bg-wake-teal/10`}
                    onClick={() => {
                      setHighlight({
                        turbineIds: [row.newResult.turbineId, ...row.newResult.affectedBy],
                        type: 'difference',
                      });
                      setTimeout(() => setHighlight(null), 3000);
                    }}
                  >
                    <td className="px-2 py-1 font-engineering text-sea-mist/90">{row.turbineName}</td>
                    <td className="px-2 py-1 text-right font-engineering text-sea-mist/80">
                      {row.oldResult.wakeLossPercent.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1 text-right font-engineering text-sea-mist/80">
                      {row.newResult.wakeLossPercent.toFixed(1)}%
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-engineering font-semibold ${
                        row.diffPercent > 0 ? 'text-alert-orange' : row.diffPercent < 0 ? 'text-wake-teal' : 'text-sea-mist/60'
                      }`}
                    >
                      {row.diffPercent > 0 ? '+' : ''}
                      {row.diffPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-sea-mist/40">点击行可在三维场景中联动高亮对应风机</div>
        </div>
      )}
    </div>
  );
}
