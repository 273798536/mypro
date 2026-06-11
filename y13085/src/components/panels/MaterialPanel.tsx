import { useSceneStore } from "../../hooks/useSceneStore";
import { MATERIAL_TYPE_LABEL_MAP, STATUS_LABEL_MAP } from "../../data/types";
import CaliberChangeTag from "./CaliberChangeTag";
import { Camera, FileText, MessageSquare, RotateCcw } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  inspection_photo: <Camera size={14} />,
  retraction_record: <RotateCcw size={14} />,
  verbal_note: <MessageSquare size={14} />,
};

export default function MaterialPanel() {
  const { materials, selectedObjectId, setSelectedObjectId } = useSceneStore();

  const filteredMaterials = selectedObjectId
    ? materials.filter((m) => m.relatedObjectId === selectedObjectId)
    : materials;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800/60">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <FileText size={15} className="text-copper" />
          关联材料
          {selectedObjectId && (
            <span className="text-[11px] text-zinc-500">
              （已筛选当前对象）
            </span>
          )}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredMaterials.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-600 text-xs">
            点击三维对象查看关联材料
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="px-4 py-3 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                onClick={() => setSelectedObjectId(mat.relatedObjectId)}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-zinc-500">
                    {TYPE_ICONS[mat.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-200 truncate">
                        {mat.title}
                      </span>
                      <CaliberChangeTag changed={mat.caliberChanged} />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                      {mat.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-zinc-600">
                        {MATERIAL_TYPE_LABEL_MAP[mat.type]}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        导入: {mat.importedAt.slice(0, 16).replace("T", " ")}
                      </span>
                      {mat.modifiedAt !== mat.importedAt && (
                        <span className="text-[10px] text-amber-600">
                          修改: {mat.modifiedAt.slice(0, 16).replace("T", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
