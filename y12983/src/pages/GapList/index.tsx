import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, ChevronLeft, ChevronRight, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { useGapStore } from '@/stores/gapStore';
import Card from '@/components/Card/Card';
import StatusBadge from '@/components/Status/StatusBadge';
import SeverityBadge from '@/components/Status/SeverityBadge';
import GapTypeBadge from '@/components/Status/GapTypeBadge';
import Button from '@/components/Button/Button';
import Modal from '@/components/Modal/Modal';
import type { GapStatus, GapType, Severity, CreateGapData } from '@/types';

export default function GapList() {
  const navigate = useNavigate();
  const { gaps, total, currentPage, pageSize, fetchGaps, createGap, detectDuplicates, duplicates } = useGapStore();

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<GapStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<GapType | ''>('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGap, setNewGap] = useState<CreateGapData>({
    title: '',
    severity: 'medium',
    gapType: 'sampling',
    tableName: '',
    businessLine: '',
    description: '',
    source: '人工上报',
  });

  useEffect(() => {
    fetchGaps({
      page: 1,
      pageSize: 10,
      keyword: keyword || undefined,
      status: statusFilter || undefined,
      gapType: typeFilter || undefined,
      severity: severityFilter || undefined,
    });
  }, [keyword, statusFilter, typeFilter, severityFilter, fetchGaps]);

  const handlePageChange = (page: number) => {
    fetchGaps({
      page,
      pageSize,
      keyword: keyword || undefined,
      status: statusFilter || undefined,
      gapType: typeFilter || undefined,
      severity: severityFilter || undefined,
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleCreate = () => {
    if (!newGap.title || !newGap.tableName || !newGap.businessLine) {
      alert('请填写必填项');
      return;
    }

    const dups = detectDuplicates(newGap, 0.6);
    if (dups.length > 0) {
      if (!confirm(`检测到 ${dups.length} 条相似记录，是否仍要创建？`)) {
        return;
      }
    }

    createGap(newGap, '当前用户');
    setShowCreateModal(false);
    setNewGap({
      title: '',
      severity: 'medium',
      gapType: 'sampling',
      tableName: '',
      businessLine: '',
      description: '',
      source: '人工上报',
    });
  };

  const handleTitleInput = (value: string) => {
    setNewGap({ ...newGap, title: value });
    if (value.length > 3) {
      detectDuplicates({ ...newGap, title: value }, 0.5);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">缺口报告</h1>
          <p className="text-sm text-slate-400 mt-1">
            共 {total} 条记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => fetchGaps({ page: currentPage, pageSize })}>
            刷新
          </Button>
          <Button variant="secondary" icon={<Download size={16} />}>
            导出
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
            新建报告
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="搜索标题、表名、描述..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GapStatus | '')}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="fixed">已修正</option>
              <option value="ignored">已忽略</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as GapType | '')}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">全部类型</option>
              <option value="sampling">采样缺口</option>
              <option value="migration">迁移问题</option>
              <option value="other">其他</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as Severity | '')}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">全部严重度</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="critical">严重</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-400">标题</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">状态</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">类型</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">严重度</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">表名</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">业务线</th>
                <th className="text-left py-3 px-4 font-medium text-slate-400">发现时间</th>
              </tr>
            </thead>
            <tbody>
              {gaps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                gaps.map((gap) => (
                  <tr
                    key={gap.id}
                    onClick={() => navigate(`/gaps/${gap.id}`)}
                    className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="text-slate-200 font-medium hover:text-blue-400 transition-colors">
                        {gap.title}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={gap.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <GapTypeBadge type={gap.gapType} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={gap.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {gap.tableName}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {gap.businessLine}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(gap.discoveredAt).toLocaleDateString('zh-CN', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
            <span className="text-sm text-slate-500">
              第 {currentPage} / {totalPages} 页，共 {total} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                  }
                  if (currentPage > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[32px] h-8 px-2 rounded text-sm transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建缺口报告"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>
              创建
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {duplicates.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                <AlertTriangle size={16} />
                检测到 {duplicates.length} 条相似记录
              </div>
              <div className="space-y-2">
                {duplicates.slice(0, 3).map((dup) => (
                  <div
                    key={dup.gap.id}
                    onClick={() => {
                      navigate(`/gaps/${dup.gap.id}`);
                      setShowCreateModal(false);
                    }}
                    className="p-2 bg-slate-800/50 rounded cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{dup.gap.title}</span>
                      <span className="text-xs text-amber-400">
                        相似度 {Math.round(dup.similarity * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{dup.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newGap.title}
              onChange={(e) => handleTitleInput(e.target.value)}
              placeholder="请输入缺口报告标题"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">缺口类型</label>
              <select
                value={newGap.gapType}
                onChange={(e) => setNewGap({ ...newGap, gapType: e.target.value as GapType })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="sampling">采样缺口</option>
                <option value="migration">迁移问题</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">严重程度</label>
              <select
                value={newGap.severity}
                onChange={(e) => setNewGap({ ...newGap, severity: e.target.value as Severity })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">严重</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">来源</label>
              <select
                value={newGap.source}
                onChange={(e) => setNewGap({ ...newGap, source: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="自动检测">自动检测</option>
                <option value="人工上报">人工上报</option>
                <option value="迁移任务">迁移任务</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                表名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newGap.tableName}
                onChange={(e) => setNewGap({ ...newGap, tableName: e.target.value })}
                placeholder="如：monitor_metrics"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                业务线 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newGap.businessLine}
                onChange={(e) => setNewGap({ ...newGap, businessLine: e.target.value })}
                placeholder="如：监控平台"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">问题描述</label>
            <textarea
              value={newGap.description}
              onChange={(e) => setNewGap({ ...newGap, description: e.target.value })}
              placeholder="请详细描述缺口情况..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
