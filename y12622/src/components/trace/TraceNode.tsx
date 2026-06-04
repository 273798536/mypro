import React from 'react';
import {
  Microscope,
  Image,
  Sliders,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SeverityBadge, ColorBadge, EquipmentStatusBadge } from '../common/StatusBadge';
import type { Equipment, SourceImage, Processing, Anomaly, Opinion, Conclusion } from '../../types';

type NodeType = 'equipment' | 'sourceImage' | 'processing' | 'anomaly' | 'opinion' | 'conclusion';

interface TraceNodeProps {
  type: NodeType;
  data: Equipment | SourceImage | Processing | Anomaly | Opinion | Conclusion | undefined;
  isActive?: boolean;
  onClick?: () => void;
  title?: string;
  icon?: React.ElementType;
  time?: string;
}

const nodeConfig: Record<NodeType, { icon: any; label: string; color: string }> = {
  equipment: { icon: Microscope, label: '设备清单', color: 'blue' },
  sourceImage: { icon: Image, label: '底图记录', color: 'emerald' },
  processing: { icon: Sliders, label: '处理记录', color: 'amber' },
  anomaly: { icon: AlertTriangle, label: '异常标注', color: 'red' },
  opinion: { icon: MessageSquare, label: '处理意见', color: 'purple' },
  conclusion: { icon: CheckCircle, label: '复核结论', color: 'green' },
};

export function TraceNode({ type, data, isActive, onClick, title, icon, time }: TraceNodeProps) {
  const config = nodeConfig[type];
  const Icon = icon || config.icon;
  const displayTitle = title || config.label;

  const colorClasses = {
    blue: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
    emerald: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
    amber: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
    red: 'border-red-300 bg-red-50 hover:bg-red-100',
    purple: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
    green: 'border-green-300 bg-green-50 hover:bg-green-100',
  };

  const iconBgClasses = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
    green: 'bg-green-600',
  };

  const renderContent = () => {
    if (!data) {
      return (
        <div className="space-y-1">
          <p className="text-sm text-gray-400 italic">暂无数据</p>
          {time && (
            <p className="text-xs text-gray-400">
              {new Date(time).toLocaleString('zh-CN')}
            </p>
          )}
        </div>
      );
    }

    switch (type) {
      case 'equipment': {
        const eq = data as Equipment;
        return (
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{eq.name}</p>
            <p className="text-xs text-gray-500">型号: {eq.model}</p>
            <p className="text-xs text-gray-500">SN: {eq.sn}</p>
            <EquipmentStatusBadge status={eq.status} />
          </div>
        );
      }
      case 'sourceImage': {
        const img = data as SourceImage;
        return (
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{img.batch_no}</p>
            <p className="text-xs text-gray-500">坐标: {img.coordinates}</p>
            <p className="text-xs text-gray-500">
              导入: {new Date(img.import_time).toLocaleDateString('zh-CN')}
            </p>
            <div className="w-16 h-12 rounded overflow-hidden border border-gray-200 mt-2 bg-gray-100">
              {img.file_data && (
                <img src={img.file_data} alt="缩略图" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        );
      }
      case 'processing': {
        const proc = data as Processing;
        return (
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{proc.processed_by}</p>
            <p className="text-xs text-gray-500">
              缩放: {(proc.zoom_level * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">
              平移: ({proc.pan_offset.x.toFixed(0)}, {proc.pan_offset.y.toFixed(0)})
            </p>
            <p className="text-xs text-gray-500">
              时间: {new Date(proc.start_time).toLocaleString('zh-CN')}
            </p>
          </div>
        );
      }
      case 'anomaly': {
        const anom = data as Anomaly;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={anom.severity} />
            </div>
            <p className="text-xs text-gray-500">
              位置: ({anom.position_x.toFixed(2)}, {anom.position_y.toFixed(2)})
            </p>
            <ColorBadge color={anom.color_code} />
            <p className="text-xs text-gray-600 mt-1">{anom.human_reason}</p>
          </div>
        );
      }
      case 'opinion': {
        const op = data as Opinion;
        return (
          <div className="space-y-1">
            <p className="text-xs text-gray-700 line-clamp-3">{op.processing_opinion}</p>
            {time && (
              <p className="text-xs text-gray-400 mt-1">
                {new Date(time).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        );
      }
      case 'conclusion': {
        const conc = data as Conclusion;
        return (
          <div className="space-y-1">
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${
                conc.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : conc.status === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {conc.status === 'approved'
                ? '通过'
                : conc.status === 'rejected'
                ? '驳回'
                : '待补充'}
            </span>
            <p className="text-xs text-gray-700 line-clamp-2">{conc.conclusion_text}</p>
            <p className="text-xs text-gray-500">复核人: {conc.reviewed_by}</p>
            <p className="text-xs text-gray-400">
              {new Date(conc.reviewed_at).toLocaleString('zh-CN')}
            </p>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'relative flex-shrink-0 w-56 rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer',
          colorClasses[config.color],
          isActive && 'ring-2 ring-offset-2 ring-blue-500 scale-105 shadow-lg'
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg text-white', iconBgClasses[config.color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {displayTitle}
            </p>
            {renderContent()}
          </div>
        </div>

        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
          {Object.keys(nodeConfig).indexOf(type) + 1}
        </div>
      </div>
    </div>
  );
}

export function TraceConnector() {
  return (
    <div className="flex-shrink-0 mx-1">
      <ChevronRight className="w-6 h-6 text-gray-300" />
    </div>
  );
}
