import { useEffect, useMemo } from 'react';
import { ArrowLeftRight, Save, RefreshCw, Thermometer } from 'lucide-react';
import { useDopplerStore } from '../store/useDopplerStore';
import { NumberInput } from '../components/shared/NumberInput';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ReasonTooltip } from '../components/shared/ReasonTooltip';
import { WaveAnimation } from '../components/shared/WaveAnimation';
import type { CalculationMode, Direction } from '../types/doppler';

export function SingleCalculation() {
  const {
    records,
    currentRecordId,
    calculationMode,
    createRecord,
    updateRecord,
    setCalculationMode,
    recalculateRecord,
    getRecordById
  } = useDopplerStore();

  const currentRecord = useMemo(() => {
    if (currentRecordId) {
      return getRecordById(currentRecordId);
    }
    return records.find(r => r.status !== 'normal') || records[0];
  }, [currentRecordId, records, getRecordById]);

  useEffect(() => {
    if (!currentRecord) {
      createRecord('manual', '单条计算');
    }
  }, [currentRecord, createRecord]);

  const handleModeToggle = () => {
    const newMode: CalculationMode = calculationMode === 'frequency_to_velocity'
      ? 'velocity_to_frequency'
      : 'frequency_to_velocity';
    setCalculationMode(newMode);
    if (currentRecord) {
      recalculateRecord(currentRecord.id, newMode);
    }
  };

  const handleFieldUpdate = (field: string, value: any) => {
    if (!currentRecord) return;
    updateRecord(currentRecord.id, { [field]: value });
    setTimeout(() => {
      recalculateRecord(currentRecord.id);
    }, 0);
  };

  const handleDirectionChange = (direction: Direction) => {
    if (!currentRecord) return;
    updateRecord(currentRecord.id, { direction });
    setTimeout(() => {
      recalculateRecord(currentRecord.id);
    }, 0);
  };

  const handleSave = () => {
    if (!currentRecord) return;
    recalculateRecord(currentRecord.id);
  };

  const handleNewRecord = () => {
    createRecord('manual', '单条计算');
  };

  if (!currentRecord) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">单条计算</h1>
          <p className="text-slate-600 text-sm mt-1">
            分步输入数据，实时计算多普勒频移和速度
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleNewRecord}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            新建记录
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            保存计算
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">输入参数</h2>
              <div className="flex items-center gap-2">
                <StatusBadge status={currentRecord.status} />
                <ReasonTooltip
                  reasons={currentRecord.statusReasons}
                  status={currentRecord.status}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <NumberInput
                label="发射频率"
                value={currentRecord.emittedFrequency}
                onChange={(v) => handleFieldUpdate('emittedFrequency', v)}
                unit="Hz"
                hint="波源发出的原始频率"
                placeholder="例如: 1000"
              />

              {calculationMode === 'frequency_to_velocity' ? (
                <NumberInput
                  label="接收频率"
                  value={currentRecord.receivedFrequency}
                  onChange={(v) => handleFieldUpdate('receivedFrequency', v)}
                  unit="Hz"
                  hint="观察者接收到的频率"
                  placeholder="例如: 1050"
                />
              ) : (
                <NumberInput
                  label="运动速度"
                  value={currentRecord.velocity}
                  onChange={(v) => handleFieldUpdate('velocity', v)}
                  unit="m/s"
                  hint="波源相对于介质的速度"
                  placeholder="例如: 15"
                />
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                运动方向
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDirectionChange('approaching')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    currentRecord.direction === 'approaching'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  → 靠近观察者
                </button>
                <button
                  onClick={() => handleDirectionChange('receding')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    currentRecord.direction === 'receding'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ← 远离观察者
                </button>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                温度修正
                <span className="text-xs text-slate-400 font-normal">（可选）</span>
              </label>
              <NumberInput
                label=""
                value={currentRecord.temperature}
                onChange={(v) => handleFieldUpdate('temperature', v)}
                unit="°C"
                hint="环境温度，用于精确计算声速"
                placeholder="例如: 20"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">波形演示</h2>
              <button
                onClick={handleModeToggle}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                切换换算方向
              </button>
            </div>
            <WaveAnimation
              frequency={currentRecord.emittedFrequency}
              velocity={currentRecord.velocity}
              direction={currentRecord.direction}
              speedOfSound={currentRecord.speedOfSound}
            />
            <div className="mt-4 text-xs text-slate-500 text-center">
              蓝色圆点为波源，绿色圆点为观察者
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5" />
              <h3 className="font-semibold">计算结果</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-xs text-blue-100 mb-1">当前声速</div>
                <div className="text-2xl font-bold font-mono">
                  {currentRecord.speedOfSound.toFixed(2)}
                  <span className="text-base font-normal text-blue-100 ml-2">m/s</span>
                </div>
                {currentRecord.temperature !== null && (
                  <div className="text-xs text-blue-200 mt-1">
                    基于 {currentRecord.temperature}°C 计算
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-xs text-blue-100 mb-1">频移</div>
                <div className="text-2xl font-bold font-mono">
                  {currentRecord.frequencyShift !== null
                    ? currentRecord.frequencyShift.toFixed(2)
                    : '--'}
                  <span className="text-base font-normal text-blue-100 ml-2">Hz</span>
                </div>
                <div className="text-xs text-blue-200 mt-1">
                  {currentRecord.frequencyShift !== null
                    ? currentRecord.frequencyShift > 0
                      ? '频率升高（靠近）'
                      : currentRecord.frequencyShift < 0
                        ? '频率降低（远离）'
                        : '无频移'
                    : '等待输入'}
                </div>
              </div>

              {calculationMode === 'frequency_to_velocity' ? (
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs text-blue-100 mb-1">推算速度</div>
                  <div className="text-3xl font-bold font-mono">
                    {currentRecord.velocity !== null
                      ? currentRecord.velocity.toFixed(2)
                      : '--'}
                    <span className="text-base font-normal text-blue-100 ml-2">m/s</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs text-blue-100 mb-1">推算接收频率</div>
                  <div className="text-2xl font-bold font-mono">
                    {currentRecord.receivedFrequency !== null
                      ? currentRecord.receivedFrequency.toFixed(2)
                      : '--'}
                    <span className="text-base font-normal text-blue-100 ml-2">Hz</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">公式说明</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="font-mono text-slate-700 mb-1">f' = f₀ × v / (v - vₛ)</div>
                <div className="text-xs text-slate-500">波源靠近观察者</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="font-mono text-slate-700 mb-1">f' = f₀ × v / (v + vₛ)</div>
                <div className="text-xs text-slate-500">波源远离观察者</div>
              </div>
              <div className="text-xs text-slate-500 mt-4">
                其中 v 为声速，vₛ 为波源速度，f₀ 为发射频率
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">计算进度</h3>
            <div className="space-y-3">
              {[
                { label: '发射频率', done: currentRecord.emittedFrequency !== null },
                { label: '接收频率/速度', done: currentRecord.receivedFrequency !== null || currentRecord.velocity !== null },
                { label: '运动方向', done: currentRecord.direction !== null },
                { label: '温度修正', done: currentRecord.temperature !== null }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    item.done ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}>
                    {item.done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
