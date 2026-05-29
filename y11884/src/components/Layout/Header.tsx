import React from 'react';
import { useAppStore, storeActions } from '../../store/appStore';
import {
  Calculator,
  Download,
  FileJson,
  FileText,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { exportReportAsJSON, exportReportAsPDF } from '../../utils/export/report';

const Header: React.FC = () => {
  const reports = useAppStore((state) => state.reports);
  const showFormulaPanel = useAppStore((state) => state.showFormulaPanel);

  const handleExportJSON = () => {
    if (reports.length > 0) {
      exportReportAsJSON(reports[reports.length - 1]);
      storeActions.addWarning(
        'info',
        '报告已导出为 JSON 文件',
        '包含完整的积分计算数据'
      );
    } else {
      storeActions.addWarning(
        'warning',
        '请先生成分析报告后再导出',
        '需要先计算两条路径的积分并生成报告'
      );
    }
  };

  const handleExportPDF = () => {
    if (reports.length > 0) {
      exportReportAsPDF(reports[reports.length - 1]);
      storeActions.addWarning(
        'info',
        '报告已导出为 PDF 文件',
        '包含积分结果和对比分析'
      );
    } else {
      storeActions.addWarning(
        'warning',
        '请先生成分析报告后再导出',
        '需要先计算两条路径的积分并生成报告'
      );
    }
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有路径和计算结果吗？')) {
      storeActions.resetApp();
      storeActions.addWarning('info', '已重置所有数据');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            曲线积分路径比较器
          </h1>
          <p className="text-xs text-gray-500">
            Line Integral Path Comparator
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => storeActions.toggleFormulaPanel()}
          className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
            showFormulaPanel
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          公式面板
        </button>

        <div className="relative group">
          <button className="px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            导出
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-40">
            <button
              onClick={handleExportPDF}
              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
            >
              <FileText className="w-4 h-4 text-red-500" />
              导出 PDF 报告
            </button>
            <button
              onClick={handleExportJSON}
              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 rounded-b-lg"
            >
              <FileJson className="w-4 h-4 text-yellow-600" />
              导出 JSON 数据
            </button>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重置
        </button>
      </div>
    </header>
  );
};

export default Header;
