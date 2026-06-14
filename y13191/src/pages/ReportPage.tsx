import React from 'react';
import { BarChart3, ArrowLeft, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import MarkdownReport from '../components/MarkdownReport';
import { useAnalysisStore } from '../store/useAnalysisStore';

const ReportPage: React.FC = () => {
  const { rawLogs } = useAnalysisStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white py-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">分析报告</h1>
            <p className="text-green-200 text-sm">
              Markdown格式 · 可复制下载
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-sm text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回分析
          </Link>
          {rawLogs.length > 0 && (
            <Link
              to="/handover"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-sm font-medium transition-colors"
            >
              <Handshake className="w-4 h-4" />
              交接模拟
            </Link>
          )}
        </div>
      </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          <MarkdownReport />
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

export default ReportPage;
