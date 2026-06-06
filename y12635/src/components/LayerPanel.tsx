import { useState } from "react";
import type { Layer } from "../types";
import {
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onToggleLayer: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onAddLayer: (name: string, color: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onSelectLayer: (layerId: string) => void;
}

const PRESET_COLORS = [
  "#1e40af",
  "#059669",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4b5563",
];

export function LayerPanel({
  layers,
  activeLayerId,
  onToggleLayer,
  onRemoveLayer,
  onAddLayer,
  onUpdateLayer,
  onSelectLayer,
}: LayerPanelProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("新图层");
  const [newColor, setNewColor] = useState(PRESET_COLORS[1]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = () => {
    const name = newName.trim() || "新图层";
    onAddLayer(name, newColor);
    setAdding(false);
    setNewName("新图层");
    setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  };

  const handleStartEdit = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleConfirmEdit = (layerId: string) => {
    const name = editingName.trim();
    if (name) {
      onUpdateLayer(layerId, { name });
    }
    setEditingId(null);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-700 rounded-full" />
          图层管理
        </h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-ghost !p-1.5"
            title="新建图层"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {layers.map((layer) => (
          <div
            key={layer.id}
            onClick={() => onSelectLayer(layer.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer",
              activeLayerId === layer.id
                ? "border-primary-300 bg-primary-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            )}
          >
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            {editingId === layer.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmEdit(layer.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            ) : (
              <span className="flex-1 text-sm text-slate-700 truncate">
                {layer.name}
              </span>
            )}

            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {editingId === layer.id ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmEdit(layer.id);
                    }}
                    className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                    title="确认"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                    title="取消"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLayer(layer.id);
                    }}
                    className={cn(
                      "p-1 rounded transition-colors",
                      layer.visible
                        ? "hover:bg-primary-100 text-primary-700"
                        : "hover:bg-slate-100 text-slate-400"
                    )}
                    title={layer.visible ? "隐藏图层" : "显示图层"}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(layer);
                    }}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                    title="重命名"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLayer(layer.id);
                    }}
                    className="p-1 rounded hover:bg-red-100 text-red-500"
                    title="删除图层"
                    disabled={layers.length <= 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {adding && (
          <div className="p-3 rounded-lg border border-dashed border-primary-300 bg-primary-50/50 space-y-2 animate-fade-in">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="图层名称"
              className="w-full text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full ring-2 ring-white shadow-sm transition-transform",
                    newColor === c ? "scale-125 ring-2 ring-slate-400" : ""
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                className="btn-primary !py-1 !px-3 text-xs flex-1"
              >
                添加
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="btn-secondary !py-1 !px-3 text-xs"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
