import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import RailwayView from './RailwayView';
import NodePanel from './NodePanel';
import SourcePanel from './SourcePanel';
import ErrorPanel from './ErrorPanel';

const GameBoard = () => {
  const {
    bonds,
    coupons,
    railwayNodes,
    currentNodeIndex,
    errors,
    playerName
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'node' | 'sources' | 'errors'>('node');

  const bond = bonds[0];
  const currentNode = railwayNodes[currentNodeIndex];
  const currentCoupon = currentNode?.couponId 
    ? coupons.find(c => c.id === currentNode.couponId) 
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-rail-card rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rail-info/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{bond?.name}</h3>
              <p className="text-gray-400 text-sm">代码: {bond?.code} | 玩家: {playerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-gray-400">票面利率</p>
              <p className="text-white font-bold">{bond?.couponRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">面值</p>
              <p className="text-white font-bold">{bond?.faceValue ? (bond.faceValue / 100000000).toFixed(2) : 0}亿</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">进度</p>
              <p className="text-white font-bold">{currentNodeIndex + 1}/{railwayNodes.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-rail-card rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">现金流铁路</h3>
        <RailwayView />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-rail-card rounded-xl border border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('node')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'node'
                    ? 'bg-rail-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                当前节点
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'sources'
                    ? 'bg-rail-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                数据来源
              </button>
              <button
                onClick={() => setActiveTab('errors')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'errors'
                    ? 'bg-rail-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                错误记录
                {errors.length > 0 && (
                  <span className="absolute top-2 right-4 w-5 h-5 bg-rail-danger rounded-full text-xs flex items-center justify-center text-white">
                    {errors.length}
                  </span>
                )}
              </button>
            </div>
            <div className="p-6">
              {activeTab === 'node' && (
                <NodePanel node={currentNode} coupon={currentCoupon} />
              )}
              {activeTab === 'sources' && <SourcePanel />}
              {activeTab === 'errors' && <ErrorPanel />}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-rail-card rounded-xl p-4 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">操作提示</h4>
            <div className="text-sm text-gray-400 space-y-2">
              <p>• 点击"处理"按钮处理当前节点</p>
              <p>• 注意识别票息顺延情况</p>
              <p>• 回售岔道口需要做出选择</p>
              <p>• 违约隧道需要正确判定</p>
            </div>
          </div>

          <div className="bg-rail-card rounded-xl p-4 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">图例说明</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-rail-success rounded-full"></span>
                <span className="text-gray-300">已完成</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-rail-info rounded-full animate-pulse"></span>
                <span className="text-gray-300">进行中</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-500 rounded-full"></span>
                <span className="text-gray-300">待处理</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-rail-danger rounded-full"></span>
                <span className="text-gray-300">失败</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
