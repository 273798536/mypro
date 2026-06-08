import { useState } from 'react';
import { GitCompare, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import HudCard from '@/components/ui/HudCard';
import Slider from '@/components/ui/Slider';
import DiffHighlight from '@/components/ui/DiffHighlight';
import { paramDiff } from '@/utils/sectionMath';

export default function ParamPanel() {
  const currentParams = useGameStore((s) => s.currentParams);
  const setParams = useGameStore((s) => s.setParams);
  const paramHistory = useGameStore((s) => s.paramHistory);
  const lastSectionResult = useGameStore((s) => s.lastSectionResult);
  const activeBoundaryScene = useGameStore((s) => s.activeBoundaryScene);
  const status = useGameStore((s) => s.status);
  const [reason, setReason] = useState('手动调参');

  const prevSnapshot = paramHistory.length >= 2 ? paramHistory[paramHistory.length - 2] : null;
  const diffs = prevSnapshot ? paramDiff(prevSnapshot.params, currentParams) : {};
  const hasDiffs = Object.keys(diffs).length > 0;

  const disabled = status === 'idle' || status === 'finished';

  const resultCol = () => {
    if (!lastSectionResult) return null;
    return [
      { label: '截面点数', before: prevSnapshot?.sectionResult?.pointCount, after: lastSectionResult.pointCount },
      { label: '离群点数', before: prevSnapshot?.sectionResult?.outlierCount, after: lastSectionResult.outlierCount },
      { label: '截面积', before: prevSnapshot?.sectionResult?.crossSectionArea?.toFixed(3), after: lastSectionResult.crossSectionArea.toFixed(3) },
    ];
  };

  return (
    <div className="space-y-3 h-full overflow-y-auto scrollbar-cyber pr-1">
      <HudCard title="截面参数 · SECTION" accent="cyan">
        <div className="space-y-3">
          <div className="text-[10px] font-mono text-cyan-300/60">截面位置</div>

          <Slider
            label="位置 X"
            value={currentParams.positionX}
            min={-3}
            max={3}
            onChange={(v) => setParams({ positionX: v }, reason)}
            diffValue={prevSnapshot?.params.positionX}
          />
          <Slider
            label="位置 Y"
            value={currentParams.positionY}
            min={-3}
            max={3}
            onChange={(v) => setParams({ positionY: v }, reason)}
            diffValue={prevSnapshot?.params.positionY}
          />
          <Slider
            label="位置 Z"
            value={currentParams.positionZ}
            min={-3}
            max={3}
            onChange={(v) => setParams({ positionZ: v }, reason)}
            diffValue={prevSnapshot?.params.positionZ}
          />

          <div className="h-px bg-cyber-cyan/10 my-2" />
          <div className="text-[10px] font-mono text-cyan-300/60">法向量方向</div>
          <Slider
            label="法向 X"
            value={currentParams.normalX}
            min={-1}
            max={1}
            onChange={(v) => setParams({ normalX: v }, reason)}
            diffValue={prevSnapshot?.params.normalX}
          />
          <Slider
            label="法向 Y"
            value={currentParams.normalY}
            min={-1}
            max={1}
            onChange={(v) => setParams({ normalY: v }, reason)}
            diffValue={prevSnapshot?.params.normalY}
          />
          <Slider
            label="法向 Z"
            value={currentParams.normalZ}
            min={-1}
            max={1}
            onChange={(v) => setParams({ normalZ: v }, reason)}
            diffValue={prevSnapshot?.params.normalZ}
          />

          <div className="h-px bg-cyber-cyan/10 my-2" />
          <div className="text-[10px] font-mono text-cyan-300/60">厚度与时间</div>
          <Slider
            label="截面厚度"
            value={currentParams.thickness}
            min={0.05}
            max={1.5}
            onChange={(v) => setParams({ thickness: v }, reason)}
            diffValue={prevSnapshot?.params.thickness}
          />
          <Slider
            label="时间偏移"
            value={currentParams.timeOffset}
            min={-500}
            max={500}
            step={10}
            unit="ms"
            onChange={(v) => setParams({ timeOffset: v }, reason)}
            diffValue={prevSnapshot?.params.timeOffset}
          />

          <div className="h-px bg-cyber-cyan/10 my-2" />
          <div>
            <div className="text-[10px] font-mono text-cyan-300/60 mb-1">修改原因</div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-space-dark/80 text-[11px] text-cyber-cyan font-mono px-2 py-1.5 border border-cyber-cyan/20 rounded focus:outline-none focus:border-cyber-cyan/50"
              placeholder="记录调参原因..."
            />
          </div>
        </div>
      </HudCard>

      <HudCard title="截面结果 · RESULT" accent="green">
        {lastSectionResult ? (
          <div className="space-y-1 text-[11px] font-mono">
            {resultCol()?.map((r: any) => (
              <DiffHighlight
                key={r.label}
                label={r.label}
                before={r.before}
                after={r.after}
              />
            ))}
            <div className="h-px bg-cyber-cyan/10 my-1.5" />
            <div className="text-[10px] text-cyan-300/60">质心位置</div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <DiffHighlight
                label="X"
                before={prevSnapshot?.sectionResult?.centroid.x.toFixed(2)}
                after={lastSectionResult.centroid.x.toFixed(2)}
              />
              <DiffHighlight
                label="Y"
                before={prevSnapshot?.sectionResult?.centroid.y.toFixed(2)}
                after={lastSectionResult.centroid.y.toFixed(2)}
              />
              <DiffHighlight
                label="Z"
                before={prevSnapshot?.sectionResult?.centroid.z.toFixed(2)}
                after={lastSectionResult.centroid.z.toFixed(2)}
              />
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-cyan-300/50">开始游戏后显示</div>
        )}
      </HudCard>

      {hasDiffs && prevSnapshot && (
        <HudCard title="参数变更对比 · DIFF" accent="yellow">
          <div className="flex items-start gap-2 text-[10px] mb-2">
            <GitCompare className="w-3 h-3 text-warn-yellow mt-0.5" />
            <div>
              <div>上次修改者: <span className="text-cyber-cyan">{prevSnapshot.operator}</span></div>
              <div className="text-cyan-300/60">原因: {prevSnapshot.reason}</div>
            </div>
          </div>
          <div className="space-y-1">
            {(Object.keys(diffs) as (keyof typeof diffs)[]).map((k) => (
              <DiffHighlight
                key={k}
                label={String(k)}
                before={diffs[k]!.before.toFixed(3)}
                after={diffs[k]!.after.toFixed(3)}
                changed
              />
            ))}
          </div>
        </HudCard>
      )}

      {activeBoundaryScene && (
        <HudCard title="边界场景告警 · WARNING" accent="orange">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-alert-orange animate-pulse" />
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-alert-orange">
                {activeBoundaryScene.name}
              </div>
              <div className="text-[10px] text-cyan-300/70 leading-relaxed">
                {activeBoundaryScene.description}
              </div>
              <div className="text-[10px] text-warn-yellow/90 pt-1">
                建议修正:
                {Object.entries(activeBoundaryScene.expectedFix).map(([k, v]) => (
                  <span key={k} className="ml-1">
                    {k}={typeof v === 'number' ? v.toFixed(2) : String(v)}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-success-green/80 pt-1 italic">
                影响: {activeBoundaryScene.consequence}
              </div>
            </div>
          </div>
        </HudCard>
      )}
    </div>
  );
}
