import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Radio,
  Ship,
  Fish,
  Droplets,
  Clock,
  MapPin,
  Edit3,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { useSceneStore, useProcessStore, useDataStore } from '@/stores';
import { getRiskColor, getRiskLabel, formatDateTime } from '@/utils/geo';
import { cn } from '@/lib/utils';
import type { AnomalyPoint, BuoyData, AquacultureLog, SalinityData } from '@/types';

function getObjectIcon(type: string) {
  switch (type) {
    case 'anomaly':
      return <AlertTriangle size={18} className="text-orange-400" />;
    case 'buoy':
      return <Radio size={18} className="text-emerald-400" />;
    case 'ship':
      return <Ship size={18} className="text-blue-400" />;
    case 'farm':
      return <Fish size={18} className="text-purple-400" />;
    case 'station':
      return <Droplets size={18} className="text-teal-400" />;
    default:
      return <AlertTriangle size={18} />;
  }
}

function getObjectLabel(type: string) {
  switch (type) {
    case 'anomaly':
      return '异常点';
    case 'buoy':
      return '浮标';
    case 'ship':
      return '船舶';
    case 'farm':
      return '养殖区';
    case 'station':
      return '监测站';
    default:
      return '对象';
  }
}

function AnomalyDetail({ anomaly }: { anomaly: AnomalyPoint }) {
  const { getRelatedNotice } = useProcessStore();
  const { setSelectedRiskNotice } = useDataStore();
  const relatedNotice = getRelatedNotice(anomaly.id);

  const handleTraceNotice = () => {
    if (relatedNotice) {
      setSelectedRiskNotice(relatedNotice.id);
      console.log(
        `%c[复核入口] 正在追溯异常 ${anomaly.id} → 风险通报 ${relatedNotice.id}`,
        'color:#74c0fc;'
      );
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="p-3 rounded-lg border"
        style={{
          backgroundColor: `${getRiskColor(anomaly.riskLevel)}15`,
          borderColor: `${getRiskColor(anomaly.riskLevel)}50`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getRiskColor(anomaly.riskLevel) }}
          />
          <span className="text-sm font-medium text-slate-200">
            风险等级: {getRiskLabel(anomaly.riskLevel)}
          </span>
        </div>
        <p className="text-sm text-slate-300">{anomaly.description}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock size={14} />
          <span>发生时间: {formatDateTime(anomaly.timestamp)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MapPin size={14} />
          <span>
            位置: {anomaly.latitude.toFixed(4)}°N, {anomaly.longitude.toFixed(4)}°E
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <AlertTriangle size={14} />
          <span>类型: {anomaly.type}</span>
        </div>
      </div>

      {relatedNotice && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <ChevronRight size={14} />
            关联风险通报 (追溯链路)
          </p>
          <p className="text-sm font-medium text-slate-200 mb-1">{relatedNotice.title}</p>
          <p className="text-xs text-slate-400 mb-2">{formatDateTime(relatedNotice.noticeTime)}</p>
          <button
            onClick={handleTraceNotice}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <FileText size={12} />
            查看通报详情和处理意见
          </button>
        </div>
      )}

      {!relatedNotice && (
        <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 text-xs text-slate-500">
          暂无关联风险通报
        </div>
      )}
    </div>
  );
}

function BuoyDetail({ buoy }: { buoy: BuoyData }) {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          'p-3 rounded-lg border',
          buoy.isOffline
            ? 'bg-red-900/20 border-red-700/50'
            : 'bg-emerald-900/20 border-emerald-700/50'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              buoy.isOffline ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
            )}
          />
          <span className="text-sm font-medium text-slate-200">
            {buoy.buoyId} - {buoy.isOffline ? '离线' : '在线'}
          </span>
        </div>
        {buoy.isOffline && buoy.lastOnline && (
          <p className="text-xs text-red-400 mt-2">
            最后在线: {formatDateTime(buoy.lastOnline)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-slate-800/50">
          <p className="text-xs text-slate-500">油膜厚度</p>
          <p className="text-sm font-mono text-slate-200 mt-0.5">
            {buoy.oilThickness.toFixed(2)} mm
          </p>
        </div>
        <div className="p-2 rounded bg-slate-800/50">
          <p className="text-xs text-slate-500">状态</p>
          <p className="text-sm text-slate-200 mt-0.5">{buoy.status}</p>
        </div>
      </div>
    </div>
  );
}

function FarmDetail({ farm }: { farm: AquacultureLog }) {
  const hasGap = !farm.salinity || !farm.waterQuality;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50">
        <p className="text-sm font-medium text-slate-200">{farm.farmName}</p>
        <p className="text-xs text-slate-400 mt-0.5">记录日期: {farm.logDate}</p>
      </div>

      {hasGap && (
        <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/50">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">数据缺口</span>
          </div>
          <p className="text-xs text-amber-300/70">
            水质数据缺失，相关风险结论仅供参考
          </p>
        </div>
      )}

      <div className="space-y-2">
        {farm.salinity && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">盐度</span>
            <span className="text-slate-200 font-mono">{farm.salinity} PSU</span>
          </div>
        )}
        {farm.waterQuality && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">水质等级</span>
            <span className="text-slate-200">{farm.waterQuality}</span>
          </div>
        )}
      </div>

      <div className="p-3 rounded bg-slate-800/50">
        <p className="text-xs text-slate-500 mb-1">日志备注</p>
        <p className="text-sm text-slate-300">{farm.notes}</p>
      </div>
    </div>
  );
}

