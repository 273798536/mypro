import { Eye, Pencil, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { Sample, SampleVersion } from '@/types';
import { Badge } from '@/components/ui/Badge';

/**
 * 样本卡片组件属性接口
 */
interface SampleCardProps {
  /** 样本数据 */
  sample: Sample;
  /** 当前版本数据 */
  currentVersion?: SampleVersion | null;
  /** 点击卡片回调 */
  onClick?: () => void;
}

/**
 * 标注状态类型
 */
type AnnotationStatus = 'annotated' | 'pending' | 'need_correction';

/**
 * 根据版本状态获取标注状态
 */
function getAnnotationStatus(version?: SampleVersion | null): AnnotationStatus {
  if (!version) return 'pending';
  switch (version.status) {
    case 'final':
    case 'human_corrected':
      return 'annotated';
    case 'ai_reviewed':
      return 'need_correction';
    default:
      return 'pending';
  }
}

/**
 * 获取标注状态显示配置
 */
function getStatusConfig(status: AnnotationStatus) {
  switch (status) {
    case 'annotated':
      return {
        label: '已标注',
        variant: 'success' as const,
        Icon: CheckCircle2,
      };
    case 'pending':
      return {
        label: '待标注',
        variant: 'neutral' as const,
        Icon: Clock,
      };
    case 'need_correction':
      return {
        label: '需修正',
        variant: 'warn' as const,
        Icon: AlertTriangle,
      };
  }
}

/**
 * 样本卡片缩略图（SVG 鱼图案）
 */
function FishThumbnail({ speciesName }: { speciesName: string }) {
  const initial = speciesName.charAt(0);
  return (
    <svg
      viewBox="0 0 160 100"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 背景渐变 */}
      <defs>
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8f4f8" />
          <stop offset="100%" stopColor="#c5e1ec" />
        </linearGradient>
        <linearGradient id="fishGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2d5a4a" />
          <stop offset="100%" stopColor="#3d7a66" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#waterGrad)" />

      {/* 鱼身 */}
      <ellipse cx="80" cy="50" rx="45" ry="22" fill="url(#fishGrad)" />
      {/* 鱼尾 */}
      <polygon points="125,50 150,30 150,70" fill="#2d5a4a" />
      {/* 鱼眼 */}
      <circle cx="55" cy="45" r="5" fill="white" />
      <circle cx="56" cy="45" r="3" fill="#1e3a5f" />
      {/* 鱼鳍 */}
      <path d="M80,28 Q85,15 95,22 Q90,28 80,28" fill="#3d7a66" opacity="0.7" />
      <path d="M80,72 Q85,85 95,78 Q90,72 80,72" fill="#3d7a66" opacity="0.7" />

      {/* 物种名首字母 */}
      <text
        x="80"
        y="92"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="#1e3a5f"
        fontFamily="IBM Plex Serif, Georgia, serif"
      >
        {initial}
      </text>
    </svg>
  );
}

/**
 * 样本卡片组件
 * 显示缩略图、物种名、分组、版本号和标注状态，hover 显示快速操作
 */
export function SampleCard({ sample, currentVersion, onClick }: SampleCardProps) {
  const status = getAnnotationStatus(currentVersion);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.Icon;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-lg shadow-soft border border-deep-ocean/5 overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lift transition-all duration-200"
    >
      {/* 缩略图区域 */}
      <div className="relative h-32 bg-paper overflow-hidden">
        {sample.image_url ? (
          <img
            src={sample.image_url}
            alt={sample.species_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FishThumbnail speciesName={sample.standard_species_name || sample.species_name} />
        )}

        {/* 右上角版本徽章 */}
        {currentVersion && (
          <div className="absolute top-2 right-2">
            <Badge variant="info">
              v{currentVersion.version_number}
            </Badge>
          </div>
        )}

        {/* 右下角标注状态 */}
        <div className="absolute bottom-2 right-2">
          <Badge variant={statusConfig.variant}>
            <span className="flex items-center gap-1">
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
          </Badge>
        </div>

        {/* hover 快速操作按钮 */}
        <div className="absolute inset-0 bg-deep-ocean/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-paper text-deep-ocean rounded text-sm font-medium hover:bg-white transition-colors"
          >
            <Eye size={16} />
            查看详情
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-life-green text-paper rounded text-sm font-medium hover:bg-life-green-light transition-colors"
          >
            <Pencil size={16} />
            启动标注
          </button>
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-4">
        {/* 物种名 */}
        <h3 className="text-lg font-serif font-semibold text-deep-ocean mb-1">
          {sample.standard_species_name || sample.species_name}
        </h3>

        {/* 原始物种名（如果不同） */}
        {sample.standard_species_name &&
          sample.standard_species_name !== sample.species_name && (
            <p className="text-xs text-deep-ocean/50 mb-2 line-through">
              原: {sample.species_name}
            </p>
          )}

        {/* 分组标签和样本ID */}
        <div className="flex items-center justify-between mt-2">
          <Badge variant="neutral">
            分组 {sample.group}
          </Badge>
          <span className="text-xs text-deep-ocean/40 tabular">
            {sample.id}
          </span>
        </div>
      </div>
    </div>
  );
}
