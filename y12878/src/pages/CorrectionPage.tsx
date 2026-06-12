import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Clock,
  AlertOctagon,
  CheckCircle,
  XCircle,
  Save,
  ArrowLeftRight,
  History,
  MapPin,
  Ship,
  Fuel,
  Wind,
  Waves,
  Thermometer,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useVoyageStore } from '@/store/useVoyageStore';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import TraceTimeline from '@/components/TraceTimeline';
import type { CleanStep, FuelRecord } from '@/types';

export default function CorrectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRecordId = searchParams.get('recordId');

  const fuelRecords = useVoyageStore(s => s.fuelRecords);
  const vessels = useVoyageStore(s => s.vessels);
  const voyages = useVoyageStore(s => s.voyages);
  const weatherData = useVoyageStore(s => s.weatherData);
  const corrections = useVoyageStore(s => s.corrections);
  const auditLogs = useVoyageStore(s => s.auditLogs);

  const approveRecord = useVoyageStore(s => s.approveRecord);
  const rejectRecord = useVoyageStore(s => s.rejectRecord);
  const correctFuelValue = useVoyageStore(s => s.correctFuelValue);

  const pendingRecords = useMemo(() => {
    return fuelRecords.filter(r => r.status === 'pending');
  }, [fuelRecords]);
  const [selectedId, setSelectedId] = useState<string | null>(urlRecordId || pendingRecords[0]?.id || null);
  const [searchText, setSearchText] = useState('');

  const [fuelValue, setFuelValue] = useState<string>('');
  const [windSpeed, setWindSpeed] = useState<string>('');
  const [waveHeight, setWaveHeight] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredRecords = useMemo(() => {
    if (!searchText.trim()) return pendingRecords;
    return pendingRecords.filter(r =>
      r.id.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [pendingRecords, searchText]);

  const selectedRecord: FuelRecord | null = useMemo(() => {
    if (!selectedId) return null;
    return fuelRecords.find(r => r.id === selectedId) || pendingRecords.find(r => r.id === selectedId) || null;
  }, [selectedId, fuelRecords, pendingRecords]);

  const selectedVessel = useMemo(() => {
    if (!selectedRecord) return null;
    const voyage = voyages.find(v => v.id === selectedRecord.voyageId);
    if (!voyage) return null;
    return vessels.find(v => v.id === voyage.vesselId) || null;
  }, [selectedRecord, voyages, vessels]);

  const selectedWeather = useMemo(() => {
    if (!selectedId) return null;
    return weatherData.find(w => w.fuelRecordId === selectedId) || null;
  }, [selectedId, weatherData]);

  const historySteps: CleanStep[] = useMemo(() => {
    if (!selectedId) return [];
    const steps: CleanStep[] = [];
    const recordCorrections = corrections.filter(c => c.recordId === selectedId);
    const recordAuditLogs = auditLogs.filter(a => a.recordId === selectedId);

    if (selectedRecord) {
      steps.push({
        step: '数据导入',
        before: null,
        after: `油耗:${selectedRecord.fuelConsumption}L/h, 航速:${selectedRecord.speed}节`,
        reason: `从${selectedRecord.source}导入原始数据`,
        operator: 'system',
        timestamp: selectedRecord.timestamp
      });
    }

    recordCorrections.forEach(c => {
      steps.push({
        step: '数据修正',
        before: c.beforeValue,
        after: c.afterValue,
        reason: c.reason,
        operator: 'user',
        timestamp: c.operateTime
      });
    });

    recordAuditLogs.forEach(log => {
      const actionLabel = log.action === 'approve' ? '审核通过'
        : log.action === 'reject' ? '审核驳回'
        : log.action === 'correct' ? '提交修正'
        : log.action;
      steps.push({
        step: actionLabel,
        before: '-',
        after: log.detail,
        reason: `操作人: ${log.operator}`,
        operator: log.operator.includes('系统') ? 'system' : 'user',
        timestamp: log.timestamp
      });
    });

    return steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [selectedId, selectedRecord, corrections, auditLogs]);

  useEffect(() => {
    if (selectedRecord) {
      setFuelValue(selectedRecord.fuelConsumption.toString());
      setWindSpeed(selectedWeather?.windSpeed?.toString() || '');
      setWaveHeight(selectedWeather?.waveHeight?.toString() || '');
      setReason('');
    }
  }, [selectedRecord, selectedWeather]);

  const hasChanges = useMemo(() => {
    if (!selectedRecord) return false;
    const fuelChanged = fuelValue !== '' && Number(fuelValue) !== selectedRecord.fuelConsumption;
    const windChanged = windSpeed !== '' && selectedWeather && Number(windSpeed) !== selectedWeather.windSpeed;
    const waveChanged = waveHeight !== '' && selectedWeather && Number(waveHeight) !== selectedWeather.waveHeight;
    return fuelChanged || windChanged || waveChanged;
  }, [selectedRecord, selectedWeather, fuelValue, windSpeed, waveHeight]);

  const handleApprove = () => {
    if (!selectedRecord || !reason.trim()) return;
    setIsSubmitting(true);
    try {
      if (hasChanges) {
        correctFuelValue(selectedRecord.id, Number(fuelValue || selectedRecord.fuelConsumption), reason, '当前操作员');
      }
      approveRecord(selectedRecord.id, reason);
      setReason('');
      const remaining = pendingRecords.filter(r => r.id !== selectedRecord.id);
      setSelectedId(remaining[0]?.id || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    if (!selectedRecord || !reason.trim()) return;
    setIsSubmitting(true);
    try {
      rejectRecord(selectedRecord.id, reason);
      setReason('');
      const remaining = pendingRecords.filter(r => r.id !== selectedRecord.id);
      setSelectedId(remaining[0]?.id || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = () => {
    if (!selectedRecord) return;
    if (!reason.trim() && hasChanges) return;
    setIsSubmitting(true);
    try {
      if (hasChanges) {
        correctFuelValue(selectedRecord.id, Number(fuelValue || selectedRecord.fuelConsumption), reason || '暂存修正', '当前操作员');
      }
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="min-h-[calc(100vh-8rem)]">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-data-gold/20 backdrop-blur-sm">
              <ArrowLeftRight className="h-6 w-6 text-data-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-deep-sea tracking-wide">人工修正审核</h1>
              <p className="text-sm text-sea-gray-dark mt-0.5">
                待处理 {pendingRecords.length} 条记录需要人工审核
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/trace')}
            className="flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur border border-white/60 px-5 py-2.5 font-medium text-deep-sea hover:bg-white transition-colors"
          >
            <History className="h-4 w-4" />
            查看溯源
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm h-full flex flex-col">
              <div className="px-5 py-4 border-b border-sea-gray-dark/10">
                <h3 className="font-semibold text-deep-sea mb-3">待处理记录</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sea-gray-dark" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="搜索记录ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-sea-gray/50 border border-sea-gray-dark/20 text-sm text-deep-sea placeholder:text-sea-gray-dark focus:outline-none focus:border-ocean/50 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-20rem)]">
                {filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-sea-gray-dark">
                    <CheckCircle className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">暂无待处理记录</p>
                  </div>
                ) : (
                  <div className="divide-y divide-sea-gray-dark/10">
                    {filteredRecords.map(rec => {
                      const voyage = voyages.find(v => v.id === rec.voyageId);
                      const vessel = voyage ? vessels.find(v => v.id === voyage.vesselId) : null;
                      const isSelected = selectedId === rec.id;
                      return (
                        <button
                          key={rec.id}
                          onClick={() => setSelectedId(rec.id)}
                          className={cn(
                            'w-full p-4 text-left transition-all',
                            isSelected
                              ? 'bg-ocean/10 border-l-4 border-ocean'
                              : 'hover:bg-sea-gray/50 border-l-4 border-transparent'
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-sm text-deep-sea truncate max-w-[60%]">
                              {vessel?.name || '未知船舶'}
                            </span>
                            <StatusBadge status={rec.status} />
                          </div>
                          <div className="text-xs text-sea-gray-dark space-y-1">
                            <p className="font-mono truncate">{rec.id.slice(0, 20)}...</p>
                            <p className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(rec.timestamp).toLocaleString('zh-CN', {
                                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            <div className="flex items-center gap-3 pt-1">
                              <span className="flex items-center gap-1">
                                <Fuel className="h-3 w-3" />
                                <span className="font-mono font-semibold text-deep-sea">{rec.fuelConsumption.toFixed(1)}</span>
                                <span className="text-[10px]">L/h</span>
                              </span>
                              {rec.hasCorrection && (
                                <span className="inline-flex items-center gap-1 text-data-gold">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="text-[10px] font-medium">已修正</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {!selectedRecord ? (
              <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm p-16 flex flex-col items-center justify-center text-sea-gray-dark">
                <AlertOctagon className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">请选择一条待处理记录</p>
                <p className="text-sm mt-1">从左侧列表中选择需要审核修正的记录</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-deep-sea flex items-center gap-2">
                        <Ship className="h-5 w-5 text-ocean" />
                        {selectedVessel?.name || '未知船舶'}
                      </h3>
                      <p className="text-xs text-sea-gray-dark mt-1 font-mono">
                        记录ID: {selectedRecord.id}
                      </p>
                    </div>
                    <StatusBadge status={selectedRecord.status} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-sea-gray/50 p-4">
                      <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-2">
                        <Clock className="h-3.5 w-3.5" />
                        采集时间
                      </div>
                      <p className="text-sm font-semibold text-deep-sea">
                        {new Date(selectedRecord.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="rounded-xl bg-sea-gray/50 p-4">
                      <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-2">
                        <Ship className="h-3.5 w-3.5" />
                        船舶信息
                      </div>
                      <p className="text-sm font-semibold text-deep-sea">
                        {selectedVessel ? `${selectedVessel.name} (${selectedVessel.tonnage}吨)` : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-sea-gray/50 p-4">
                      <div className="flex items-center gap-2 text-sea-gray-dark text-xs mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        位置坐标
                      </div>
                      <p className="text-sm font-mono font-semibold text-deep-sea">
                        {selectedRecord.lat?.toFixed(4) || '—'}, {selectedRecord.lng?.toFixed(4) || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-sea-gray-dark/10 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-deep-sea text-white">
                      <ArrowLeftRight className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-sea">数据对比修正</h3>
                      <p className="text-xs text-sea-gray-dark mt-0.5">
                        左：原始数据 · 中：差异对比 · 右：修正后（可编辑）
                      </p>
                    </div>
                    {hasChanges && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-data-gold/10 text-data-gold px-3 py-1 text-xs font-semibold">
                        <AlertTriangle className="h-3 w-3" />
                        存在未保存修改
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-sea-gray-dark/10 min-h-[320px]">
                    <div className="bg-sea-gray/30 p-5">
                      <h4 className="text-xs font-semibold text-sea-gray-dark mb-4 flex items-center gap-2">
                        <History className="h-3.5 w-3.5" />
                        修正前数据
                      </h4>
                      <div className="space-y-5">
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">油耗值 (L/h)</label>
                          <div className="font-mono text-lg font-semibold text-deep-sea/60 line-through">
                            {selectedRecord.fuelConsumption.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">风速 (m/s)</label>
                          <div className="font-mono text-lg font-semibold text-deep-sea/60 line-through">
                            {selectedWeather?.windSpeed?.toFixed(1) || '—'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">浪高 (m)</label>
                          <div className="font-mono text-lg font-semibold text-deep-sea/60 line-through">
                            {selectedWeather?.waveHeight?.toFixed(1) || '—'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">气温 (°C)</label>
                          <div className="font-mono text-lg font-semibold text-deep-sea/60">
                            {selectedWeather?.temperature?.toFixed(1) || '—'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">航速 (节)</label>
                          <div className="font-mono text-lg font-semibold text-deep-sea/60">
                            {selectedRecord.speed.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/50 p-5">
                      <h4 className="text-xs font-semibold text-sea-gray-dark mb-4 flex items-center gap-2">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        差异对比
                      </h4>
                      <div className="space-y-5">
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">油耗值变化</label>
                          {fuelValue && Number(fuelValue) !== selectedRecord.fuelConsumption ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-deep-sea/60 line-through text-sm">
                                {selectedRecord.fuelConsumption.toFixed(1)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-data-gold" />
                              <span className="font-mono font-bold text-ocean text-lg">
                                {Number(fuelValue).toFixed(1)}
                              </span>
                              <span className={cn(
                                'text-xs font-semibold px-2 py-0.5 rounded-full',
                                Number(fuelValue) < selectedRecord.fuelConsumption
                                  ? 'bg-green-500/10 text-green-600'
                                  : 'bg-coral/10 text-coral'
                              )}>
                                {Number(fuelValue) > selectedRecord.fuelConsumption ? '+' : ''}
                                {(Number(fuelValue) - selectedRecord.fuelConsumption).toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-sea-gray-dark">无变化</span>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">风速变化</label>
                          {windSpeed && selectedWeather && Number(windSpeed) !== selectedWeather.windSpeed ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-deep-sea/60 line-through text-sm">
                                {selectedWeather.windSpeed.toFixed(1)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-data-gold" />
                              <span className="font-mono font-bold text-ocean text-lg">
                                {Number(windSpeed).toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-sea-gray-dark">无变化</span>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">浪高变化</label>
                          {waveHeight && selectedWeather && Number(waveHeight) !== selectedWeather.waveHeight ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-deep-sea/60 line-through text-sm">
                                {selectedWeather.waveHeight.toFixed(1)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-data-gold" />
                              <span className="font-mono font-bold text-ocean text-lg">
                                {Number(waveHeight).toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-sea-gray-dark">无变化</span>
                          )}
                        </div>
                        <div className="pt-3 border-t border-sea-gray-dark/10">
                          <label className="text-xs text-sea-gray-dark block mb-1.5">风向</label>
                          <div className="font-mono text-sm text-deep-sea/70">
                            {selectedWeather?.windDirection || '—'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">数据来源</label>
                          <div className="font-mono text-sm text-deep-sea/70">
                            {selectedRecord.source}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-ocean/5 p-5">
                      <h4 className="text-xs font-semibold text-ocean mb-4 flex items-center gap-2">
                        <Save className="h-3.5 w-3.5" />
                        修正后数据（可编辑）
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5 flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            油耗值 (L/h) <span className="text-coral">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={fuelValue}
                            onChange={e => setFuelValue(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-ocean/30 font-mono text-deep-sea text-sm focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5 flex items-center gap-1">
                            <Wind className="h-3 w-3" />
                            风速 (m/s)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={windSpeed}
                            onChange={e => setWindSpeed(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-ocean/30 font-mono text-deep-sea text-sm focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5 flex items-center gap-1">
                            <Waves className="h-3 w-3" />
                            浪高 (m)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={waveHeight}
                            onChange={e => setWaveHeight(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-ocean/30 font-mono text-deep-sea text-sm focus:outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5 flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            气温 (°C)
                          </label>
                          <div className="w-full px-3 py-2 rounded-lg bg-sea-gray/50 border border-sea-gray-dark/20 font-mono text-deep-sea/50 text-sm">
                            {selectedWeather?.temperature?.toFixed(1) || '—'}
                            <span className="text-[10px] text-sea-gray-dark ml-2">不可编辑</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-sea-gray-dark block mb-1.5">
                            修正理由 <span className="text-coral">*</span>
                          </label>
                          <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="请填写修正理由（通过/驳回/暂存均需填写）..."
                            rows={3}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg border font-mono text-sm text-deep-sea focus:outline-none focus:ring-2 transition-all resize-none',
                              reason.trim()
                                ? 'bg-white border-ocean/30 focus:border-ocean focus:ring-ocean/20'
                                : 'bg-white border-coral/30 focus:border-coral focus:ring-coral/20'
                            )}
                          />
                          {!reason.trim() && (
                            <p className="text-[10px] text-coral mt-1 flex items-center gap-1">
                              <AlertOctagon className="h-3 w-3" />
                              提交前必须填写修正理由
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-sea-gray-dark/10 bg-sea-gray/30 flex items-center justify-end gap-3">
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting || (!reason.trim() && hasChanges)}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium bg-sea-gray-dark/20 text-sea-gray-dark hover:bg-sea-gray-dark/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      暂存
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting || !reason.trim()}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="h-4 w-4" />
                      驳回
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting || !reason.trim()}
                      className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-semibold bg-ocean text-white hover:bg-ocean-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ocean/30"
                    >
                      <CheckCircle className="h-4 w-4" />
                      通过（待确认→已通过）
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm">
                  <div className="px-6 py-4 border-b border-sea-gray-dark/10 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean/20">
                      <History className="h-4 w-4 text-ocean" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-sea">状态流转时间线</h3>
                      <p className="text-xs text-sea-gray-dark mt-0.5">
                        该记录的所有历史操作记录
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    {historySteps.length > 0 ? (
                      <TraceTimeline steps={historySteps} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-sea-gray-dark">
                        <History className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">暂无历史操作记录</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
  );
}
