import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { presetScenes } from '../data/presetScenes';
import { Scene } from '../types/game';

const Config: React.FC = () => {
  const navigate = useNavigate();
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [showSourceInfo, setShowSourceInfo] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">场景配置</h1>
              <p className="text-xs text-slate-400">管理和查看游戏场景</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">预置场景</h3>
              <div className="space-y-2">
                {presetScenes.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedScene?.id === scene.id
                        ? 'bg-orange-600/30 border border-orange-500'
                        : 'bg-slate-700 hover:bg-slate-600 border border-transparent'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">{scene.name}</div>
                    <div className="text-xs text-slate-400">{scene.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedScene ? (
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedScene.name}</h2>
                    <p className="text-slate-400 mt-1">{selectedScene.description}</p>
                  </div>
                  <button
                    onClick={() => setShowSourceInfo(selectedScene.source)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
                  >
                    <Info className="w-4 h-4" />
                    来源
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{selectedScene.robots.length}</div>
                    <div className="text-xs text-slate-400">机器人</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">{selectedScene.shelves.length}</div>
                    <div className="text-xs text-slate-400">货架</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400">{selectedScene.orders.length}</div>
                    <div className="text-xs text-slate-400">订单</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white mb-3">机器人列表</h3>
                  <div className="space-y-2">
                    {selectedScene.robots.map((robot) => (
                      <div key={robot.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{robot.name}</div>
                          <div className="text-xs text-slate-400">位置: ({robot.position.x}, {robot.position.y}) | 电量: {robot.battery}%</div>
                        </div>
                        <button
                          onClick={() => setShowSourceInfo(robot.source)}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          来源
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white mb-3">货架列表</h3>
                  <div className="space-y-2">
                    {selectedScene.shelves.map((shelf) => (
                      <div key={shelf.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{shelf.name}</div>
                          <div className="text-xs text-slate-400">商品: {shelf.goodsType} | 库存: {shelf.stock}</div>
                        </div>
                        <button
                          onClick={() => setShowSourceInfo(shelf.source)}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          来源
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white mb-3">订单列表</h3>
                  <div className="space-y-2">
                    {selectedScene.orders.map((order) => (
                      <div key={order.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{order.name}</div>
                          <div className="text-xs text-slate-400">商品: {order.goodsType} | 奖励: {order.reward} | 截止: {order.deadline}</div>
                        </div>
                        <button
                          onClick={() => setShowSourceInfo(order.source)}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          来源
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">选择一个场景</h3>
                <p className="text-slate-400">从左侧列表选择场景查看详情</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showSourceInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSourceInfo(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">来源信息</h3>
            <p className="text-slate-300">{showSourceInfo}</p>
            <button
              onClick={() => setShowSourceInfo(null)}
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Config;
