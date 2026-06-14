import React from 'react';
import { BarChart3, FileText, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import DataUpload from '../components/DataUpload';
import RawDataTable from '../components/RawDataTable';
import CalculationSteps from '../components/CalculationSteps';
import QualityReport from '../components/QualityReport';
import ManualOverride from '../components/ManualOverride';
import ParamCompare from '../components/ParamCompare';
import { useAnalysisStore } from '../store/useAnalysisStore';

const AnalysisPage: React.FC = () => {
  const { rawLogs, generateAnalysisReport, currentReport, clearData } = useAnalysisStore();

  const handleGenerateReport = () => {
    generateAnalysisReport();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white py-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">电池内阻阈值预警分析系统</h1>
              <p className="text-blue-200 text-sm">
                传感器日志解析 · 阈值预警 · 人工改判追溯
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rawLogs.length > 0 && (
              <>
                <button
                  onClick={clearData}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-sm text-sm transition-colors"
                >
                  清空数据
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-900 rounded-sm text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  生成报告
                </button>
                <Link
                  to="/report"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-sm text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  查看报告
                </Link>
                <Link
                  to="/handover"
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sm text-sm font-medium transition-colors"
                >
                  <Handshake className="w-4 h-4" />
                  交接模拟
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          <DataUpload />

          {rawLogs.length > 0 && (
            <>
              <ParamCompare />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <RawDataTable />
                  <QualityReport />
                </div>
                <div className="space-y-6">
                  <CalculationSteps />
                  <ManualOverride />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          电池内阻阈值预警分析系统 · 所有数据处理均在本地完成，确保数据安全
        </div>
      </footer>
    </div>
  );
};

export default AnalysisPage;
