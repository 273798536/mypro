import { useSceneStore } from "../../hooks/useSceneStore";
import CaliberChangeTag from "./CaliberChangeTag";
import { Lightbulb, Thermometer, Sun } from "lucide-react";

export default function ObjectPropertyPanel() {
  const { selectedObjectId, lightObjects, showcases, materials } = useSceneStore();

  if (!selectedObjectId) {
    return (
      <div className="px-4 py-8 text-center text-zinc-600 text-xs">
        <Lightbulb size={24} className="mx-auto mb-2 text-zinc-700" />
        点击三维场景中的灯光对象
        <br />
        查看详细属性和关联材料
      </div>
    );
  }

  const light = lightObjects.find((l) => l.id === selectedObjectId);
  if (!light) return null;

  const showcase = showcases.find((s) => s.id === light.showcaseId);
  const relatedMaterials = materials.filter((m) => m.relatedObjectId === selectedObjectId);
  const hasCaliberChange = relatedMaterials.some((m) => m.caliberChanged);

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={14} className="text-copper" />
          <span className="text-sm font-semibold text-zinc-200">{light.name}</span>
          <CaliberChangeTag changed={hasCaliberChange} />
        </div>
        {showcase && (
          <p className="text-[11px] text-zinc-500">
            {showcase.name} · {showcase.zone}
          </p>
        )}
      </div>

      <div className="bg-zinc-900/60 rounded-md p-3 space-y-2.5">
        <h4 className="text-[11px] text-zinc-500 uppercase tracking-wider">灯光参数</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-800/50 rounded px-2.5 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Sun size={11} className="text-amber-500" />
              <span className="text-[10px] text-zinc-500">照度</span>
            </div>
            <span className="text-sm text-zinc-200 font-mono">
              {(light.intensity * 100).toFixed(0)}%
            </span>
          </div>
          <div className="bg-zinc-800/50 rounded px-2.5 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer size={11} className="text-blue-400" />
              <span className="text-[10px] text-zinc-500">色温</span>
            </div>
            <span className="text-sm text-zinc-200 font-mono">
              {light.colorTemp}K
            </span>
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded px-2.5 py-2">
          <span className="text-[10px] text-zinc-500">类型</span>
          <span className="text-xs text-zinc-300 ml-2">
            {light.type === "spot" ? "聚光灯" : light.type === "point" ? "点光源" : "环境光"}
          </span>
        </div>
        <div className="bg-zinc-800/50 rounded px-2.5 py-2">
          <span className="text-[10px] text-zinc-500">坐标</span>
          <span className="text-xs text-zinc-400 font-mono ml-2">
            ({light.position[0].toFixed(1)}, {light.position[1].toFixed(1)}, {light.position[2].toFixed(1)})
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] text-zinc-500 mb-2">关联材料 ({relatedMaterials.length})</h4>
        {relatedMaterials.length === 0 ? (
          <p className="text-[11px] text-zinc-600">暂无关联材料</p>
        ) : (
          <div className="space-y-1.5">
            {relatedMaterials.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center gap-2 bg-zinc-800/30 rounded px-2.5 py-1.5"
              >
                <span className="text-[11px] text-zinc-300 truncate flex-1">
                  {mat.title}
                </span>
                <CaliberChangeTag changed={mat.caliberChanged} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
