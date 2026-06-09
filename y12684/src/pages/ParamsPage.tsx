import { useState } from 'react';
import { useAppStore } from '../store';
import { paramRanges, paramLinkageRules, formatDateTime } from '../utils/constants';
import type { ErosionParams } from '../types';

export default function ParamsPage() {
  const params = useAppStore((s) => s.params);
  const updateParams = useAppStore((s) => s.updateParams);
  const measurements = useAppStore((s) => s.measurements);
  const addMeasurement = useAppStore((s) => s.addMeasurement);
  const removeMeasurement = useAppStore((s) => s.removeMeasurement);
  const addException = useAppStore((s) => s.addException);

  const [newRecord, setNewRecord] = useState({
    paramName: 'windSpeed',
    value: '',
    unit: 'm/s',
    source: '现场测量'
  });

  const handleAddMeasurement = () => {
    const val = parseFloat(newRecord.value);
    if (isNaN(val)) {
      addException({
        type: 'param_missing',
        title: `测量数据录入无效：${newRecord.paramName}`,
        description: `尝试补录 ${paramRanges[newRecord.paramName]?.label ?? newRecord.paramName} 的测量数据时，输入值不是有效数字。`,
        impact: '该条测量记录未被保存，相关参数联动不会触发，模拟结果可能缺少最新实测数据支撑。',
        suggestion: '请在"测量记录补录"区域输入有效的数值后再次提交（例如 12.5）。数值范围请参考下方参数范围说明。',
        relatedParams: [newRecord.paramName]
      });
      return;
    }
    const meta = paramRanges[newRecord.paramName];
    if (meta && (val < meta.min || val > meta.max)) {
      addException({
        type: 'param_exceed',
        title: `测量值超出建议范围：${newRecord.paramName}`,
        description: `补录的 ${meta.label} 值 ${val}${meta.unit} 超出建议范围 [${meta.min}, ${meta.max}]${meta.unit}。`,
        impact: '系统仍然会保存该记录并联动更新参数，但超出范围的数值可能导致风蚀模拟结果失真或不符合工程经验。',
        suggestion: '建议调整参数口径至建议范围内；如该值确为实测数据，请在备注中注明原因，并关注模拟结果的合理性。',
        relatedParams: [newRecord.paramName]
      });
    }
    addMeasurement({
      paramName: newRecord.paramName,
      value: val,
      unit: newRecord.unit,
      source: newRecord.source
    });
    setNewRecord((s) => ({ ...s, value: '' }));
  };

  const handleParamChange = <K extends keyof ErosionParams>(key: K, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateParams({ [key]: num } as Partial<ErosionParams>);
  };

  const baseParams: Array<keyof ErosionParams> = [
    'windSpeed',
    'windDirection',
    'grainSize',
    'moisture',
    'vegetation'
  ];

  return (
    <div className="h-full overflow-y-auto p-6 bg-sand-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sand-800 mb-1">参数配置</h1>
            <p className="text-sm text-sand-600">
              配置风蚀模拟的基础参数，管理实测数据补录，查看参数联动关系。所有变更会实时作用于三维演示页。
            </p>
          </div>
        </header>

        {/* 基础参数设置 */}
        <section className="card">
          <h2 className="text-lg font-semibold text-sand-800 mb-1">基础参数设置</h2>
          <p className="text-xs text-sand-500 mb-4 leading-relaxed">
            修改以下参数会实时触发关联参数的联动更新（联动规则见下方参数联动面板）。
            每个参数旁都附有物理解释，方便在周会或演示时向他人讲解。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {baseParams.map((key) => {
              const meta = paramRanges[key];
              return (
                <div key={key} className="p-3 bg-sand-50 rounded-md border border-sand-200">
                  <label className="block text-sm font-medium text-sand-700 mb-1">
                    {meta?.label ?? key}
                    <span className="text-xs text-sand-400 ml-2">({meta?.unit})</span>
                  </label>
                  <input
                    type="number"
                    step={0.01}
                    min={meta?.min}
                    max={meta?.max}
                    value={params[key]}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    className="input w-full"
                  />
                  <div className="mt-1.5 text-[11px] text-sand-500 leading-relaxed">
                    建议范围 {meta?.min} ~ {meta?.max} {meta?.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 参数联动面板 */}
        <section className="card">
          <h2 className="text-lg font-semibold text-sand-800 mb-1">参数联动关系</h2>
          <p className="text-xs text-sand-500 mb-4 leading-relaxed">
            以下参数之间存在物理关联。当补录测量记录或手动修改基础参数时，系统会按联动公式自动更新关联参数，
            确保整体物理一致性。该联动非一次性判断，任何数据源的变化都会实时刷新。
          </p>
          <div className="space-y-3">
            {paramLinkageRules.map((rule) => {
              const srcMeta = paramRanges[rule.source];
              const tgtMeta = paramRanges[rule.target];
              const srcVal = (params as unknown as Record<string, number>)[rule.source];
              const tgtVal = (params as unknown as Record<string, number>)[rule.target];
              return (
                <div
                  key={`${rule.source}-${rule.target}`}
                  className="p-3 bg-gradient-to-r from-sand-50 to-amber-50 rounded-md border border-sand-200"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="badge bg-sand-200 text-sand-800">
                      {srcMeta?.label ?? rule.source} = {srcVal.toFixed(2)} {srcMeta?.unit}
                    </span>
                    <span className="text-sand-400">→</span>
                    <span className="badge bg-amber-200 text-amber-900 font-medium">
                      {tgtMeta?.label ?? rule.target} = {tgtVal.toFixed(4)} {tgtMeta?.unit}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-sand-600 mb-1 bg-white/60 px-2 py-1 rounded">
                    {rule.formula}
                  </div>
                  <div className="text-xs text-sand-600 leading-relaxed">
                    <span className="font-medium text-sand-700">解释：</span>
                    {rule.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 测量记录管理 */}
        <section className="card">
          <h2 className="text-lg font-semibold text-sand-800 mb-1">测量记录管理</h2>
          <p className="text-xs text-sand-500 mb-4 leading-relaxed">
            补录现场实测数据。新增记录后，对应参数及所有关联参数会自动联动更新，并写入操作日志，
            便于运维组和规划设计师追溯数据来源。
          </p>

          <div className="mb-4 p-3 bg-sand-50 rounded-md border border-sand-200">
            <div className="text-sm font-medium text-sand-700 mb-2">补录新测量记录</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <select
                value={newRecord.paramName}
                onChange={(e) => {
                  const meta = paramRanges[e.target.value];
                  setNewRecord((s) => ({
                    ...s,
                    paramName: e.target.value,
                    unit: meta?.unit ?? ''
                  }));
                }}
                className="input"
              >
                {Object.entries(paramRanges).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step={0.01}
                placeholder="数值"
                value={newRecord.value}
                onChange={(e) => setNewRecord((s) => ({ ...s, value: e.target.value }))}
                className="input"
              />
              <input
                type="text"
                placeholder="单位"
                value={newRecord.unit}
                onChange={(e) => setNewRecord((s) => ({ ...s, unit: e.target.value }))}
                className="input"
              />
              <input
                type="text"
                placeholder="数据来源"
                value={newRecord.source}
                onChange={(e) => setNewRecord((s) => ({ ...s, source: e.target.value }))}
                className="input"
              />
              <button onClick={handleAddMeasurement} className="btn btn-primary">
                补录
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-sand-600 text-xs">
                  <th className="text-left py-2 px-2">时间</th>
                  <th className="text-left py-2 px-2">参数</th>
                  <th className="text-left py-2 px-2">数值</th>
                  <th className="text-left py-2 px-2">来源</th>
                  <th className="text-right py-2 px-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {measurements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sand-400 text-sm">
                      暂无测量记录。使用上方表单补录实测数据，补录后参数联动会自动更新。
                    </td>
                  </tr>
                )}
                {[...measurements].reverse().map((m) => {
                  const meta = paramRanges[m.paramName];
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-sand-100 hover:bg-sand-50/50 transition"
                    >
                      <td className="py-2 px-2 text-xs text-sand-500 font-mono">
                        {formatDateTime(m.timestamp)}
                      </td>
                      <td className="py-2 px-2 text-sand-700">
                        {meta?.label ?? m.paramName}
                        <span className="ml-1 text-[10px] text-sand-400">({m.paramName})</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-sand-800">
                        {m.value}
                        <span className="text-xs text-sand-500 ml-1">{m.unit}</span>
                      </td>
                      <td className="py-2 px-2 text-sand-600 text-xs">{m.source}</td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => {
                            if (confirm('确认删除该测量记录？删除后已联动更新的参数不会自动回退。')) {
                              removeMeasurement(m.id);
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
