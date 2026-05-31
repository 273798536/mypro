import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Check,
  AlertTriangle,
  Zap,
  Wind,
  Database,
  FileSpreadsheet,
  ArrowRight,
  Trash2,
  Play,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  generateNormalSample,
  generateSensorDriftSample,
  generateSpeedSuddenChangeSample,
  generateMissingSectionSample,
  generateComprehensiveSample,
  parseGapSensorCSV,
  parseSpeedRecordCSV,
  parseCarMappingCSV,
} from '@/utils/mockData';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

type SampleType = 'normal' | 'drift' | 'speed' | 'missing' | 'comprehensive';

const sampleConfigs: Record<SampleType, {
  label: string;
  description: string;
  icon: typeof Zap;
  color: string;
  generator: () => ReturnType<typeof generateNormalSample>;
}> = {
  normal: {
    label: '正常数据',
    description: '所有区段间隙值在正常范围内',
    icon: Check,
    color: 'text-success border-success/30 bg-success/5',
    generator: generateNormalSample,
  },
  drift: {
    label: '传感器漂移',
    description: '某传感器连续5个采样点偏差超过±15%',
    icon: Wind,
    color: 'text-warning border-warning/30 bg-warning/5',
    generator: generateSensorDriftSample,
  },
  speed: {
    label: '速度突变',
    description: '相邻采样点速度变化率>50km/h/s',
    icon: Zap,
    color: 'text-danger border-danger/30 bg-danger/5',
    generator: generateSpeedSuddenChangeSample,
  },
  missing: {
    label: '区段缺失',
    description: '某区段采样点不足10个，无法判定',
    icon: Database,
    color: 'text-industrial-muted border-industrial-muted/30 bg-industrial-muted/5',
    generator: generateMissingSectionSample,
  },
  comprehensive: {
    label: '综合边界',
    description: '同时包含漂移、突变、缺失三种异常',
    icon: AlertTriangle,
    color: 'text-primary border-primary/30 bg-primary/5',
    generator: generateComprehensiveSample,
  },
};

