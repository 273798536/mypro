import { useState } from 'react';
import { Calculator, Ship, Waves, Navigation, BedDouble } from 'lucide-react';
import type { CalculateRequest, DataSource } from '@shared/types';
import { defaultCalculateRequest } from '@/store/calculationStore';

interface ParameterInputProps {
  onCalculate: (request: CalculateRequest) => void;
  isCalculating: boolean;
}

interface FieldConfig {
  key: string;
  label: string;
  unit: string;
  step?: string;
  allowNull?: boolean;
}

interface SectionConfig {
  title: string;
  icon: React.ReactNode;
  sourceKey: string;
  fields: FieldConfig[];
}

export default function ParameterInput({ onCalculate, isCalculating }: ParameterInputProps) {
  const [request, setRequest] = useState<CalculateRequest>(
    JSON.parse(JSON.stringify(defaultCalculateRequest))
  );
  const [sourceNames, setSourceNames] = useState({
    hull: '船体参数手册',
    wave: '海洋站观测数据',
    navigation: '船舶AIS数据',
    cabin: '舱室布局图',
  });

  const sections: SectionConfig[] = [
    {
      title: '船体参数',
      icon: <Ship className="w-5 h-5" />,
      sourceKey: 'hull',
      fields: [
        { key: 'displacement', label: '排水量', unit: '吨' },
        { key: 'GM', label: '初稳心高', unit: 'm', step: '0.01' },
        { key: 'rollRadius', label: '横摇惯性半径', unit: 'm', step: '0.01' },
        { key: 'shipLength', label: '船长', unit: 'm' },
        { key: 'shipWidth', label: '船宽', unit: 'm' },
      ],
    },
    {
      title: '波浪条件',
      icon: <Waves className="w-5 h-5" />,
      sourceKey: 'wave',
      fields: [
        { key: 'significantHeight', label: '有义波高', unit: 'm', step: '0.1', allowNull: true },
        { key: 'wavePeriod', label: '波浪周期', unit: 's', step: '0.1', allowNull: true },
        { key: 'waveDirection', label: '浪向角', unit: '°', allowNull: true },
      ],
    },
    {
      title: '航行参数',
      icon: <Navigation className="w-5 h-5" />,
      sourceKey: 'navigation',
      fields: [
        { key: 'speed', label: '航速', unit: '节', step: '0.1' },
        { key: 'headingAngle', label: '航向角', unit: '°' },
      ],
    },
    {
      title: '舱室位置',
      icon: <BedDouble className="w-5 h-5" />,
      sourceKey: 'cabin',
      fields: [
        { key: 'longitudinalPos', label: '纵向位置（距船舯）', unit: 'm' },
        { key: 'verticalPos', label: '垂向位置（距基线）', unit: 'm', step: '0.1' },
        { key: 'deck', label: '甲板层', unit: '层' },
      ],
    },
  ];

  const getParamValue = (section: string, field: string): number | null => {
    const params: Record<string, any> = {
      hull: request.hullParams,
      wave: request.waveParams,
      navigation: request.navigationParams,
      cabin: request.cabinParams,
    };
    return params[section][field];
  };

  const updateParam = (section: string, field: string, value: string, allowNull: boolean) => {
    if (allowNull && value === '') {
      setRequest((prev) => {
        const updated = JSON.parse(JSON.stringify(prev));
        const params: Record<string, any> = {
          hull: updated.hullParams,
          wave: updated.waveParams,
          navigation: updated.navigationParams,
          cabin: updated.cabinParams,
        };
        params[section][field] = null;
        return updated;
      });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setRequest((prev) => {
          const updated = JSON.parse(JSON.stringify(prev));
          const params: Record<string, any> = {
            hull: updated.hullParams,
            wave: updated.waveParams,
            navigation: updated.navigationParams,
            cabin: updated.cabinParams,
          };
          params[section][field] = numValue;
          return updated;
        });
      }
    }
  };

  const updateSource = (sourceKey: string, name: string) => {
    setSourceNames((prev) => ({ ...prev, [sourceKey]: name }));
    const timestamp = new Date().toISOString();
    setRequest((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const sources: Record<string, DataSource> = {
        hull: updated.hullParams.source,
        wave: updated.waveParams.source,
        navigation: updated.navigationParams.source,
        cabin: updated.cabinParams.source,
      };
      sources[sourceKey] = { name, timestamp };
      return updated;
    });
  };

  const handleSubmit = () => {
    const finalRequest = JSON.parse(JSON.stringify(request));
    onCalculate(finalRequest);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          计算参数
        </h2>
        <p className="text-sm text-slate-500">
          输入船舶和海况参数，系统将自动进行横摇舒适度评估
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            船舶名称
          </label>
          <input
            type="text"
            value={request.shipName}
            onChange={(e) => setRequest((prev) => ({ ...prev, shipName: e.target.value }))}
            placeholder="请输入船舶名称"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0A2463] focus:border-transparent transition-all outline-none"
          />
        </div>

        {sections.map((section, idx) => (
          <div
            key={section.title}
            className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0A2463]">
                  {section.icon}
                  <h3 className="font-semibold text-slate-800">{section.title}</h3>
                </div>
                <input
                  type="text"
                  value={sourceNames[section.sourceKey as keyof typeof sourceNames]}
                  onChange={(e) => updateSource(section.sourceKey, e.target.value)}
                  className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-md text-slate-600 w-40 text-right focus:outline-none focus:border-[#0A2463]"
                  placeholder="数据来源"
                />
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((field) => {
                const value = getParamValue(section.sourceKey, field.key);
                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => updateParam(section.sourceKey, field.key, e.target.value, !!field.allowNull)}
                        step={field.step || '1'}
                        placeholder={field.allowNull ? '缺测留空' : ''}
                        className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-[#0A2463] focus:border-transparent transition-all outline-none ${
                          value === null && field.allowNull
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'border-slate-200 bg-white'
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        {field.unit}
                      </span>
                    </div>
                    {field.allowNull && (
                      <p className="text-xs text-amber-600 mt-1">
                        {value === null ? '⚠️ 参数缺测，将使用估算值' : '数据正常'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isCalculating}
        className="w-full py-4 bg-gradient-to-r from-[#0A2463] to-[#1E3A8A] text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
      >
        {isCalculating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            计算中...
          </>
        ) : (
          <>
            <Calculator className="w-5 h-5" />
            开始计算
          </>
        )}
      </button>
    </div>
  );
}
