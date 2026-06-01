import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  ShoppingCart,
  DollarSign,
  TrendingDown,
  Clock,
  MessageSquare,
  FileText,
  Paperclip,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Circle,
  Square,
  Triangle,
  Sparkles,
  RefreshCw,
  Tag,
  ChevronDown,
  ChevronUp,
  Package,
  Zap,
  Megaphone,
  Diamond,
  Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { MemberStatus, MemberStatusRecord, Activity, CustomerServiceNote } from '../types';
import { cn } from '../lib/utils';

const statusShapeConfig = {
  [MemberStatus.active]: { shape: Circle, color: '#10B981' },
  [MemberStatus.at_risk]: { shape: AlertTriangle, color: '#F59E0B' },
  [MemberStatus.silent]: { shape: Square, color: '#64748B' },
  [MemberStatus.churned]: { shape: Triangle, color: '#EF4444' },
  [MemberStatus.new]: { shape: Sparkles, color: '#3B82F6' },
  [MemberStatus.reactivated]: { shape: RefreshCw, color: '#8B5CF6' },
};

const sourceLabels: Record<string, string> = {
  auto: '自动',
  manual: '人工',
  customer_service: '客服',
};

const typeColors: Record<string, { border: string; bg: string; text: string }> = {
  complaint: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  consult: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  feedback: { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  other: { border: 'border-l-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
};

const typeLabels: Record<string, string> = {
  complaint: '投诉',
  consult: '咨询',
  feedback: '反馈',
  other: '其他',
};

const activityColors = [
  'bg-amber-200/50',
  'bg-purple-200/50',
  'bg-blue-200/50',
  'bg-pink-200/50',
  'bg-emerald-200/50',
];

const activityTypeIcons: Record<string, React.ElementType> = {
  promotion: Megaphone,
  version_update: Diamond,
  event: Zap,
  campaign: Package,
};

const activityTypeLabels: Record<string, string> = {
  promotion: '促销活动',
  version_update: '版本更新',
  event: '事件',
  campaign: '营销活动',
};

const MemberDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getMemberById = useStore((state) => state.getMemberById);
  const addCustomerServiceNote = useStore((state) => state.addCustomerServiceNote);
  const activities = useStore((state) => state.activities);

  const member = id ? getMemberById(id) : undefined;

  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({
    type: 'consult' as CustomerServiceNote['type'],
    content: '',
    relatedStatus: '' as MemberStatus | '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const memberActivities = useMemo(() => {
    if (!member) return [];
    return activities.filter((activity) =>
      member.statusHistory.some(
        (record) =>
          record.activities.includes(activity.id) ||
          (new Date(record.startDate) <= new Date(activity.endDate) &&
            new Date(record.endDate) >= new Date(activity.startDate))
      )
    );
  }, [member, activities]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getChurnProbabilityColor = (prob: number) => {
    if (prob < 0.3) return '#10B981';
    if (prob < 0.6) return '#F59E0B';
    return '#EF4444';
  };

  const handleSubmitNote = () => {
    if (!member || !noteForm.content.trim()) return;
    setIsSubmitting(true);
    addCustomerServiceNote(member.id, {
      date: new Date().toISOString(),
      operator: '当前客服',
      content: noteForm.content,
      type: noteForm.type,
      relatedStatus: noteForm.relatedStatus || undefined,
    });
    setNoteForm({ type: 'consult', content: '', relatedStatus: '' });
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const getBehaviorDataForRecord = (record: MemberStatusRecord) => {
    const days = Math.ceil(
      (new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      orderCount: Math.floor(Math.random() * 10) + 1,
      totalSpent: Math.floor(Math.random() * 5000) + 500,
      visitCount: Math.floor(Math.random() * 30) + 5,
      avgStayTime: Math.floor(Math.random() * 30) + 5,
      days,
    };
  };

  const getStatusTransitionLabel = (record: MemberStatusRecord, index: number, history: MemberStatusRecord[]) => {
    if (index === 0) return `初始状态: ${statusLabel(record.status)}`;
    const prev = history[index - 1];
    return `${statusLabel(prev.status)} → ${statusLabel(record.status)}`;
  };

  const statusLabel = (status: MemberStatus) => {
    const config = {
      [MemberStatus.active]: '活跃',
      [MemberStatus.at_risk]: '高危',
      [MemberStatus.silent]: '沉默',
      [MemberStatus.churned]: '流失',
      [MemberStatus.new]: '新会员',
      [MemberStatus.reactivated]: '回流',
    };
    return config[status];
  };

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="text-gray-400 mb-4" size={48} />
        <p className="text-gray-500 text-lg">会员不存在</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
          <span>返回列表</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">会员详情</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                  <User className="text-white" size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-gray-500">{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-gray-500">注册于 {formatDate(member.registerDate)}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={member.currentStatus} size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <ShoppingCart size={14} />
                  <span>累计订单</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{member.totalOrders}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <DollarSign size={14} />
                  <span>累计消费</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">¥{member.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">流失概率</span>
                  </div>
                  <span
                    className="text-lg font-bold"
                    style={{ color: getChurnProbabilityColor(member.churnProbability) }}
                  >
                    {(member.churnProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${member.churnProbability * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: getChurnProbabilityColor(member.churnProbability) }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">预测3个月后状态</span>
                </div>
                <StatusBadge status={member.predictedStatus3m} size="md" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Clock size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">状态时间轴</h3>
        </div>

        <div className="relative">
          {memberActivities.length > 0 && (
            <div className="absolute left-8 top-0 bottom-0 w-0.5" style={{ zIndex: 0 }}>
              {memberActivities.map((activity, idx) => {
                const startDate = new Date(activity.startDate);
                const endDate = new Date(activity.endDate);
                const firstDate = new Date(member.statusHistory[0]?.startDate || Date.now());
                const lastDate = new Date(
                  member.statusHistory[member.statusHistory.length - 1]?.endDate || Date.now()
                );
                const totalDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                const topPercent = Math.max(0, ((startDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100);
                const bottomPercent = Math.max(0, 100 - ((endDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100);
                
                return (
                  <div
                    key={activity.id}
                    className={cn('absolute left-0 right-0', activityColors[idx % activityColors.length])}
                    style={{
                      top: `${topPercent}%`,
                      bottom: `${bottomPercent}%`,
                      left: '-4px',
                      right: '-4px',
                      borderRadius: '4px',
                    }}
                  />
                );
              })}
            </div>
          )}

          <div className="relative">
            <div
              className="absolute left-8 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-300 via-amber-300 to-red-300"
              style={{ borderStyle: 'dashed', borderWidth: 0 }}
            >
              <svg className="absolute inset-0 w-full h-full">
                <line
                  x1="50%"
                  y1="0"
                  x2="50%"
                  y2="100%"
                  stroke="url(#timelineGradient)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <defs>
                  <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="space-y-0">
              {member.statusHistory.map((record, index) => {
                const ShapeIcon = statusShapeConfig[record.status].shape;
                const isExpanded = expandedNodeId === record.id;
                const behaviorData = getBehaviorDataForRecord(record);
                const recordActivities = activities.filter((a) => record.activities.includes(a.id));

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * index }}
                    className="relative pl-20 pb-8 last:pb-0"
                  >
                    <div
                      className="absolute left-6 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center z-10"
                      style={{ borderColor: statusShapeConfig[record.status].color, marginTop: '2px' }}
                    >
                      <ShapeIcon
                        size={12}
                        fill={statusShapeConfig[record.status].color}
                        style={{ color: statusShapeConfig[record.status].color }}
                      />
                    </div>

                    <div
                      className={cn(
                        'bg-gray-50 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-100',
                        isExpanded && 'ring-2 ring-blue-200 bg-blue-50'
                      )}
                      onClick={() => setExpandedNodeId(isExpanded ? null : record.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {getStatusTransitionLabel(record, index, member.statusHistory)}
                            </span>
                            {recordActivities.map((activity) => {
                              const ActivityIcon = activityTypeIcons[activity.type] || Package;
                              return (
                                <span
                                  key={activity.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700"
                                >
                                  <ActivityIcon size={10} />
                                  {activity.name}
                                </span>
                              );
                            })}
                            {record.source === 'customer_service' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                <MessageSquare size={10} />
                                客服操作
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{formatDate(record.startDate)} ~ {formatDate(record.endDate)}</span>
                            <span>来源：{sourceLabels[record.source]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={record.status} size="sm" />
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">该状态期内行为数据</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">订单数</p>
                                  <p className="text-lg font-bold text-gray-900">{behaviorData.orderCount}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">消费金额</p>
                                  <p className="text-lg font-bold text-gray-900">¥{behaviorData.totalSpent.toLocaleString()}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">访问次数</p>
                                  <p className="text-lg font-bold text-gray-900">{behaviorData.visitCount}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">平均停留</p>
                                  <p className="text-lg font-bold text-gray-900">{behaviorData.avgStayTime}分钟</p>
                                </div>
                              </div>
                              {record.remark && (
                                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <p className="text-sm text-yellow-800">备注：{record.remark}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Tag size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">行为标签对比</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-blue-500" />
              <h4 className="font-medium text-gray-700">行为标签（基于实际行为）</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.behaviorTags.map((tag) => {
                const isConflict = member.tagConflict && !member.systemTags.includes(tag);
                return (
                  <motion.span
                    key={tag}
                    animate={isConflict ? { x: [-2, 2, -2, 2, 0] } : {}}
                    transition={isConflict ? { duration: 0.4, repeat: Infinity, repeatDelay: 2 } : {}}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium',
                      isConflict
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                        : 'bg-blue-100 text-blue-800'
                    )}
                  >
                    {isConflict && <AlertTriangle size={12} className="text-yellow-600" />}
                    {tag}
                  </motion.span>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-purple-500" />
              <h4 className="font-medium text-gray-700">系统标签（自动打标）</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.systemTags.map((tag) => {
                const isConflict = member.tagConflict && !member.behaviorTags.includes(tag);
                return (
                  <motion.span
                    key={tag}
                    animate={isConflict ? { x: [-2, 2, -2, 2, 0] } : {}}
                    transition={isConflict ? { duration: 0.4, repeat: Infinity, repeatDelay: 2 } : {}}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium',
                      isConflict
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                        : 'bg-purple-100 text-purple-800'
                    )}
                  >
                    {isConflict && <AlertTriangle size={12} className="text-yellow-600" />}
                    {tag}
                  </motion.span>
                );
              })}
            </div>
          </div>
        </div>

        {member.tagConflict && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200"
          >
            <div className="flex items-start gap-3">
              <Info size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">标签不一致说明</h4>
                <p className="text-sm text-yellow-700">
                  该会员的行为数据与系统自动打标存在差异。行为标签基于实际消费、浏览等行为数据计算，
                  系统标签基于马尔可夫模型预测结果。建议人工核实该会员的真实状态，必要时手动调整标签。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">客服备注证据</h3>
          </div>
          <span className="text-sm text-gray-500">共 {member.customerServiceNotes.length} 条记录</span>
        </div>

        <div className="space-y-4 mb-6">
          {[...member.customerServiceNotes].reverse().map((note, index) => {
            const colorConfig = typeColors[note.type] || typeColors.other;
            const relatedRecord = note.relatedStatus
              ? member.statusHistory.find(
                  (r) => r.status === note.relatedStatus && new Date(r.startDate) <= new Date(note.date)
                )
              : null;

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                className={cn(
                  'rounded-xl p-4 border-l-4 border',
                  colorConfig.border,
                  colorConfig.bg,
                  'border-t border-r border-b border-gray-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', colorConfig.bg, colorConfig.text)}>
                        {typeLabels[note.type]}
                      </span>
                      <span className="text-sm text-gray-500">{note.operator}</span>
                      <span className="text-sm text-gray-400">{formatDateTime(note.date)}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{note.content}</p>
                    {note.relatedStatus && relatedRecord && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs text-gray-600 border border-gray-200">
                        <ArrowLeft size={10} />
                        关联状态变更：{statusLabel(relatedRecord.status)}
                      </div>
                    )}
                  </div>
                  {note.attachmentUrl && (
                    <button className="ml-4 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Paperclip size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {member.customerServiceNotes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FileText size={40} className="mx-auto mb-2" />
              <p>暂无客服备注</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} className="text-gray-600" />
            <h4 className="font-medium text-gray-700">添加新备注</h4>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">类型</label>
                <select
                  value={noteForm.type}
                  onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value as CustomerServiceNote['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="complaint">投诉</option>
                  <option value="consult">咨询</option>
                  <option value="feedback">反馈</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">关联状态（可选）</label>
                <select
                  value={noteForm.relatedStatus}
                  onChange={(e) => setNoteForm({ ...noteForm, relatedStatus: e.target.value as MemberStatus | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">不关联</option>
                  {Object.values(MemberStatus).map((status) => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">内容</label>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="请输入备注内容..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                <Paperclip size={16} />
                <span>添加附件</span>
              </button>
              <button
                onClick={handleSubmitNote}
                disabled={!noteForm.content.trim() || isSubmitting}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                  noteForm.content.trim() && !isSubmitting
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send size={16} />
                <span>{isSubmitting ? '提交中...' : '提交备注'}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Megaphone size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">活动重叠追溯</h3>
        </div>

        {memberActivities.length > 0 ? (
          <div className="relative">
            <div className="h-16 mb-4 bg-gray-50 rounded-xl relative overflow-hidden">
              {memberActivities.map((activity, idx) => {
                const firstDate = new Date(member.statusHistory[0]?.startDate || Date.now());
                const lastDate = new Date(
                  member.statusHistory[member.statusHistory.length - 1]?.endDate || Date.now()
                );
                const totalDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
                const startDate = new Date(activity.startDate);
                const endDate = new Date(activity.endDate);
                const leftPercent = Math.max(0, ((startDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100);
                const widthPercent = Math.max(5, Math.min(100 - leftPercent, ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100));

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 0.7, scaleY: 1 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className={cn('absolute top-0 bottom-0 rounded-lg', activityColors[idx % activityColors.length])}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      transformOrigin: 'center',
                    }}
                  />
                );
              })}
            </div>

            <div className="space-y-3">
              {memberActivities.map((activity, idx) => {
                const ActivityIcon = activityTypeIcons[activity.type] || Package;
                const affectedRecords = member.statusHistory.filter(
                  (r) =>
                    new Date(r.startDate) <= new Date(activity.endDate) &&
                    new Date(r.endDate) >= new Date(activity.startDate)
                );
                const hasStatusChange = affectedRecords.length > 1;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * idx }}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          activityColors[idx % activityColors.length].replace('/50', '')
                        )}
                      >
                        <ActivityIcon size={20} className="text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            {activityTypeLabels[activity.type]}
                          </span>
                          {activity.version && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              <Diamond size={10} className="inline mr-1" />
                              {activity.version}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {formatDate(activity.startDate)} ~ {formatDate(activity.endDate)}
                        </p>
                        {hasStatusChange && affectedRecords.length > 1 && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">状态影响：</span>
                            {affectedRecords.map((record, i) => (
                              <React.Fragment key={record.id}>
                                <StatusBadge status={record.status} size="sm" />
                                {i < affectedRecords.length - 1 && (
                                  <ArrowLeft size={12} className="text-gray-400" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full flex-shrink-0 mt-2',
                          activityColors[idx % activityColors.length].replace('/50', '').replace('bg-', 'bg-')
                        )}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Package size={48} className="mx-auto mb-3" />
            <p className="text-lg">该会员暂无参与活动记录</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MemberDetail;
