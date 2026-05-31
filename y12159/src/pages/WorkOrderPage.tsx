import { useState } from 'react';
import { ClipboardList, Plus, Check, Clock, User, MapPin, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { WorkOrderStatus, WorkOrder } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

const statusConfig: Record<WorkOrderStatus, { label: string; className: string; color: string }> = {
  PENDING: { label: '待处理', className: 'bg-warning/10 text-warning border-warning/30', color: 'text-warning' },
  IN_PROGRESS: { label: '处理中', className: 'bg-primary/10 text-primary border-primary/30', color: 'text-primary' },
  RESOLVED: { label: '已解决', className: 'bg-success/10 text-success border-success/30', color: 'text-success' },
};

const statusOrder: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];

export default function WorkOrderPage() {
  const { workOrders, judgmentResults, generateWorkOrdersFromResults, updateWorkOrderStatus, isLoading } = useStore();
  const [filterStatus, setFilterStatus] = useState<WorkOrderStatus | 'ALL'>('ALL');

  const canGenerate = judgmentResults.some((r) => r.status === 'WARNING' || r.status === 'FAIL');

  const filteredWorkOrders = filterStatus === 'ALL'
    ? workOrders
    : workOrders.filter((o) => o.status === filterStatus);

  const stats = {
    PENDING: workOrders.filter((o) => o.status === 'PENDING').length,
    IN_PROGRESS: workOrders.filter((o) => o.status === 'IN_PROGRESS').length,
    RESOLVED: workOrders.filter((o) => o.status === 'RESOLVED').length,
  };

  const handleGenerateOrders = () => {
    generateWorkOrdersFromResults();
  };

  const handleNextStatus = (order: WorkOrder) => {
    const currentIndex = statusOrder.indexOf(order.status);
    if (currentIndex < statusOrder.length - 1) {
      updateWorkOrderStatus(order.id, statusOrder[currentIndex + 1]);
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DRIFT: '传感器漂移',
      SPEED_SUDDEN_CHANGE: '速度突变',
      MISSING: '区段缺失',
      GAP_ABNORMAL: '间隙异常',
    };
    return type.split('、').map((t) => labels[t] || t).join('、');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工单联动</h1>
          <p className="text-sm text-industrial-muted mt-1">
            根据间隙判定结果自动生成检修工单，追踪处理进度
          </p>
        </div>
        <button
          onClick={handleGenerateOrders}
          disabled={!canGenerate || isLoading}
          className="industrial-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} className={isLoading ? 'animate-spin' : ''} />
          生成工单
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="industrial-card p-4 border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-industrial-muted mb-1">待处理</p>
              <p className="text-3xl font-bold font-mono text-warning">{stats.PENDING}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-sm">
              <Clock size={24} className="text-warning" />
            </div>
          </div>
        </div>
        <div className="industrial-card p-4 border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-industrial-muted mb-1">处理中</p>
              <p className="text-3xl font-bold font-mono text-primary">{stats.IN_PROGRESS}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-sm">
              <User size={24} className="text-primary" />
            </div>
          </div>
        </div>
        <div className="industrial-card p-4 border-l-4 border-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-industrial-muted mb-1">已解决</p>
              <p className="text-3xl font-bold font-mono text-success">{stats.RESOLVED}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-sm">
              <Check size={24} className="text-success" />
            </div>
          </div>
        </div>
      </div>

      <div className="industrial-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">工单列表</h3>
          <div className="flex items-center gap-2">
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  'px-3 py-1 text-xs rounded-sm transition-colors',
                  filterStatus === status
                    ? 'bg-primary text-white'
                    : 'bg-industrial-bg text-industrial-muted hover:bg-industrial-border/10'
                )}
              >
                {status === 'ALL' ? '全部' : statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>

        {!canGenerate && workOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-industrial-bg rounded-full flex items-center justify-center">
              <ClipboardList size={32} className="text-industrial-muted" />
            </div>
            <h3 className="text-lg font-medium mb-2">暂无工单</h3>
            <p className="text-sm text-industrial-muted">
              请先在间隙分析页面执行判定，当存在警告或失败区段时可生成工单
            </p>
          </div>
        )}

        {filteredWorkOrders.length > 0 && (
          <div className="space-y-3">
            {filteredWorkOrders.map((order) => (
              <div key={order.id} className="industrial-card p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-semibold">{order.id.slice(-8).toUpperCase()}</span>
                      <span className={cn('px-2 py-0.5 text-xs rounded-sm border', statusConfig[order.status].className)}>
                        {statusConfig[order.status].label}
                      </span>
                      <span className="text-xs text-industrial-muted">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-xs text-industrial-muted mb-1">区段</p>
                        <p className="font-mono flex items-center gap-1">
                          <MapPin size={12} />
                          {order.sectionId}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-industrial-muted mb-1">车厢</p>
                        <p className="font-mono">{order.carNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-industrial-muted mb-1">异常类型</p>
                        <p className={cn('font-mono', statusConfig[order.status].color)}>
                          {getAnomalyTypeLabel(order.anomalyType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-industrial-muted mb-1">负责班组</p>
                        <p className="font-mono flex items-center gap-1">
                          <User size={12} />
                          {order.assignedTeam}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-industrial-bg rounded-sm">
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-industrial-muted mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{order.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {order.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleNextStatus(order)}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-sm border transition-colors flex items-center gap-1',
                          order.status === 'PENDING'
                            ? 'border-primary text-primary hover:bg-primary/10'
                            : 'border-success text-success hover:bg-success/10'
                        )}
                      >
                        <RefreshCw size={12} />
                        {order.status === 'PENDING' ? '开始处理' : '标记完成'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canGenerate && workOrders.length === 0 && (
        <div className="industrial-card p-4 border-l-4 border-warning">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning flex-shrink-0" />
            <div>
              <p className="font-medium">待生成工单</p>
              <p className="text-sm text-industrial-muted">
                当前有 {judgmentResults.filter(r => r.status === 'WARNING' || r.status === 'FAIL').length} 个异常区段待生成检修工单
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
