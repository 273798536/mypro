/**
 * 数据追溯视图页面
 * 功能：版本变更时间轴、修正历史链、样本详情面板、跨页面双向跳转
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Clock,
  User,
  Hash,
  Image,
  FileText,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  Bot,
  CheckCircle2,
  Edit3,
  GitBranch,
  ExternalLink,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { create } from 'zustand';
import AppLayout from '@/components/layout/AppLayout';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  mockSampleRecords,
  mockMediaBatches,
  mockVersionRecords,
  mockCorrectionRecords,
  mockConclusionRecords,
  mockAnomalyRecords,
  type SampleRecord,
  type VersionRecord,
  type CorrectionRecord,
  type ConclusionRecord,
} from '@/mock/sampleData';

/* =========================================================
 * 类型定义
 * ========================================================= */

/** 时间轴节点类型 */
type TimelineNodeType =
  | 'create'
  | 'version'
  | 'correction'
  | 'ai_analysis'
  | 'conclusion'
  | 'review';

/** 时间轴节点 */
interface TimelineNode {
  id: string;
  type: TimelineNodeType;
  title: string;
  description: string;
  timestamp: string;
  operator: string;
  versionNo?: string;
  metadata?: Record<string, unknown>;
}

/** 修正历史链节点 */
interface CorrectionChainNode {
  id: string;
  step: 'manual_correction' | 'model_reanalysis' | 'conclusion_update';
  title: string;
  content: string;
  operator?: string;
  timestamp: string;
  beforeValue?: string;
  afterValue?: string;
  fieldName?: string;
  status?: 'pending' | 'approved' | 'rejected';
  confidence?: number;
  children?: CorrectionChainNode[];
}

/** 追溯视图Store状态 */
interface TraceViewState {
  /** 当前高亮的时间轴节点ID */
  activeTimelineNodeId: string | null;
  setActiveTimelineNode: (id: string | null) => void;

  /** 当前高亮的修正链节点ID */
  activeChainNodeId: string | null;
  setActiveChainNode: (id: string | null) => void;

  /** 复制状态 */
  copiedField: string | null;
  setCopiedField: (field: string | null) => void;
}

/** 追溯视图Store */
const useTraceViewStore = create<TraceViewState>((set) => ({
  activeTimelineNodeId: null,
  setActiveTimelineNode: (id) => set({ activeTimelineNodeId: id }),

  activeChainNodeId: null,
  setActiveChainNode: (id) => set({ activeChainNodeId: id }),

  copiedField: null,
  setCopiedField: (field) => set({ copiedField: field }),
}));

/* =========================================================
 * 时间轴节点配置（颜色、图标）
 * ========================================================= */

const TIMELINE_NODE_CONFIG: Record<
  TimelineNodeType,
  {
    color: string;
    bgColor: string;
    ringColor: string;
    label: string;
  }
> = {
  create: {
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    ringColor: 'ring-emerald-200 dark:ring-emerald-900',
    label: '创建',
  },
  version: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    ringColor: 'ring-blue-200 dark:ring-blue-900',
    label: '版本变更',
  },
  correction: {
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    ringColor: 'ring-amber-200 dark:ring-amber-900',
    label: '人工修正',
  },
  ai_analysis: {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    ringColor: 'ring-purple-200 dark:ring-purple-900',
    label: 'AI分析',
  },
  conclusion: {
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    ringColor: 'ring-indigo-200 dark:ring-indigo-900',
    label: '结论',
  },
  review: {
    color: 'bg-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    ringColor: 'ring-teal-200 dark:ring-teal-900',
    label: '审核',
  },
};

/* =========================================================
 * 辅助函数：构造时间轴数据
 * ========================================================= */

