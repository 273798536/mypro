import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, AlertTriangle, AlertCircle, Eye } from 'lucide-react';
import type { Anomaly, AnomalyType, AnomalySeverity, NextAction } from '../../types';
import { anomalyTypeLabel, anomalySeverityLabel, nextActionLabel } from '../../utils/anomaly';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

/**
 * 异常列表组件属性接口
 */
interface AnomalyListProps {
  /** 异常数据列表 */
  anomalies: Anomaly[];
  /** 解决异常回调 */
  onResolve: (id: string) => void;
  /** 查看样本回调 */
  onViewSample: (sampleId: string) => void;
}

/**
 * 筛选条件接口
 */
interface FilterState {
  /** 按异常类型筛选，空字符串表示全部 */
  type: AnomalyType | '';
  /** 按严重程度筛选，空字符串表示全部 */
  severity: AnomalySeverity | '';
  /** 是否已解决，null 表示全部 */
  resolved: boolean | null;
}

/**
 * 严重程度对应的左侧色条颜色
 * 低=浅绿，中=琥珀，高=珊瑚
 */
const severityBarColor: Record<AnomalySeverity, string> = {
  low: 'bg-life-green',
  medium: 'bg-amber-warn',
  high: 'bg-corral-severe',
};

/**
 * 严重程度对应的圆点颜色
 */
const severityDotColor: Record<AnomalySeverity, string> = {
  low: 'bg-life-green',
  medium: 'bg-amber-warn',
  high: 'bg-corral-severe',
};

/**
 * 下一步操作建议的详细说明
 */
const nextActionDescription: Record<NextAction, string> = {
  supply_material:
    '请补充上传该样本的原始图片数据。支持 JPG/PNG 格式，建议图片清晰度不低于 1080P，确保病灶区域可见。上传后系统将自动重新触发 AI 分析。',
  adjust_standard:
    '请核对并调整该样本的物种名称或标注口径。建议使用标准物种字典中的规范名称，如有疑问请联系质控组确认。修正后将影响后续统计结果。',
  manual_review:
    '请人工复核该样本的 AI 标注结果。重点检查标注框位置、标签类型和置信度评分。确认无误后可标记为已解决，如有修改请在样本详情页编辑。',
};

/**
 * 异常分类列表组件
 * 表格视图展示所有异常，支持筛选、hover 展开操作建议
 */
