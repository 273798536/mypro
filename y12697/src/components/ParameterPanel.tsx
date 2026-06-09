import { useState, useEffect } from 'react';
import type { ProcessingRecord, Coordinates, Dimensions, ConversionItem } from '../../../shared/types';
import { convertUnit, unitList } from '../utils';

interface Props {
  record: ProcessingRecord | null;
  onChange: (data: Partial<ProcessingRecord>) => void;
}

export default function ParameterPanel({ record, onChange }: Props) {
  const units = unitList();

  const coordinates: Coordinates = record?.coordinates ?? { x: 0, y: 0, z: 0, unit: 'mm' };
  const dimensions: Dimensions = record?.dimensions ?? { width: 0, height: 0, depth: 0, unit: 'mm' };
  const conversions: ConversionItem[] = record?.conversions ?? [];
  const [targetUnit, setTargetUnit] = useState('m');

  useEffect(() => {
    if (!dimensions.width && !dimensions.height && !dimensions.depth) return;
    const calc = (v: number, from: string, to: string, label: string): ConversionItem | null =>
      v ? convertUnit(v, from, to) : null;
    const items: ConversionItem[] = [
      calc(dimensions.width, dimensions.unit, targetUnit, '宽'),
      calc(dimensions.height, dimensions.unit, targetUnit, '高'),
      calc(dimensions.depth, dimensions.unit, targetUnit, '深'),
      calc(coordinates.x, coordinates.unit, targetUnit, 'X'),
      calc(coordinates.y, coordinates.unit, targetUnit, 'Y'),
      calc(coordinates.z, coordinates.unit, targetUnit, 'Z'),
    ].filter(Boolean) as ConversionItem[];
    onChange({ conversions: items });
  }, [dimensions.width, dimensions.height, dimensions.depth, dimensions.unit, coordinates.x, coordinates.y, coordinates.z, coordinates.unit, targetUnit]);

  const updateCoord = (key: keyof Coordinates, value: number) => {
    onChange({ coordinates: { ...coordinates, [key]: value } });
  };
  const updateDim = (key: keyof Dimensions, value: number) => {
    onChange({ dimensions: { ...dimensions, [key]: value } });
  };

  return (
    <div className="card-panel h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-charcoal-800 flex items-center gap-2">
        <span className="text-sm font-medium">参数联动 · 单位换算</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-charcoal-400">
          换算到
          <select
            value={targetUnit}
            onChange={(e) => setTargetUnit(e.target.value)}
            className="bg-charcoal-800 border border-charcoal-700 rounded-sm px-2 py-1 text-white focus:outline-none focus:border-alert-orange"
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section>
          <h4 className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">设备坐标</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((k) => (
              <div key={k}>
                <label className="text-[11px] text-charcoal-500 font-mono uppercase">{k}</label>
                <input
                  type="number"
                  value={coordinates[k]}
                  onChange={(e) => updateCoord(k, Number(e.target.value))}
                  className="input-field font-mono"
                />
              </div>
            ))}
            <div className="col-span-3">
              <label className="text-[11px] text-charcoal-500 font-mono">单位</label>
              <select
                value={coordinates.unit}
                onChange={(e) => onChange({ coordinates: { ...coordinates, unit: e.target.value } })}
                className="input-field font-mono"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
        <section>
          <h4 className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">尺寸参数</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['width', 'height', 'depth'] as const).map((k) => (
              <div key={k}>
                <label className="text-[11px] text-charcoal-500 font-mono uppercase">
                  {k === 'width' ? '宽' : k === 'height' ? '高' : '深'}
                </label>
                <input
                  type="number"
                  value={dimensions[k]}
                  onChange={(e) => updateDim(k, Number(e.target.value))}
                  className="input-field font-mono"
                />
              </div>
            ))}
            <div className="col-span-3">
              <label className="text-[11px] text-charcoal-500 font-mono">单位</label>
              <select
                value={dimensions.unit}
                onChange={(e) => onChange({ dimensions: { ...dimensions, unit: e.target.value } })}
                className="input-field font-mono"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
        {conversions.length > 0 && (
          <section>
            <h4 className="text-xs text-charcoal-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-alert-orange animate-pulse-slow" />
              实时换算结果
            </h4>
            <div className="space-y-1.5">
              {conversions.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-charcoal-800/60 border border-charcoal-700 rounded-sm px-3 py-1.5 font-mono text-xs"
                >
                  <span className="text-charcoal-400">
                    {c.value} {c.fromUnit}
                  </span>
                  <span className="text-alert-orange">→</span>
                  <span className="text-alert-green">{c.converted} {c.toUnit}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-charcoal-500 mt-1.5 leading-relaxed">
              {conversions[0]?.formula}
            </p>
          </section>
        )}
        <section>
          <h4 className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">风险备注</h4>
          <textarea
            value={record?.riskNotes ?? ''}
            onChange={(e) => onChange({ riskNotes: e.target.value })}
            rows={3}
            placeholder="输入具体的风险备注，例如：现场吊装时需注意侧方管道..."
            className="input-field resize-none"
          />
        </section>
        <section>
          <h4 className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">处理结论</h4>
          <textarea
            value={record?.conclusion ?? ''}
            onChange={(e) => onChange({ conclusion: e.target.value })}
            rows={3}
            placeholder="复核结论..."
            className="input-field resize-none"
          />
        </section>
      </div>
    </div>
  );
}