function buildTimelineData(
  sample: SampleRecord | null,
  versions: VersionRecord[],
  corrections: CorrectionRecord[],
  conclusions: ConclusionRecord[],
): TimelineNode[] {
  const nodes: TimelineNode[] = [];

  if (!sample) return nodes;

  // 创建节点
  nodes.push({
    id: `create-${sample.id}`,
    type: 'create',
    title: '样本记录创建',
    description: `样本编号 ${sample.sampleNo} 创建成功，物种名：${sample.speciesName}`,
    timestamp: sample.createdAt,
    operator: sample.testedBy,
  });

  // 版本变更节点
  for (const v of versions) {
    if (v.entityType !== '样本记录' || v.entityId !== sample.id) continue;

    let type: TimelineNodeType = 'version';
    if (v.operation === '审核') type = 'review';
    else if (v.operation === '修正') type = 'correction';
    else if (v.changedFields.includes('standardSpeciesName')) type = 'ai_analysis';

    nodes.push({
      id: `version-${v.id}`,
      type,
      title: `${v.operation} - v${v.versionNo}`,
      description: v.changeRemark,
      timestamp: v.operatedAt,
      operator: v.operator,
      versionNo: `v${v.versionNo}`,
      metadata: {
        changedFields: v.changedFields,
        operation: v.operation,
      },
    });
  }

  // 人工修正节点
  for (const c of corrections) {
    if (c.sampleId !== sample.id) continue;

    nodes.push({
      id: `correction-${c.id}`,
      type: 'correction',
      title: `人工修正 - ${c.fieldName}`,
      description: c.reason,
      timestamp: c.correctedAt,
      operator: c.correctedBy,
      metadata: {
        fieldName: c.fieldName,
        beforeValue: c.beforeValue,
        afterValue: c.afterValue,
        approvalStatus: c.approvalStatus,
      },
    });
  }

  // 结论节点
  for (const conclusion of conclusions) {
    if (!conclusion.sampleIds.includes(sample.id)) continue;

    nodes.push({
      id: `conclusion-${conclusion.id}`,
      type: 'conclusion',
      title: `结论生成 - ${conclusion.type}`,
      description: conclusion.title,
      timestamp: conclusion.concludedAt,
      operator: conclusion.concludedBy,
      metadata: {
        conclusionType: conclusion.type,
        status: conclusion.status,
      },
    });
  }

  // 按时间排序
  nodes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return nodes;
}

/* =========================================================
 * 辅助函数：构造修正历史链
 * ========================================================= */

function buildCorrectionChain(
  sample: SampleRecord | null,
  corrections: CorrectionRecord[],
  conclusions: ConclusionRecord[],
): CorrectionChainNode[] {
  const chain: CorrectionChainNode[] = [];

  if (!sample) return chain;

  // 获取样本关联的修正
  const sampleCorrections = corrections.filter((c) => c.sampleId === sample.id);

  // 每条修正生成一个链路（人工修正 → 模型再分析 → 结论更新）
  for (const correction of sampleCorrections) {
    const correctionNode: CorrectionChainNode = {
      id: `chain-correction-${correction.id}`,
      step: 'manual_correction',
      title: `人工修正：${correction.fieldName}`,
      content: correction.reason,
      operator: correction.correctedBy,
      timestamp: correction.correctedAt,
      beforeValue: correction.beforeValue,
      afterValue: correction.afterValue,
      fieldName: correction.fieldName,
      status:
        correction.approvalStatus === '已批准'
          ? 'approved'
          : correction.approvalStatus === '已驳回'
          ? 'rejected'
          : 'pending',
      children: [
        {
          id: `chain-ai-${correction.id}`,
          step: 'model_reanalysis',
          title: '模型再分析',
          content: `基于修正后的${correction.fieldName}，AI模型重新进行物种匹配与一致性校验`,
          timestamp: new Date(
            new Date(correction.correctedAt).getTime() + 2 * 60 * 1000,
          ).toISOString(),
          confidence: 95,
          children: [
            {
              id: `chain-conclusion-${correction.id}`,
              step: 'conclusion_update',
              title: '结论更新',
              content:
                '根据修正结果和模型分析自动更新关联结论，同步通知复核人员',
              operator: '系统',
              timestamp: new Date(
                new Date(correction.correctedAt).getTime() + 5 * 60 * 1000,
              ).toISOString(),
              status: correction.approvalStatus === '已批准' ? 'approved' : correction.approvalStatus === '已驳回' ? 'rejected' : 'pending',
            },
          ],
        },
      ],
    };

    chain.push(correctionNode);
  }

  // 如果没有修正但有同义词匹配，生成一个基于AI的链路
  if (sampleCorrections.length === 0 && sample.isSynonymCase) {
    chain.push({
      id: 'chain-synonym-auto',
      step: 'manual_correction',
      title: '同义词自动匹配',
      content: `AI自动检测到物种名称 "${sample.speciesName}" 与标准名称 "${sample.standardSpeciesName}" 匹配`,
      operator: 'AI系统',
      timestamp: sample.updatedAt,
      beforeValue: sample.speciesName,
      afterValue: sample.standardSpeciesName,
      fieldName: 'speciesName',
      status: 'approved',
      children: [
        {
          id: 'chain-synonym-ai',
          step: 'model_reanalysis',
          title: '模型一致性校验',
          content:
            '跨批次校验物种一致性，确认无其他同源冲突，置信度92%',
          timestamp: new Date(
            new Date(sample.updatedAt).getTime() + 1 * 60 * 1000,
          ).toISOString(),
          confidence: 92,
          children: [
            {
              id: 'chain-synonym-conclusion',
              step: 'conclusion_update',
              title: '批次结论同步',
              content:
                '物种名称已标准化，批次适用性评价报告引用标准名称',
              operator: '系统',
              timestamp: new Date(
                new Date(sample.updatedAt).getTime() + 3 * 60 * 1000,
              ).toISOString(),
              status: 'approved',
            },
          ],
        },
      ],
    });
  }

  return chain;
}

