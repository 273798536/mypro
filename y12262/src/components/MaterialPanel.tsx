import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Material, GraphNode, RiskLevel } from '../types';
import {
  getMaterialSourceColor,
  getMaterialSourceText,
  getMaterialTypeText,
  getMaterialTypeIcon,
  formatTimestamp,
  getNodeTypeIcon,
  getRiskLevelText,
  getRiskLevelColor,
} from '../utils';
import { useGameStore } from '../store/gameStore';

interface MaterialPanelProps {
  materials: Material[];
  nodes: GraphNode[];
  nodeStates: Record<string, RiskLevel>;
}

type TabType = 'raw' | 'processed';

export function MaterialPanel({ materials, nodes, nodeStates }: MaterialPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('raw');
  const selectedNodeId = useGameStore((state) => state.selectedNodeId);
  const setSelectedNode = useGameStore((state) => state.setSelectedNode);

  const processedNodes = nodes.filter((node) => nodeStates[node.id] !== 'unknown');

  const filteredMaterials = selectedNodeId
    ? materials.filter((m) => m.targetNodeId === selectedNodeId)
    : materials;

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="h-full flex flex-col bg-slate-800 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('raw')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'raw'
              ? 'bg-slate-700 text-white border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          📋 原始材料
          <span className="ml-2 text-xs bg-slate-600 px-2 py-0.5 rounded-full">
            {materials.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('processed')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'processed'
              ? 'bg-slate-700 text-white border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          ✅ 处理结果
          <span className="ml-2 text-xs bg-slate-600 px-2 py-0.5 rounded-full">
            {processedNodes.length}/{nodes.length}
          </span>
        </button>
      </div>

      <div className="p-3 bg-slate-700/30 border-b border-slate-700">
        <p className="text-xs text-slate-400">
          {selectedNodeId
            ? `当前筛选：${getNodeById(selectedNodeId)?.name || ''} 的关联材料`
            : '点击图谱节点可筛选相关材料'}
        </p>
        {selectedNodeId && (
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            清除筛选
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'raw' ? (
            <motion.div
              key="raw"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-3 space-y-3"
            >
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-sm">暂无材料</p>
                </div>
              ) : (
                filteredMaterials.map((material) => {
                  const targetNode = getNodeById(material.targetNodeId);
                  return (
                    <motion.div
                      key={material.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer"
                      onClick={() => setSelectedNode(material.targetNodeId)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded text-white font-medium shrink-0 ${getMaterialSourceColor(
                            material.source
                          )}`}
                        >
                          {getMaterialSourceText(material.source)}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          {getMaterialTypeIcon(material.type)}
                          {getMaterialTypeText(material.type)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-200 mb-2 leading-relaxed">
                        {material.content}
                      </p>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {formatTimestamp(material.timestamp)}
                        </span>
                        {targetNode && (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-600 text-slate-300"
                            style={{
                              color: getRiskLevelColor(
                                nodeStates[targetNode.id] || 'unknown'
                              ),
                            }}
                          >
                            {getNodeTypeIcon(targetNode.type)}
                            {targetNode.name}
                            <span className="text-slate-400">
                              ({getRiskLevelText(nodeStates[targetNode.id] || 'unknown')})
                            </span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="processed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-3 space-y-2"
            >
              {nodes.map((node) => {
                const state = nodeStates[node.id] || 'unknown';
                const isProcessed = state !== 'unknown';

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isProcessed
                        ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 opacity-60'
                    }`}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shrink-0"
                        style={{
                          borderColor: getRiskLevelColor(state),
                          backgroundColor: `${getRiskLevelColor(state)}20`,
                        }}
                      >
                        {getNodeTypeIcon(node.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-white">
                            {node.name}
                          </span>
                          {isProcessed && (
                            <span
                              className="text-xs px-2 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: `${getRiskLevelColor(state)}30`,
                                color: getRiskLevelColor(state),
                              }}
                            >
                              {getRiskLevelText(state)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {node.description}
                        </p>
                      </div>
                      <div className="text-xl">
                        {isProcessed ? '✓' : '○'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
