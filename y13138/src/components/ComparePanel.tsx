import { useState } from 'react';
import { ChevronUp, ChevronDown, SplitSquareVertical, ArrowRight } from 'lucide-react';
import { useParamStore } from '@/store/paramStore';
import { useChartStore } from '@/store/chartStore';
import { computeSteadyState } from '@/engine/steadyState';
import { buildTransitionMatrix, multiplyVectorMatrix, formatMatrixEquation } from '@/engine/markov';
import { autoConvertByUnitPair } from '@/engine/unitConvert';
import type { CompareDiffRow } from '@/types';

function buildDiffRows(): CompareDiffRow[] {
  const { groups } = useParamStore.getState();
  const rowsA = groups.A.rows;
  const rowsB = groups.B.rows;
  const allIds = Array.from(new Set([...rowsA.map((r) => r.id), ...rowsB.map((r) => r.id)]));
  return allIds.map((id) => {
    const a = rowsA.find((r) => r.id === id);
    const b = rowsB.find((r) => r.id === id);
    const valueA = a?.value ?? 0;
    const valueB = b?.value ?? 0;
    const isDiff = Math.abs(valueA - valueB) > 1e-9;
    const calcStepsA: string[] = [];
    const calcStepsB: string[] = [];
    if (a?.sourceRecordId) calcStepsA.push(`来源：${a.sourceRecordId}（${a.remark || '无备注'}）`);
    if (b?.sourceRecordId) calcStepsB.push(`来源：${b.sourceRecordId}（${b.remark || '无备注'}）`);
    let unitConvertNote: string | undefined;
    if (isDiff && a && b) {
      const conv = autoConvertByUnitPair(valueA, a.unit, b.unit);
      if (conv) {
        unitConvertNote = `单位换算过程（A→B）：${conv.steps.join('；')}`;
      }
    }
    return {
      paramId: id,
      paramName: (a || b)?.name || id,
      valueA,
      valueB,
      unit: (a || b)?.unit || '',
      isDiff,
      calcStepsA,
      calcStepsB,
      unitConvertNote,
    };
  });
}