/* =========================================================
 * 组件：顶部面包屑导航栏
 * ========================================================= */

function PageHeader() {
  const navigate = useNavigate();
  const params = useParams();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="返回上一页"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <Breadcrumb
              items={[
                { label: '数据追溯', href: '/review' },
                { label: `详情 #${params.id?.slice(-6) ?? ''}` },
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ExternalLink size={14} />}
            onClick={() => navigate('/review')}
          >
            返回复核台
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * 组件：左侧垂直时间轴
 * ========================================================= */

function LeftTimeline() {
  const navigate = useNavigate();
  const params = useParams();
  const { activeTimelineNodeId, setActiveTimelineNode } = useTraceViewStore();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // 查找关联的样本
  const targetSample = useMemo(() => {
    const id = params.id;
    if (!id) return null;

    // 直接按样本ID查找
    let sample = mockSampleRecords.find((s) => s.id === id);
    if (sample) return sample;

    // 按异常ID查找关联样本
    const anomaly = mockAnomalyRecords.find((a) => a.id === id);
    if (anomaly?.sampleId) {
      sample = mockSampleRecords.find((s) => s.id === anomaly.sampleId);
      if (sample) return sample;
    }

    // 按结论ID查找关联样本
    const conclusion = mockConclusionRecords.find((c) => c.id === id);
    if (conclusion?.sampleIds?.length > 0) {
      sample = mockSampleRecords.find((s) => s.id === conclusion.sampleIds[0]);
      if (sample) return sample;
    }

    // 按批号ID查找第一个样本
    const batchSamples = mockSampleRecords.filter((s) => s.batchId === id);
    if (batchSamples.length > 0) return batchSamples[0];

    return mockSampleRecords[0] ?? null;
  }, [params.id]);

  // 构建时间轴数据
  const timelineNodes = useMemo(() => {
    return buildTimelineData(
      targetSample,
      mockVersionRecords,
      mockCorrectionRecords,
      mockConclusionRecords,
    );
  }, [targetSample]);

  if (timelineNodes.length === 0) {
    return (
      <Card className="h-full">
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Clock size={40} className="mb-2 text-slate-300 dark:text-slate-600" />
          <p>暂无版本变更记录</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            版本变更时间轴
          </h3>
        </div>
        <Badge variant="pending" showIcon={false}>
          {timelineNodes.length} 个节点
        </Badge>
      </div>

      <div className="relative pl-2 py-2">
        {/* 时间轴垂直线 */}
        <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-slate-100 dark:from-blue-900 dark:via-slate-700 dark:to-slate-800" />

        <div className="space-y-6">
          {timelineNodes.map((node, index) => {
            const config = TIMELINE_NODE_CONFIG[node.type];
            const isActive = activeTimelineNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="relative flex items-start gap-4"
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => setActiveTimelineNode(isActive ? null : node.id)}
              >
                {/* 圆形节点 */}
                <motion.div
                  animate={{
                    scale: isHovered || isActive ? 1.25 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className={cn(
                    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md ring-4',
                    config.color,
                    config.ringColor,
                    isActive && 'ring-8',
                  )}
                >
                  {node.type === 'create' && <Hash size={16} />}
                  {node.type === 'version' && <Layers size={16} />}
                  {node.type === 'correction' && <Edit3 size={16} />}
                  {node.type === 'ai_analysis' && <Bot size={16} />}
                  {node.type === 'conclusion' && <FileText size={16} />}
                  {node.type === 'review' && <CheckCircle2 size={16} />}
                </motion.div>

                {/* 节点内容 */}
                <div
                  className={cn(
                    'flex-1 cursor-pointer rounded-lg border p-3 transition-all',
                    isActive
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                        config.bgColor,
                        node.type === 'create' &&
                          'text-emerald-700 dark:text-emerald-400',
                        node.type === 'version' &&
                          'text-blue-700 dark:text-blue-400',
                        node.type === 'correction' &&
                          'text-amber-700 dark:text-amber-400',
                        node.type === 'ai_analysis' &&
                          'text-purple-700 dark:text-purple-400',
                        node.type === 'conclusion' &&
                          'text-indigo-700 dark:text-indigo-400',
                        node.type === 'review' &&
                          'text-teal-700 dark:text-teal-400',
                      )}
                    >
                      {config.label}
                    </span>
                    {node.versionNo && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {node.versionNo}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    {node.title}
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                    {node.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {node.operator}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(node.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* =========================================================
 * 组件：中间修正历史链卡片
 * ========================================================= */

function MiddleCorrectionChain() {
  const navigate = useNavigate();
  const params = useParams();
  const { activeChainNodeId, setActiveChainNode } = useTraceViewStore();
  const [hoveredChainId, setHoveredChainId] = useState<string | null>(null);

  // 查找关联的样本
  const targetSample = useMemo(() => {
    const id = params.id;
    if (!id) return null;

    let sample = mockSampleRecords.find((s) => s.id === id);
    if (sample) return sample;

    const anomaly = mockAnomalyRecords.find((a) => a.id === id);
    if (anomaly?.sampleId) {
      sample = mockSampleRecords.find((s) => s.id === anomaly.sampleId);
      if (sample) return sample;
    }

    const conclusion = mockConclusionRecords.find((c) => c.id === id);
    if (conclusion?.sampleIds?.length > 0) {
      sample = mockSampleRecords.find((s) => s.id === conclusion.sampleIds[0]);
      if (sample) return sample;
    }

    const batchSamples = mockSampleRecords.filter((s) => s.batchId === id);
    if (batchSamples.length > 0) return batchSamples[0];

    return mockSampleRecords[0] ?? null;
  }, [params.id]);

  // 构建修正链
  const correctionChains = useMemo(() => {
    return buildCorrectionChain(
      targetSample,
      mockCorrectionRecords,
      mockConclusionRecords,
    );
  }, [targetSample]);

  /** 单个链路节点渲染 */
  const renderChainNode = (
    node: CorrectionChainNode,
    level: number,
    parentId: string | null,
  ) => {
    const isActive = activeChainNodeId === node.id;
    const isHovered = hoveredChainId === node.id;
    const chainId = parentId ?? node.id;

    const stepConfig = {
      manual_correction: {
        icon: Edit3,
        color: 'from-amber-500 to-orange-500',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        label: '人工修正',
      },
      model_reanalysis: {
        icon: Bot,
        color: 'from-purple-500 to-indigo-500',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-400',
        label: '模型再分析',
      },
      conclusion_update: {
        icon: Sparkles,
        color: 'from-emerald-500 to-teal-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-400',
        label: '结论更新',
      },
    };

    const config = stepConfig[node.step];
    const Icon = config.icon;

    return (
      <div key={node.id} className="relative">
        {/* 连接到父节点的线 */}
        {level > 0 && (
          <div className="absolute -top-6 left-[30px] h-6 w-0.5 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: level * 0.1, duration: 0.3 }}
          className="relative"
          onMouseEnter={() => setHoveredChainId(node.id)}
          onMouseLeave={() => setHoveredChainId(null)}
          onClick={() => setActiveChainNode(isActive ? null : node.id)}
        >
          {/* 卡片主体 */}
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer',
              isActive
                ? `${config.border} ${config.bg} shadow-lg scale-[1.01]`
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md',
              isHovered && !isActive && 'border-slate-300 dark:border-slate-600',
            )}
            style={{ marginLeft: level > 0 ? 24 : 0 }}
          >
            {/* 左侧渐变条 */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b',
                config.color,
              )}
            />

            <div className="flex items-start gap-3 pl-2">
              {/* 步骤图标 */}
              <motion.div
                animate={{ scale: isHovered || isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                  config.color,
                )}
              >
                <Icon size={18} />
              </motion.div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                      config.bg,
                      config.text,
                    )}
                  >
                    {config.label}
                  </span>
                  {node.status && (
                    <Badge
                      variant={
                        node.status === 'approved'
                          ? 'approved'
                          : node.status === 'rejected'
                          ? 'rejected'
                          : 'pending'
                      }
                      showIcon={false}
                    >
                      {node.status === 'approved'
                        ? '已完成'
                        : node.status === 'rejected'
                        ? '已驳回'
                        : '处理中'}
                    </Badge>
                  )}
                  {node.confidence !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <Sparkles size={11} />
                      置信度 {node.confidence}%
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {node.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                  {node.content}
                </p>

                {/* 字段变更对比 */}
                {node.beforeValue !== undefined &&
                  node.afterValue !== undefined && (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-400 mr-1">
                          {node.fieldName ?? '字段'}:
                        </span>
                        <span className="line-through text-red-500 mr-2">
                          {node.beforeValue}
                        </span>
                        <ArrowRight
                          size={12}
                          className="inline text-slate-400 mr-2"
                        />
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {node.afterValue}
                        </span>
                      </div>
                    </div>
                  )}

                {/* 操作人信息 */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    {node.operator && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {node.operator}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(node.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {level === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/review');
                      }}
                      className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <Eye size={11} />
                      查看详情
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 子节点递归渲染 */}
          {node.children && node.children.length > 0 && (
            <div className="mt-6 space-y-6">
              {node.children.map((child) =>
                renderChainNode(child, level + 1, chainId),
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            修正历史链
          </h3>
        </div>
        <Badge variant="warning" showIcon={false}>
          {correctionChains.length} 条链路
        </Badge>
      </div>

      {correctionChains.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Edit3 size={40} className="mb-2 text-slate-300 dark:text-slate-600" />
          <p>暂无修正历史</p>
          <p className="text-xs mt-1">该样本尚未经过人工修正</p>
        </div>
      ) : (
        <div className="space-y-8 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
          {correctionChains.map((chain) =>
            renderChainNode(chain, 0, null),
          )}
        </div>
      )}
    </Card>
  );
}

/* =========================================================
 * 组件：右侧样本详情面板
 * ========================================================= */

function RightDetailPanel() {
  const navigate = useNavigate();
  const params = useParams();
  const { copiedField, setCopiedField } = useTraceViewStore();

  // 查找当前样本
  const targetSample = useMemo(() => {
    const id = params.id;
    if (!id) return null;

    let sample = mockSampleRecords.find((s) => s.id === id);
    if (sample) return sample;

    const anomaly = mockAnomalyRecords.find((a) => a.id === id);
    if (anomaly?.sampleId) {
      sample = mockSampleRecords.find((s) => s.id === anomaly.sampleId);
      if (sample) return sample;
    }

    const conclusion = mockConclusionRecords.find((c) => c.id === id);
    if (conclusion?.sampleIds?.length > 0) {
      sample = mockSampleRecords.find((s) => s.id === conclusion.sampleIds[0]);
      if (sample) return sample;
    }

    const batchSamples = mockSampleRecords.filter((s) => s.batchId === id);
    if (batchSamples.length > 0) return batchSamples[0];

    return mockSampleRecords[0] ?? null;
  }, [params.id]);

  // 关联批号
  const relatedBatch = useMemo(() => {
    if (!targetSample?.batchId) return null;
    return mockMediaBatches.find((b) => b.id === targetSample.batchId) ?? null;
  }, [targetSample]);

  // 复制到剪贴板
  const handleCopy = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // 忽略剪贴板错误
    }
  };

  if (!targetSample) {
    return (
      <Card className="h-full">
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <AlertTriangle
            size={40}
            className="mb-2 text-slate-300 dark:text-slate-600"
          />
          <p>未找到关联样本数据</p>
          <button
            onClick={() => navigate('/review')}
            className="mt-4 text-blue-500 text-sm hover:underline"
          >
            返回复核台
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            样本详情
          </h3>
        </div>
        <Badge
          variant={
            targetSample.status === '已审核' || targetSample.status === '已确认'
              ? 'approved'
              : targetSample.status === '需修正'
              ? 'rejected'
              : 'pending'
          }
        >
          {targetSample.status}
        </Badge>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* ===== 固定显示区域：原始行号 / 图片名 / 来源备注 ===== */}
        <div className="space-y-3 rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-4 dark:border-blue-900/50 dark:from-blue-950/20 dark:to-indigo-950/10">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Layers size={12} />
            追溯关键信息（固定显示）
          </div>

          {/* 原始行号 */}
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Hash size={11} />
                原始行号
              </span>
              <button
                onClick={() =>
                  handleCopy('originalRowNo', String(targetSample.originalRowNo))
                }
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                title="复制"
              >
                {copiedField === 'originalRowNo' ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
            <button
              onClick={() => navigate('/review')}
              className="w-full text-left rounded-lg bg-white px-3 py-2 text-sm font-mono font-semibold text-blue-600 underline decoration-blue-300/60 underline-offset-2 hover:bg-blue-50 transition-colors dark:bg-slate-800 dark:text-blue-400 dark:decoration-blue-700/50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-900"
              title="点击跳转源数据"
            >
              第 {targetSample.originalRowNo} 行
              <ExternalLink
                size={12}
                className="inline ml-1.5 opacity-60"
              />
            </button>
          </div>

          {/* 图片文件名 */}
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Image size={11} />
                图片文件名
              </span>
              <button
                onClick={() => handleCopy('imageName', targetSample.imageName)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                title="复制"
              >
                {copiedField === 'imageName' ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
            <button
              onClick={() => navigate('/review')}
              className="w-full text-left rounded-lg bg-white px-3 py-2 text-sm font-mono text-blue-600 underline decoration-blue-300/60 underline-offset-2 hover:bg-blue-50 transition-colors dark:bg-slate-800 dark:text-blue-400 dark:decoration-blue-700/50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-900 truncate"
              title={targetSample.imageName}
            >
              {targetSample.imageName}
              <ExternalLink
                size={12}
                className="inline ml-1.5 opacity-60"
              />
            </button>
          </div>

          {/* 来源备注 */}
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <FileText size={11} />
                来源备注
              </span>
              <button
                onClick={() => handleCopy('sourceRemark', targetSample.sourceRemark)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                title="复制"
              >
                {copiedField === 'sourceRemark' ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
            <button
              onClick={() => navigate('/review')}
              className="w-full text-left rounded-lg bg-white px-3 py-2 text-xs text-blue-600 underline decoration-blue-300/60 underline-offset-2 hover:bg-blue-50 transition-colors dark:bg-slate-800 dark:text-blue-400 dark:decoration-blue-700/50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-900 line-clamp-2"
              title={targetSample.sourceRemark}
            >
              {targetSample.sourceRemark}
              <ExternalLink
                size={12}
                className="inline ml-1.5 opacity-60 align-middle"
              />
            </button>
          </div>
        </div>

        {/* ===== 样本基础信息 ===== */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            基础信息
          </h4>

          <InfoRow
            label="样本编号"
            value={targetSample.sampleNo}
            onCopy={() => handleCopy('sampleNo', targetSample.sampleNo)}
            copied={copiedField === 'sampleNo'}
          />

          <InfoRow
            label="样本名称"
            value={targetSample.sampleName}
            onCopy={() => handleCopy('sampleName', targetSample.sampleName)}
            copied={copiedField === 'sampleName'}
          />

          {/* 物种信息 - 区分原始名和标准名 */}
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 flex items-center gap-2">
              {targetSample.isSynonymCase && (
                <Badge variant="warning" showIcon={false}>
                  同义匹配
                </Badge>
              )}
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                物种信息
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-slate-500">原始录入：</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {targetSample.speciesName}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-slate-500">标准名称：</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {targetSample.standardSpeciesName}
                </span>
              </div>
            </div>
          </div>

          {/* 检测结果 */}
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                检测结果
              </span>
              <Badge
                variant={
                  targetSample.result === '阳性'
                    ? 'danger'
                    : targetSample.result === '可疑'
                    ? 'warning'
                    : 'approved'
                }
              >
                {targetSample.result}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">菌落数：</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {targetSample.colonyCount ?? '-'} CFU/g
                </span>
              </div>
              <div>
                <span className="text-slate-500">培养温度：</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {targetSample.incubateTemp}℃
                </span>
              </div>
              <div>
                <span className="text-slate-500">培养时长：</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {targetSample.incubateHours}h
                </span>
              </div>
              <div>
                <span className="text-slate-500">检测人：</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {targetSample.testedBy}
                </span>
              </div>
            </div>
          </div>

          {/* 关联批号 */}
          {relatedBatch && (
            <button
              onClick={() => navigate(`/trace/${relatedBatch.id}`)}
              className="w-full text-left rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <MapPin size={11} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  关联批号
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {relatedBatch.batchNo}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {relatedBatch.mediaName}
                  </p>
                </div>
                <ExternalLink size={14} className="text-slate-400 ml-2 shrink-0" />
              </div>
            </button>
          )}

          {/* 审核信息 */}
          {(targetSample.reviewedBy || targetSample.reviewedAt) && (
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  审核信息
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {targetSample.reviewedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">审核人：</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {targetSample.reviewedBy}
                    </span>
                  </div>
                )}
                {targetSample.reviewedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">审核时间：</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {new Date(targetSample.reviewedAt).toLocaleDateString(
                        'zh-CN',
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== 快速操作 ===== */}
        <div className="pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Eye size={14} />}
              onClick={() => navigate('/review')}
              className="justify-center"
            >
              查看源数据
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit3 size={14} />}
              onClick={() => navigate('/review')}
              className="justify-center"
            >
              发起修正
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** 信息行子组件 */
interface InfoRowProps {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}

function InfoRow({ label, value, onCopy, copied }: InfoRowProps) {
  return (
    <div className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-slate-900 dark:text-white font-mono">
          {value}
        </span>
        <button
          onClick={onCopy}
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded',
            copied
              ? 'text-emerald-500 opacity-100'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700',
          )}
          title={copied ? '已复制' : '复制'}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
 * 主组件：数据追溯视图
 * ========================================================= */

export default function TraceView() {
  const params = useParams();
  const navigate = useNavigate();

  // 初始化提示
  useEffect(() => {
    // 如果没有id参数，跳转回复核台
    if (!params.id) {
      navigate('/review');
    }
  }, [params.id, navigate]);

  return (
    <AppLayout>
      <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
        {/* 顶部面包屑 */}
        <PageHeader />

        {/* 三栏布局 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 grid grid-cols-12 gap-4 min-h-0"
        >
          {/* 左侧时间轴 */}
          <div className="col-span-12 lg:col-span-3 min-h-0 overflow-y-auto">
            <LeftTimeline />
          </div>

          {/* 中间修正历史链 */}
          <div className="col-span-12 lg:col-span-5 min-h-0 overflow-y-auto">
            <MiddleCorrectionChain />
          </div>

          {/* 右侧样本详情 */}
          <div className="col-span-12 lg:col-span-4 min-h-0 overflow-y-auto">
            <RightDetailPanel />
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
