import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { StatusTag } from '@/components/ui/StatusTag';
import { formatCurrency, formatMiles } from '@/utils/number';
import { formatDate, formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { TraceNode, LiabilityRecord } from '@/types';

export const TracePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    node: TraceNode | null;
  }>({ isOpen: false, node: null });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const getLiabilityById = useAppStore((state) => state.getLiabilityById);
  const getTraceChain = useAppStore((state) => state.getTraceChain);

  const record = useMemo(() => {
    if (!id) return undefined;
    return getLiabilityById(id);
  }, [id, getLiabilityById]);

  const traceNodes = useMemo(() => {
    if (!id) return [];
    return getTraceChain(id);
  }, [id, getTraceChain]);

  const filteredNodes = useMemo(() => {
    return traceNodes.filter(node => 
      node.type === 'estimate' || node.type === 'exchange' || node.type === 'expire'
    );
  }, [traceNodes]);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'estimate':
        return <Calculator className="w-5 h-5" />;
      case 'exchange':
        return <ShoppingBag className="w-5 h-5" />;
      case 'expire':
        return <Clock className="w-5 h-5" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const getNodeColor = (type: string, status: string) => {
    if (status === 'error') {
      return 'bg-red-500';
    }
    if (status === 'warning') {
      return 'bg-amber-500';
    }
    switch (type) {
      case 'estimate':
        return 'bg-blue-500';
      case 'exchange':
        return 'bg-emerald-500';
      case 'expire':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getNodeLabel = (type: string) => {
    switch (type) {
      case 'estimate':
        return '负债估算';
      case 'exchange':
        return '兑换状态';
      case 'expire':
        return '过期冲回';
      default:
        return '其他';
    }
  };

  const renderNodeContent = (node: TraceNode) => {
    switch (node.type) {
      case 'estimate':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 mb-1">剩余里程</p>
                <p className="text-lg font-bold text-blue-700 font-mono">
                  {formatMiles(node.data.parameters?.remainingMiles || 0)}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-emerald-600 mb-1">负债系数</p>
                <p className="text-lg font-bold text-emerald-700 font-mono">
                  {node.data.parameters?.liabilityCoefficient}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 mb-1">概率系数</p>
                <p className="text-lg font-bold text-amber-700 font-mono">
                  {node.data.parameters?.probabilityCoefficient}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2">计算公式</p>
              <p className="text-sm font-mono text-gray-700">{node.data.formula}</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">计算过程</p>
                <p className="text-sm font-mono text-[#1E3A5F] font-semibold">
                  {node.data.calculationProcess}
                </p>
              </div>
            </div>
          </div>
        );

      case 'exchange':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">订单编号</p>
                <p className="text-sm font-mono text-gray-900">{node.data.orderNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">订单状态</p>
                <StatusTag status={node.data.status} type="order" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">兑换类型</p>
                <p className="text-sm font-medium text-gray-900">{node.data.exchangeType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">兑换里程</p>
                <p className="text-sm font-mono font-medium text-gray-900">
                  {formatMiles(node.data.miles || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">兑付金额</p>
                <p className="text-sm font-mono font-semibold text-[#1E3A5F]">
                  {formatCurrency(node.data.amount || 0)}
                </p>
              </div>
            </div>
            {node.data.rejectReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-1">退回原因</p>
                <p className="text-sm text-red-700">{node.data.rejectReason}</p>
              </div>
            )}
          </div>
        );

      case 'expire':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">批次编号</p>
                <p className="text-sm font-mono text-gray-900">{node.data.batchNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">处理状态</p>
                <StatusTag status={node.data.processStatus} type="process" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">应过期里程</p>
                <p className="text-sm font-mono font-medium text-gray-900">
                  {formatMiles(node.data.milesToExpire || 0)}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-1">实际过期里程</p>
                <p className="text-sm font-mono font-semibold text-red-700">
                  {formatMiles(node.data.actualExpiredMiles || 0)}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">过期原因</p>
              <p className="text-sm text-gray-700">{node.data.expireReason}</p>
            </div>
            {node.data.processStatus === '已冲回' && record?.reviewComment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-600 mb-1">处理意见</p>
                <p className="text-sm text-emerald-700">{record.reviewComment}</p>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">暂无详情</p>;
    }
  };

  const renderModalContent = (node: TraceNode) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-white',
            getNodeColor(node.type, node.status)
          )}>
            {getNodeIcon(node.type)}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{node.title}</h4>
            <p className="text-sm text-gray-500">{getNodeLabel(node.type)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {formatDateTime(node.time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {node.operator || '系统'}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">节点详情</h5>
          {renderNodeContent(node)}
        </div>

        {node.description && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">{node.description}</p>
          </div>
        )}
      </div>
    );
  };

  const getNodeTimelineIndex = (type: string) => {
    switch (type) {
      case 'estimate':
        return 1;
      case 'exchange':
        return 2;
      case 'expire':
        return 3;
      default:
        return 0;
    }
  };

  const getStepStatus = (index: number, currentType: string) => {
    const currentIndex = getNodeTimelineIndex(currentType);
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  if (!record) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 btn btn-ghost gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="card p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">记录不存在</h2>
          <p className="text-gray-500">未找到指定的负债记录，请检查链接是否正确</p>
        </div>
      </div>
    );
  }

  const steps = ['负债估算', '兑换状态', '过期冲回'];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900">
              追溯链路
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {record.memberName} ({record.memberNo}) - 追溯链路视图
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">基本信息</h2>
            <p className="text-sm text-gray-500">会员账户概览</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusTag status={record.businessCategory} type="business" />
            <StatusTag status={record.reviewStatus} type="review" />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">会员号</p>
            <p className="text-sm font-mono text-gray-900">{record.memberNo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">会员姓名</p>
            <p className="text-sm text-gray-900">{record.memberName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">账户类型</p>
            <p className="text-sm text-gray-900">{record.accountType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">剩余里程</p>
            <p className="text-sm font-mono font-semibold text-gray-900">
              {formatMiles(record.remainingMiles)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">估算负债</p>
            <p className="text-sm font-mono font-bold text-[#1E3A5F]">
              {formatCurrency(record.estimatedLiability)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">过期日期</p>
            <p className={cn(
              'text-sm font-medium',
              record.isExpired ? 'text-red-600' : 'text-gray-900'
            )}>
              {formatDate(record.expireDate || '-')}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">链路进度</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200" />
          <div
            className="absolute top-5 left-0 h-1 bg-[#1E3A5F] transition-all duration-500"
            style={{
              width: `${Math.min(filteredNodes.length * 33.33, 100)}%`
            }}
          />
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const node = filteredNodes.find(n => getNodeTimelineIndex(n.type) === index + 1);
              const status = node ? 'completed' : (index < filteredNodes.length ? 'completed' : 'pending');
              return (
                <div key={step} className="flex flex-col items-center">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300',
                    status === 'completed'
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <p className={cn(
                    'text-sm mt-2 font-medium',
                    status === 'completed' ? 'text-[#1E3A5F]' : 'text-gray-400'
                  )}>
                    {step}
                  </p>
                  {node && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(node.time)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">追溯节点详情</h2>
            <p className="text-sm text-gray-500 mt-1">共 {filteredNodes.length} 个追溯节点</p>
          </div>
        </div>

        <div className="relative">
          <div className="timeline-line" />
          {filteredNodes.map((node, index) => (
            <div
              key={node.id}
              className={cn(
                'relative pl-16 pb-8 animate-fade-in',
                `stagger-${(index % 4) + 1}`
              )}
            >
              <div className={cn(
                'timeline-dot',
                getNodeColor(node.type, node.status)
              )} style={{ top: '0.5rem' }} />

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleNodeExpand(node.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                      getNodeColor(node.type, node.status)
                    )}>
                      {getNodeIcon(node.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{node.title}</h3>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          node.type === 'estimate' && 'bg-blue-100 text-blue-700',
                          node.type === 'exchange' && 'bg-emerald-100 text-emerald-700',
                          node.type === 'expire' && 'bg-purple-100 text-purple-700'
                        )}>
                          {getNodeLabel(node.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(node.time)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {node.operator || '系统'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailModal({ isOpen: true, node });
                      }}
                      className="p-2 text-gray-400 hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/10 rounded transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {expandedNodes.has(node.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedNodes.has(node.id) && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    {renderNodeContent(node)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredNodes.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无追溯节点数据</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, node: null })}
        title="节点详情"
        size="lg"
        footer={
          <button
            onClick={() => setDetailModal({ isOpen: false, node: null })}
            className="btn btn-primary"
          >
            关闭
          </button>
        }
      >
        {detailModal.node && renderModalContent(detailModal.node)}
      </Modal>
    </div>
  );
};
