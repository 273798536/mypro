import { useState } from 'react';
import { Calculator, Plus, Trash2, RefreshCw, FlaskConical } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import FormulaCard from '@/components/formula/FormulaCard';
import type { ConcentrationUnit } from '@/utils/conversion';

const UNITS: ConcentrationUnit[] = ['mg/kg', 'ppm', 'μg/mL', 'g/kg'];

export default function CalcToolPanel() {
  const { additiveItems, updateAdditiveItem, removeAdditiveItem, addAdditiveItem, recalculateAll, sourceRows } = useVerificationStore();
  const [showFormulas, setShowFormulas] = useState(true);

  const handleAddRow = () => {
    const nextSourceRow = sourceRows[additiveItems.length] || sourceRows[0];
    addAdditiveItem({
      name: '新增添加剂',
      measuredValue: 0,
      measuredUnit: 'mg/kg',
      limitValue: 0,
      limitStandard: '',
      sourceRowNumber: nextSourceRow?.rowNumber ?? 0,
      sourceImageName: nextSourceRow?.imageName ?? '',
    });
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-auto">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title !mb-0">
            <FlaskConical size={18} className="text-brand-700" />
            残留检测数据 · 浓度换算
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setShowFormulas((v) => !v)}>
              <Calculator size={14} />
              {showFormulas ? '隐藏公式' : '显示公式'}
            </button>
            <button className="btn-secondary" onClick={recalculateAll}>
              <RefreshCw size={14} />
              重算全部
            </button>
            <button className="btn-primary" onClick={handleAddRow}>
              <Plus size={14} />
              添加一行
            </button>
          </div>
        </div>

        {additiveItems.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-10 border border-dashed rounded-md">
            暂无检测数据，可在左侧粘贴原始表格或点击"添加一行"
          </div>
        ) : (
          <div className="overflow-auto -mx-2 px-2">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-2 text-left w-28">添加剂名称</th>
                  <th className="px-2 py-2 text-left w-20">实测值</th>
                  <th className="px-2 py-2 text-left w-20">单位</th>
                  <th className="px-2 py-2 text-left w-24">换算 mg/kg</th>
                  <th className="px-2 py-2 text-left w-20">限量值</th>
                  <th className="px-2 py-2 text-left w-36">执行标准</th>
                  <th className="px-2 py-2 text-left w-24">溯源</th>
                  <th className="px-2 py-2 text-left w-20">判定</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {additiveItems.map((it) => {
                  const ratio = it.limitValue > 0 ? (it.convertedMgPerKg / it.limitValue) : NaN;
                  const ratioPct = Number.isFinite(ratio) ? (ratio * 100).toFixed(0) + '%' : '—';
                  return (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <input className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          value={it.name}
                          onChange={(e) => updateAdditiveItem(it.id, { name: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.001" className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          value={it.measuredValue}
                          onChange={(e) => updateAdditiveItem(it.id, { measuredValue: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          value={it.measuredUnit}
                          onChange={(e) => updateAdditiveItem(it.id, { measuredUnit: e.target.value as ConcentrationUnit })}>
                          {UNITS.map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 font-mono font-semibold text-brand-700">
                        {Number.isFinite(it.convertedMgPerKg) ? it.convertedMgPerKg : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.001" className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          value={it.limitValue}
                          onChange={(e) => updateAdditiveItem(it.id, { limitValue: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          value={it.limitStandard}
                          placeholder="如 GB 2760 山梨酸钾"
                          onChange={(e) => updateAdditiveItem(it.id, { limitStandard: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="chip bg-brand-50 text-brand-700" title={it.sourceImageName || '无图谱'}>
                          L{it.sourceRowNumber || '?'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        {it.isPass ? (
                          <span className={'chip ' + (Number.isFinite(ratio) && ratio >= 0.8 ? 'bg-warn-500 text-white' : 'bg-pass-500 text-white')}>
                            {Number.isFinite(ratio) && ratio >= 0.8 ? '临界' : '通过'} {ratioPct}
                          </span>
                        ) : (
                          <span className="chip bg-fail-500 text-white">不合格</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button className="p-1 rounded hover:bg-fail-50 text-slate-400 hover:text-fail-600"
                          onClick={() => removeAdditiveItem(it.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-slate-500">
              提示：超过限量 80% 标记为"临界"（需工程师复核），超过 100% 标记为"不合格"。
            </div>
          </div>
        )}
      </div>

      {showFormulas && (
        <div>
          <div className="section-title">
            <Calculator size={18} className="text-brand-700" />
            计算公式参考（公式 / 单位 / 适用范围 / 失败原因）
          </div>
          <FormulaCard />
        </div>
      )}
    </div>
  );
}