interface MatrixBlockProps {
  title: string;
  nodes: ReturnType<typeof useChartStore.getState>['nodes'];
  edges: ReturnType<typeof useChartStore.getState>['edges'];
  color: string;
}
function MatrixBlock({ title, nodes, edges, color }: MatrixBlockProps) {
  const P = buildTransitionMatrix(nodes, edges);
  const result = computeSteadyState(nodes, edges);
  const initial = nodes.map((n) => n.initialProb);
  const step1 = multiplyVectorMatrix(initial, P);
  const step2 = multiplyVectorMatrix(step1, P);
  const eq1 = formatMatrixEquation(1, nodes, initial, P, step1).slice(1, 3);

  return (
    <div className="flex-1 min-w-0 border-2 p-3 rounded-sm bg-white" style={{ borderColor: color }}>
      <h4
        className="font-serif text-[13px] font-bold mb-2 pb-1 border-b-2"
        style={{ color, borderColor: color }}
      >
        {title}
      </h4>
      <div className="text-[10px] mono text-academic-navy/70 mb-2">转移矩阵 P：</div>
      <div className="overflow-x-auto mb-2.5 custom-scroll">
        <table className="mono text-[11px] border-collapse">
          <tbody>
            {P.map((row, i) => (
              <tr key={i}>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={`border px-1.5 py-1 text-center ${
                      v > 0.3 ? 'font-semibold' : ''
                    }`}
                    style={{
                      color: v < 0.1 ? '#a4161a' : v > 0.3 ? color : '#1e2a5a',
                      borderColor: 'rgba(30,42,90,0.2)',
                    }}
                  >
                    {v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] mono text-academic-navy/70 mb-1">
        稳态 π̄ = [ {result.steadyVector.map((p) => (p * 100).toFixed(1) + '%').join(', ')} ]
      </div>
      <div className="text-[10px] mono mb-2" style={{ color: result.isConverged ? '#2d6a4f' : '#a4161a' }}>
        {result.isConverged ? '✅ 收敛正常' : '⚠️ ' + result.convergenceNote}
      </div>

      <div className="text-[10px] mono text-academic-navy/70 mb-1">
        计算展开示例（第1步）：
      </div>
      <div className="mono text-[10px] leading-relaxed bg-academic-paper-dark/50 p-2 rounded-sm border border-academic-navy/10">
        {eq1.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div className="mt-1 pt-1 border-t border-academic-navy/10">
          π₁(...) = {step2.map((p) => p.toFixed(3)).join(', ')}
        </div>
      </div>
    </div>
  );
}

export default function ComparePanel() {
  const [expanded, setExpanded] = useState(true);
  const [height, setHeight] = useState(320);
  const { groups, activeGroupId } = useParamStore();
  const { nodes, edges, steadyCalc, chainTrajectory } = useChartStore();
  const diffRows = buildDiffRows();
  const hasDiff = diffRows.some((r) => r.isDiff);

  return (
    <div
      className="border-t-2 border-academic-navy bg-white flex flex-col flex-shrink-0"
      style={{ height: expanded ? height : 40, transition: 'height 0.3s ease' }}
    >
      <div
        className="h-10 flex items-center justify-between px-4 bg-academic-navy text-academic-paper cursor-pointer select-none flex-shrink-0"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <SplitSquareVertical className="w-4 h-4" />
          <span className="font-serif text-sm font-semibold">双组对照计算面板</span>
          {hasDiff && (
            <span className="px-2 py-0.5 text-[10px] font-serif bg-diff-gold text-academic-navy rounded-sm font-semibold">
              {diffRows.filter((r) => r.isDiff).length} 处参数差异
            </span>
          )}
          <span className="text-[10px] mono opacity-70 ml-2">
            中间计算过程 · 单位换算 · 稳态推导 —— 全展开
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-serif">
          <span className="opacity-80">A组 vs B组</span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div
          className="flex-1 overflow-hidden flex flex-col"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).dataset.dragHandle) {
              const startY = e.clientY;
              const startH = height;
              const onMove = (ev: MouseEvent) => {
                setHeight(Math.max(180, Math.min(600, startH + (startY - ev.clientY))));
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }
          }}
        >
          <div
            data-drag-handle
            className="h-1.5 bg-academic-navy/20 cursor-row-resize flex items-center justify-center hover:bg-academic-navy/40 transition-all flex-shrink-0"
          >
            <div className="w-10 h-0.5 bg-academic-navy/40 rounded-sm" />
          </div>

          <div className="flex-1 overflow-auto custom-scroll p-3 space-y-4">
            <div>
              <h3 className="font-serif text-sm font-bold text-academic-navy mb-2 pb-1 border-b-2 border-academic-navy/30">
                📊 参数值对照（金黄底为差异项）
              </h3>
              <div className="overflow-x-auto custom-scroll">
                <table className="w-full text-[11px] mono border-collapse border border-academic-navy/20">
                  <thead>
                    <tr className="bg-academic-navy text-academic-paper text-[10px]">
                      <th className="border px-2 py-1.5 text-left font-serif" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        参数ID
                      </th>
                      <th className="border px-2 py-1.5 text-left font-serif" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        参数名
                      </th>
                      <th className="border px-2 py-1.5 text-center font-serif" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        A组（{groups.A.label.split('：')[1] || groups.A.label}）
                      </th>
                      <th className="border px-2 py-1.5 text-center font-serif w-[60px]" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        单位
                      </th>
                      <th className="border px-2 py-1.5 text-center font-serif w-[40px]" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        Δ
                      </th>
                      <ArrowRight className="w-4 h-4 text-academic-paper/80 my-auto" />
                      <th className="border px-2 py-1.5 text-center font-serif" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        B组（含晚到附件）
                      </th>
                      <th className="border px-2 py-1.5 text-left font-serif" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                        差异说明 / 单位换算
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map((r, idx) => (
                      <tr
                        key={r.paramId}
                        className={`${idx % 2 ? 'bg-academic-paper/40' : ''} ${
                          r.isDiff ? 'diff-row' : ''
                        }`}
                      >
                        <td className="border px-2 py-1.5 font-semibold">{r.paramId}</td>
                        <td className="border px-2 py-1.5 font-serif">{r.paramName}</td>
                        <td
                          className={`border px-2 py-1.5 text-center ${
                            activeGroupId === 'A' ? 'font-bold' : ''
                          }`}
                        >
                          {r.valueA}
                        </td>
                        <td className="border px-2 py-1.5 text-center text-academic-navy/70">
                          {r.unit}
                        </td>
                        <td className="border px-2 py-1.5 text-center font-bold">
                          {r.isDiff ? (
                            <span
                              style={{
                                color: r.valueB > r.valueA ? '#2d6a4f' : '#a4161a',
                              }}
                            >
                              {r.valueB - r.valueA > 0 ? '+' : ''}
                              {(r.valueB - r.valueA).toFixed(3)}
                            </span>
                          ) : (
                            <span className="text-academic-navy/30">—</span>
                          )}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          <ArrowRight className="w-3.5 h-3.5 mx-auto text-academic-navy/40" />
                        </td>
                        <td
                          className={`border px-2 py-1.5 text-center ${
                            activeGroupId === 'B' ? 'font-bold' : ''
                          }`}
                        >
                          {r.valueB}
                        </td>
                        <td className="border px-2 py-1.5 font-serif text-[10px] text-academic-navy/75 max-w-[260px]">
                          {r.unitConvertNote ||
                            (r.isDiff
                              ? '参数值不同 → 见计算展开'
                              : '两组取值一致')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-serif text-sm font-bold text-academic-navy mb-2 pb-1 border-b-2 border-academic-navy/30">
                🧮 马尔可夫链计算过程（并排对照）
              </h3>
              <div className="flex gap-3 flex-wrap">
                <MatrixBlock
                  title="A组：课堂实测（不含晚到附件）"
                  nodes={nodes}
                  edges={edges}
                  color="#1e2a5a"
                />
                <MatrixBlock
                  title="B组：含晚到附件修正"
                  nodes={nodes}
                  edges={edges}
                  color="#c46a1b"
                />
              </div>
            </div>

            {steadyCalc && (
              <div className="panel-card p-3 rounded-sm bg-academic-paper/50">
                <h3 className="font-serif text-sm font-bold text-academic-navy mb-2">
                  📐 稳态方程完整求解（{activeGroupId}组）
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] mono text-academic-navy/60 mb-1 font-serif">
                      方程组：
                    </div>
                    <div className="mono text-[10.5px] leading-relaxed bg-white p-2 rounded-sm border border-academic-navy/15">
                      {steadyCalc.equations.map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] mono text-academic-navy/60 mb-1 font-serif">
                      高斯消元过程：
                    </div>
                    <div className="mono text-[10.5px] leading-relaxed bg-white p-2 rounded-sm border border-academic-navy/15">
                      {steadyCalc.eliminationSteps.map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {chainTrajectory && (
              <div className="panel-card p-3 rounded-sm bg-white">
                <h3 className="font-serif text-sm font-bold text-academic-navy mb-2 pb-1 border-b border-academic-navy/15">
                  📈 马尔可夫链分布随步长演化（π₀ → π₁₂）
                </h3>
                <div className="overflow-x-auto custom-scroll">
                  <table className="mono text-[10px] border-collapse min-w-full">
                    <thead>
                      <tr>
                        <th className="border px-1.5 py-1 bg-academic-navy text-academic-paper font-serif text-left">
                          t步
                        </th>
                        {nodes.map((n) => (
                          <th
                            key={n.id}
                            className={`border px-1.5 py-1 font-serif text-center ${
                              n.isAbnormal
                                ? 'bg-abnormal-brick/15 text-abnormal-brick'
                                : 'bg-academic-navy text-academic-paper'
                            }`}
                            style={{ borderColor: 'rgba(30,42,90,0.2)' }}
                          >
                            π({n.displayName})
                          </th>
                        ))}
                        <th className="border px-1.5 py-1 bg-academic-navy text-academic-paper font-serif text-center">
                          Σ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chainTrajectory.trajectory.map((row, i) => {
                        const sum = row.distribution.reduce((s, p) => s + p, 0);
                        const overflow = row.overflowFlags.some((f) => f);
                        return (
                          <tr
                            key={i}
                            className={i % 2 ? 'bg-academic-paper/40' : ''}
                            style={overflow ? { background: 'rgba(255,230,109,0.4)' } : {}}
                          >
                            <td className="border px-1.5 py-0.5 font-semibold text-center">
                              t={row.step}
                            </td>
                            {row.distribution.map((p, j) => (
                              <td
                                key={j}
                                className={`border px-1.5 py-0.5 text-center ${
                                  row.overflowFlags[j] ? 'text-abnormal-brick font-bold' : ''
                                }`}
                                style={{ borderColor: 'rgba(30,42,90,0.2)' }}
                              >
                                {(p * 100).toFixed(1)}%
                              </td>
                            ))}
                            <td
                              className="border px-1.5 py-0.5 text-center font-semibold"
                              style={{
                                color: Math.abs(sum - 1) < 0.01 ? '#2d6a4f' : '#a4161a',
                                borderColor: 'rgba(30,42,90,0.2)',
                              }}
                            >
                              {sum.toFixed(3)}
                              {Math.abs(sum - 1) < 0.01 ? '✓' : '⚠'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-[10px] font-serif text-academic-navy/60">
                  * 金黄底行：存在概率越界的步 · 红字：越界的节点概率 · Σ列：验证概率和≈1
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
