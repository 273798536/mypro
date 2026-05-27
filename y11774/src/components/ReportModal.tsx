import { X, Download, Image, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { useAssetStore } from '@/store/useAssetStore';
import { generateReportContent, downloadTextFile, downloadImage } from '@/utils/export';
import { QUALITY_STATUS_COLORS, QUALITY_STATUS_LABELS } from '@/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl: string | null;
}

export default function ReportModal({ isOpen, onClose, screenshotUrl }: ReportModalProps) {
  const { filteredAssets, filteredEdges, dataQualityReport } = useAssetStore();

  if (!isOpen) return null;

  const qualityData = dataQualityReport
    ? [
        { name: QUALITY_STATUS_LABELS.raw, value: dataQualityReport.rawCount },
        { name: QUALITY_STATUS_LABELS.corrected, value: dataQualityReport.correctedCount },
        { name: QUALITY_STATUS_LABELS.pending_review, value: dataQualityReport.pendingReviewCount },
      ]
    : [];

  const COLORS = [
    QUALITY_STATUS_COLORS.raw,
    QUALITY_STATUS_COLORS.corrected,
    QUALITY_STATUS_COLORS.pending_review,
  ];

  const handleExportReport = () => {
    const content = generateReportContent(filteredAssets, filteredEdges, dataQualityReport);
    const filename = `资产相关性报告_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadTextFile(content, filename);
  };

  const handleDownloadScreenshot = () => {
    if (screenshotUrl) {
      const filename = `资产相关性截图_${new Date().toISOString().slice(0, 10)}.png`;
      downloadImage(screenshotUrl, filename);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">资产相关性分析报告</h2>
              <p className="text-sm text-gray-400">生成时间: {new Date().toLocaleString('zh-CN')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">数据概览</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{filteredAssets.length}</p>
                  <p className="text-xs text-gray-500">资产节点数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{filteredEdges.length}</p>
                  <p className="text-xs text-gray-500">相关性边数</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">数据质量状态</h3>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px' }}
                      formatter={(value) => <span className="text-gray-400">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">数据质量检测</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                {dataQualityReport?.isSymmetric ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm text-white">相关矩阵对称性</p>
                  <p className="text-xs text-gray-500">
                    {dataQualityReport?.isSymmetric
                      ? '矩阵对称，数据一致性良好'
                      : `存在 ${dataQualityReport?.asymmetricPairs.length || 0} 对不对称数据`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                {dataQualityReport && dataQualityReport.timeWindowErrors.length === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm text-white">时间窗口完整性</p>
                  <p className="text-xs text-gray-500">
                    {dataQualityReport && dataQualityReport.timeWindowErrors.length === 0
                      ? '所有时间窗口数据完整'
                      : `存在 ${dataQualityReport?.timeWindowErrors.length || 0} 个异常`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                {dataQualityReport?.isOverDense ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm text-white">节点密度</p>
                  <p className="text-xs text-gray-500">
                    当前密度: {((dataQualityReport?.nodeDensity || 0) * 100).toFixed(1)}%
                    {dataQualityReport?.isOverDense && ' - 建议增加筛选阈值'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {screenshotUrl && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">截图预览</h3>
              <div className="rounded-xl overflow-hidden border border-gray-700/50">
                <img
                  src={screenshotUrl}
                  alt="星云截图"
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700/50">
          {screenshotUrl && (
            <button
              onClick={handleDownloadScreenshot}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Image className="w-4 h-4" />
              <span>下载截图</span>
            </button>
          )}
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>导出完整报告</span>
          </button>
        </div>
      </div>
    </div>
  );
}
