import { useNavigate } from 'react-router-dom';
import {
  FileText,
  FileWarning,
  MessageSquare,
  Clock,
  Users,
  ChevronRight,
  Layers,
} from 'lucide-react';
import StatusTag from '@/components/StatusTag/StatusTag';
import { sourceLabels } from '@/data/mockData';
import { formatCurrency } from '@/utils/dateFormat';
import { cn } from '@/lib/utils';
import type { Material } from '@/types';

interface MaterialCardProps {
  material: Material;
}

export default function MaterialCard({ material }: MaterialCardProps) {
  const navigate = useNavigate();

  const sourceIcon = () => {
    switch (material.source) {
      case 'contract_scan':
        return FileText;
      case 'supplement':
        return FileWarning;
      default:
        return FileText;
    }
  };

  const SourceIcon = sourceIcon();

  return (
    <div
      onClick={() => navigate(`/detail/${material.id}`)}
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
        'group relative overflow-hidden'
      )}
    >
      {/* Status indicators */}
      <div className="absolute top-0 right-0 flex gap-1 p-3">
        {material.hasNameMismatch && (
          <span className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full" title="名称不一致">
            <FileWarning className="w-3.5 h-3.5" />
          </span>
        )}
        {material.hasManualAnnotation && (
          <span className="w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full" title="有人工批注">
            <MessageSquare className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              material.source === 'contract_scan' && 'bg-blue-50 text-blue-600',
              material.source === 'supplement' && 'bg-orange-50 text-orange-600',
              material.source === 'manual' && 'bg-green-50 text-green-600',
              material.source === 'system' && 'bg-gray-50 text-gray-600'
            )}
          >
            <SourceIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-serif font-semibold text-[#0F2B4D] text-base leading-snug truncate">
              {material.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {material.type} · {sourceLabels[material.source]}
            </p>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-sm">
          <p className="text-gray-400 text-xs mb-0.5">授课老师</p>
          <p className="text-gray-700 font-medium truncate">{material.teacher}</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-400 text-xs mb-0.5">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              学生
            </span>
          </p>
          <p className="text-gray-700 font-medium truncate">{material.student}</p>
        </div>
      </div>

      {/* Amount and lessons */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">总金额</p>
          <p className="text-xl font-bold text-[#0F2B4D] font-serif">
            {formatCurrency(material.totalAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">课时数</p>
          <p className="text-sm font-medium text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {material.lessonCount} 节
            </span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <StatusTag status={material.status} size="sm" />
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Layers className="w-3 h-3" />
            {material.currentVersion}
          </span>
        </div>
        <span className="text-sm text-[#D4A853] flex items-center gap-1 group-hover:gap-2 transition-all">
          查看详情
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>

      {/* Upload date */}
      <p className="text-xs text-gray-400 mt-3">
        上传日期: {material.uploadDate}
      </p>
    </div>
  );
}