export function AnomalyList({ anomalies, onResolve, onViewSample }: AnomalyListProps) {
  /** 筛选条件状态 */
  const [filter, setFilter] = useState<FilterState>({
    type: '',
    severity: '',
    resolved: null,
  });

  /** 当前展开行的异常ID（hover 触发） */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /**
   * 根据筛选条件过滤异常列表
   */
  const filteredAnomalies = anomalies.filter((a) => {
    if (filter.type && a.type !== filter.type) return false;
    if (filter.severity && a.severity !== filter.severity) return false;
    if (filter.resolved !== null && a.resolved !== filter.resolved) return false;
    return true;
  });

  /**
   * 渲染状态徽章
   */
  const renderStatusBadge = (resolved: boolean) => {
    if (resolved) {
      return (
        <Badge variant="success">
          <span className="flex items-center gap-1">
            <Check size={12} />
            已解决
          </span>
        </Badge>
      );
    }
    return (
      <Badge variant="warn">
        <span className="flex items-center gap-1">
          <AlertCircle size={12} />
          待处理
        </span>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg shadow-soft border border-deep-ocean/5">
        <div className="flex items-center gap-2">
          <label className="text-sm text-deep-ocean/70 font-medium">类型：</label>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value as AnomalyType | '' })}
            className="input-field text-sm w-40"
          >
            <option value="">全部类型</option>
            <option value="missing_material">{anomalyTypeLabel.missing_material}</option>
            <option value="incorrect_spec">{anomalyTypeLabel.incorrect_spec}</option>
            <option value="species_synonym">{anomalyTypeLabel.species_synonym}</option>
            <option value="annotation_low_conflict">
              {anomalyTypeLabel.annotation_low_conflict}
            </option>
            <option value="other">{anomalyTypeLabel.other}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-deep-ocean/70 font-medium">严重程度：</label>
          <select
            value={filter.severity}
            onChange={(e) =>
              setFilter({ ...filter, severity: e.target.value as AnomalySeverity | '' })
            }
            className="input-field text-sm w-32"
          >
            <option value="">全部</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-deep-ocean/70 font-medium">状态：</label>
          <select
            value={filter.resolved === null ? '' : String(filter.resolved)}
            onChange={(e) => {
              const val = e.target.value;
              setFilter({
                ...filter,
                resolved: val === '' ? null : val === 'true',
              });
            }}
            className="input-field text-sm w-32"
          >
            <option value="">全部状态</option>
            <option value="false">待处理</option>
            <option value="true">已解决</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-deep-ocean/50">
          共 {filteredAnomalies.length} 条异常
        </div>
      </div>

      {/* 异常列表表格 */}
      <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-paper-dark/50 border-b border-deep-ocean/5 text-xs font-semibold text-deep-ocean/70">
          <div className="col-span-1">严重程度</div>
          <div className="col-span-2">类型</div>
          <div className="col-span-2">涉及样本</div>
          <div className="col-span-4">描述</div>
          <div className="col-span-2">下一步操作</div>
          <div className="col-span-1">状态</div>
        </div>

        {/* 数据行 */}
        {filteredAnomalies.length === 0 ? (
          <div className="py-12 text-center text-deep-ocean/40">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
            <p>暂无符合条件的异常记录</p>
          </div>
        ) : (
          <div className="divide-y divide-deep-ocean/5">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                onMouseEnter={() => setExpandedId(anomaly.id)}
                onMouseLeave={() => setExpandedId(null)}
                className="relative"
              >
                {/* 左侧 4px 色条 */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${severityBarColor[anomaly.severity]}`}
                />

                {/* 行内容 */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-paper-dark/30 transition-colors cursor-default">
                  {/* 严重程度 */}
                  <div className="col-span-1 flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${severityDotColor[anomaly.severity]}`}
                    />
                    <span className="text-sm font-medium text-deep-ocean">
                      {anomalySeverityLabel[anomaly.severity]}
                    </span>
                  </div>

                  {/* 类型 */}
                  <div className="col-span-2 text-sm text-deep-ocean/80">
                    {anomalyTypeLabel[anomaly.type]}
                  </div>

                  {/* 涉及样本 */}
                  <div className="col-span-2">
                    <button
                      onClick={() => onViewSample(anomaly.sample_id)}
                      className="text-sm text-deep-ocean hover:text-deep-ocean-light underline underline-offset-2 inline-flex items-center gap-1"
                    >
                      <Eye size={14} />
                      {anomaly.sample_id}
                    </button>
                  </div>

                  {/* 描述 */}
                  <div className="col-span-4 text-sm text-deep-ocean/70 line-clamp-2">
                    {anomaly.description}
                  </div>

                  {/* 下一步操作按钮 */}
                  <div className="col-span-2">
                    <Button
                      variant={anomaly.resolved ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => onResolve(anomaly.id)}
                      disabled={anomaly.resolved}
                      className="w-full"
                    >
                      {anomaly.resolved ? '已解决' : nextActionLabel[anomaly.next_action]}
                    </Button>
                  </div>

                  {/* 状态 */}
                  <div className="col-span-1">{renderStatusBadge(anomaly.resolved)}</div>
                </div>

                {/* Hover 展开的下一步操作建议面板 */}
                {expandedId === anomaly.id && (
                  <div className="px-4 py-3 bg-deep-ocean/5 border-t border-deep-ocean/10">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-deep-ocean/10 rounded-lg">
                        <AlertCircle size={18} className="text-deep-ocean" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-deep-ocean mb-1">
                          操作建议：{nextActionLabel[anomaly.next_action]}
                        </h5>
                        <p className="text-sm text-deep-ocean/70 leading-relaxed">
                          {nextActionDescription[anomaly.next_action]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-deep-ocean/40">
                        {expandedId === anomaly.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
