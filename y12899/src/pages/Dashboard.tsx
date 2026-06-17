import { useState } from 'react';
import {
  Activity,
  MapPin,
  Droplets,
  BookOpen,
  AlertTriangle,
  FileText,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DataCard } from '../components/DataCard';
import { BuoyDataPanel } from '../components/BuoyDataPanel';
import { NoSailPanel } from '../components/NoSailPanel';
import { WaterQualityPanel } from '../components/WaterQualityPanel';
import { FarmLogPanel } from '../components/FarmLogPanel';
import { AnomalyPanel } from '../components/AnomalyPanel';
import { noSailZones } from '../data/mockData';
import { calculateWaterQualityIndex } from '../utils/calculations';

type TabType = 'overview' | 'buoy' | 'nosail' | 'water' | 'logs' | 'anomalies';

const tabs = [
  { id: 'overview' as TabType, label: '数据概览', icon: BarChart3 },
  { id: 'buoy' as TabType, label: '浮标数据', icon: Activity },
  { id: 'nosail' as TabType, label: '禁航检测', icon: MapPin },
  { id: 'water' as TabType, label: '水质预警', icon: Droplets },
  { id: 'logs' as TabType, label: '养殖日志', icon: BookOpen },
  { id: 'anomalies' as TabType, label: '异常处理', icon: AlertTriangle },
];

export default function Dashboard() {
  const {
    currentBatch,
    buoyData,
    violations,
    waterQuality,
    farmLogs,
    anomalies,
    reviewRounds,
    addReviewNote,
    supplementWaterQuality,
    addBuoyDataBatch,
    updateFarmLog,
    resolveAnomaly,
    addSupplementMaterial,
    adjustCaliber,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const latestReview = reviewRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
  const tideRange = latestReview
    ? latestReview.tideData.highTideHeight - latestReview.tideData.lowTideHeight
    : 3.4;
  const windSpeed = latestReview ? latestReview.weatherData.windSpeed : 4.5;

  const wqi = calculateWaterQualityIndex(waterQuality);

  const delayedLogCount = farmLogs.filter(l => l.isDelayed).length;
  const supplementAnomalies = anomalies.filter(a => a.category === 'supplement_material').length;
  const adjustAnomalies = anomalies.filter(a => a.category === 'adjust_caliber').length;

  const getWqiLevel = (score: number) => {
    if (score >= 90) return { level: 'normal', label: '优秀' };
    if (score >= 70) return { level: 'normal', label: '良好' };
    if (score >= 50) return { level: 'warning', label: '轻度污染' };
    return { level: 'critical', label: '中度污染' };
  };

  const wqiInfo = getWqiLevel(wqi);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-4 gap-4">
              <DataCard
                title="养殖面积"
                value={currentBatch.area}
                unit="亩"
                subtitle={currentBatch.location}
                status="info"
                icon={<FileText size={18} />}
              />
              <DataCard
                title="水质综合指数 (WQI)"
                value={wqi}
                subtitle={wqiInfo.label}
                status={wqiInfo.level as any}
                icon={<Droplets size={18} />}
              />
              <DataCard
                title="浮标数据点"
                value={buoyData.length}
                unit="条"
                subtitle="有效监测记录"
                status="normal"
                icon={<Activity size={18} />}
              />
              <DataCard
                title="越界记录"
                value={violations.length}
                unit="条"
                subtitle={`已拦截 ${violations.filter(v => v.intercepted).length} 条`}
                status={violations.length > 0 ? 'warning' : 'normal'}
                icon={<MapPin size={18} />}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <DataCard
                title="需补充材料"
                value={supplementAnomalies}
                unit="项"
                subtitle="点击查看详情"
                status="warning"
                icon={<AlertTriangle size={18} />}
                onClick={() => setActiveTab('anomalies')}
              />
              <DataCard
                title="需调整口径"
                value={adjustAnomalies}
                unit="项"
                subtitle="点击查看详情"
                status="info"
                icon={<RefreshCw size={18} />}
                onClick={() => setActiveTab('anomalies')}
              />
              <DataCard
                title="延迟日志"
                value={delayedLogCount}
                unit="条"
                subtitle="待补充完整"
                status={delayedLogCount > 0 ? 'warning' : 'normal'}
                icon={<BookOpen size={18} />}
                onClick={() => setActiveTab('logs')}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Activity size={18} className="text-sky-600" />
                  最新浮标数据
                </h3>
                <div className="space-y-2">
                  {buoyData.slice(-2).map(data => (
                    <div key={data.id} className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                      <span className="text-sm text-slate-500">
                        {new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex gap-4 text-sm">
                        <span>水温 <b className="text-slate-700">{data.temperature}°C</b></span>
                        <span>盐度 <b className="text-slate-700">{data.salinity} psu</b></span>
                        <span>溶解氧 <b className="text-slate-700">{data.dissolvedOxygen} mg/L</b></span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('buoy')}
                  className="mt-3 w-full text-center text-sm text-sky-600 hover:text-sky-700 font-medium"
                >
                  查看完整数据 →
                </button>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  待处理异常
                </h3>
                {anomalies.length > 0 ? (
                  <div className="space-y-2">
                    {anomalies.slice(0, 3).map(a => (
                      <div
                        key={a.id}
                        className={`p-3 rounded-lg text-sm border ${
                          a.category === 'supplement_material'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-sky-50 border-sky-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">{a.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            a.category === 'supplement_material'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}>
                            {a.category === 'supplement_material' ? '需补材料' : '需改口径'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{a.nextAction}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                    暂无待处理异常
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('anomalies')}
                  className="mt-3 w-full text-center text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  查看全部异常 →
                </button>
              </div>
            </div>
          </div>
        );

      case 'buoy':
        return (
          <BuoyDataPanel
            dataList={buoyData}
            area={currentBatch.area}
            hasViolation={violations.length > 0}
            tideRange={tideRange}
            windSpeed={windSpeed}
            waterRecords={waterQuality}
            onImportBatch={addBuoyDataBatch}
          />
        );

      case 'nosail':
        return <NoSailPanel violations={violations} zones={noSailZones} />;

      case 'water':
        return <WaterQualityPanel records={waterQuality} onSupplement={supplementWaterQuality} />;

      case 'logs':
        return <FarmLogPanel logs={farmLogs} onUpdate={updateFarmLog} />;

      case 'anomalies':
        return (
          <AnomalyPanel
            anomalies={anomalies}
            onResolve={resolveAnomaly}
            onAddSupplement={addSupplementMaterial}
            onAdjustCaliber={adjustCaliber}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">海藻养殖收成估算</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {currentBatch.name} · {currentBatch.date} · {currentBatch.location}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-slate-500">当前批次</p>
                <p className="font-medium text-slate-700">{currentBatch.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {renderTabContent()}
      </main>
    </div>
  );
}
