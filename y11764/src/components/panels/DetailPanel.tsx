import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  GitCompare,
  Save,
  FileText,
  History,
  Edit3,
  Wrench
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useDataStore } from '../../store/useDataStore';
import type { Portfolio } from '../../types/portfolio';
import {
  formatPercent,
  formatNumber,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getSharpeRating,
  getAnomalyTypeLabel
} from '../../utils/formatters';
import { fixWeightSum } from '../../engine/validation';
import { generatePDFReport } from '../../utils/exporters';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface DetailPanelProps {
  portfolio: Portfolio | null;
  hoveredPortfolio: Portfolio | null;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  portfolio,
  hoveredPortfolio
}) => {
  const {
    assets,
    constraints,
    versionHistory,
    toggleComparison,
    comparisonPortfolioIds,
    updatePortfolio,
    savePortfolioVersion
  } = useDataStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [versionNote, setVersionNote] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const displayPortfolio = portfolio || hoveredPortfolio;

  if (!displayPortfolio) {
    return (
      <div className="w-80 h-full p-4 flex flex-col items-center justify-center text-slate-500">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-sm text-center">
          点击或悬停在3D场景中的组合点<br />查看详细信息
        </p>
        {hoveredPortfolio && (
          <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-xs text-slate-400">当前悬停</p>
            <p className="text-sm text-slate-200">{hoveredPortfolio.name}</p>
          </div>
        )}
      </div>
    );
  }

  const p = displayPortfolio;
  const isSelected = portfolio !== null;
  const isInComparison = comparisonPortfolioIds.includes(p.id);
  const sharpeRating = getSharpeRating(p.sharpeRatio);

  const portfolioVersionHistory = versionHistory.filter(v => v.portfolioId === p.id);

  const weightData = {
    labels: Object.entries(p.weights)
      .filter(([_, w]) => w > 0.001)
      .map(([id]) => assets.find(a => a.id === id)?.name || id),
    datasets: [{
      data: Object.entries(p.weights)
        .filter(([_, w]) => w > 0.001)
        .map(([_, w]) => w * 100),
      backgroundColor: [
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16'
      ],
      borderWidth: 0
    }]
  };

  const riskContributionData = p.riskContributions ? {
    labels: Object.entries(p.riskContributions)
      .filter(([_, rc]) => rc > 0.001)
      .map(([id]) => assets.find(a => a.id === id)?.name || id),
    datasets: [{
      label: '风险贡献度',
      data: Object.entries(p.riskContributions)
        .filter(([_, rc]) => rc > 0.001)
        .map(([_, rc]) => rc * 100),
      backgroundColor: '#3b82f6',
      borderRadius: 4
    }]
  } : null;

  const handleFixWeights = () => {
    const fixed = fixWeightSum(p);
    updatePortfolio(p.id, fixed);
  };

  const handleSaveVersion = () => {
    if (versionNote.trim()) {
      savePortfolioVersion(p.id, versionNote.trim(), '投顾团队');
      setVersionNote('');
    }
  };

  const handleRename = () => {
    if (editName.trim()) {
      updatePortfolio(p.id, { name: editName.trim() });
      setIsEditing(false);
    }
  };

  const handleExportPDF = () => {
    generatePDFReport(p, assets, constraints);
  };

  return (
    <div className="w-80 h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 text-sm bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-100 flex-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                {p.name}
              </h2>
              <button
                onClick={() => { setEditName(p.name); setIsEditing(true); }}
                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded"
                disabled={!isSelected}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1`}
            style={{
              backgroundColor: `${getStatusColor(p.status)}20`,
              color: getStatusColor(p.status)
            }}
          >
            {p.status === 'error' ? (
              <XCircle className="w-3 h-3" />
            ) : p.status === 'warning' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            {getStatusLabel(p.status)}
          </span>
          <span className="text-xs text-slate-500">
            {p.source} · v{p.version}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">预期收益</div>
            <div className="text-lg font-bold text-green-400">
              {formatPercent(p.expectedReturn)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">波动率</div>
            <div className="text-lg font-bold text-amber-400">
              {formatPercent(p.volatility)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">最大回撤</div>
            <div className="text-lg font-bold text-red-400">
              {formatPercent(p.maxDrawdown)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">夏普比率</div>
            <div className="text-lg font-bold" style={{ color: sharpeRating.color }}>
              {formatNumber(p.sharpeRatio, 3)}
            </div>
            <div className="text-xs" style={{ color: sharpeRating.color }}>
              {sharpeRating.label}
            </div>
          </div>
        </div>
      </div>

      {p.anomalies.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border" style={{
          backgroundColor: p.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          borderColor: p.status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{
              color: p.status === 'error' ? '#ef4444' : '#f59e0b'
            }} />
            <span className="text-sm font-medium" style={{
              color: p.status === 'error' ? '#ef4444' : '#f59e0b'
            }}>
              检测到 {p.anomalies.length} 个异常
            </span>
          </div>
          <div className="space-y-2">
            {p.anomalies.map((anomaly, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span style={{
                    color: anomaly.severity === 'error' ? '#ef4444' : '#f59e0b'
                  }}>
                    {getAnomalyTypeLabel(anomaly.type)}
                  </span>
                  {anomaly.type === 'weight_sum' && isSelected && (
                    <button
                      onClick={handleFixWeights}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30"
                    >
                      <Wrench className="w-3 h-3" />
                      一键修正
                    </button>
                  )}
                </div>
                <p className="text-slate-400">{anomaly.message}</p>
                {anomaly.type === 'weight_sum' && (
                  <div className="mt-1 p-2 rounded bg-slate-900/50 font-mono text-xs">
                    当前值: <span className="text-red-400">{anomaly.details.weightSum.toFixed(4)}</span>
                    {' / '}
                    期望值: <span className="text-green-400">1.0000</span>
                    {' / '}
                    偏差: <span className="text-amber-400">{(anomaly.details.diff * 100).toFixed(2)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isSelected && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => toggleComparison(p.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors ${
              isInComparison
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-600/50'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {isInComparison ? '取消对比' : '加入对比'}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
          >
            <FileText className="w-4 h-4" />
            导出报告
          </button>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-200 mb-3">资产权重配置</h3>
        <div className="h-48 mb-3">
          <Doughnut
            data={weightData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right' as const,
                  labels: {
                    color: '#94a3b8',
                    font: { size: 10 },
                    padding: 8
                  }
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(2)}%`
                  }
                }
              }
            }}
          />
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {Object.entries(p.weights)
            .filter(([_, w]) => w > 0.001)
            .sort((a, b) => b[1] - a[1])
            .map(([assetId, weight]) => {
              const asset = assets.find(a => a.id === assetId);
              return (
                <div key={assetId} className="flex items-center justify-between py-1 text-xs border-b border-slate-700/50">
                  <span className="text-slate-300 flex-1 truncate">
                    {asset?.name || assetId}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${weight * 100}%`,
                          backgroundColor: asset?.category === '股票' ? '#3b82f6' :
                            asset?.category === '债券' ? '#10b981' :
                            asset?.category === '商品' ? '#f59e0b' : '#8b5cf6'
                        }}
                      />
                    </div>
                    <span className="text-slate-400 w-12 text-right">
                      {formatPercent(weight)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {riskContributionData && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-200 mb-3">风险贡献分析</h3>
          <div className="h-40 mb-3">
            <Bar
              data={riskContributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y' as const,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `贡献度: ${ctx.parsed.x.toFixed(2)}%`
                    }
                  }
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#64748b', font: { size: 9 } }
                  },
                  y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 9 } }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {isSelected && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-200 mb-3">
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center gap-2 w-full"
            >
              <History className="w-4 h-4 text-amber-400" />
              版本历史
              <span className="text-xs text-slate-500">({portfolioVersionHistory.length})</span>
            </button>
          </h3>
          {showVersionHistory && (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {portfolioVersionHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">暂无版本记录</p>
              ) : (
                portfolioVersionHistory.map((version) => (
                  <div key={version.id} className="relative pl-4 pb-3 border-l border-slate-700">
                    <div className="absolute left-0 top-0 w-2 h-2 rounded-full -translate-x-1/2 bg-amber-400" />
                    <div className="text-xs text-slate-400 mb-1">
                      {formatDate(version.timestamp)} · {version.modifiedBy}
                    </div>
                    <p className="text-sm text-slate-200">{version.changeDescription}</p>
                  </div>
                ))
              )}
              <div className="mt-2">
                <textarea
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="记录本次修改内容..."
                  className="w-full px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSaveVersion}
                  disabled={!versionNote.trim()}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  保存版本
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="text-xs text-slate-500 mb-1">创建时间</div>
        <div className="text-sm text-slate-300 mb-2">{formatDate(p.createdAt)}</div>
        <div className="text-xs text-slate-500 mb-1">更新时间</div>
        <div className="text-sm text-slate-300">{formatDate(p.updatedAt)}</div>
      </div>
    </div>
  );
};
