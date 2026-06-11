import { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

/**
 * AI 结果条目接口
 */
export interface CorrectionItem {
  /** 条目唯一标识 */
  id: string;
  /** 字段名称 */
  field_name: string;
  /** AI 输出的原值 */
  original_value: string;
  /** 当前修正后的值（空表示未修正） */
  corrected_value: string;
  /** 修正原因（空表示未填写） */
  reason: string;
  /** AI 置信度（0-1） */
  confidence?: number;
  /** 关联的样本ID */
  sample_id?: string;
}

/**
 * 人工修正面板组件属性接口
 */
interface HumanCorrectionPanelProps {
  /** AI 结果列表 */
  items: CorrectionItem[];
  /** 单条应用修正回调 */
  onApplyCorrection: (id: string, correctedValue: string, reason: string) => void;
  /** 批量应用已修正项回调 */
  onBatchApply: (corrections: { id: string; correctedValue: string; reason: string }[]) => void;
}

/**
 * 人工修正面板组件
 * 逐条列出 AI 结果，支持原值、修正值、修正原因输入，并统计进度
 */
export function HumanCorrectionPanel({
  items,
  onApplyCorrection,
  onBatchApply,
}: HumanCorrectionPanelProps) {
  /** 本地编辑状态（用于未确认提交前的临时编辑） */
  const [edits, setEdits] = useState<
    Record<string, { corrected_value: string; reason: string }>
  >({});
  /** 展开状态 */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /**
   * 获取某个条目的当前编辑值（优先取本地编辑状态）
   */
  const getItemEdit = (item: CorrectionItem) => {
    if (edits[item.id]) {
      return edits[item.id];
    }
    return {
      corrected_value: item.corrected_value,
      reason: item.reason,
    };
  };

  /**
   * 更新本地编辑值
   */
  const updateEdit = (
    id: string,
    field: 'corrected_value' | 'reason',
    value: string
  ) => {
    setEdits((prev) => {
      const current = prev[id] || { corrected_value: '', reason: '' };
      return {
        ...prev,
        [id]: { ...current, [field]: value },
      };
    });
  };

  /**
   * 判断条目是否已修正
   */
  const isItemCorrected = (item: CorrectionItem): boolean => {
    const edit = getItemEdit(item);
    return (
      edit.corrected_value.trim() !== '' &&
      edit.corrected_value !== item.original_value
    );
  };

  /**
   * 切换条目展开状态
   */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 应用单条修正
   */
  const applySingle = (item: CorrectionItem) => {
    const edit = getItemEdit(item);
    if (edit.corrected_value.trim() === '') return;
    onApplyCorrection(item.id, edit.corrected_value.trim(), edit.reason.trim());
  };

  /**
   * 批量应用所有已修正项
   */
  const applyBatch = () => {
    const corrections = items
      .filter((item) => isItemCorrected(item))
      .map((item) => {
        const edit = getItemEdit(item);
        return {
          id: item.id,
          correctedValue: edit.corrected_value.trim(),
          reason: edit.reason.trim(),
        };
      });
    if (corrections.length > 0) {
      onBatchApply(corrections);
    }
  };

  /** 已修正数量 */
  const correctedCount = items.filter((item) => isItemCorrected(item)).length;
  /** 总条目数 */
  const totalCount = items.length;
  /** 进度百分比 */
  const progressPercent = totalCount > 0 ? (correctedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-deep-ocean/10 bg-paper/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck size={20} className="text-deep-ocean" />
            <h2 className="text-lg font-serif font-semibold text-deep-ocean">
              人工修正
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="info">
              <span className="flex items-center gap-1">
                <ListChecks size={12} />
                共 {totalCount} 条
              </span>
            </Badge>
            <Badge variant="success">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} />
                已修正 {correctedCount} 条
              </span>
            </Badge>
          </div>
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-deep-ocean/50">修正进度</span>
            <span className="text-xs tabular text-deep-ocean/60">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-life-green rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {correctedCount > 0 && (
        <div className="px-6 py-3 bg-life-green/5 border-b border-life-green/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-life-green">
            <CheckCircle2 size={16} />
            <span>
              {correctedCount} 条已填写修正值，可批量应用
            </span>
          </div>
          <button
            onClick={applyBatch}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-life-green text-paper rounded text-sm font-medium hover:bg-life-green-light transition-colors"
          >
            <Send size={14} />
            批量应用
          </button>
        </div>
      )}

      {/* 修正列表 */}
      <div className="divide-y divide-deep-ocean/5 max-h-[500px] overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="p-12 text-center text-deep-ocean/40">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无可修正的 AI 结果</p>
          </div>
        ) : (
          items.map((item) => {
            const edit = getItemEdit(item);
            const corrected = isItemCorrected(item);
            const expanded = expandedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 transition-colors ${
                  corrected ? 'bg-life-green/5' : ''
                }`}
              >
                {/* 条目头部 */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* 状态指示 */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        corrected
                          ? 'bg-life-green'
                          : 'bg-deep-ocean/20'
                      }`}
                    />
                    {/* 字段名 */}
                    <Badge variant={corrected ? 'success' : 'neutral'}>
                      {item.field_name}
                    </Badge>
                    {/* 样本ID（可选） */}
                    {item.sample_id && (
                      <span className="text-xs text-deep-ocean/40 tabular">
                        {item.sample_id}
                      </span>
                    )}
                    {/* AI 置信度（可选） */}
                    {item.confidence !== undefined && (
                      <Badge
                        variant={
                          item.confidence < 0.5
                            ? 'warn'
                            : 'info'
                        }
                      >
                        置信度 {(item.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {corrected && (
                      <span className="text-xs text-life-green font-medium">
                        已修正
                      </span>
                    )}
                    {expanded ? (
                      <ChevronUp
                        size={16}
                        className="text-deep-ocean/40"
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-deep-ocean/40"
                      />
                    )}
                  </div>
                </div>

                {/* 原始值预览（收起状态） */}
                {!expanded && (
                  <div className="mt-2 pl-5 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-deep-ocean/40">
                        原值:
                      </span>
                      <span className="text-sm text-corral-severe line-through">
                        {item.original_value}
                      </span>
                    </div>
                    {corrected && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-deep-ocean/40">
                          修正后:
                        </span>
                        <span className="text-sm text-life-green font-medium">
                          {edit.corrected_value}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 展开的编辑区域 */}
                {expanded && (
                  <div className="mt-3 pl-5 space-y-3">
                    {/* 原值 */}
                    <div>
                      <label className="block text-xs text-deep-ocean/50 mb-1">
                        AI 原值
                      </label>
                      <div className="px-3 py-2 bg-paper-dark/50 rounded border border-deep-ocean/5">
                        <span className="text-sm text-deep-ocean/70 line-through">
                          {item.original_value}
                        </span>
                      </div>
                    </div>

                    {/* 修正后输入框 */}
                    <div>
                      <label className="block text-xs text-deep-ocean/50 mb-1">
                        修正后的值
                      </label>
                      <input
                        type="text"
                        value={edit.corrected_value}
                        onChange={(e) =>
                          updateEdit(
                            item.id,
                            'corrected_value',
                            e.target.value
                          )
                        }
                        placeholder="输入修正后的值..."
                        className="w-full px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean placeholder:text-deep-ocean/40 focus:outline-none focus:border-life-green/50 focus:ring-1 focus:ring-life-green/20 transition-all"
                      />
                    </div>

                    {/* 修正原因输入框 */}
                    <div>
                      <label className="block text-xs text-deep-ocean/50 mb-1">
                        修正原因
                      </label>
                      <textarea
                        value={edit.reason}
                        onChange={(e) =>
                          updateEdit(item.id, 'reason', e.target.value)
                        }
                        placeholder="描述修正的原因（可选）..."
                        rows={2}
                        className="w-full px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean placeholder:text-deep-ocean/40 focus:outline-none focus:border-life-green/50 focus:ring-1 focus:ring-life-green/20 transition-all resize-none"
                      />
                    </div>

                    {/* 应用按钮 */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => applySingle(item)}
                        disabled={edit.corrected_value.trim() === ''}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-all ${
                          edit.corrected_value.trim() === ''
                            ? 'bg-deep-ocean/20 text-paper/60 cursor-not-allowed'
                            : 'bg-life-green text-paper hover:bg-life-green-light'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        应用修正
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
