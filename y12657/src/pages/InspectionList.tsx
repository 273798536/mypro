import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Upload,
  Download,
  ArrowRight,
  FileText,
  Building2,
  Calendar,
  User,
  Inbox,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InspectionStatus } from '@shared/types';
import { useInspectionStore } from '@/store/inspectionStore';
import { exportReport } from '@/api/client';

const statusConfig: Record<InspectionStatus, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-slate/10 text-slate' },
  checking: { label: '检查中', className: 'bg-brand-50 text-brand' },
  reviewing: { label: '复核中', className: 'bg-alert-50 text-alert' },
  completed: { label: '已完成', className: 'bg-success-50 text-success' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function InspectionList() {
  const { inspections, loading, fetchList } = useInspectionStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all');

  useEffect(() => {
    const params: { keyword?: string; status?: InspectionStatus } = {};
    if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    fetchList(params);
  }, [searchKeyword, statusFilter, fetchList]);

  const handleDownload = async (id: string) => {
    try {
      const url = await exportReport(id, 'xlsx');
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection_${id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-graphite">检查记录</h1>
          <p className="text-sm text-slate mt-1">管理地下车库净空检查项目</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => alert('功能开发中')}>
            <Plus className="w-4 h-4" />
            新建检查
          </button>
          <button className="btn-secondary" onClick={() => alert('功能开发中')}>
            <Upload className="w-4 h-4" />
            导入测量记录
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/50" />
            <input
              type="text"
              placeholder="搜索项目名、车库编号..."
              className="input-field pl-9"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <select
            className="input-field sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | 'all')}
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="checking">检查中</option>
            <option value="reviewing">复核中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card p-12">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
            <p className="text-sm text-slate">加载中...</p>
          </div>
        </div>
      ) : inspections.length === 0 ? (
        <div className="card p-12">
          <div className="flex flex-col items-center text-center">
            <Inbox className="w-16 h-16 text-slate/30 mb-4" />
            <h3 className="font-display text-lg font-semibold text-graphite mb-1">暂无检查记录</h3>
            <p className="text-sm text-slate mb-4">
              {searchKeyword || statusFilter !== 'all'
                ? '没有找到匹配的记录，试试调整筛选条件'
                : '点击"新建检查"按钮开始第一个项目'}
            </p>
            {!searchKeyword && statusFilter === 'all' && (
              <button className="btn-primary" onClick={() => alert('功能开发中')}>
                <Plus className="w-4 h-4" />
                新建检查
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {inspections.map((item) => {
            const status = statusConfig[item.status];
            return (
              <div
                key={item.id}
                className="card card-hover p-5 relative group"
              >
                {item.abnormalCount > 0 && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-alert text-white text-xs font-bold rounded-full shadow-lg">
                      {item.abnormalCount}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-semibold text-graphite truncate pr-2">
                      {item.projectName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-slate" />
                      <span className="text-sm text-slate font-mono">{item.garageCode}</span>
                    </div>
                  </div>
                  <span className={cn('status-badge flex-shrink-0', status.className)}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>检查日期: {formatDate(item.createdAt).slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{item.scope}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate/10">
                  <div className="flex items-center gap-1.5 text-xs text-slate">
                    <User className="w-3.5 h-3.5" />
                    <span>{item.lastEditor}</span>
                    <span className="text-slate/40">·</span>
                    <span>{formatDate(item.updatedAt).slice(0, 10)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Link to={`/inspections/${item.id}`} className="btn-ghost">
                      进入详情
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button className="btn-ghost" onClick={() => handleDownload(item.id)}>
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
