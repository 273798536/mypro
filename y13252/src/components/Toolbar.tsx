import { useState } from 'react';
import { Database, RefreshCw, FileText, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore.js';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  onAddPhoto?: () => void;
}

export default function Toolbar({ onAddPhoto }: ToolbarProps) {
  const { seedData, rerunCheck, fetchReport, loading, error, selectedComplaintId, complaints, status } = useComplaintStore();
  const navigate = useNavigate();
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  const selectedComplaint = complaints.find(c => c.id === selectedComplaintId);

  const handleSeed = async () => {
    await seedData();
    setShowSeedConfirm(false);
  };

  const handleRerun = async () => {
    if (!selectedComplaintId) return;
    await rerunCheck(selectedComplaintId);
  };

  const handleViewReport = async () => {
    if (!selectedComplaintId) return;
    await fetchReport(selectedComplaintId);
    navigate('/report');
  };

  return (
    <div className="bg-[#1e3a5f] text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            夜市外摆投诉回放
          </h1>
          {status && (
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-300">
              <span>投诉总数: {status.totalComplaints}</span>
              <span className="text-amber-400">待处理: {status.pendingCount}</span>
              <span className="text-blue-400">处理中: {status.processingCount}</span>
              <span className="text-green-400">已完成: {status.resolvedCount}</span>
              <span className="text-slate-400">报告版本: v{status.reportVersion}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-1.5 bg-red-500/20 text-red-300 px-3 py-1.5 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <button
            onClick={() => setShowSeedConfirm(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            放样例
          </button>
          
          <button
            onClick={handleRerun}
            disabled={!selectedComplaintId || loading}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            重跑
          </button>
          
          <button
            onClick={handleViewReport}
            disabled={!selectedComplaintId || loading}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
          >
            <FileText className="w-4 h-4" />
            查看Markdown报告
          </button>
          
          {onAddPhoto && (
            <button
              onClick={onAddPhoto}
              disabled={!selectedComplaintId || loading}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              补录照片
            </button>
          )}
        </div>
      </div>
      
      {showSeedConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">确认生成样例数据？</h3>
              <button
                onClick={() => setShowSeedConfirm(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="text-sm text-slate-600 mb-6 space-y-2">
              <p>此操作将：</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>清空现有所有数据</li>
                <li>生成3条投诉记录</li>
                <li>包含1张名称不一致的测试照片</li>
                <li>包含坐标偏移到隔壁街的测试场景</li>
                <li>所有数据保存到本地JSON文件，重启不丢失</li>
              </ul>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSeedConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSeed}
                disabled={loading}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                确认生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
