import { useSandboxStore } from "@/store/useSandboxStore";
import { Slider } from "@/components/Common/Slider";
import { PARAM_EXPLANATIONS } from "@/utils/explanations";
import { Wind, Layers, Move3d, Box } from "lucide-react";

export function ParameterPanel() {
  const {
    currentProject,
    selectedBlockId,
    updateCorridorParam,
    updateBlockPosition,
    updateBlockSize,
  } = useSandboxStore();

  const selectedBlock = currentProject.blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-400" />
          <span className="panel-title">参数联动面板</span>
        </div>
        <span className="text-[10px] font-mono text-surface-500">
          统一数据源
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3 text-primary-400">
            <Wind className="w-4 h-4" />
            <h3 className="font-serif text-sm font-semibold">风廊参数</h3>
          </div>

          {currentProject.corridors.map((corridor) => (
            <div
              key={corridor.id}
              className="mb-5 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                <span className="text-sm font-medium text-surface-200">
                  {corridor.name}
                </span>
              </div>

              <Slider
                label="风廊宽度"
                value={corridor.width}
                min={10}
                max={80}
                step={1}
                unit="m"
                explanation={PARAM_EXPLANATIONS.width.explanation}
                onChange={(v) => updateCorridorParam(corridor.id, "width", v)}
              />

              <Slider
                label="风廊高度"
                value={corridor.height}
                min={20}
                max={150}
                step={5}
                unit="m"
                explanation={PARAM_EXPLANATIONS.height.explanation}
                onChange={(v) => updateCorridorParam(corridor.id, "height", v)}
              />

              <Slider
                label="风廊偏角"
                value={corridor.angle}
                min={-45}
                max={45}
                step={1}
                unit="°"
                explanation={PARAM_EXPLANATIONS.angle.explanation}
                onChange={(v) => updateCorridorParam(corridor.id, "angle", v)}
              />
            </div>
          ))}
        </div>

        {selectedBlock ? (
          <div>
            <div className="flex items-center gap-2 mb-3 text-primary-400">
              <Box className="w-4 h-4" />
              <h3 className="font-serif text-sm font-semibold">
                选中体块属性
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-surface-800/40 border border-primary-500/30">
              <div className="text-sm font-medium text-surface-200 mb-3">
                {selectedBlock.name}
              </div>

              <div className="text-[10px] font-mono text-surface-500 mb-2 flex items-center gap-1">
                <Move3d className="w-3 h-3" />
                坐标位置
              </div>
              <Slider
                label="X 轴坐标"
                value={selectedBlock.position.x}
                min={-60}
                max={60}
                step={0.5}
                unit="m"
                onChange={(v) => updateBlockPosition(selectedBlock.id, { x: v })}
              />
              <Slider
                label="Z 轴坐标"
                value={selectedBlock.position.z}
                min={-60}
                max={60}
                step={0.5}
                unit="m"
                onChange={(v) => updateBlockPosition(selectedBlock.id, { z: v })}
              />
              <Slider
                label="建筑高度"
                value={selectedBlock.size.height}
                min={6}
                max={120}
                step={2}
                unit="m"
                onChange={(v) => updateBlockSize(selectedBlock.id, { height: v })}
              />
              <Slider
                label="建筑宽度"
                value={selectedBlock.size.width}
                min={6}
                max={40}
                step={1}
                unit="m"
                onChange={(v) => updateBlockSize(selectedBlock.id, { width: v })}
              />
              <Slider
                label="建筑进深"
                value={selectedBlock.size.depth}
                min={6}
                max={40}
                step={1}
                unit="m"
                onChange={(v) => updateBlockSize(selectedBlock.id, { depth: v })}
              />

              <div className="mt-3 pt-3 border-t border-surface-700/50 text-[10px] font-mono text-surface-500 space-y-1">
                <div>
                  ID: <span className="text-surface-400">{selectedBlock.id}</span>
                </div>
                <div>
                  类型:{" "}
                  <span className="text-surface-400">
                    {selectedBlock.type === "building"
                      ? "建筑"
                      : selectedBlock.type === "green"
                      ? "绿地"
                      : "基础设施"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-800/30 border border-dashed border-surface-700/50 text-center">
            <Box className="w-8 h-8 mx-auto mb-2 text-surface-600" />
            <p className="text-xs text-surface-500">点击场景中的体块</p>
            <p className="text-xs text-surface-500">可编辑其属性参数</p>
          </div>
        )}
      </div>
    </div>
  );
}
