import React from 'react';
import { CircleDot, Box, Disc, Activity, Zap, Play, RotateCcw } from 'lucide-react';
import { useRLCStore } from '../store/useRLCStore';
import { ResistanceUnit, InductanceUnit, CapacitanceUnit, WaveformType } from '../types';
import { getUnitLabel } from '../engine/unitConverter';

const resistanceUnits: ResistanceUnit[] = ['ohm', 'kohm', 'mohm'];
const inductanceUnits: InductanceUnit[] = ['h', 'mh', 'uh'];
const capacitanceUnits: CapacitanceUnit[] = ['f', 'uf', 'nf', 'pf'];
const waveformTypes: { value: WaveformType; label: string }[] = [
  { value: 'step', label: '阶跃信号' },
  { value: 'pulse', label: '脉冲信号' },
  { value: 'sinusoidal', label: '正弦信号' },
];

export const ParameterInput: React.FC = () => {
  const {
    parameters,
    setResistance,
    setInductance,
    setCapacitance,
    setWaveform,
    setInitialConditions,
    calculate,
    resetParameters,
    isCalculating,
  } = useRLCStore();

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Zap className="w-6 h-6 text-blue-400" />
        电路参数设置
      </h2>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <CircleDot className="w-4 h-4 text-orange-400" />
            电阻 R
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={parameters.resistance.value}
              onChange={(e) => setResistance(parseFloat(e.target.value) || 0, parameters.resistance.unit)}
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
              step="any"
              min="0"
            />
            <select
              value={parameters.resistance.unit}
              onChange={(e) => setResistance(parameters.resistance.value, e.target.value as ResistanceUnit)}
              className="bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            >
              {resistanceUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {getUnitLabel(unit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Box className="w-4 h-4 text-purple-400" />
            电感 L
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={parameters.inductance.value}
              onChange={(e) => setInductance(parseFloat(e.target.value) || 0, parameters.inductance.unit)}
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
              step="any"
              min="0"
            />
            <select
              value={parameters.inductance.unit}
              onChange={(e) => setInductance(parameters.inductance.value, e.target.value as InductanceUnit)}
              className="bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            >
              {inductanceUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {getUnitLabel(unit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Disc className="w-4 h-4 text-green-400" />
            电容 C
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={parameters.capacitance.value}
              onChange={(e) => setCapacitance(parseFloat(e.target.value) || 0, parameters.capacitance.unit)}
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
              step="any"
              min="0"
            />
            <select
              value={parameters.capacitance.unit}
              onChange={(e) => setCapacitance(parameters.capacitance.value, e.target.value as CapacitanceUnit)}
              className="bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            >
              {capacitanceUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {getUnitLabel(unit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-5 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Activity className="w-4 h-4 text-cyan-400" />
            输入波形
          </label>
          
          <div className="flex flex-wrap gap-2">
            {waveformTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setWaveform(type.value, parameters.inputWaveform.amplitude)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  parameters.inputWaveform.type === type.value
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">幅值 (V)</label>
            <input
              type="number"
              value={parameters.inputWaveform.amplitude}
              onChange={(e) => setWaveform(parameters.inputWaveform.type, parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
              step="any"
            />
          </div>

          {parameters.inputWaveform.type === 'sinusoidal' && (
            <div className="space-y-2">
              <label className="text-sm text-slate-400">频率 (Hz)</label>
              <input
                type="number"
                value={parameters.inputWaveform.frequency || 50}
                onChange={(e) => setWaveform(parameters.inputWaveform.type, parameters.inputWaveform.amplitude, parseFloat(e.target.value) || 50)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                step="any"
                min="0"
              />
            </div>
          )}

          {parameters.inputWaveform.type === 'pulse' && (
            <div className="space-y-2">
              <label className="text-sm text-slate-400">脉冲宽度 (s)</label>
              <input
                type="number"
                value={parameters.inputWaveform.pulseWidth || 0.001}
                onChange={(e) => setWaveform(parameters.inputWaveform.type, parameters.inputWaveform.amplitude, undefined, parseFloat(e.target.value) || 0.001)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                step="any"
                min="0"
              />
            </div>
          )}
        </div>

        <div className="border-t border-slate-700/50 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">初始条件</label>
            <button
              onClick={() => setInitialConditions(!parameters.initialConditions.enabled, parameters.initialConditions.inductorCurrent, parameters.initialConditions.capacitorVoltage)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                parameters.initialConditions.enabled ? 'bg-blue-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  parameters.initialConditions.enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {parameters.initialConditions.enabled && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">初始电流 (A)</label>
                <input
                  type="number"
                  value={parameters.initialConditions.inductorCurrent}
                  onChange={(e) => setInitialConditions(true, parseFloat(e.target.value) || 0, parameters.initialConditions.capacitorVoltage)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  step="any"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">初始电压 (V)</label>
                <input
                  type="number"
                  value={parameters.initialConditions.capacitorVoltage}
                  onChange={(e) => setInitialConditions(true, parameters.initialConditions.inductorCurrent, parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  step="any"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={calculate}
            disabled={isCalculating}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCalculating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {isCalculating ? '计算中...' : '开始计算'}
          </button>
          <button
            onClick={resetParameters}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center gap-2"
            title="重置参数"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
