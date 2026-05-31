import { useStore } from '@/store/useStore';
import { formatNumber } from '@/utils/calculations';
import { LengthUnit, SpeedUnit, DensityUnit, ViscosityUnit, TemperatureUnit } from '@/types';
import { Calculator, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';

const lengthUnits: LengthUnit[] = ['m', 'cm', 'mm'];
const speedUnits: SpeedUnit[] = ['m/s', 'km/h', 'ft/s'];
const densityUnits: DensityUnit[] = ['kg/m³', 'g/cm³'];
const viscosityUnits: ViscosityUnit[] = ['Pa·s', 'cP'];
const temperatureUnits: TemperatureUnit[] = ['K', '°C', '°F'];

interface InputRowProps {
  label: string;
  value: number;
  unit: string;
  units: string[];
  onChange: (value: number) => void;
  onUnitChange: (unit: any) => void;
  step?: string;
  error?: boolean;
}

function InputRow({ label, value, unit, units, onChange, onUnitChange, step = '0.001', error }: InputRowProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-400 w-20 shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`flex-1 bg-slate-700 border rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 ${
          error ? 'border-red-500' : 'border-slate-600'
        }`}
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as any)}
        className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-20"
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ScaleConverter() {
  const { scaleFormData, updateScaleForm, calculationResult, recalculate } = useStore();

  const getFieldError = (field: string) => {
    return calculationResult?.errors.some(
      (e) => e.field === field && e.severity === 'error'
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-blue-400" />
        <h3 className="text-white font-semibold">尺度换算</h3>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-slate-500 uppercase tracking-wide">几何参数</div>
        <InputRow
          label="模型长度"
          value={scaleFormData.modelLength}
          unit={scaleFormData.modelLengthUnit}
          units={lengthUnits}
          onChange={(v) => updateScaleForm({ modelLength: v })}
          onUnitChange={(u) => updateScaleForm({ modelLengthUnit: u })}
          error={getFieldError('modelLength') || getFieldError('modelLengthUnit')}
        />
        <InputRow
          label="实机长度"
          value={scaleFormData.realLength}
          unit={scaleFormData.realLengthUnit}
          units={lengthUnits}
          onChange={(v) => updateScaleForm({ realLength: v })}
          onUnitChange={(u) => updateScaleForm({ realLengthUnit: u })}
          error={getFieldError('realLength')}
        />
      </div>

      <div className="space-y-3">
        <div className="text-xs text-slate-500 uppercase tracking-wide">流动参数</div>
        <InputRow
          label="风速"
          value={scaleFormData.windSpeed}
          unit={scaleFormData.windSpeedUnit}
          units={speedUnits}
          onChange={(v) => updateScaleForm({ windSpeed: v })}
          onUnitChange={(u) => updateScaleForm({ windSpeedUnit: u })}
          error={getFieldError('windSpeed')}
          step="1"
        />
        <InputRow
          label="空气密度"
          value={scaleFormData.airDensity}
          unit={scaleFormData.airDensityUnit}
          units={densityUnits}
          onChange={(v) => updateScaleForm({ airDensity: v })}
          onUnitChange={(u) => updateScaleForm({ airDensityUnit: u })}
          error={getFieldError('airDensity')}
          step="0.0001"
        />
        <InputRow
          label="空气粘度"
          value={scaleFormData.airViscosity}
          unit={scaleFormData.airViscosityUnit}
          units={viscosityUnits}
          onChange={(v) => updateScaleForm({ airViscosity: v })}
          onUnitChange={(u) => updateScaleForm({ airViscosityUnit: u })}
          error={getFieldError('airViscosity')}
          step="0.00001"
        />
        <InputRow
          label="温度"
          value={scaleFormData.temperature}
          unit={scaleFormData.temperatureUnit}
          units={temperatureUnits}
          onChange={(v) => updateScaleForm({ temperature: v })}
          onUnitChange={(u) => updateScaleForm({ temperatureUnit: u })}
          error={getFieldError('temperature')}
          step="0.1"
        />
      </div>

      <button
        onClick={recalculate}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
      >
        重新计算
      </button>

      {calculationResult && (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-500 uppercase tracking-wide">计算结果</div>
          
          <div className={`p-3 rounded border ${
            calculationResult.status === 'error'
              ? 'bg-red-900/20 border-red-500/50'
              : calculationResult.status === 'warning'
              ? 'bg-yellow-900/20 border-yellow-500/50'
              : 'bg-green-900/20 border-green-500/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {calculationResult.status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : calculationResult.status === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              <span className={`font-medium ${
                calculationResult.status === 'error'
                  ? 'text-red-400'
                  : calculationResult.status === 'warning'
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}>
                {calculationResult.status === 'error' ? '参数错误' : calculationResult.status === 'warning' ? '存在警告' : '校验通过'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">雷诺数 Re</div>
                <div className="text-lg font-mono text-blue-400">
                  {formatNumber(calculationResult.reynolds)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">马赫数 Ma</div>
                <div className="text-lg font-mono text-purple-400">
                  {formatNumber(calculationResult.mach, 3)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">尺度比 λ</div>
                <div className="text-lg font-mono text-green-400">
                  {formatNumber(calculationResult.scaleRatio, 4)}
                </div>
              </div>
            </div>
          </div>

          {calculationResult.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4" />
                <span>错误与警告（点击错误可定位到具体记录）</span>
              </div>
              {calculationResult.errors.map((error, i) => (
                <div
                  key={i}
                  className={`p-3 rounded border-l-4 ${
                    error.severity === 'error'
                      ? 'bg-red-900/20 border-red-500 border-l-red-500'
                      : 'bg-yellow-900/20 border-yellow-500/50 border-l-yellow-500'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {error.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {error.type === 'unit_mismatch' && '单位混乱'}
                        {error.type === 'reynolds_mismatch' && '雷诺数不匹配'}
                        {error.type === 'mach_mismatch' && '马赫数警告'}
                        {error.type === 'invalid_value' && '数值无效'}
                      </div>
                      <div className="text-sm text-slate-300 mt-1">{error.message}</div>
                      <div className="text-xs text-slate-500 mt-1 font-mono">
                        {error.location}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
