import { useCallback, useRef, useState } from 'react';
import { FileDown, ArrowLeft, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../store/analysisStore';
import { exportReportToPDF, downloadPDF } from '../utils/pdfExport';

export function ReportPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { history, currentRecord } = useAnalysisStore();
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const record = id 
    ? history.find(r => r.id === id) 
    : currentRecord;

  const handleExportPDF = useCallback(async () => {
    if (!record) return;

    setIsExporting(true);
    try {
      const blob = await exportReportToPDF(record);
      const fileName = `多普勒分析报告_${record.source.fileName.replace(/\.[^/.]+$/, '')}_${Date.now()}.pdf`;
      downloadPDF(blob, fileName);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('导出PDF失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [record]);

  if (!record) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-dark-400 mb-4">未找到分析记录</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary-400 hover:text-primary-300"
          >
            返回工作台
          </button>
        </div>
      </div>
    );
  }

  const hasError = record.anomalies.some(a => a.severity === 'error');
  const hasWarning = record.anomalies.some(a => a.severity === 'warning');

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            导出 PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white">
            <h1 className="text-2xl font-bold mb-2">多普勒效应测速分析报告</h1>
            <p className="text-primary-100">
              生成时间: {new Date(record.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>

          <div className="p-8 space-y-8">
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                一、样本信息
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">文件名:</span>
                  <span className="ml-2 font-mono text-gray-800">{record.source.fileName}</span>
                </div>
                <div>
                  <span className="text-gray-500">文件大小:</span>
                  <span className="ml-2 text-gray-800">
                    {(record.source.fileSize / 1024).toFixed(2)} KB
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">音频时长:</span>
                  <span className="ml-2 text-gray-800">{record.source.duration.toFixed(2)} 秒</span>
                </div>
                <div>
                  <span className="text-gray-500">原始采样率:</span>
                  <span className="ml-2 font-mono text-gray-800">{record.source.sampleRate} Hz</span>
                </div>
                <div>
                  <span className="text-gray-500">导入来源:</span>
                  <span className="ml-2 text-gray-800">{record.source.importedFrom}</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                二、分析参数
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">基准频率:</span>
                  <span className="ml-2 font-mono text-gray-800">{record.parameters.baseFrequency} Hz</span>
                </div>
                <div>
                  <span className="text-gray-500">配置采样率:</span>
                  <span className="ml-2 font-mono text-gray-800">{record.parameters.sampleRate} Hz</span>
                </div>
                <div>
                  <span className="text-gray-500">移动方向:</span>
                  <span className="ml-2 text-gray-800">
                    {record.parameters.direction === 'approaching' ? '靠近观察者' : '远离观察者'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">噪声阈值:</span>
                  <span className="ml-2 text-gray-800">
                    {(record.parameters.noiseThreshold * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                三、计算结果
              </h2>
              <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">观测频率</p>
                    <p className="text-3xl font-bold font-mono text-gray-800">
                      {record.results.observedFrequency.toFixed(2)}
                      <span className="text-lg font-normal text-gray-500 ml-1">Hz</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">频率偏移</p>
                    <p className={`text-3xl font-bold font-mono ${
                      record.results.frequencyShift >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {record.results.frequencyShift >= 0 ? '+' : ''}
                      {record.results.frequencyShift.toFixed(2)}
                      <span className="text-lg font-normal text-gray-500 ml-1">Hz</span>
                    </p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 mb-1">计算速度</p>
                  <p className="text-4xl font-bold font-mono text-primary-600">
                    {record.results.velocity.toFixed(2)}
                    <span className="text-xl font-normal text-gray-500 ml-2">m/s</span>
                    <span className="text-lg text-gray-400 ml-3">
                      = {(record.results.velocity * 3.6).toFixed(2)} km/h
                    </span>
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    置信度: 
                    <span className={`ml-2 font-bold ${
                      record.results.confidence >= 80 ? 'text-green-600' :
                      record.results.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {record.results.confidence.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {record.anomalies.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  四、异常提示
                </h2>
                <div className="space-y-3">
                  {record.anomalies.map((anomaly, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        anomaly.severity === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`text-sm font-bold ${
                          anomaly.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {anomaly.severity === 'error' ? '[错误]' : '[警告]'}
                        </span>
                        <div>
                          <p className="text-gray-800">{anomaly.message}</p>
                          <p className="text-sm text-gray-500 mt-1">建议: {anomaly.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {record.corrections.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  五、修正记录
                </h2>
                <div className="space-y-2">
                  {record.corrections.map((corr, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      <span className="text-gray-400">
                        {new Date(corr.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                      <span className="mx-2">-</span>
                      <span>{corr.field}: </span>
                      <span className="font-mono">{String(corr.oldValue)}</span>
                      <span className="mx-1">→</span>
                      <span className="font-mono text-primary-600">{String(corr.newValue)}</span>
                      {corr.reason && (
                        <span className="text-gray-400 ml-2">({corr.reason})</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-400 border-t border-gray-200">
            声波多普勒测速系统 - 物理教学实验工具
          </div>
        </div>
      </div>
    </div>
  );
}
