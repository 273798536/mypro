import React, { useState } from 'react';
import {
  Save,
  FileText,
  GitCompare,
  Download,
  Share2,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers
} from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';
import { formatPercent, formatNumber, getStatusColor } from '../../utils/formatters';
import { generateComparisonReport, exportToJSON, exportToExcel } from '../../utils/exporters';
import type { Portfolio } from '../../types/portfolio';

interface BottomBarProps {
  selectedPortfolio: Portfolio | null;
}

export const BottomBar: React.FC<BottomBarProps> = ({ selectedPortfolio }) => {
  const {
    portfolios,
    assets,
    constraints,
    comparisonPortfolioIds,
    clearComparison
  } = useDataStore();

  const { sceneSettings } = useFilterStore();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [saveType, setSaveType] = useState<'snapshot' | 'plan'>('snapshot');

  const comparisonPortfolios = portfolios.filter(p => comparisonPortfolioIds.includes(p.id));

  const normalCount = portfolios.filter(p => p.status === 'normal').length;
  const warningCount = portfolios.filter(p => p.status === 'warning').length;
  const errorCount = portfolios.filter(p => p.status === 'error').length;

  const maxSharpe = Math.max(...portfolios.map(p => p.sharpeRatio));
  const bestPortfolio = portfolios.find(p => p.sharpeRatio === maxSharpe);

  const handleSavePlan = () => {
    if (planName.trim()) {
      const plan = {
        id: `plan-${Date.now()}`,
        name: planName.trim(),
        description: planDescription.trim(),
        type: saveType,
        portfolioIds: selectedPortfolio ? [selectedPortfolio.id] : comparisonPortfolioIds,
        filterSettings: sceneSettings,
        axisMapping: { x: sceneSettings.xAxis, y: sceneSettings.yAxis, z: sceneSettings.zAxis },
        createdAt: new Date().toISOString(),
        createdBy: '投顾团队'
      };
      const existingPlans = JSON.parse(localStorage.getItem('portfolioPlans') || '[]');
      existingPlans.push(plan);
      localStorage.setItem('portfolioPlans', JSON.stringify(existingPlans));
      setShowSaveModal(false);
      setPlanName('');
      setPlanDescription('');
    }
  };

  const handleExportComparison = () => {
    if (comparisonPortfolios.length >= 2) {
      generateComparisonReport(comparisonPortfolios, assets, constraints);
    }
  };

  return (
    <>
      <div className="h-14 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 flex items-center px-4 gap-4">
        <div className="flex items-center gap-2 pr-4 border-r border-slate-700/50">
          <span className="text-xs text-slate-500">共 {portfolios.length} 个组合</span>
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              {normalCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {warningCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-red-400">
              <XCircle className="w-3 h-3" />
              {errorCount}
            </span>
          </div>
        </div>

        {bestPortfolio && (
          <div className="flex items-center gap-2 pr-4 border-r border-slate-700/50">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500">最优夏普</span>
            <span className="text-sm font-bold text-amber-400">{formatNumber(maxSharpe, 3)}</span>
            <span className="text-xs text-slate-400">· {bestPortfolio.name}</span>
            <span className="text-xs text-green-400">{formatPercent(bestPortfolio.expectedReturn)}</span>
            <span className="text-xs text-slate-500">/</span>
            <span className="text-xs text-amber-400">{formatPercent(bestPortfolio.volatility)}</span>
          </div>
        )}

        {comparisonPortfolios.length > 0 && (
          <div className="flex items-center gap-2 pr-4 border-r border-slate-700/50">
            <GitCompare className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-500">对比组 ({comparisonPortfolios.length})</span>
            {comparisonPortfolios.map(p => (
              <span
                key={p.id}
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: `${getStatusColor(p.status)}15`,
                  color: getStatusColor(p.status)
                }}
              >
                {p.name}
              </span>
            ))}
            {comparisonPortfolios.length >= 2 && (
              <button
                onClick={handleExportComparison}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
              >
                <FileText className="w-3 h-3" />
                导出对比报告
              </button>
            )}
            <button
              onClick={clearComparison}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              清空
            </button>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToJSON(portfolios, assets, constraints)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700/50 text-slate-300 rounded-lg border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出 JSON
          </button>
          <button
            onClick={() => exportToExcel(portfolios, assets)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            导出 Excel
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!selectedPortfolio && comparisonPortfolioIds.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            保存方案
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-96 p-6 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              保存投资方案
            </h3>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">保存类型</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSaveType('snapshot')}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                    saveType === 'snapshot'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                  }`}
                >
                  快速快照
                </button>
                <button
                  onClick={() => setSaveType('plan')}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                    saveType === 'plan'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                  }`}
                >
                  正式方案
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">方案名称</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="输入方案名称..."
                className="w-full px-3 py-2 text-sm bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-slate-400 mb-1">方案说明（可选）</label>
              <textarea
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="记录方案背景、客户需求、特殊限制..."
                className="w-full px-3 py-2 text-sm bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                rows={3}
              />
            </div>

            {selectedPortfolio && (
              <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">将保存组合</p>
                <p className="text-sm text-slate-200">{selectedPortfolio.name}</p>
              </div>
            )}

            {comparisonPortfolioIds.length > 0 && !selectedPortfolio && (
              <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">将保存 {comparisonPortfolioIds.length} 个对比组合</p>
                <div className="flex flex-wrap gap-1">
                  {comparisonPortfolios.map(p => (
                    <span key={p.id} className="px-2 py-0.5 text-xs bg-slate-700/50 rounded text-slate-300">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 text-sm bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSavePlan}
                disabled={!planName.trim()}
                className="flex-1 py-2 text-sm bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
