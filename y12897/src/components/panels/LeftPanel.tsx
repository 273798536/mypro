import { ChevronDown, ChevronRight, AlertTriangle, Activity, Ship, Fish, Droplets, Radio, Upload, X, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useDataStore, useProcessStore, useSceneStore } from '@/stores';
import { getRiskColor, getRiskLabel, formatTime, generateId } from '@/utils/geo';
import { cn } from '@/lib/utils';
import type { RiskNotice, BuoyData, AquacultureLog, SalinityData } from '@/types';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <span className="text-slate-300">{icon}</span>
        <span className="text-sm font-medium text-slate-200">{title}</span>
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function RiskNoticeList() {
  const { riskNotices, selectedRiskNoticeId, setSelectedRiskNotice } = useDataStore();

  return (
    <div className="space-y-2">
      {riskNotices.map((notice) => (
        <div
          key={notice.id}
          onClick={() => setSelectedRiskNotice(selectedRiskNoticeId === notice.id ? null : notice.id)}
          className={cn(
            'p-3 rounded-lg cursor-pointer transition-all',
            'border border-slate-700 hover:border-cyan-500/50',
            selectedRiskNoticeId === notice.id
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-800/50 hover:bg-slate-800'
          )}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: getRiskColor(notice.severity) }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{notice.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatTime(notice.noticeTime)} · {getRiskLabel(notice.severity)}风险
              </p>
            </div>
          </div>
          {selectedRiskNoticeId === notice.id && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">处理意见：</p>
              <p className="text-xs text-slate-300 leading-relaxed">{notice.handlingOpinion}</p>
              <p className="text-xs text-slate-500 mt-2">来源：{notice.source}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BuoyStatusList() {
  const { buoys } = useDataStore();
  const { filters, toggleFilter, selectObject, selectedObject } = useSceneStore();

  const handleBuoyClick = (buoy: any) => {
    selectObject({
      type: 'buoy',
      id: buoy.id,
      data: buoy as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">共 {buoys.length} 个浮标</span>
        <button
          onClick={() => toggleFilter('showBuoys')}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            filters.showBuoys
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-700 text-slate-400 border border-slate-600'
          )}
        >
          {filters.showBuoys ? '显示中' : '已隐藏'}
        </button>
      </div>
      {buoys.map((buoy) => (
        <div
          key={buoy.id}
          onClick={() => handleBuoyClick(buoy)}
          className={cn(
            'p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all',
            buoy.isOffline
              ? 'bg-red-900/20 border-red-800/50'
              : 'bg-slate-800/30 border-slate-700/50',
            selectedObject?.id === buoy.id && selectedObject?.type === 'buoy'
              ? 'ring-2 ring-cyan-500 ring-offset-1 ring-offset-slate-900'
              : 'hover:border-slate-600'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              buoy.isOffline ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
            )}
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-200">{buoy.buoyId}</p>
            <p className="text-xs text-slate-400">
              油膜厚度: {buoy.oilThickness.toFixed(2)} mm
            </p>
          </div>
          {buoy.isOffline && (
            <span className="text-xs text-red-400 font-medium">离线</span>
          )}
        </div>
      ))}
    </div>
  );
}

function DataSourceSummary() {
  const { shipTracks, aquacultureLogs, salinityDataList } = useDataStore();
  const { filters, toggleFilter } = useSceneStore();
  const { getAllDataGaps, getAllAnomalies } = useProcessStore();

  const sources = [
    { key: 'showShips', label: '船舶轨迹', count: shipTracks.length, icon: <Ship size={14} /> },
    { key: 'showFarms', label: '养殖日志', count: aquacultureLogs.length, icon: <Fish size={14} /> },
    { key: 'showStations', label: '盐度监测', count: salinityDataList.length, icon: <Droplets size={14} /> },
    { key: 'showAnomalies', label: '异常点', count: getAllAnomalies().length, icon: <AlertTriangle size={14} /> },
  ];

  return (
    <div className="space-y-2">
      {sources.map((src) => (
        <button
          key={src.key}
          onClick={() => toggleFilter(src.key as keyof typeof filters)}
          className={cn(
            'w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left',
            filters[src.key as keyof typeof filters] as boolean
              ? 'bg-cyan-900/20 border-cyan-700/50 text-cyan-200'
              : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-800/50'
          )}
        >
          <span className="text-slate-400">{src.icon}</span>
          <span className="text-xs flex-1">{src.label}</span>
          <span className="text-xs font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">
            {src.count}
          </span>
        </button>
      ))}

      {getAllDataGaps().length > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-amber-900/20 border border-amber-700/50">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">数据缺口: {getAllDataGaps().length} 项</span>
          </div>
          <p className="text-xs text-amber-300/70 mt-1">部分数据缺失，结论仅供参考</p>
        </div>
      )}
    </div>
  );
}

function FilterPanel() {
  const { filters, toggleFilter } = useSceneStore();
  const levels = [
    { key: 'critical', label: '极高', color: 'bg-red-500' },
    { key: 'high', label: '高', color: 'bg-orange-500' },
    { key: 'medium', label: '中', color: 'bg-amber-500' },
    { key: 'low', label: '低', color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">风险等级筛选</p>
      <div className="flex flex-wrap gap-1.5">
        {levels.map((level) => (
          <button
            key={level.key}
            onClick={() => toggleFilter('riskLevels', level.key)}
            className={cn(
              'px-2 py-1 rounded text-xs flex items-center gap-1.5 border transition-all',
              filters.riskLevels.includes(level.key)
                ? 'border-slate-500 bg-slate-700 text-slate-200'
                : 'border-slate-700 bg-slate-800/50 text-slate-500'
            )}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${level.color}`} />
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [importType, setImportType] = useState<string>('riskNotice');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importData, riskNotices, buoys, aquacultureLogs, salinityDataList } = useDataStore();
  const { runProcessing } = useProcessStore();

  const importTypes = [
    { key: 'riskNotice', label: '风险通报', icon: <AlertTriangle size={14} />, count: riskNotices.length },
    { key: 'buoy', label: '浮标数据', icon: <Radio size={14} />, count: buoys.length },
    { key: 'aquaculture', label: '养殖日志', icon: <Fish size={14} />, count: aquacultureLogs.length },
    { key: 'salinity', label: '盐度监测', icon: <Droplets size={14} />, count: salinityDataList.length },
  ];

  const handleDemoImport = () => {
    setImportStatus('importing');
    setTimeout(() => {
      let demoData: unknown[] = [];
      switch (importType) {
        case 'riskNotice':
          demoData = [{
            id: generateId('notice'),
            title: '新增：东涌养殖区发现异常油膜',
            noticeTime: new Date().toISOString(),
            location: '东涌养殖区附近',
            severity: 'medium' as const,
            handlingOpinion: '请立即派遣现场核查船前往确认，采集水样送检。',
            source: '养殖区巡查员上报',
            latitude: 22.54,
            longitude: 113.95,
          } as RiskNotice];
          break;
        case 'buoy':
          demoData = [{
            id: generateId('buoy'),
            buoyId: 'F-05',
            timestamp: new Date().toISOString(),
            latitude: 22.6,
            longitude: 113.9,
            oilThickness: 0.22,
            status: 'active' as const,
            isOffline: false,
          } as BuoyData];
          break;
        case 'aquaculture':
          demoData = [{
            id: generateId('aqua'),
            farmId: 'farm-003',
            farmName: '西涌鲍鱼养殖区',
            logDate: '2025-06-15',
            salinity: 32.5,
            waterQuality: '良好',
            notes: '今日水质正常，未见异常',
            latitude: 22.52,
            longitude: 113.9,
          } as AquacultureLog];
          break;
        case 'salinity':
          demoData = [{
            id: generateId('sal'),
            stationId: 'station-004',
            stationName: '港口门盐度站',
            timestamp: new Date().toISOString(),
            salinity: 30.2,
            unit: 'psu' as const,
            source: '在线监测',
            latitude: 22.57,
            longitude: 113.88,
          } as SalinityData];
          break;
      }
      importData(importType, demoData);
      setImportStatus('success');
      setTimeout(() => {
        runProcessing();
        onClose();
        setImportStatus('idle');
      }, 800);
    }, 600);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('importing');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const dataArray = Array.isArray(data) ? data : [data];
        importData(importType, dataArray);
        setImportStatus('success');
        setTimeout(() => {
          runProcessing();
          onClose();
          setImportStatus('idle');
        }, 800);
      } catch {
        setImportStatus('idle');
        alert('文件解析失败，请检查JSON格式');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-96 shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Upload size={16} className="text-cyan-400" />
            导入数据
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-2">选择数据类型</p>
            <div className="grid grid-cols-2 gap-2">
              {importTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setImportType(type.key)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    importType === type.key
                      ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {type.icon}
                    <span className="text-xs font-medium">{type.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">现有 {type.count} 条</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus !== 'idle'}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm rounded-lg transition-colors border border-slate-600 flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              选择 JSON 文件
            </button>
            <p className="text-xs text-slate-500 text-center">— 或 —</p>
            <button
              onClick={handleDemoImport}
              disabled={importStatus !== 'idle'}
              className={cn(
                'w-full py-2.5 px-3 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 font-medium',
                importStatus === 'success'
                  ? 'bg-emerald-600 text-white'
                  : importStatus === 'importing'
                    ? 'bg-cyan-600/50 text-cyan-200 cursor-wait'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              )}
            >
              {importStatus === 'success' ? (
                <><CheckCircle size={14} /> 导入成功，正在重算...</>
              ) : importStatus === 'importing' ? (
                '正在导入...'
              ) : (
                <>快速导入示例数据</>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            导入完成后将自动重新运行轨迹清洗与风险分层，
            处理记录会与之前的数据共用同一批次。
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeftPanel() {
  const [importModalOpen, setImportModalOpen] = useState(false);

  return (
    <>
      <div className="w-72 h-full bg-slate-900/90 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-700/50">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            海面溢油扩散复盘
          </h2>
          <p className="text-xs text-slate-500 mt-1">大亚湾 6·15 溢油事件</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Section title="风险通报" icon={<AlertTriangle size={16} className="text-orange-400" />}>
            <RiskNoticeList />
          </Section>

          <Section title="浮标状态" icon={<Radio size={16} className="text-emerald-400" />} defaultOpen={true}>
            <BuoyStatusList />
          </Section>

          <Section title="数据源" icon={<Activity size={16} className="text-cyan-400" />} defaultOpen={true}>
            <DataSourceSummary />
          </Section>

          <Section title="筛选设置" icon={<Activity size={16} className="text-purple-400" />} defaultOpen={false}>
            <FilterPanel />
          </Section>
        </div>

        <div className="px-4 py-3 border-t border-slate-700/50">
          <button
            onClick={() => setImportModalOpen(true)}
            className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={14} />
            导入数据
          </button>
        </div>
      </div>
      <ImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </>
  );
}
