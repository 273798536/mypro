import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatchStore } from '@/stores/useBatchStore';
import { ExportService } from '@/services/exportService';
import type { ExportFormat } from '@/types';
import { formatTimestamp, formatDateForFileName } from '@/utils/helpers';
import {
  ArrowLeft,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Info,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
} from 'lucide-react';

export function ExportPage() {
  const navigate = useNavigate();
  const { currentBatch, devices, getReport } = useBatchStore();
  const report = getReport();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);

  const formats: Array<{
    id: ExportFormat;
    name: string;
    icon: typeof FileText;
    description: string;
    color: string;
  }> = [
    {
      id: 'pdf',
      name: 'HTML 报告',
      icon: FileText,
      description: '完整报告，包含图表、异常详情和操作记录，可直接用浏览器打开',
      color: '#e74c3c',
    },
    {
      id: 'csv',
      name: 'CSV 数据',
      icon: FileSpreadsheet,
      description: '设备清单数据，可用 Excel 打开进行进一步分析',
      color: '#2ecc71',
    },
    {
      id: 'json',
      name: 'JSON 完整数据',
      icon: FileJson,
      description: '包含完整批处理记录，用于数据备份和二次开发',
      color: '#3498db',
    },
  ];

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);

    try {
      const fileName = ExportService.generateFileName(
        format === 'pdf' ? '报告' : format === 'csv' ? '数据' : '完整数据',
        currentBatch.runId
      );

      let blob: Blob;

      switch (format) {
        case 'pdf':
          blob = await ExportService.exportPDF(report);
          break;
        case 'csv':
          blob = ExportService.exportCSV(devices);
          break;
        case 'json':
          blob = ExportService.exportJSON(currentBatch, devices);
          break;
      }

      ExportService.download(blob, fileName, format);

      setTimeout(() => setExporting(null), 500);
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(null);
    }
  };

  const getPreviewFileName = (format: ExportFormat) => {
    const type = format === 'pdf' ? '报告' : format === 'csv' ? '数据' : '完整数据';
    const ext = format === 'pdf' ? 'html' : format;
    return `工地安全风险_${type}_${currentBatch.runId}_${formatDateForFileName()}.${ext}`;
  };

  const flipDevices = devices.filter((d) => d.coordinateFlip);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
          导出中心
        </h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Info size={18} className="text-[#1e3a5f]" />
            当前运行信息
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">运行编号</div>
              <div className="font-mono text-sm text-[#1e3a5f] bg-gray-50 px-3 py-2 rounded">
                {currentBatch.runId}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">操作人</div>
              <div className="font-medium text-gray-800">{currentBatch.operator}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">操作记录</div>
              <div className="font-medium text-gray-800">
                {currentBatch.currentIndex + 1} 条操作
              </div>
            </div>
          </div>
        </div>

        {flipDevices.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-6">
            <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} />
              坐标异常说明
            </h2>
            <p className="text-sm text-amber-700 mb-4">
              以下设备存在坐标异常，导出文件中已包含详细的自然语言说明，便于非技术人员理解：
            </p>
            <div className="space-y-2">
              {flipDevices.map((device) => (
                <div
                  key={device.id}
                  className="p-3 bg-white rounded-lg border border-amber-200"
                >
                  <div className="font-medium text-amber-800 text-sm">
                    {device.name}
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    {device.coordinateFlip?.reason}
                  </div>
                  <div className="text-xs text-amber-500 mt-1 font-mono">
                    原始: {device.coordinateFlip?.originalX.toFixed(4)},{' '}
                    {device.coordinateFlip?.originalY.toFixed(4)} → 修正:{' '}
                    {device.coordinateFlip?.correctedX.toFixed(4)},{' '}
                    {device.coordinateFlip?.correctedY.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Download size={18} />
            选择导出格式
          </h2>

          {formats.map((format) => (
            <div
              key={format.id}
              className={`bg-white rounded-xl border-2 p-6 transition-all ${
                previewFormat === format.id
                  ? 'border-[#1e3a5f] bg-blue-50/30'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onMouseEnter={() => setPreviewFormat(format.id)}
              onMouseLeave={() => setPreviewFormat(null)}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: format.color + '20', color: format.color }}
                >
                  <format.icon size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{format.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{format.description}</p>

                  {previewFormat === format.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Eye size={12} />
                        文件名预览
                      </div>
                      <div className="font-mono text-sm text-[#1e3a5f]">
                        {getPreviewFileName(format.id)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleExport(format.id)}
                    disabled={exporting !== null}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      exporting === format.id
                        ? 'bg-gray-200 text-gray-400 cursor-wait'
                        : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a7a]'
                    }`}
                  >
                    {exporting === format.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        导出
                      </>
                    )}
                  </button>
                  {exporting === format.id && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      开始下载
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Info size={18} className="text-[#1e3a5f]" />
            导出说明
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </div>
              <div>
                <strong>文件名区分运行</strong>
                <p className="text-gray-500 mt-0.5">
                  每个导出文件都包含运行ID和时间戳，可清晰区分不同时间的导出结果，避免文件覆盖。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </div>
              <div>
                <strong>坐标异常易读说明</strong>
                <p className="text-gray-500 mt-0.5">
                  报告中的坐标异常原因使用自然语言描述，而非纯技术字段名，方便不懂代码的人员理解。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </div>
              <div>
                <strong>完整审计追踪</strong>
                <p className="text-gray-500 mt-0.5">
                  HTML报告和JSON文件包含完整的操作历史记录，可追溯每一步操作的时间、人员和内容。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                4
              </div>
              <div>
                <strong>处理意见完整保留</strong>
                <p className="text-gray-500 mt-0.5">
                  所有标注和处理意见都会完整呈现在导出文件中，便于后续检查和跟进。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          <div className="flex items-center justify-center gap-1">
            <Clock size={12} />
            本次导出时间: {formatTimestamp(Date.now())}
          </div>
        </div>
      </div>
    </div>
  );
}
