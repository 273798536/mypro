import { useState } from 'react';
import {
  GitCompare,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Box,
  Layers,
  Edit3,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ErosionChart } from '../charts/ErosionChart';
import { comparePlans } from '../../utils/planManager';
import { formatVolume, formatTimestamp } from '../../data/mockData';
import { COLORS } from '../../types';

export function RightPanel() {
  const {
    viewMode,
    setViewMode,
    planHistory,
    currentPlan,
    comparePlan,
    loadPlan,
    deletePlan,
    updateFlowData,
    flowData,
    calculationResult,
    sections,
    selectedSectionId,
    setPlaying,
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({
    plans: true,
    flowEdit: false,
    charts: true,
  });

  const [editFlowIndex, setEditFlowIndex] = useState<number | null>(null);
  const [editFlowValue, setEditFlowValue] = useState('');

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sectionFlowData = flowData
    .filter(f => f.sectionId === selectedSectionId)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 20);

  const handleStartEditFlow = (index: number, currentValue: number) => {
    setEditFlowIndex(index);
    setEditFlowValue(currentValue.toString());
    setPlaying(false);
  };

  const handleSaveFlow = () => {
    if (editFlowIndex !== null && editFlowValue) {
      const sortedFlows = [...flowData]
        .filter(f => f.sectionId === selectedSectionId)
        .sort((a, b) => a.timestamp - b.timestamp);
      const globalIndex = flowData.findIndex(f => f.id === sortedFlows[editFlowIndex]?.id);
      if (globalIndex !== -1) {
        updateFlowData(globalIndex, parseFloat(editFlowValue));
      }
      setEditFlowIndex(null);
      setEditFlowValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditFlowIndex(null);
    setEditFlowValue('');
  };

  const comparison = currentPlan && comparePlan
    ? comparePlans(currentPlan, comparePlan)
    : null;

  return (
    <div className="w-96 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setViewMode('3d')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === '3d'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Box size={14} />
            3D视图
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'compare'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <GitCompare size={14} />
            方案对比
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'chart'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <BarChart3 size={14} />
            数据图表
          </button>
        </div>

        {viewMode === 'compare' && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="text-xs">
                <span className="text-slate-400">当前方案:</span>
                <span className="text-sky-400 ml-1 font-medium">
                  {currentPlan?.name || '未保存'}
                </span>
              </div>
              <div className="text-xs text-right">
                <span className="text-slate-400">对比方案:</span>
                <span className="text-amber-400 ml-1 font-medium">
                  {comparePlan?.name || '未选择'}
                </span>
              </div>
            </div>
            {comparison && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-slate-700/50 rounded">
                  <div className={`font-bold ${comparison.erosionDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {comparison.erosionDiff > 0 ? '+' : ''}{(comparison.erosionDiff / 10000).toFixed(2)}
                  </div>
                  <div className="text-slate-400">冲刷差(万m³)</div>
                </div>
                <div className="text-center p-2 bg-slate-700/50 rounded">
                  <div className={`font-bold ${comparison.depositionDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {comparison.depositionDiff > 0 ? '+' : ''}{(comparison.depositionDiff / 10000).toFixed(2)}
                  </div>
                  <div className="text-slate-400">淤积差(万m³)</div>
                </div>
                <div className="text-center p-2 bg-slate-700/50 rounded">
                  <div className={`font-bold ${comparison.netDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {comparison.netDiff > 0 ? '+' : ''}{(comparison.netDiff / 10000).toFixed(2)}
                  </div>
                  <div className="text-slate-400">净差(万m³)</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => toggleSection('plans')}
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              方案历史 ({planHistory.length})
            </h3>
            {expandedSections.plans ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronRight size={16} className="text-slate-400" />
            )}
          </div>

          {expandedSections.plans && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {planHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  暂无保存的方案
                </p>
              ) : (
                planHistory.slice().reverse().map((plan) => {
                  const isCurrent = currentPlan?.id === plan.id;
                  const isCompare = comparePlan?.id === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`p-2 rounded border transition-all ${
                        isCurrent
                          ? 'bg-sky-500/10 border-sky-500/50'
                          : isCompare
                          ? 'bg-amber-500/10 border-amber-500/50'
                          : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          isCurrent ? 'text-sky-400' : isCompare ? 'text-amber-400' : 'text-slate-200'
                        }`}>
                          {plan.name}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => loadPlan(plan.id, false)}
                            className={`p-1 rounded ${
                              isCurrent
                                ? 'bg-sky-500/30 text-sky-400'
                                : 'hover:bg-slate-600 text-slate-400 hover:text-white'
                            }`}
                            title="加载为当前方案"
                          >
                            {isCurrent ? <Check size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => loadPlan(plan.id, true)}
                            className={`p-1 rounded ${
                              isCompare
                                ? 'bg-amber-500/30 text-amber-400'
                                : 'hover:bg-slate-600 text-slate-400 hover:text-white'
                            }`}
                            title="设为对比方案"
                          >
                            <GitCompare size={12} />
                          </button>
                          <button
                            onClick={() => deletePlan(plan.id)}
                            className="p-1 rounded hover:bg-red-500/30 text-slate-400 hover:text-red-400"
                            title="删除方案"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>
                          冲刷 {(plan.resultData.erosionVolume / 10000).toFixed(2)}万m³
                        </span>
                        <span>
                          淤积 {(plan.resultData.depositionVolume / 10000).toFixed(2)}万m³
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {formatTimestamp(plan.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => toggleSection('flowEdit')}
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Edit3 size={16} className="text-sky-400" />
              流量数据编辑
              {selectedSectionId && (
                <span className="text-xs text-slate-400 font-normal">
                  - {sections.find(s => s.id === selectedSectionId)?.name}
                </span>
              )}
            </h3>
            {expandedSections.flowEdit ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronRight size={16} className="text-slate-400" />
            )}
          </div>

          {expandedSections.flowEdit && (
            <div>
              <p className="text-xs text-slate-400 mb-3">
                点击流量值进行修改，修改后系统会自动重新计算并保留新旧结果对比
              </p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {sectionFlowData.map((flow, idx) => (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between text-xs p-2 hover:bg-slate-700/50 rounded"
                  >
                    <span className="text-slate-400 font-mono">
                      {formatTimestamp(flow.timestamp)}
                    </span>
                    {editFlowIndex === idx ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editFlowValue}
                          onChange={(e) => setEditFlowValue(e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-700 border border-sky-500 rounded text-white text-xs font-mono focus:outline-none"
                          step="0.1"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveFlow}
                          className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditFlow(idx, flow.flow)}
                        className="text-sky-400 font-mono hover:text-sky-300 hover:underline"
                      >
                        {flow.flow.toFixed(1)} m³/s
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                验收测试：修改任意流量数据，观察新旧方案冲淤结果的差异
              </p>
            </div>
          )}
        </div>

        {expandedSections.charts && (
          <ErosionChart compareMode={viewMode === 'compare'} />
        )}
      </div>
    </div>
  );
}
