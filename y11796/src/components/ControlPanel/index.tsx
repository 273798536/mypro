import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { ResistanceUnit, CapacitanceUnit, VoltageUnit, TimeUnit, CircuitMode } from '@/types';
import { parseStudentCSV } from '@/utils/reportExport';
import { generateMockStudentData } from '@/utils/mockData';
import { 
  Sliders, Save, Upload, Users, AlertTriangle, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  unitOptions?: string[];
  onUnitChange?: (u: string) => void;
  hasWarning?: boolean;
  warningMessage?: string;
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  unitOptions,
  onUnitChange,
  hasWarning,
  warningMessage,
}: SliderInputProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`mb-4 p-3 rounded-lg border transition-all ${
      hasWarning 
        ? 'border-orange-500/50 bg-orange-500/5' 
        : 'border-gray-700/50 bg-gray-800/30'
    }`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-mono">{label}</span>
          {hasWarning && <AlertTriangle size={12} className="text-orange-400" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-sm">
            {value} {unit}
          </span>
          {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
                {unitOptions && onUnitChange && (
                  <select
                    value={unit}
                    onChange={(e) => onUnitChange(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 font-mono focus:outline-none focus:border-cyan-500"
                  >
                    {unitOptions.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                )}
              </div>
              {hasWarning && warningMessage && (
                <div className="mt-2 text-xs text-orange-400 flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{warningMessage}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ControlPanel() {
  const {
    params,
    result,
    presets,
    studentData,
    setParams,
    loadPreset,
    saveCurrentAsPreset,
    addStudentDataBatch,
    processAllStudentData,
    setShowReportModal,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const hasNonzeroInitial = params.initialVoltage !== 0;
  const hasTimeConstantWarning = result?.warnings.some(w => w.type === 'time_constant_error');
  const hasUnitWarning = result?.warnings.some(w => w.type === 'unit_mismatch');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allData: any[] = [];
    for (const file of Array.from(files)) {
      try {
        const parsed = await parseStudentCSV(file);
        allData.push(...parsed);
      } catch (err) {
        console.error('解析文件失败:', err);
      }
    }

    if (allData.length > 0) {
      addStudentDataBatch(allData);
    }
    e.target.value = '';
  };

  const handleGenerateMockData = () => {
    const mockData = generateMockStudentData(params, 10);
    const simplified = mockData.map(d => ({
      studentId: d.studentId,
      studentName: d.studentName,
      experimentId: d.experimentId,
      source: d.source,
      dataPoints: d.dataPoints,
      paramsSnapshot: d.paramsSnapshot,
    }));
    addStudentDataBatch(simplified);
  };

  return (
    <div className="w-full h-full bg-[#0F141F] rounded-xl border border-cyan-500/20 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-mono text-sm flex items-center gap-2">
          <Sliders size={16} />
          参数控制
        </h3>
        {result && (
          <span className={`text-xs px-2 py-1 rounded ${
            result.status === 'normal' ? 'bg-green-500/20 text-green-400' :
            result.status === 'warning' ? 'bg-orange-500/20 text-orange-400' :
            result.status === 'needs_review' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {result.status === 'normal' ? '正常' :
             result.status === 'warning' ? '警告' :
             result.status === 'needs_review' ? '需确认' : '错误'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-2 block">电路模式</label>
          <div className="grid grid-cols-3 gap-2">
            {(['charge', 'discharge', 'both'] as CircuitMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setParams({ mode })}
                className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                  params.mode === mode
                    ? 'bg-cyan-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {mode === 'charge' ? '充电' : mode === 'discharge' ? '放电' : '充放电'}
              </button>
            ))}
          </div>
        </div>

        <SliderInput
          label="电阻 R"
          value={params.resistance}
          onChange={(v) => setParams({ resistance: v })}
          min={0.1}
          max={10000}
          step={0.1}
          unit={params.resistanceUnit}
          unitOptions={['Ω', 'kΩ', 'MΩ']}
          onUnitChange={(u) => setParams({ resistanceUnit: u as ResistanceUnit })}
          hasWarning={!!result?.warnings.some(w => w.field === 'resistance')}
          warningMessage={result?.warnings.find(w => w.field === 'resistance')?.message}
        />

        <SliderInput
          label="电容 C"
          value={params.capacitance}
          onChange={(v) => setParams({ capacitance: v })}
          min={0.1}
          max={10000}
          step={0.1}
          unit={params.capacitanceUnit}
          unitOptions={['F', 'μF', 'nF', 'pF']}
          onUnitChange={(u) => setParams({ capacitanceUnit: u as CapacitanceUnit })}
          hasWarning={!!result?.warnings.some(w => w.field === 'capacitance')}
          warningMessage={result?.warnings.find(w => w.field === 'capacitance')?.message}
        />

        <SliderInput
          label="电源电压 Vs"
          value={params.sourceVoltage}
          onChange={(v) => setParams({ sourceVoltage: v })}
          min={0}
          max={1000}
          step={0.1}
          unit={params.voltageUnit}
          unitOptions={['V', 'mV', 'kV']}
          onUnitChange={(u) => setParams({ voltageUnit: u as VoltageUnit })}
        />

        <SliderInput
          label="初始电压 V0"
          value={params.initialVoltage}
          onChange={(v) => setParams({ initialVoltage: v })}
          min={0}
          max={100}
          step={0.1}
          unit={params.voltageUnit}
          hasWarning={hasNonzeroInitial}
          warningMessage="初始电压不为零，充电曲线公式已修正"
        />

        <SliderInput
          label="采样点数"
          value={params.samplePoints}
          onChange={(v) => setParams({ samplePoints: Math.round(v) })}
          min={2}
          max={500}
          step={1}
          unit="点"
          hasWarning={!!result?.warnings.some(w => w.field === 'samplePoints')}
          warningMessage={result?.warnings.find(w => w.field === 'samplePoints')?.message}
        />

        <SliderInput
          label="时间范围"
          value={params.timeRange}
          onChange={(v) => setParams({ timeRange: v })}
          min={0.1}
          max={1000}
          step={0.1}
          unit={params.timeUnit}
          unitOptions={['s', 'ms', 'μs']}
          onUnitChange={(u) => setParams({ timeUnit: u as TimeUnit })}
        />

        {(hasTimeConstantWarning || hasUnitWarning) && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono mb-2">
              <AlertTriangle size={14} />
              <span>参数异常提醒</span>
            </div>
            {hasTimeConstantWarning && (
              <div className="text-xs text-yellow-300 mb-1">
                ⚠️ 时间常数超出教学常用范围，结果需人工确认
              </div>
            )}
            {hasUnitWarning && (
              <div className="text-xs text-yellow-300">
                ⚠️ 检测到单位混用，请确认单位一致性
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-2 block">预设参数</label>
          <div className="space-y-2">
            {presets.slice(0, 5).map(preset => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset)}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-xs transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 group-hover:text-cyan-400">{preset.name}</span>
                  <span className="text-gray-600 text-[10px]">{preset.description}</span>
                </div>
              </button>
            ))}
          </div>
          {!showSavePreset ? (
            <button
              onClick={() => setShowSavePreset(true)}
              className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-cyan-500 hover:text-cyan-400 text-xs transition-colors"
            >
              <Plus size={12} />
              保存当前为预设
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="预设名称"
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => {
                  if (presetName.trim()) {
                    saveCurrentAsPreset(presetName.trim(), '');
                    setPresetName('');
                    setShowSavePreset(false);
                  }
                }}
                className="px-3 py-1 bg-cyan-500 text-black rounded text-xs hover:bg-cyan-400 transition-colors"
              >
                <Save size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <label className="text-xs text-gray-500 mb-2 block">学生数据</label>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-400">已导入: <span className="text-cyan-400">{studentData.length}</span> 人</span>
            <button
              onClick={processAllStudentData}
              className="text-cyan-400 hover:text-cyan-300"
            >
              批量处理
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
            >
              <Upload size={12} />
              导入CSV
            </button>
            <button
              onClick={handleGenerateMockData}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
            >
              <Users size={12} />
              模拟数据
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          disabled={studentData.length === 0}
          className={`w-full py-3 rounded-lg font-mono text-sm transition-all ${
            studentData.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black hover:from-cyan-400 hover:to-blue-400'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          生成分析报告
        </button>
      </div>
    </div>
  );
}
