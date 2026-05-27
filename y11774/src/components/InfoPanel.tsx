import { X, Database, FileText, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock as ClockIcon } from 'lucide-react';
import { useAssetStore } from '@/store/useAssetStore';
import { getTopCorrelations } from '@/utils/correlation';
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  QUALITY_STATUS_LABELS,
  QUALITY_STATUS_COLORS,
  TIME_WINDOW_LABELS,
} from '@/types';

export default function InfoPanel() {
  const {
    selectedAssetId,
    assets,
    filteredEdges,
    filters,
    setSelectedAsset,
    setHighlightedSector,
    highlightedSector,
  } = useAssetStore();

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  if (!selectedAsset) {
    return (
      <div className="w-80 bg-gray-900/80 backdrop-blur-xl border-l border-gray-700/50 flex flex-col h-full">
        <div className="p-6 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Database className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">点击节点查看资产详情</p>
          </div>
        </div>
      </div>
    );
  }

  const topCorrelations = getTopCorrelations(selectedAsset.id, filteredEdges, 8);
  const relatedAssets = topCorrelations.map((c) => ({
    ...assets.find((a) => a.id === c.assetId)!,
    coefficient: c.coefficient,
    isPositive: c.isPositive,
  })).filter(Boolean);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="w-80 bg-gray-900/80 backdrop-blur-xl border-l border-gray-700/50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ASSET_TYPE_COLORS[selectedAsset.type] }}
            />
            <span className="text-xs text-gray-400">{ASSET_TYPE_LABELS[selectedAsset.type]}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">{selectedAsset.code}</h2>
          <p className="text-sm text-gray-400">{selectedAsset.name}</p>
        </div>
        <button
          onClick={() => setSelectedAsset(null)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            基本信息
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">行业分类</span>
              <button
                onClick={() => setHighlightedSector(highlightedSector === selectedAsset.sector ? null : selectedAsset.sector)}
                className="text-cyan-400 hover:underline"
              >
                {selectedAsset.sector}
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">数据质量</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${QUALITY_STATUS_COLORS[selectedAsset.qualityStatus]}20`,
                  color: QUALITY_STATUS_COLORS[selectedAsset.qualityStatus],
                }}
              >
                {QUALITY_STATUS_LABELS[selectedAsset.qualityStatus]}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">时间窗口</span>
              <span className="text-white">{TIME_WINDOW_LABELS[filters.timeWindow]}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            数据来源
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Database className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white">{selectedAsset.dataSource}</p>
                <p className="text-xs text-gray-500">数据源</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white">{selectedAsset.reportReference}</p>
                <p className="text-xs text-gray-500">研究报告</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            相关性排行 (Top 8)
          </h3>
          <div className="space-y-2">
            {relatedAssets.map((asset, index) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset.id)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: ASSET_TYPE_COLORS[asset.type] }}
                  />
                  <span className="text-sm text-white font-mono">{asset.code}</span>
                </div>
                <div className="flex items-center gap-1">
                  {asset.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span
                    className={`text-sm font-mono ${
                      asset.isPositive ? 'text-cyan-400' : 'text-red-400'
                    }`}
                  >
                    {asset.coefficient > 0 ? '+' : ''}{asset.coefficient.toFixed(3)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedAsset.correctionHistory.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              修正记录
            </h3>
            <div className="space-y-3">
              {selectedAsset.correctionHistory.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-cyan-400">{log.field}</span>
                    <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    <span className="text-red-400 line-through">{log.oldValue}</span>
                    <span className="mx-1">→</span>
                    <span className="text-green-400">{log.newValue}</span>
                  </div>
                  <p className="text-xs text-gray-500">{log.reason}</p>
                  <p className="text-xs text-gray-600 mt-1">操作人: {log.operator}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
