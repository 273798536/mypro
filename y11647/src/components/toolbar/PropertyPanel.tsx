import { useTacticsStore } from '../../store/useTacticsStore';
import type { Robot, Obstacle, PassPoint, Ball } from '../../engine/types';
import { Trash2, Route } from 'lucide-react';

export function PropertyPanel() {
  const { scheme, selectedElementId, updateElement, deleteElement, startPath, collisionWarnings } =
    useTacticsStore();

  const selectedElement = scheme.elements.find((e) => e.id === selectedElementId);

  if (!selectedElement) {
    return (
      <div className="p-4 bg-slate-800 rounded-xl shadow-xl">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">属性面板</h3>
        <p className="text-sm text-slate-500">选择一个元素以编辑属性</p>

        {collisionWarnings.length > 0 && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <h4 className="text-sm font-semibold text-red-400 mb-2">
              ⚠️ 碰撞警告 ({collisionWarnings.length})
            </h4>
            {collisionWarnings.map((warning, i) => (
              <p key={i} className="text-xs text-red-300 mb-1">
                • {warning.message}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  const elementWarnings = collisionWarnings.filter((w) =>
    w.elementIds.includes(selectedElement.id)
  );

  return (
    <div className="p-4 bg-slate-800 rounded-xl shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400">属性面板</h3>
        <button
          onClick={() => deleteElement(selectedElement.id)}
          className="p-1.5 rounded-lg hover:bg-red-600/20 text-red-400 transition-colors"
          title="删除元素"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">名称</label>
          <input
            type="text"
            value={selectedElement.label}
            onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">X 坐标</label>
            <input
              type="number"
              value={Math.round(selectedElement.position.x)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  position: { ...selectedElement.position, x: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Y 坐标</label>
            <input
              type="number"
              value={Math.round(selectedElement.position.y)}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  position: { ...selectedElement.position, y: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {selectedElement.type === 'robot' && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                能量: {(selectedElement as Robot).energy} / {(selectedElement as Robot).maxEnergy}
              </label>
              <input
                type="range"
                min="0"
                max={(selectedElement as Robot).maxEnergy}
                value={(selectedElement as Robot).energy}
                onChange={(e) =>
                  updateElement(selectedElement.id, { energy: Number(e.target.value) })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">颜色</label>
              <input
                type="color"
                value={selectedElement.color}
                onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
              />
            </div>

            <button
              onClick={() => startPath(selectedElement.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
            >
              <Route className="w-4 h-4" />
              绘制移动路径
            </button>
          </>
        )}

        {selectedElement.type === 'obstacle' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">宽度</label>
              <input
                type="number"
                min="20"
                max="200"
                value={(selectedElement as Obstacle).width}
                onChange={(e) =>
                  updateElement(selectedElement.id, { width: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">高度</label>
              <input
                type="number"
                min="20"
                max="200"
                value={(selectedElement as Obstacle).height}
                onChange={(e) =>
                  updateElement(selectedElement.id, { height: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {selectedElement.type === 'passPoint' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">关联球ID</label>
            <input
              type="text"
              value={(selectedElement as PassPoint).targetId || ''}
              onChange={(e) =>
                updateElement(selectedElement.id, { targetId: e.target.value || undefined })
              }
              placeholder="输入球的元素ID"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              球的ID: {scheme.elements.find((e) => e.type === 'ball')?.id || '未放置球'}
            </p>
            {(selectedElement.position.x < 0 || selectedElement.position.x > 900 ||
              selectedElement.position.y < 0 || selectedElement.position.y > 600) && (
              <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 rounded text-xs text-red-300">
                ⚠️ 传球点在场外！机器人向此处传球时球将越界出界
              </div>
            )}
          </div>
        )}

        {selectedElement.type === 'ball' && (
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-300">
              球ID: <span className="font-mono text-sky-400">{selectedElement.id}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              将此ID填入传球点的"关联球ID"字段，机器人到达终点时会自动传球
            </p>
          </div>
        )}

        {elementWarnings.length > 0 && (
          <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ 警告</h4>
            {elementWarnings.map((warning, i) => (
              <p key={i} className="text-xs text-red-300">
                • {warning.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
