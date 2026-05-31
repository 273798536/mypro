import { useState } from 'react';
import { AlertTriangle, XCircle, TriangleAlert, ChevronDown, ChevronUp, BookOpen, Route, Ruler, Scale } from 'lucide-react';
import { ScoreReport, ErrorItem, ErrorType, ErrorCategory } from '@/types';
import { getErrorTypeLabel, getErrorCategoryLabel } from '@/utils/scoring';
import { cn } from '@/lib/utils';

interface ErrorClassificationProps {
  report: ScoreReport;
  onOperationClick?: (operationId: string) => void;
}

const errorTypeConfig: Record<ErrorType, { icon: typeof AlertTriangle; color: string; label: string }> = {
  angle_out_of_range: {
    icon: Ruler,
    color: 'text-[#E94560]',
    label: '角度越界',
  },
  unit_error: {
    icon: Scale,
    color: 'text-[#f59e0b]',
    label: '距离单位错',
  },
  obstacle_cross: {
    icon: Route,
    color: 'text-[#dc2626]',
    label: '障碍穿越',
  },
  invalid_angle: {
    icon: Ruler,
    color: 'text-[#E94560]',
    label: '无效角度',
  },
  invalid_distance: {
    icon: Scale,
    color: 'text-[#f59e0b]',
    label: '无效距离',
  },
};

const categoryConfig: Record<ErrorCategory, { icon: typeof BookOpen; color: string; bgColor: string }> = {
  triangle_calculation: {
    icon: BookOpen,
    color: 'text-[#0F3460]',
    bgColor: 'bg-[#0F3460]/5',
  },
  path_selection: {
    icon: Route,
    color: 'text-[#16C79A]',
    bgColor: 'bg-[#16C79A]/5',
  },
};

function ErrorCard({
  error,
  onOperationClick,
}: {
  error: ErrorItem;
  onOperationClick?: (operationId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = errorTypeConfig[error.type];
  const categoryConfigData = categoryConfig[error.category];
  const TypeIcon = typeConfig.icon;
  const CategoryIcon = categoryConfigData.icon;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all duration-300',
        error.corrected
          ? 'border-[#16C79A]/30 bg-[#16C79A]/5'
          : 'border-[#E94560]/20 bg-white hover:shadow-md'
      )}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-1.5 rounded-md mt-0.5',
                error.corrected ? 'bg-[#16C79A]/20' : 'bg-[#E94560]/10'
              )}
            >
              <TypeIcon size={16} className={error.corrected ? 'text-[#16C79A]' : typeConfig.color} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-[#2C3E50]">
                  {getErrorTypeLabel(error.type)}
                </span>
                {error.corrected && (
                  <span className="text-xs bg-[#16C79A] text-white px-2 py-0.5 rounded-full">
                    已修正
                  </span>
                )}
              </div>
              <p className="text-xs text-[#2C3E50]/70 line-clamp-2">
                {error.ruleDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#E94560]">
              -{error.pointsDeducted}分
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-[#2C3E50]/40" />
            ) : (
              <ChevronDown size={16} className="text-[#2C3E50]/40" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#0F3460]/10 pt-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'p-1 rounded',
                  categoryConfigData.bgColor
                )}
              >
                <CategoryIcon size={12} className={categoryConfigData.color} />
              </div>
              <span className="text-xs text-[#2C3E50]/60">
                错误分类: <span className="font-medium">{getErrorCategoryLabel(error.category)}</span>
              </span>
            </div>

            <div className="text-xs text-[#2C3E50]/60">
              规则编号: <span className="font-mono font-medium">{error.ruleReference}</span>
            </div>

            {onOperationClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOperationClick(error.operationId);
                }}
                className="text-xs text-[#0F3460] hover:underline"
              >
                查看对应操作记录 →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorClassification({ report, onOperationClick }: ErrorClassificationProps) {
  const allErrors = report.scoreItems.flatMap((item) => item.errors);

  const errorsByType: Record<ErrorType, ErrorItem[]> = {
    angle_out_of_range: [],
    unit_error: [],
    obstacle_cross: [],
    invalid_angle: [],
    invalid_distance: [],
  };

  for (const error of allErrors) {
    errorsByType[error.type].push(error);
  }

  const typeColumns: { type: ErrorType; title: string }[] = [
    { type: 'angle_out_of_range', title: '角度越界' },
    { type: 'unit_error', title: '距离单位错' },
    { type: 'obstacle_cross', title: '障碍穿越' },
  ];

  const totalDeducted = allErrors.reduce((sum, e) => sum + e.pointsDeducted, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#0F3460]/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E94560]/10 rounded-lg">
            <TriangleAlert size={20} className="text-[#E94560]" />
          </div>
          <div>
            <h3 className="font-bold text-[#0F3460] text-lg">错误分类明细</h3>
            <p className="text-sm text-[#2C3E50]/60">
              共 {allErrors.length} 处错误，累计扣 {totalDeducted} 分
            </p>
          </div>
        </div>
      </div>

      {allErrors.length === 0 ? (
        <div className="text-center py-12 text-[#2C3E50]/50">
          <XCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">暂无错误记录</p>
          <p className="text-sm">完美完成所有测绘任务！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {typeColumns.map((col) => (
            <div key={col.type} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#0F3460]/10">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  col.type === 'angle_out_of_range' && 'bg-[#E94560]',
                  col.type === 'unit_error' && 'bg-[#f59e0b]',
                  col.type === 'obstacle_cross' && 'bg-[#dc2626]'
                )} />
                <h4 className="font-semibold text-[#2C3E50]">{col.title}</h4>
                <span className="text-xs bg-[#0F3460]/10 text-[#0F3460] px-2 py-0.5 rounded-full">
                  {errorsByType[col.type].length} 项
                </span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {errorsByType[col.type].length === 0 ? (
                  <div className="text-center py-8 text-[#2C3E50]/40 text-sm">
                    无此类错误
                  </div>
                ) : (
                  errorsByType[col.type].map((error) => (
                    <ErrorCard
                      key={error.id}
                      error={error}
                      onOperationClick={onOperationClick}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