export default function ImportPage() {
  const navigate = useNavigate();
  const {
    importState,
    setGapSensorData,
    setSpeedRecords,
    setCarMappings,
    gapSensorData,
    speedRecords,
    carMappings,
    executePhase1Judgment,
    executePhase2Judgment,
    clearAllData,
    isLoading,
  } = useStore();

  const [dragActive, setDragActive] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    gap?: ReturnType<typeof generateNormalSample>['gapData'];
    speed?: ReturnType<typeof generateNormalSample>['speedRecords'];
    car?: ReturnType<typeof generateNormalSample>['carMappings'];
  }>({});

  const gapInputRef = useRef<HTMLInputElement>(null);
  const speedInputRef = useRef<HTMLInputElement>(null);
  const carInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(type);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'gap' | 'speed' | 'car') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      if (type === 'gap') {
        const data = parseGapSensorCSV(csv);
        setPreviewData({ gap: data });
      } else if (type === 'speed') {
        const data = parseSpeedRecordCSV(csv);
        setPreviewData({ speed: data });
      } else {
        const data = parseCarMappingCSV(csv);
        setPreviewData({ car: data });
      }
    };
    reader.readAsText(file);
  }, [setPreviewData]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'gap' | 'speed' | 'car') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      if (type === 'gap') {
        const data = parseGapSensorCSV(csv);
        setPreviewData({ gap: data });
      } else if (type === 'speed') {
        const data = parseSpeedRecordCSV(csv);
        setPreviewData({ speed: data });
      } else {
        const data = parseCarMappingCSV(csv);
        setPreviewData({ car: data });
      }
    };
    reader.readAsText(file);
  }, [setPreviewData]);

  const loadSampleData = (type: SampleType) => {
    const sample = sampleConfigs[type].generator();
    setPreviewData({
      gap: sample.gapData,
      speed: sample.speedRecords,
      car: sample.carMappings,
    });
  };

  const confirmImport = () => {
    if (previewData.gap) setGapSensorData(previewData.gap);
    if (previewData.speed) setSpeedRecords(previewData.speed);
    if (previewData.car) setCarMappings(previewData.car);
    setPreviewData({});
  };

  const handleRunAndView = () => {
    const hasSpeedData = !!previewData.speed;
    confirmImport();
    setTimeout(() => {
      executePhase1Judgment();
      if (hasSpeedData) {
        setTimeout(() => {
          executePhase2Judgment();
          setTimeout(() => {
            navigate('/');
          }, 100);
        }, 100);
      } else {
        setTimeout(() => {
          navigate('/');
        }, 100);
      }
    }, 100);
  };

  const hasPreview = previewData.gap || previewData.speed || previewData.car;

  const uploadAreas = [
    {
      type: 'gap' as const,
      title: '间隙传感器数据',
      phase: '第一阶段',
      description: 'CSV格式: timestamp, sensorId, carNumber, gapValue, sectionId',
      icon: FileSpreadsheet,
      hasData: importState.hasGapData,
      previewCount: previewData.gap?.length,
      ref: gapInputRef,
    },
    {
      type: 'car' as const,
      title: '车厢编号映射',
      phase: '第一阶段',
      description: 'CSV格式: sensorId, carNumber, lineId',
      icon: Database,
      hasData: importState.hasCarMapping,
      previewCount: previewData.car?.length,
      ref: carInputRef,
    },
    {
      type: 'speed' as const,
      title: '速度记录',
      phase: '第二阶段',
      description: 'CSV格式: timestamp, carNumber, speed, sectionId',
      icon: Zap,
      hasData: importState.hasSpeedData,
      previewCount: previewData.speed?.length,
      ref: speedInputRef,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据导入</h1>
          <p className="text-sm text-industrial-muted mt-1">
            分两阶段导入数据，先导入间隙数据和车厢编号，再补充速度记录
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAllData}
            className="industrial-btn-danger flex items-center gap-2"
          >
            <Trash2 size={16} />
            清空数据
          </button>
          {hasPreview && (
            <>
              <button
                onClick={confirmImport}
                className="industrial-btn-secondary flex items-center gap-2"
              >
                <Check size={16} />
                确认导入
              </button>
              <button
                onClick={handleRunAndView}
                disabled={isLoading}
                className="industrial-btn-primary flex items-center gap-2"
              >
                <Play size={16} />
                {isLoading ? '计算中...' : '导入并查看结果'}
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-industrial-panel border border-industrial-border/20 rounded-sm">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            importState.hasGapData && importState.hasCarMapping
              ? 'bg-success text-white'
              : 'bg-primary text-white'
          )}>
            1
          </div>
          <span className={importState.hasGapData && importState.hasCarMapping ? 'text-success' : ''}>
            第一阶段
          </span>
          {importState.hasGapData && importState.hasCarMapping && (
            <Check size={16} className="text-success" />
          )}
        </div>
        <div className="flex-1 h-0.5 bg-industrial-border/20">
          <div
            className={cn(
              'h-full transition-all duration-500',
              importState.hasGapData && importState.hasCarMapping ? 'bg-success' : 'bg-primary'
            )}
            style={{ width: importState.hasGapData && importState.hasCarMapping ? '100%' : importState.hasGapData || importState.hasCarMapping ? '50%' : '0%' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            importState.hasSpeedData
              ? 'bg-success text-white'
              : importState.hasGapData && importState.hasCarMapping
              ? 'bg-primary text-white'
              : 'bg-industrial-muted text-white'
          )}>
            2
          </div>
          <span className={importState.hasSpeedData ? 'text-success' : ''}>
            第二阶段
          </span>
          {importState.hasSpeedData && (
            <Check size={16} className="text-success" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {uploadAreas.map((area) => (
          <div key={area.type} className="industrial-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <area.icon size={18} className="text-primary" />
                <h3 className="font-medium">{area.title}</h3>
              </div>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-sm',
                area.phase === '第一阶段'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-warning/10 text-warning'
              )}>
                {area.phase}
              </span>
            </div>

            <div
              onDragEnter={(e) => handleDrag(e, area.type)}
              onDragLeave={(e) => handleDrag(e, area.type)}
              onDragOver={(e) => handleDrag(e, area.type)}
              onDrop={(e) => handleDrop(e, area.type)}
              onClick={() => area.ref.current?.click()}
              className={cn(
                'mt-3 border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-all duration-200',
                dragActive === area.type
                  ? 'border-primary bg-primary/5'
                  : 'border-industrial-border/30 hover:border-primary/50 hover:bg-industrial-bg/50'
              )}
            >
              <Upload size={24} className="mx-auto mb-2 text-industrial-muted" />
              <p className="text-sm text-industrial-muted mb-1">
                拖拽文件到此处或点击上传
              </p>
              <p className="text-xs text-industrial-muted/70">
                {area.description}
              </p>
              <input
                ref={area.ref}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e, area.type)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-industrial-muted">
                已导入: {area.hasData ? (
                  <span className="text-success">是</span>
                ) : (
                  <span className="text-danger">否</span>
                )}
              </span>
              {area.previewCount !== undefined && (
                <span className="text-primary">
                  待导入: {area.previewCount} 条
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasPreview && (
        <div className="industrial-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={16} className="text-primary" />
            <h3 className="font-medium">数据预览</h3>
          </div>

          <div className="space-y-4">
            {previewData.gap && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">间隙传感器数据 ({previewData.gap.length} 条)</h4>
                  <StatusBadge status="PASS" />
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>时间戳</th>
                        <th>传感器ID</th>
                        <th>车厢编号</th>
                        <th>间隙值 (mm)</th>
                        <th>区段ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.gap.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="font-mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                          <td className="font-mono">{row.sensorId}</td>
                          <td className="font-mono">{row.carNumber}</td>
                          <td className="font-mono">{row.gapValue.toFixed(3)}</td>
                          <td className="font-mono">{row.sectionId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {previewData.car && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">车厢编号映射 ({previewData.car.length} 条)</h4>
                  <StatusBadge status="PASS" />
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>传感器ID</th>
                        <th>车厢编号</th>
                        <th>线路ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.car.map((row, idx) => (
                        <tr key={idx}>
                          <td className="font-mono">{row.sensorId}</td>
                          <td className="font-mono">{row.carNumber}</td>
                          <td className="font-mono">{row.lineId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {previewData.speed && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">速度记录 ({previewData.speed.length} 条)</h4>
                  <StatusBadge status="PASS" />
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>时间戳</th>
                        <th>车厢编号</th>
                        <th>速度 (km/h)</th>
                        <th>区段ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.speed.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="font-mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                          <td className="font-mono">{row.carNumber}</td>
                          <td className="font-mono">{row.speed.toFixed(1)}</td>
                          <td className="font-mono">{row.sectionId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="industrial-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-warning" />
          <h3 className="font-medium">边界样例测试</h3>
          <span className="text-xs text-industrial-muted">
            一键加载包含特定异常场景的测试数据
          </span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {(Object.keys(sampleConfigs) as SampleType[]).map((type) => {
            const config = sampleConfigs[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => loadSampleData(type)}
                className={cn(
                  'p-4 border-2 rounded-sm text-left transition-all duration-200 hover:shadow-lg',
                  config.color
                )}
              >
                <Icon size={20} className="mb-2" />
                <h4 className="font-medium text-sm mb-1">{config.label}</h4>
                <p className="text-xs opacity-70">{config.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {gapSensorData.length > 0 && (
        <div className="industrial-card p-4 border-l-4 border-success">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">当前数据状态</h3>
              <p className="text-sm text-industrial-muted mt-1">
                间隙数据: {gapSensorData.length} 条 ·
                速度记录: {speedRecords.length} 条 ·
                车厢映射: {carMappings.length} 条 ·
                当前阶段: {importState.phase === 'PHASE2' ? '第二阶段（完整）' : '第一阶段'}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="industrial-btn-primary flex items-center gap-2"
            >
              查看分析结果
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
