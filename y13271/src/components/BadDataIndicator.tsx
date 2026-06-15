// 坏数据指示器组件 - 显示红色折角 + Tooltip 悬浮列出所有坏数据类型和原始行号
import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { BadDataFlag } from '../types';
import { cn } from '../lib/utils';

// 坏数据类型映射配置
const BAD_DATA_CONFIG: Record<
  BadDataFlag,
  { label: string; description: string; severity: 'high' | 'medium' | 'low' }
> = {
  missing_name: {
    label: '姓名缺失',
    description: '反馈人姓名为空',
    severity: 'medium',
  },
  invalid_name: {
    label: '姓名无效',
    description: '姓名包含特殊字符或格式异常',
    severity: 'medium',
  },
  missing_phone: {
    label: '电话缺失',
    description: '联系电话为空',
    severity: 'high',
  },
  invalid_phone: {
    label: '电话无效',
    description: '电话号码格式不正确',
    severity: 'high',
  },
  missing_content: {
    label: '内容缺失',
    description: '反馈内容为空',
    severity: 'high',
  },
  short_content: {
    label: '内容过短',
    description: '反馈内容字数不足，参考价值低',
    severity: 'low',
  },
  no_matching_bay: {
    label: '无匹配站点',
    description: '无法匹配到对应的公交港湾站点',
    severity: 'high',
  },
  duplicate_content: {
    label: '重复内容',
    description: '反馈内容与其他记录高度相似',
    severity: 'medium',
  },
};

// 严重程度颜色配置
const SEVERITY_COLORS: Record<
  'high' | 'medium' | 'low',
  {
    dot: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  high: {
    dot: 'bg-red-500',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    label: '高',
  },
  medium: {
    dot: 'bg-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    label: '中',
  },
  low: {
    dot: 'bg-yellow-400',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-700',
    label: '低',
  },
};

// 组件 Props 定义
export interface BadDataIndicatorProps {
  flags: BadDataFlag[]; // 坏数据标记列表
  sourceRow?: number; // 原始行号（可选）
  sourceFile?: string; // 源文件名（可选）
  size?: 'sm' | 'md' | 'lg'; // 红色折角尺寸
  showTooltip?: boolean; // 是否启用 Tooltip（默认 true）
  className?: string; // 自定义外层样式
}

// 自定义 Tooltip 组件
interface TooltipProps {
  open: boolean;
  children: React.ReactNode;
  content: React.ReactNode;
}

function Tooltip({ open, children, content }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-block">
      {children}
      {open && (
        <div
          ref={tooltipRef}
          className={cn(
            // 定位
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            // 尺寸与样式
            'w-72 p-0',
            // 外观
            'bg-white border border-red-200 rounded-md shadow-xl',
            // 动画
            'animate-[fadeIn_0.15s_ease-out]'
          )}
        >
          {content}
          {/* 小箭头 */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-red-200" />
        </div>
      )}
    </div>
  );
}

export function BadDataIndicator({
  flags,
  sourceRow,
  sourceFile,
  size = 'md',
  showTooltip = true,
  className,
}: BadDataIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTooltipPinned, setIsTooltipPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭固定的 Tooltip（必须在 early return 之前调用所有 Hooks）
  useEffect(() => {
    if (!isTooltipPinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsTooltipPinned(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTooltipPinned]);

  // 无坏数据时不显示
  if (!flags || flags.length === 0) {
    return null;
  }

  // 折角尺寸配置
  const cornerSizeClass = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const shouldShowTooltip = showTooltip && (isOpen || isTooltipPinned);

  // 处理点击折角（固定 Tooltip）
  const handleCornerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTooltipPinned(prev => !prev);
  };

  // Tooltip 内容
  const tooltipContent = (
    <div className="overflow-hidden">
      {/* Tooltip 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm font-semibold text-red-900">
            检测到 {flags.length} 项数据问题
          </span>
        </div>
        {isTooltipPinned && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTooltipPinned(false);
            }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-red-400 hover:bg-red-200 hover:text-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 坏数据类型列表 */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
        {flags.map((flag, idx) => {
          const config = BAD_DATA_CONFIG[flag];
          const severity = SEVERITY_COLORS[config.severity];
          return (
            <div
              key={`${flag}-${idx}`}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-red-50/50 transition-colors"
            >
              {/* 严重程度圆点 */}
              <div className="mt-1.5 shrink-0">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    severity.dot
                  )}
                />
              </div>
              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-800">
                    {config.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium',
                      severity.badgeBg,
                      severity.badgeText
                    )}
                  >
                    {severity.label}风险
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {config.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 原始信息底部栏 */}
      {(sourceRow !== undefined || sourceFile) && (
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 space-y-0.5">
          {sourceFile && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500 shrink-0">源文件：</span>
              <span
                className="text-slate-700 truncate font-mono"
                title={sourceFile}
              >
                {sourceFile}
              </span>
            </div>
          )}
          {sourceRow !== undefined && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500 shrink-0">原始行：</span>
              <span className="text-slate-700 font-mono font-medium">
                第 {sourceRow} 行
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 原生 title 备用（不使用自定义 Tooltip 时）
  const nativeTitle = flags
    .map(f => {
      const config = BAD_DATA_CONFIG[f];
      return `• ${config.label}${sourceRow !== undefined ? ` (第${sourceRow}行)` : ''}`;
    })
    .join('\n');

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={() => !isTooltipPinned && setIsOpen(true)}
      onMouseLeave={() => !isTooltipPinned && setIsOpen(false)}
    >
      {showTooltip ? (
        <Tooltip open={shouldShowTooltip} content={tooltipContent}>
          {/* 红色折角元素 */}
          <div
            onClick={handleCornerClick}
            className={cn(
              'relative block cursor-pointer transition-transform duration-200',
              cornerSizeClass,
              'hover:scale-110'
            )}
            title={!showTooltip ? nativeTitle : undefined}
          >
            {/* 红色折角 - 使用 clip-path 实现 */}
            <div
              className="absolute top-0 right-0 w-full h-full"
              style={{
                background:
                  'linear-gradient(135deg, transparent 50%, #DC2626 50%, #B91C1C 100%)',
                clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
              }}
            />
            {/* 警示图标 - 小号显示在折角内 */}
            {size !== 'sm' && (
              <div className="absolute top-0 right-0 translate-x-0.5 -translate-y-0.5">
                <div
                  className={cn(
                    'flex items-center justify-center text-white',
                    size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'drop-shadow-sm',
                      size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5'
                    )}
                    strokeWidth={3}
                  />
                </div>
              </div>
            )}
          </div>
        </Tooltip>
      ) : (
        // 不带 Tooltip 的简化版本
        <div
          className={cn('relative block', cornerSizeClass)}
          title={nativeTitle}
        >
          <div
            className="absolute top-0 right-0 w-full h-full"
            style={{
              background:
                'linear-gradient(135deg, transparent 50%, #DC2626 50%, #B91C1C 100%)',
              clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
            }}
          />
        </div>
      )}

      {/* 坏数据数量小圆点（用于表格单元格等场景） */}
      {flags.length > 1 && size !== 'sm' && (
        <span
          className={cn(
            'absolute -top-1 -left-1 inline-flex items-center justify-center',
            'rounded-full bg-red-600 text-white font-bold',
            'border-2 border-white shadow-sm',
            size === 'md'
              ? 'min-w-[16px] h-4 px-1 text-[10px]'
              : 'min-w-[18px] h-4.5 px-1 text-[11px]'
          )}
          style={{ fontSize: '10px' }}
        >
          {flags.length}
        </span>
      )}
    </div>
  );
}
