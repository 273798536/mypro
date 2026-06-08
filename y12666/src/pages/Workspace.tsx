import { useRef } from 'react';
import TopBar from '@/components/TopBar';
import ParameterPanel from '@/components/ParameterPanel';
import Scene3D from '@/components/three/Scene3D';
import ColorLegend from '@/components/ColorLegend';
import ScreenshotCompare from '@/components/ScreenshotCompare';
import ReviewProcess from '@/components/ReviewProcess';
import ConclusionCompare from '@/components/ConclusionCompare';
import EdgeCaseModal from '@/components/EdgeCaseModal';
import SupplementModal from '@/components/SupplementModal';
import { Signature } from '@/components/Signature';

export default function Workspace() {
  const sceneRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-screen h-screen flex flex-col bg-deep-sea overflow-hidden font-body">
      <TopBar />

      <div className="flex flex-1 min-h-0">
        <ParameterPanel />

        <div
          id="scene-container"
          ref={sceneRef}
          className="flex-1 relative min-w-0"
        >
          <Scene3D sceneRef={sceneRef} />
          <ColorLegend />
          <ScreenshotCompare />

          <div className="absolute left-4 top-4 panel-card px-3 py-2 z-10">
            <div className="text-[10px] text-sea-mist/50 font-engineering">
              操作提示
            </div>
            <div className="text-[10px] text-sea-mist/70 mt-0.5 space-y-0.5">
              <div>🖱 左键拖动旋转 · 右键平移 · 滚轮缩放</div>
              <div>🎯 点击风机查看详情 · 从左侧调整参数</div>
            </div>
          </div>
        </div>

        <div className="w-[360px] h-full flex flex-col gap-3 p-3 overflow-y-auto shrink-0">
          <ReviewProcess />
          <ConclusionCompare />

          <div className="panel-card p-4">
            <div className="font-engineering text-sm text-sea-mist font-semibold mb-2">
              当前尾流评估结果
            </div>
            <div className="text-[10px] text-sea-mist/50 mb-2">
              基于 Jensen 尾流模型实时计算
            </div>
            <CurrentWakeTable />
          </div>
        </div>
      </div>

      <EdgeCaseModal />
      <SupplementModal />
      <Signature />
    </div>
  );
}

import { useProjectStore } from '@/store/useProjectStore';

function CurrentWakeTable() {
  const wakeResults = useProjectStore((s) => s.wakeResults);
  const setHighlight = useProjectStore((s) => s.setHighlight);
  const setSelected = useProjectStore((s) => s.setSelectedTurbineId);
  const selectedId = useProjectStore((s) => s.selectedTurbineId);

  return (
    <div className="max-h-56 overflow-y-auto rounded border border-wake-teal/15">
      <table className="w-full text-[11px]">
        <thead className="bg-ocean-slate/60 sticky top-0">
          <tr>
            <th className="text-left px-2 py-1.5 text-sea-mist/60 font-normal">风机</th>
            <th className="text-right px-2 py-1.5 text-sea-mist/60 font-normal">入流速度</th>
            <th className="text-right px-2 py-1.5 text-sea-mist/60 font-normal">尾流损失</th>
            <th className="text-right px-2 py-1.5 text-sea-mist/60 font-normal">状态</th>
          </tr>
        </thead>
        <tbody>
          {wakeResults.map((r) => (
            <tr
              key={r.turbineId}
              className={`cursor-pointer transition-colors border-t border-wake-teal/5 ${
                selectedId === r.turbineId ? 'bg-warning-amber/15' : ''
              } ${r.isOutOfBounds ? 'bg-alert-orange/10' : ''} hover:bg-wake-teal/10`}
              onClick={() => {
                setSelected(r.turbineId);
                setHighlight({
                  turbineIds: [r.turbineId, ...r.affectedBy],
                  type: 'selected',
                });
                setTimeout(() => setHighlight(null), 2500);
              }}
            >
              <td className="px-2 py-1.5 font-engineering text-sea-mist/90">{r.turbineName}</td>
              <td className="px-2 py-1.5 text-right font-engineering text-sea-mist/80">
                {r.incomingSpeed.toFixed(2)} m/s
              </td>
              <td
                className={`px-2 py-1.5 text-right font-engineering font-semibold ${
                  r.wakeLossPercent >= 20
                    ? 'text-alert-orange'
                    : r.wakeLossPercent >= 10
                    ? 'text-warning-amber'
                    : 'text-wake-teal'
                }`}
              >
                {r.wakeLossPercent.toFixed(1)}%
              </td>
              <td className="px-2 py-1.5 text-right">
                {r.isOutOfBounds ? (
                  <span className="text-[9px] text-alert-orange font-semibold">越界</span>
                ) : r.wakeLossPercent >= 10 ? (
                  <span className="text-[9px] text-warning-amber">警告</span>
                ) : (
                  <span className="text-[9px] text-wake-teal">正常</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