function StationDetail({ station }: { station: SalinityData }) {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-teal-900/20 border border-teal-700/50">
        <p className="text-sm font-medium text-slate-200">{station.stationName}</p>
        <p className="text-xs text-slate-400 mt-0.5">数据来源: {station.source}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-slate-800/50">
          <p className="text-xs text-slate-500">原始盐度</p>
          <p className="text-sm font-mono text-slate-200 mt-0.5">
            {station.salinity} {station.unit}
          </p>
        </div>
        <div className="p-2 rounded bg-slate-800/50">
          <p className="text-xs text-slate-500">换算后</p>
          <p className="text-sm font-mono text-cyan-300 mt-0.5">
            {station.unit === 'mg/L'
              ? (station.salinity / 1000).toFixed(2)
              : station.salinity.toFixed(2)}{' '}
            PSU
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewSection() {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Edit3 size={16} className="text-cyan-400" />
        复核操作
      </p>

      {!isReviewing ? (
        <div className="space-y-2">
          <button
            onClick={() => setIsReviewing(true)}
            className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 size={14} />
            发起复核
          </button>
          <p className="text-xs text-slate-500 text-center">
            修正数据后将重新计算相关处理记录
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="请输入复核说明..."
            className="w-full h-20 p-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log(
                  `%c[复核] 已提交复核意见: ${reviewNote || '(无备注)'}`,
                  'color:#10b981;'
                );
                setIsReviewing(false);
                setReviewNote('');
              }}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={14} />
              确认
            </button>
            <button
              onClick={() => setIsReviewing(false)}
              className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle size={14} />
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { selectedObject, selectObject } = useSceneStore();

  if (!selectedObject) {
    return (
      <div className="w-80 h-full bg-slate-900/90 backdrop-blur-sm border-l border-slate-700/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <MessageSquare size={28} className="text-slate-600" />
          </div>
          <p className="text-sm text-slate-500">点击场景中的对象查看详情</p>
          <p className="text-xs text-slate-600 mt-1">支持浮标、船舶、养殖区、异常点</p>
        </div>
      </div>
    );
  }

  const renderDetail = () => {
    switch (selectedObject.type) {
      case 'anomaly':
        return <AnomalyDetail anomaly={selectedObject.data as unknown as AnomalyPoint} />;
      case 'buoy':
        return <BuoyDetail buoy={selectedObject.data as unknown as BuoyData} />;
      case 'farm':
        return <FarmDetail farm={selectedObject.data as unknown as AquacultureLog} />;
      case 'station':
        return <StationDetail station={selectedObject.data as unknown as SalinityData} />;
      default:
        return <p className="text-sm text-slate-400">暂无详情</p>;
    }
  };

  return (
    <div className="w-80 h-full bg-slate-900/90 backdrop-blur-sm border-l border-slate-700/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getObjectIcon(selectedObject.type)}
          <div>
            <p className="text-sm font-medium text-slate-200">
              {getObjectLabel(selectedObject.type)}详情
            </p>
            <p className="text-xs text-slate-500">ID: {selectedObject.id}</p>
          </div>
        </div>
        <button
          onClick={() => selectObject(null)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {renderDetail()}
        <ReviewSection />
      </div>
    </div>
  );
}
