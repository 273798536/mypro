import { useState, useEffect } from 'react';
import { X, Waves, Clock, Droplets, MapPin, Fish, Calendar, Save } from 'lucide-react';
import type { SamplingRecord, SamplingRecordInput } from '../../shared/types';
import { cn } from '../lib/utils';

interface RecordFormProps {
  record?: SamplingRecord | null;
  onSubmit: (data: SamplingRecordInput & { confirmed?: boolean }) => Promise<void>;
  onClose: () => void;
}

export default function RecordForm({ record, onSubmit, onClose }: RecordFormProps) {
  const [formData, setFormData] = useState<SamplingRecordInput & { confirmed?: boolean }>({
    date: new Date().toISOString().split('T')[0],
    area: '',
    species: '',
    wind_wave_forecast: null,
    tide_data: null,
    water_quality: null,
    confirmed: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData({
        date: record.date,
        area: record.area,
        species: record.species,
        wind_wave_forecast: record.wind_wave_forecast,
        tide_data: record.tide_data,
        water_quality: record.water_quality,
        confirmed: record.confirmed
      });
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.area || !formData.species) {
      setError('请填写日期、区域和贝类品种');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    {
      key: 'wind_wave_forecast',
      label: '风浪预报',
      icon: Waves,
      placeholder: '例如：东南风3级，浪高0.5m'
    },
    {
      key: 'tide_data',
      label: '潮汐数据',
      icon: Clock,
      placeholder: '例如：大潮汐，潮差4.2m'
    },
    {
      key: 'water_quality',
      label: '水质记录',
      icon: Droplets,
      placeholder: '例如：pH 8.1, DO 7.2mg/L'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {record ? '编辑采样记录' : '新增采样记录'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {record
                ? '补录数据后将自动触发风险重新评估'
                : '填写采样基本信息，数据完备后系统自动评估风险'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                采样日期 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                采样区域 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
                placeholder="例如：东滩A区"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Fish className="w-4 h-4" />
              贝类品种 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.species}
              onChange={e => setFormData({ ...formData, species: e.target.value })}
              placeholder="例如：缢蛏、泥蚶、文蛤"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-2">
              监测数据（可稍后补录）
            </h4>
            {fields.map(field => {
              const Icon = field.icon;
              const value = formData[field.key as keyof typeof formData] as string | null;
              const isMissing = !value;
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Icon className={cn('w-4 h-4', isMissing ? 'text-amber-600' : 'text-slate-500')} />
                    {field.label}
                    {isMissing && (
                      <span className="text-xs text-amber-600 font-normal ml-2">
                        （风浪预报晚到或数据缺失时可留空）
                      </span>
                    )}
                  </label>
                  <textarea
                    value={value || ''}
                    onChange={e => setFormData({
                      ...formData,
                      [field.key]: e.target.value || null
                    })}
                    placeholder={field.placeholder}
                    rows={2}
                    className={cn(
                      'w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all',
                      isMissing ? 'border-amber-300 bg-amber-50/50 focus:bg-white' : 'border-slate-300'
                    )}
                  />
                </div>
              );
            })}
          </div>

          {record && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="confirmed"
                checked={formData.confirmed || false}
                onChange={e => setFormData({ ...formData, confirmed: e.target.checked })}
                className="w-4 h-4 text-cyan-600 rounded"
              />
              <label htmlFor="confirmed" className="text-sm text-slate-700">
                标记为已复核（确认数据无误）
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-white font-medium bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? '保存中...' : (record ? '保存并重新评估' : '创建记录')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
