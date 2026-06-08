import { useNavigate } from 'react-router-dom';
import {
  Upload,
  AlertTriangle,
  Clock,
  PackageOpen,
  Layers,
  FileInput,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { useRef } from 'react';
import { useAppStore, getAnomaliesOfCurrentBatch } from '@/store/useAppStore';
import type { AnomalyType, MeasurementRecord } from '@/types';
import { ANOMALY_TYPE_LABEL } from '@/types';

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    batches,
    currentBatchId,
    loadSampleData,
    importRecords,
    isSampleLoaded,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentBatch = batches.find((b) => b.id === currentBatchId);
  const anomalies = getAnomaliesOfCurrentBatch();

  const statsByType: Record<AnomalyType, number> = {
    TIMESTAMP_MISMATCH: anomalies.filter(
      (a) => a.type === 'TIMESTAMP_MISMATCH' && a.status === 'PENDING'
    ).length,
    WEIGHT_OVERLOAD: anomalies.filter(
      (a) => a.type === 'WEIGHT_OVERLOAD' && a.status === 'PENDING'
    ).length,
    POSITION_OUTLIER: anomalies.filter(
      (a) => a.type === 'POSITION_OUTLIER' && a.status === 'PENDING'
    ).length,
    VOLUME_MISMATCH: anomalies.filter(
      (a) => a.type === 'VOLUME_MISMATCH' && a.status === 'PENDING'
    ).length,
  };

  const statCards = [
    {
      type: 'TIMESTAMP_MISMATCH' as AnomalyType,
      label: '时间轴不同步',
      value: statsByType.TIMESTAMP_MISMATCH,
      icon: Clock,
      color: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-300',
    },
    {
      type: 'WEIGHT_OVERLOAD' as AnomalyType,
      label: '重量超载',
      value: statsByType.WEIGHT_OVERLOAD,
      icon: PackageOpen,
      color: 'from-orange-500/20 to-orange-600/5 border-orange-500/30 text-orange-300',
    },
    {
      type: 'POSITION_OUTLIER' as AnomalyType,
      label: '位置偏离',
      value: statsByType.POSITION_OUTLIER,
      icon: Layers,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-300',
    },
    {
      type: 'VOLUME_MISMATCH' as AnomalyType,
      label: '体积不符',
      value: statsByType.VOLUME_MISMATCH,
      icon: AlertTriangle,
      color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-300',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const json = JSON.parse(text);
        const records = Array.isArray(json)
          ? (json as MeasurementRecord[])
          : json.records || [];
        importRecords(file.name.replace(/\.[^.]+$/, ''), records);
      } catch {
        alert('文件格式错误，请使用 JSON 格式的测量记录');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            船舱货物配载复核工作台
          </h1>
          <p className="mt-1 text-sm text-marine-300">
            {currentBatch
              ? `当前运行批次：${currentBatch.name} · 已检出 ${anomalies.length} 项异常`
              : '尚未导入数据，请先导入测量记录或加载示例数据'}
          </p>
        </div>
      </div>

      {!isSampleLoaded && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 bg-amber-500/20 rounded">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-200">
              首次使用？加载示例数据可立即体验完整功能
            </div>
            <div className="text-xs text-amber-300/80 mt-0.5">
              包含多个船舱的测量记录与典型异常，用于熟悉复核流程与追溯链路
            </div>
          </div>
          <button
            onClick={loadSampleData}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-marine-950 text-sm font-medium rounded shadow-panel transition-colors"
          >
            加载示例数据
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.type}
            onClick={() =>
              navigate(`/records?type=${card.type}&status=PENDING`)
            }
            className={`group text-left p-4 rounded-lg border bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-all shadow-panel`}
          >
            <div className="flex items-start justify-between">
              <card.icon className="w-5 h-5" />
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-white font-mono">
              {card.value}
            </div>
            <div className="mt-1 text-xs text-marine-300">
              待复核 · {card.label}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 border border-marine-700/50 bg-marine-800/50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileInput className="w-4 h-4 text-marine-300" />
            <h2 className="text-sm font-semibold text-white">导入测量记录</h2>
          </div>
          <label
            onClick={() => fileInputRef.current?.click()}
            className="block cursor-pointer border-2 border-dashed border-marine-600/50 hover:border-marine-500 rounded-lg p-8 text-center transition-colors"
          >
            <Upload className="w-8 h-8 text-marine-400 mx-auto mb-2" />
            <div className="text-sm text-marine-200 font-medium">
              点击或拖拽文件至此上传
            </div>
            <div className="text-xs text-marine-400 mt-1">
              支持 JSON 格式的测量记录数组
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <div className="mt-3 text-xs text-marine-400 space-y-1">
            <div>导入后系统将自动检测以下异常：</div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>时间轴不同步（测量时间偏差超过阈值）</li>
              <li>重量超载（单件超过舱位限重）</li>
              <li>位置偏离（坐标超出舱位范围）</li>
              <li>体积不符（测量值与清单偏差过大）</li>
            </ul>
          </div>
        </div>

        <div className="col-span-3 border border-marine-700/50 bg-marine-800/50 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                最新异常（待复核）
              </h2>
            </div>
            <button
              onClick={() => navigate('/records?status=PENDING')}
              className="text-xs text-marine-300 hover:text-white transition-colors"
            >
              查看全部 →
            </button>
          </div>
          {anomalies.filter((a) => a.status === 'PENDING').length === 0 ? (
            <div className="py-12 text-center text-marine-400 text-sm">
              暂无待复核异常
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies
                .filter((a) => a.status === 'PENDING')
                .slice(0, 5)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/records/${a.recordId}`)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded bg-marine-900/60 hover:bg-marine-700/50 border border-marine-700/30 transition-colors"
                  >
                    <div className="px-2 py-0.5 text-xs rounded bg-red-500/15 text-red-300 border border-red-500/30">
                      {ANOMALY_TYPE_LABEL[a.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-marine-100 truncate">
                        {a.description}
                      </div>
                      <div className="text-xs text-marine-400 mt-0.5 font-mono">
                        检出于 {new Date(a.detectedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-marine-500" />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
