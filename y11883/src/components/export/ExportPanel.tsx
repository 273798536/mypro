import { motion } from 'framer-motion';
import { Download, FileJson, FileSpreadsheet, FileCheck } from 'lucide-react';
import { usePartitionStore } from '../../store/usePartitionStore';
import { 
  generateJSONExport, 
  generateCSVExport, 
  downloadJSON, 
  downloadCSV,
  ExportSummary 
} from '../../utils/exporter';

export function ExportPanel() {
  const { problems, errors } = usePartitionStore();

  const hasResults = problems.length > 0;
  const hasErrors = errors.length > 0;

  const handleExportJSON = () => {
    const data = generateJSONExport(problems, errors);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadJSON(data, `整数拆分结果_${timestamp}.json`);
  };

  const handleExportCSV = () => {
    const csv = generateCSVExport(problems);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `整数拆分结果_${timestamp}.csv`);
  };

  const summary: ExportSummary['summary'] | null = hasResults ? {
    totalProblems: problems.length + errors.length,
    validProblems: problems.length,
    invalidProblems: errors.length,
    totalWarnings: problems.reduce((sum, p) => sum + p.warnings.length, 0),
    averagePartitionsPerProblem: problems.length > 0 
      ? problems.reduce((sum, p) => sum + p.partitions.length, 0) / problems.length 
      : 0
  } : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="card"
    >
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">结果导出</h2>
            <p className="text-xs text-gray-500">下载完整分析报告</p>
          </div>
        </div>
      </div>

      <div className="card-body">
        {hasResults && summary && (
          <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-white rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-700 text-sm">处理摘要</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">总题目数：</span>
                <span className="font-medium text-gray-700">{summary.totalProblems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">有效题目：</span>
                <span className="font-medium text-emerald-600">{summary.validProblems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">错误输入：</span>
                <span className="font-medium text-red-600">{summary.invalidProblems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">预警数量：</span>
                <span className="font-medium text-amber-600">{summary.totalWarnings}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-500">平均拆分数：</span>
                <span className="font-medium text-primary-600">{summary.averagePartitionsPerProblem.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleExportJSON}
            disabled={!hasResults}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              hasResults
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FileJson className="w-5 h-5" />
            导出 JSON 格式
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!hasResults}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              hasResults
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            导出 CSV 格式（Excel兼容）
          </button>
        </div>

        {!hasResults && (
          <p className="mt-4 text-center text-xs text-gray-400">
            请先输入数据并生成结果
          </p>
        )}
      </div>
    </motion.div>
  );
}
