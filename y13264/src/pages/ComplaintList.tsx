import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Clock, Loader, Eye, CheckCircle, 
  Droplets, AlertTriangle, RefreshCw, FileText, History 
} from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore';
import { ComplaintCard } from '../components/ComplaintCard';
import { StatsCard } from '../components/StatsCard';
import { ComplaintStatus } from '../utils/types';
import { STATUS_LABELS } from '../utils/constants';
import { cn } from '../lib/utils';

const statusFilters: Array<{ value: ComplaintStatus | 'all'; label: string; count?: number }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'for_publication', label: '待公示' },
  { value: 'publicized', label: '已公示' },
];

export function ComplaintList() {
  const navigate = useNavigate();
  const { 
    complaints, 
    searchKeyword, 
    statusFilter, 
    isLoading,
    consistencyIssues,
    fetchComplaints,
    setSearchKeyword, 
    setStatusFilter,
    validateConsistency,
    resetToDefaults,
  } = useComplaintStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    validateConsistency();
  }, [complaints, validateConsistency]);

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    processing: complaints.filter(c => c.status === 'processing').length,
    forPublication: complaints.filter(c => c.status === 'for_publication').length,
    publicized: complaints.filter(c => c.status === 'publicized').length,
  }), [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (c.mergeStatus === 'merged') return false;
      
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        return (
          c.street.toLowerCase().includes(keyword) ||
          c.complainant.toLowerCase().includes(keyword) ||
          c.description.toLowerCase().includes(keyword)
        );
      }
      
      return true;
    }).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [complaints, statusFilter, searchKeyword]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <header className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  雨水口积淤公示清单
                </h1>
                <p className="text-xs text-blue-200">社区运营管理系统</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {consistencyIssues.length > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/20 text-amber-200 px-3 py-1.5 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{consistencyIssues.length} 条数据异常</span>
                </div>
              )}
              <button
                onClick={() => navigate('/report')}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>生成报告</span>
              </button>
              <button
                onClick={() => navigate('/logs')}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <History className="w-4 h-4" />
                <span>操作日志</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重置数据</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="待处理"
            value={stats.pending}
            icon={Clock}
            color="bg-gradient-to-br from-amber-400 to-amber-600"
            delay={0}
          />
          <StatsCard
            title="处理中"
            value={stats.processing}
            icon={Loader}
            color="bg-gradient-to-br from-blue-400 to-blue-600"
            delay={100}
          />
          <StatsCard
            title="待公示"
            value={stats.forPublication}
            icon={Eye}
            color="bg-gradient-to-br from-purple-400 to-purple-600"
            delay={200}
          />
          <StatsCard
            title="已公示"
            value={stats.publicized}
            icon={CheckCircle}
            color="bg-gradient-to-br from-emerald-400 to-emerald-600"
            delay={300}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="flex-1 flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索街口、投诉人、描述..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/complaint/new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              新建投诉
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {statusFilters.map((filter) => {
            const count = filter.value === 'all' 
              ? filteredComplaints.length 
              : complaints.filter(c => c.status === filter.value && c.mergeStatus !== 'merged').length;
            
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  statusFilter === filter.value
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {filter.label}
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  statusFilter === filter.value
                    ? 'bg-white/20'
                    : 'bg-slate-100'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Droplets className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">暂无投诉记录</h3>
            <p className="text-slate-400 mb-6">
              {searchKeyword || statusFilter !== 'all' 
                ? '当前筛选条件下没有找到记录' 
                : '点击右上角"新建投诉"按钮开始记录'}
            </p>
            {!searchKeyword && statusFilter === 'all' && (
              <button
                onClick={() => navigate('/complaint/new')}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
              >
                新建第一条投诉
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredComplaints.map((complaint, index) => (
              <div
                key={complaint.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <ComplaintCard
                  complaint={complaint}
                  onClick={() => navigate(`/complaint/${complaint.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">确认重置数据？</h3>
            <p className="text-slate-600 mb-6">
              此操作将清除所有数据并恢复为初始演示数据，已有的记录将无法恢复。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  resetToDefaults();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors font-medium"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
