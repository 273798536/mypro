import { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  RefreshCw,
  XCircle,
  Clock as ClockIcon,
  Edit3,
  GitBranch,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import type { DataRecord, DataStatus } from '@/types';
import {
  DATA_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  QUALITY_ISSUE_LABELS
} from '@/types';
import { cn } from '@/lib/utils';
import { CorrectionForm } from './CorrectionForm';

interface RecordDetailPanelProps {
  record: DataRecord;
  onClose: () => void;
}

const statusIcons: Record<DataStatus, typeof CheckCircle> = {
  approved: CheckCircle,
  pending: ClockIcon,
  suspended: PauseCircle,
  recollect: RefreshCw,
  rejected: XCircle
};

export function RecordDetailPanel({ record, onClose }: RecordDetailPanelProps) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { loadTrace, processingTrace, selectRecord } = useDataStore();

  const StatusIcon = statusIcons[record.status];
  const statusColor = STATUS_COLORS[record.status];

  const handleViewTrace = async () => {
    await loadTrace(record.id);
    selectRecord(record);
  };

  const getTypeSpecificFields = () => {
    switch (record.type) {
      case 'ship_track':
        return [
          { label: '船舶ID', value: record.vesselId },
          { label: '船舶名称', value: record.vesselName },
          { label: '航速', value: `${record.speed.toFixed(1)} 节` },
          { label: '航向', value: `${record.heading.toFixed(0)}°` },
          { label: '功耗', value: `${record.powerConsumption.toFixed(1)} kW` }
        ];
      case 'aquaculture_log':
        return [
          { label: '养殖场ID', value: record.farmId },
          { label: '养殖场名称', value: record.farmName },
          { label: '设备数量', value: `${record.equipmentCount} 台` },
          { label: '日用电量', value: `${record.dailyPowerUsage.toFixed(1)} kWh` },
          { label: '养殖密度', value: `${record.stockDensity.toFixed(1)} 尾/㎡` }
        ];
      case 'salinity':
        return [
          { label: '监测站ID', value: record.stationId },
          { label: '盐度值', value: `${record.salinity.toFixed(2)} ${record.unit}` },
          { label: '水温', value: `${record.temperature.toFixed(1)} °C` },
          { label: '关联负荷', value: `${record.relatedLoad.toFixed(1)} kW` }
        ];
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-xl shadow-2xl z-40 overflow-y-auto animate-slide-in">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[record.status]}20`, color: STATUS_COLORS[record.status] }}>
              {STATUS_LABELS[record.status]}
            </span>
            <h2 className="text-lg font-bold text-gray-800 mt-2">
              {DATA_TYPE_LABELS[record.type]}详情
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${statusColor}20` }}
            >
              <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">数据状态</p>
              <p className="font-semibold" style={{ color: statusColor }}>
                {STATUS_LABELS[record.status]}
              </p>
            </div>
          </div>
          {record.resultNote && (
            <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100">
              {record.resultNote}
            </p>
          )}
        </div>

        {record.qualityIssues.length > 0 && (
          <div className="bg-[#FFF5F5] rounded-xl p-4 border border-[#E63946]20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[#E63946]" />
              <span className="font-semibold text-[#E63946]">质量问题</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {record.qualityIssues.map((issue) => (
                <span
                  key={issue}
                  className="text-xs px-2 py-1 rounded-full bg-[#E63946]10 text-[#E63946] font-medium"
                >
                  {QUALITY_ISSUE_LABELS[issue]}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> 位置信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">纬度</p>
                <p className="font-mono text-sm">{record.location.lat.toFixed(6)}°</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">经度</p>
                <p className="font-mono text-sm">{record.location.lng.toFixed(6)}°</p>
              </div>
              {record.location.depth !== undefined && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-500">深度</p>
                  <p className={cn(
                    'font-mono text-sm',
                    record.location.depth < 0 && 'text-[#E63946] font-bold'
                  )}>
                    {record.location.depth.toFixed(2)} m
                    {record.location.depth < 0 && ' ⚠️ 深度为负'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 时间信息
            </h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">采集时间</p>
              <p className="font-mono text-sm">{new Date(record.timestamp).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" /> 来源信息
            </h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">数据来源</p>
              <p className="text-sm">{record.source}</p>
              <p className="text-xs text-gray-400 mt-1">批次: {record.importBatch}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">详细数据</h3>
            <div className="space-y-2">
              {getTypeSpecificFields().map((field) => (
                <div key={field.label} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{field.label}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    field.label.includes('盐度') && record.type === 'salinity' && record.qualityIssues.includes('unit_mismatch') && 'text-[#E63946]'
                  )}>
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {record.correctionHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-3"
            >
              <span className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                修正历史 ({record.correctionHistory.length})
              </span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showHistory && (
              <div className="space-y-3">
                {record.correctionHistory.map((corr, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border-l-4 border-[#3E92CC]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">
                        {corr.operator} · {new Date(corr.timestamp).toLocaleString('zh-CN')}
                      </span>
                      {corr.statusChange && (
                        <span className="text-xs bg-[#3E92CC]10 text-[#3E92CC] px-2 py-0.5 rounded-full">
                          {STATUS_LABELS[corr.statusChange.from]} → {STATUS_LABELS[corr.statusChange.to]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{corr.reason}</p>
                    <div className="text-xs text-gray-500 bg-white rounded p-2">
                      <span className="text-[#E63946]">修正前:</span> {JSON.stringify(corr.before)}
                      <br />
                      <span className="text-[#2A9D8F]">修正后:</span> {JSON.stringify(corr.after)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowCorrection(!showCorrection)}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#0A2463] to-[#3E92CC] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            人工修正
          </button>

          <button
            onClick={handleViewTrace}
            className="w-full py-3 px-4 bg-white border-2 border-[#3E92CC] text-[#3E92CC] rounded-xl font-medium hover:bg-[#3E92CC]5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            查看数据溯源
          </button>

          {processingTrace && (
            <div className="bg-[#3E92CC]5 rounded-xl p-4 border border-[#3E92CC]20">
              <h4 className="text-sm font-semibold text-[#0A2463] mb-3">处理链路</h4>
              <div className="space-y-3">
                {processingTrace.steps.map((step, idx) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-[#3E92CC]" />
                      {idx < processingTrace.steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-[#3E92CC]30" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm font-medium text-gray-800">{step.operation}</p>
                      <p className="text-xs text-gray-500">
                        {step.operator} · {new Date(step.timestamp).toLocaleString('zh-CN')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">来源: {step.sourceData}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCorrection && (
        <CorrectionForm
          record={record}
          onClose={() => setShowCorrection(false)}
        />
      )}
    </div>
  );
}
