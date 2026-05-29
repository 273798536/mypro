import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Thermometer, Clock, Settings, Database, Play, RefreshCw } from 'lucide-react';
import { useFittingStore, type RawDataRecord } from '@/store/fittingStore';
import { generateMockBatteryData } from '@/lib/mockData';
import { cn } from '@/lib/utils';

export default function DataInputPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [parseStatus, setParseStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    samplingIntervalMs,
    initialParams,
    parameterBounds,
    isFitting,
    importData,
    setSamplingInterval,
    setInitialParams,
    setParameterBounds,
    runFitting,
    resetState,
  } = useFittingStore();

  const parseCSV = (text: string): RawDataRecord[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const records: RawDataRecord[] = [];
    const hasHeader = isNaN(parseFloat(lines[0].split(/[,\t\s]+/)[0]));
    const startLine = hasHeader ? 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t\s]+/).map(p => p.trim()).filter(p => p);
      if (parts.length < 3) continue;

      const time = parseFloat(parts[0]);
      const voltage = parseFloat(parts[1]);
      const current = parseFloat(parts[2]);
      const temperature = parts.length >= 4 ? parseFloat(parts[3]) : 25;

      if (isNaN(time) || isNaN(voltage) || isNaN(current)) continue;

      records.push({ time, voltage, current, temperature });
    }

    return records;
  };

  const detectSamplingInterval = (records: RawDataRecord[]): number => {
    if (records.length < 2) return 1000;
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(records.length, 100); i++) {
      intervals.push((records[i].time - records[i - 1].time) * 1000);
    }
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    return Math.round(median);
  };

  const handleParseCSV = () => {
    try {
      const records = parseCSV(csvText);
      if (records.length === 0) {
        setParseStatus('error');
        setErrorMessage('未解析到有效数据');
        return;
      }
      const detectedInterval = detectSamplingInterval(records);
      setSamplingInterval(detectedInterval, 'CSV解析自动检测');
      importData(records, 'CSV粘贴导入');
      setParseStatus('success');
      setErrorMessage('');
    } catch (e) {
      setParseStatus('error');
      setErrorMessage('解析失败，请检查CSV格式');
    }
  };

  const handleLoadMockData = () => {
    const mockData = generateMockBatteryData(3600, 1000, true, true);
    const records: RawDataRecord[] = mockData.time.map((t, i) => ({
      time: t,
      voltage: mockData.voltage[i],
      current: mockData.current[i],
      temperature: mockData.temperature[i],
    }));
    setSamplingInterval(mockData.samplingIntervalMs, '示例数据导入');
    importData(records, '示例数据');
    setParseStatus('success');
    setCsvText(records.slice(0, 10).map(r => `${r.time},${r.voltage.toFixed(6)},${r.current.toFixed(6)},${r.temperature.toFixed(2)}`).join('\n') + '\n...');
  };

  const handleParamChange = (key: keyof typeof initialParams, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setInitialParams({ [key]: num }, '用户手动修改');
    }
  };

  const handleBoundChange = (param: keyof typeof parameterBounds, bound: 'min' | 'max', value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setParameterBounds({
        [param]: {
          ...parameterBounds[param],
          [bound]: num,
        },
      });
    }
  };

  return (
    <div className={cn(
      'relative h-full bg-[#16162a] border-l border-[#2a2a4e] transition-all duration-300',
      isCollapsed ? 'w-12' : 'w-80'
    )}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-[#2a2a4e] hover:bg-[#3a3a5e] rounded-full flex items-center justify-center border border-[#3a3a5e] transition-colors"
      >
        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {!isCollapsed && (
        <div className="h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2a2a4e]">
            <h2 className="text-lg font-semibold text-[#00d4ff] flex items-center gap-2">
              <Database size={18} />
              数据输入
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#ff8c00] flex items-center gap-2">
                <FileText size={14} />
                电压电流CSV
              </h3>
              <textarea
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); setParseStatus('idle'); }}
                placeholder="时间,电压,电流[,温度]\n0,3.7,-1.0,25.0\n1,3.695,-1.0,25.1"
                className="w-full h-32 bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg p-3 text-sm font-mono text-gray-300 resize-none focus:outline-none focus:border-[#00d4ff] transition-colors"
              />
              {parseStatus === 'error' && (
                <p className="text-xs text-red-400">{errorMessage}</p>
              )}
              {parseStatus === 'success' && (
                <p className="text-xs text-green-400">数据解析成功</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleParseCSV}
                  className="flex-1 px-3 py-2 bg-[#2a2a4e] hover:bg-[#3a3a5e] rounded-lg text-sm transition-colors"
                >
                  解析CSV
                </button>
                <button
                  onClick={handleLoadMockData}
                  className="flex-1 px-3 py-2 bg-[#ff8c00] hover:bg-[#ff9c2a] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw size={12} />
                  导入示例数据
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#ff8c00] flex items-center gap-2">
                <Thermometer size={14} />
                温度数据
              </h3>
              <div className="bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg p-3 text-sm">
                <p className="text-gray-400">温度数据随CSV导入</p>
                <p className="text-gray-500 text-xs mt-1">格式: 第4列为温度(°C)</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#ff8c00] flex items-center gap-2">
                <Clock size={14} />
                采样间隔
              </h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={samplingIntervalMs}
                  onChange={(e) => setSamplingInterval(parseInt(e.target.value) || 1000, '用户手动设置')}
                  className="flex-1 bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
                />
                <span className="flex items-center text-gray-400 text-sm">ms</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[#ff8c00] flex items-center gap-2">
                <Settings size={14} />
                初始参数设置
              </h3>
              <div className="space-y-3">
                {(['ocv', 'R0', 'R1', 'C1'] as const).map((param) => (
                  <div key={param} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">{param.toUpperCase()}</label>
                      <span className="text-xs text-gray-500">
                        {param === 'ocv' ? 'V' : param === 'C1' ? 'F' : 'Ω'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step={param === 'C1' ? 10 : 0.001}
                        value={initialParams[param as keyof typeof initialParams] || ''}
                        onChange={(e) => handleParamChange(param as keyof typeof initialParams, e.target.value)}
                        className="flex-1 bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
                      />
                      <input
                        type="number"
                        step={param === 'C1' ? 10 : 0.001}
                        placeholder="min"
                        value={parameterBounds[param as keyof typeof parameterBounds]?.min || ''}
                        onChange={(e) => handleBoundChange(param as keyof typeof parameterBounds, 'min', e.target.value)}
                        className="w-16 bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
                      />
                      <input
                        type="number"
                        step={param === 'C1' ? 10 : 0.001}
                        placeholder="max"
                        value={parameterBounds[param as keyof typeof parameterBounds]?.max || ''}
                        onChange={(e) => handleBoundChange(param as keyof typeof parameterBounds, 'max', e.target.value)}
                        className="w-16 bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#00d4ff] transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[#2a2a4e] space-y-2">
            <button
              onClick={runFitting}
              disabled={isFitting}
              className={cn(
                'w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                isFitting
                  ? 'bg-[#2a2a4e] text-gray-500 cursor-not-allowed'
                  : 'bg-[#00d4ff] hover:bg-[#00e5ff] text-[#0f0f1e]'
              )}
            >
              <Play size={16} />
              {isFitting ? '拟合中...' : '开始拟合'}
            </button>
            <button
              onClick={resetState}
              className="w-full px-4 py-2 bg-[#2a2a4e] hover:bg-[#3a3a5e] rounded-lg text-sm transition-colors"
            >
              重置状态
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
