import { AlertTriangle, CheckCircle, Database, Layers } from 'lucide-react';
import { useAssetStore } from '@/store/useAssetStore';
import { getQualityWarnings } from '@/utils/dataQuality';
import { QUALITY_STATUS_COLORS, QUALITY_STATUS_LABELS } from '@/types';

export default function StatusBar() {
  const { filteredAssets, filteredEdges, dataQualityReport } = useAssetStore();

  const warnings = dataQualityReport ? getQualityWarnings(dataQualityReport) : [];
  const hasErrors = warnings.length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="mx-4 mb-4 bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
        {warnings.length > 0 && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm text-amber-400 font-medium">数据质量警告</p>
                <div className="space-y-0.5 mt-1">
                  {warnings.slice(0, 2).map((warning, index) => (
                    <p key={index} className="text-xs text-amber-300/80 truncate">
                      {warning}
                    </p>
                  ))}
                  {warnings.length > 2 && (
                    <p className="text-xs text-amber-400/60">
                      还有 {warnings.length - 2} 项警告...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">
                  资产节点: <span className="text-white font-mono">{filteredAssets.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">
                  相关性边: <span className="text-white font-mono">{filteredEdges.length}</span>
                </span>
              </div>
              {dataQualityReport && (
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dataQualityReport.isSymmetric ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="text-sm text-gray-300">
                    矩阵对称:{' '}
                    <span
                      className={`font-medium ${
                        dataQualityReport.isSymmetric ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {dataQualityReport.isSymmetric ? '是' : '否'}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {dataQualityReport && (
                <>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: QUALITY_STATUS_COLORS.raw }}
                    />
                    <span className="text-xs text-gray-400">
                      {QUALITY_STATUS_LABELS.raw}:{' '}
                      <span className="text-white font-mono">{dataQualityReport.rawCount}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: QUALITY_STATUS_COLORS.corrected }}
                    />
                    <span className="text-xs text-gray-400">
                      {QUALITY_STATUS_LABELS.corrected}:{' '}
                      <span className="text-white font-mono">
                        {dataQualityReport.correctedCount}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: QUALITY_STATUS_COLORS.pending_review }}
                    />
                    <span className="text-xs text-gray-400">
                      {QUALITY_STATUS_LABELS.pending_review}:{' '}
                      <span className="text-white font-mono">
                        {dataQualityReport.pendingReviewCount}
                      </span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
