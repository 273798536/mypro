import React from 'react';
import { Settings, Zap, Wind, Mountain, User, Bike, Timer } from 'lucide-react';
import { useRideStore } from '@/store/useRideStore';
import { getFieldStatus } from '@/utils/validator';
import { SAMPLE_RECORDS } from '@/data/samples';
import { RideInput, SlopeUnit, WindDirection } from '@/types';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  status?: 'normal' | 'error' | 'warning';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  unit,
  status = 'normal',
  placeholder,
  min,
  max,
  step = 1,
}) => {
  const statusClasses = {
    normal: '',
    error: 'input-field-error',
    warning: 'input-field-warning',
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-dark-300">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`input-field ${statusClasses[status]} pr-12`}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

const InputForm: React.FC = () => {
  const { currentInput, currentValidation, setInput, loadSample, ftp, setFtp } = useRideStore();

  const handleChange = (field: keyof RideInput, value: number | string) => {
    setInput({ [field]: value } as Partial<RideInput>);
  };

  const getStatus = (field: keyof RideInput) => {
    if (!currentValidation) return 'normal';
    return getFieldStatus(field, currentValidation);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold text-lg">传动参数</h3>
          </div>
          <div className="flex gap-2">
            {SAMPLE_RECORDS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => loadSample(sample)}
                className="px-3 py-1 text-xs bg-dark-700 hover:bg-dark-600 rounded-md text-dark-300 hover:text-white transition-colors"
              >
                {sample.sourceNote?.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body grid grid-cols-2 gap-4">
          <InputField
            label="牙盘齿数"
            value={currentInput.chainringTeeth}
            onChange={(v) => handleChange('chainringTeeth', v)}
            unit="T"
            status={getStatus('chainringTeeth')}
            min={1}
            max={100}
          />
          <InputField
            label="飞轮齿数"
            value={currentInput.cogTeeth}
            onChange={(v) => handleChange('cogTeeth', v)}
            unit="T"
            status={getStatus('cogTeeth')}
            min={1}
            max={60}
          />
          <InputField
            label="踏频"
            value={currentInput.cadence}
            onChange={(v) => handleChange('cadence', v)}
            unit="RPM"
            status={getStatus('cadence')}
            min={1}
            max={300}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-dark-300">FTP</label>
            <div className="relative">
              <input
                type="number"
                value={ftp}
                onChange={(e) => setFtp(Number(e.target.value))}
                className="input-field pr-12"
                min={50}
                max={500}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 text-sm">W</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <User className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold text-lg">骑手与车辆</h3>
        </div>
        <div className="card-body grid grid-cols-2 gap-4">
          <InputField
            label="骑手体重"
            value={currentInput.riderWeight}
            onChange={(v) => handleChange('riderWeight', v)}
            unit="kg"
            status={getStatus('riderWeight')}
            min={1}
            max={200}
            step={0.1}
          />
          <InputField
            label="车重"
            value={currentInput.bikeWeight}
            onChange={(v) => handleChange('bikeWeight', v)}
            unit="kg"
            status={getStatus('bikeWeight')}
            min={0}
            max={50}
            step={0.1}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Mountain className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold text-lg">地形与环境</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="坡度"
              value={currentInput.slope}
              onChange={(v) => handleChange('slope', v)}
              status={getStatus('slope')}
              min={-50}
              max={100}
              step={0.1}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-300">坡度单位</label>
              <select
                value={currentInput.slopeUnit}
                onChange={(e) => handleChange('slopeUnit', e.target.value as SlopeUnit)}
                className="input-field"
              >
                <option value="percent">百分比 (%)</option>
                <option value="degree">角度 (°)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="风速"
              value={currentInput.windSpeed}
              onChange={(v) => handleChange('windSpeed', v)}
              unit="m/s"
              status={getStatus('windSpeed')}
              min={0}
              max={50}
              step={0.1}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-300">风向</label>
              <select
                value={currentInput.windDirection}
                onChange={(e) => handleChange('windDirection', e.target.value as WindDirection)}
                className="input-field"
              >
                <option value="head">逆风</option>
                <option value="tail">顺风</option>
                <option value="cross">侧风</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold text-lg">训练信息</h3>
        </div>
        <div className="card-body space-y-4">
          <InputField
            label="持续时间"
            value={currentInput.duration || 0}
            onChange={(v) => handleChange('duration', v)}
            unit="秒"
            min={0}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-dark-300">路线片段名称</label>
            <input
              type="text"
              value={currentInput.segmentName || ''}
              onChange={(e) => handleChange('segmentName', e.target.value)}
              className="input-field"
              placeholder="例如：平路训练段"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-dark-300">备注</label>
            <textarea
              value={currentInput.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="记录训练感受或特殊情况..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputForm;
