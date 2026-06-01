import { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useConflictStore } from '../../store/useConflictStore';
import { exportToExcel, exportToCsv, downloadBlob, generateExportFilename } from '../../engine/exportGenerator';
import type { BookingExportOptions, ExportOptions } from '../../types';

interface ExportDialogProps {
  bookingId?: string;
  onClose: () => void;
}

export function ExportDialog({ bookingId, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<'excel' | 'csv'>('excel');
  const [includeChain, setIncludeChain] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { rooms, bands, courses } = useDataStore();
  const { bookings, updateBookings } = useBookingStore();
  const { conflicts } = useConflictStore();

  const exportBookings = bookingId
    ? bookings.filter(b => b.id === bookingId)
    : bookings;

  const handleExport = async () => {
    setExporting(true);
    setResult(null);

    try {
      const options: ExportOptions = {
        format: format === 'excel' ? 'xlsx' : 'csv',
        includeChain: includeChain,
      };

      const exportResult = format === 'excel'
        ? exportToExcel(exportBookings, rooms, bands, courses, conflicts, options)
        : exportToCsv(exportBookings, rooms, bands, courses, conflicts, options);

      const filename = generateExportFilename(options.format);
      downloadBlob(exportResult.blob, filename);

      if (exportResult.updatedBookings.length > 0) {
        updateBookings(exportResult.updatedBookings);
      }

      setResult({
        success: true,
        message: `已成功导出 ${exportBookings.length} 条预约到 ${filename}`,
      });

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setResult({
        success: false,
        message: '导出失败：' + (error as Error).message,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-primary-100 flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-primary-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-600" />
            {bookingId ? '导出单条预约' : '导出日程表'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-3">
              选择导出格式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`
                  relative p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${format === 'excel'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={e => setFormat(e.target.value as 'excel' | 'csv')}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className={`w-8 h-8 ${
                    format === 'excel' ? 'text-primary-600' : 'text-primary-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    format === 'excel' ? 'text-primary-800' : 'text-primary-600'
                  }`}>
                    Excel (.xlsx)
                  </span>
                </div>
              </label>
              <label
                className={`
                  relative p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${format === 'csv'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={e => setFormat(e.target.value as 'excel' | 'csv')}
                  className="sr-only"
                />
                <div className="flex flex-col items-center gap-2">
                  <FileText className={`w-8 h-8 ${
                    format === 'csv' ? 'text-primary-600' : 'text-primary-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    format === 'csv' ? 'text-primary-800' : 'text-primary-600'
                  }`}>
                    CSV (.csv)
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl cursor-pointer hover:bg-primary-100/50 transition-colors">
              <input
                type="checkbox"
                checked={includeChain}
                onChange={e => setIncludeChain(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary-600" />
                  <span className="font-medium text-primary-800">包含数据链路</span>
                </div>
                <p className="text-xs text-primary-500 mt-1">
                  导出每条预约的完整数据链路节点，用于事后追溯和审计。
                  包含导入来源、版本号、操作时间等信息。
                </p>
              </div>
            </label>
          </div>

          <div className="bg-primary-50/50 rounded-lg p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary-600">导出范围</span>
              <span className="font-medium text-primary-800">
                {bookingId ? '单条预约' : `全部 ${exportBookings.length} 条`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-primary-600">包含内容</span>
              <span className="text-primary-700">
                预约信息
                {includeChain && ' + 数据链路'}
              </span>
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              result.success
                ? 'bg-success-light text-success-dark'
                : 'bg-conflict-light text-conflict-dark'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>

        <div className="p-6 bg-primary-50/50 flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={exporting}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || exportBookings.length === 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                确认导出
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
