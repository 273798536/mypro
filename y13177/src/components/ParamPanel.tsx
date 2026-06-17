import { X, Cpu, FlaskConical, Plus, FileText } from 'lucide-react';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SourceType } from '@/types';

export function ParamPanel() {
  const isOpen = useSpeckleStore((s) => s.isParamPanelOpen);
  const setOpen = useSpeckleStore((s) => s.setParamPanelOpen);
  const activeTab = useSpeckleStore((s) => s.paramPanelTab);
  const setTab = useSpeckleStore((s) => s.setParamPanelTab);
  const dataset = useSpeckleStore((s) => s.dataset);
  const selectedVersionId = useSpeckleStore((s) => s.selectedVersionId);
  const updateDeviceParams = useSpeckleStore((s) => s.updateDeviceParams);
  const updateMaterialParams = useSpeckleStore((s) => s.updateMaterialParams);
  const addSupplement = useSpeckleStore((s) => s.addSupplement);

  const currentSnapshot = useMemo(() => {
    if (!dataset || !selectedVersionId) return null;
    return dataset.snapshots.find((s) => s.id === selectedVersionId) || null;
  }, [dataset, selectedVersionId]);

  const deviceParams = currentSnapshot?.deviceParams || null;
  const materialParams = currentSnapshot?.materialParams || null;
  const supplements = currentSnapshot?.supplements || [];

  const [deviceForm, setDeviceForm] = useState<Record<string, string>>({});
  const [materialForm, setMaterialForm] = useState<Record<string, string>>({});

  const [supSourceName, setSupSourceName] = useState('');
  const [supSourceType, setSupSourceType] = useState<SourceType>('铭牌');
  const [supContent, setSupContent] = useState('');
  const [supLineNumber, setSupLineNumber] = useState('');

  const deviceFields = [
    { key: 'deviceName', label: '设备名称', type: 'text' },
    { key: 'intensityMin', label: '强度下限', type: 'number', step: '0.01' },
    { key: 'intensityMax', label: '强度上限', type: 'number', step: '0.01' },
    { key: 'contrastMin', label: '对比度下限', type: 'number', step: '0.01' },
    { key: 'contrastMax', label: '对比度上限', type: 'number', step: '0.01' },
    { key: 'stabilityThreshold', label: '稳定性阈值', type: 'number', step: '0.01' },
    { key: 'vibrationLimit', label: '振动限值(g)', type: 'number', step: '0.1' },
  ];

  const materialFields = [
    { key: 'materialName', label: '材料名称', type: 'text' },
    { key: 'sampleId', label: '试样编号', type: 'text' },
    { key: 'surfaceRoughness', label: '表面粗糙度 Ra(μm)', type: 'number', step: '0.1' },
    { key: 'hardness', label: '硬度(HB)', type: 'number', step: '1' },
  ];

  const handleDeviceBlur = (key: string) => {
    if (!deviceParams) return;
    const raw = deviceForm[key];
    if (raw === undefined) return;
    const curVal = deviceParams[key as keyof typeof deviceParams];
    if (typeof curVal === 'number') {
      const num = parseFloat(raw);
      if (!isNaN(num) && num !== curVal) {
        updateDeviceParams({ [key]: num });
      }
    } else if (typeof curVal === 'string') {
      if (raw !== curVal) {
        updateDeviceParams({ [key]: raw });
      }
    }
  };

  const handleMaterialBlur = (key: string) => {
    if (!materialParams) return;
    const raw = materialForm[key];
    if (raw === undefined) return;
    const curVal = materialParams[key as keyof typeof materialParams];
    if (typeof curVal === 'number') {
      const num = parseFloat(raw);
      if (!isNaN(num) && num !== curVal) {
        updateMaterialParams({ [key]: num });
      }
    } else if (typeof curVal === 'string') {
      if (raw !== curVal) {
        updateMaterialParams({ [key]: raw });
      }
    }
  };

  const handleAddSupplement = () => {
    if (!supSourceName.trim() || !supContent.trim()) return;
    const lineNum = parseInt(supLineNumber, 10);
    if (isNaN(lineNum)) return;

    addSupplement({
      sourceName: supSourceName.trim(),
      sourceType: supSourceType,
      content: supContent.trim(),
      lineNumber: lineNum,
    });

    setSupSourceName('');
    setSupContent('');
    setSupLineNumber('');
  };

  const currentVersion = currentSnapshot?.version || '';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-30',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[440px] max-w-[92vw] bg-slate-900 border-l border-slate-800 shadow-2xl shadow-black/50 z-40 transition-transform duration-500 ease-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">参数与材料</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              当前版本 <span className="text-cyan-400 font-mono">{currentVersion}</span>
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          {[
            { key: 'device', label: '设备铭牌', icon: Cpu },
            { key: 'material', label: '材料参数', icon: FlaskConical },
            { key: 'supplement', label: '补充材料', icon: Plus },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'device' | 'material' | 'supplement')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2',
                activeTab === t.key
                  ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'device' && deviceParams && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                修改设备铭牌参数后将自动生成新版本，旧版本数据保留不变。
              </p>
              {deviceFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    step={f.step}
                    value={
                      deviceForm[f.key] !== undefined
                        ? deviceForm[f.key]
                        : String(deviceParams[f.key as keyof typeof deviceParams])
                    }
                    onChange={(e) => setDeviceForm({ ...deviceForm, [f.key]: e.target.value })}
                    onBlur={() => handleDeviceBlur(f.key)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'material' && materialParams && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                修改材料参数后将自动生成新版本，曲线基线会随表面粗糙度和硬度变化。
              </p>
              {materialFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    step={f.step}
                    value={
                      materialForm[f.key] !== undefined
                        ? materialForm[f.key]
                        : String(materialParams[f.key as keyof typeof materialParams])
                    }
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, [f.key]: e.target.value })
                    }
                    onBlur={() => handleMaterialBlur(f.key)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'supplement' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-500 leading-relaxed">
                添加补充材料不会覆盖旧判断，会以「补充」类型生成新版本，来源行号会记录在异常证据中。
              </p>

              <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  新增补充材料
                </h4>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">来源名称</label>
                  <input
                    type="text"
                    value={supSourceName}
                    onChange={(e) => setSupSourceName(e.target.value)}
                    placeholder="例如：设备铭牌-LS2000"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">来源类型</label>
                  <div className="flex gap-2">
                    {(['铭牌', '材料报告', '操作日志'] as SourceType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSupSourceType(t)}
                        className={cn(
                          'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                          supSourceType === t
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">内容</label>
                  <textarea
                    value={supContent}
                    onChange={(e) => setSupContent(e.target.value)}
                    placeholder="输入材料原文，将作为异常证据展示"
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">所在行号</label>
                  <input
                    type="number"
                    value={supLineNumber}
                    onChange={(e) => setSupLineNumber(e.target.value)}
                    placeholder="例如：7"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <button
                  onClick={handleAddSupplement}
                  disabled={!supSourceName.trim() || !supContent.trim() || !supLineNumber}
                  className={cn(
                    'w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                    supSourceName.trim() && supContent.trim() && supLineNumber
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:from-indigo-500 hover:to-cyan-400'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  添加并生成新版本
                </button>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  已补充材料（{supplements.length}）
                </h4>
                <div className="space-y-2">
                  {supplements.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">暂无补充材料</p>
                  )}
                  {supplements.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg bg-slate-800/30 border border-slate-700/40 p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-200">{s.sourceName}</span>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            s.sourceType === '铭牌' && 'bg-cyan-500/15 text-cyan-400',
                            s.sourceType === '材料报告' && 'bg-emerald-500/15 text-emerald-400',
                            s.sourceType === '操作日志' && 'bg-violet-500/15 text-violet-400'
                          )}
                        >
                          {s.sourceType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {s.content}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                        <span>第 {s.lineNumber} 行</span>
                        <span>
                          {s.operatorName} · {s.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
