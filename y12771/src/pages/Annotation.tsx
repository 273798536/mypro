import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Trash2, Edit3, X, UserPlus, Clock, AlertCircle, CheckCircle2, Tag, FileEdit } from 'lucide-react';
import { useBatchStore } from '../store/batchStore';
import { FUNCTIONAL_GROUP_REFERENCE } from '../../shared/types';
import type { FunctionalGroup } from '../../shared/types';

function confidenceColor(c: number) {
  if (c >= 0.85) return 'text-moss-700 bg-moss-100';
  if (c >= 0.65) return 'text-amber-700 bg-amber-100';
  return 'text-rose-700 bg-rose-100';
}

export default function Annotation() {
  const navigate = useNavigate();
  const batch = useBatchStore((s) => s.currentBatch);
  const confirmAnnotation = useBatchStore((s) => s.confirmAnnotation);
  const updateAnnotation = useBatchStore((s) => s.updateAnnotation);
  const addManualAnnotation = useBatchStore((s) => s.addManualAnnotation);
  const deleteAnnotation = useBatchStore((s) => s.deleteAnnotation);
  const updateSupplementaryInfo = useBatchStore((s) => s.updateSupplementaryInfo);
  const runAnalysis = useBatchStore((s) => s.runAnalysis);
  const isLoading = useBatchStore((s) => s.isLoading);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRemark, setEditRemark] = useState('');
  const [editPeak, setEditPeak] = useState<number>(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newPeak, setNewPeak] = useState<number>(1720);
  const [newRemark, setNewRemark] = useState('');
  const [selectedRef, setSelectedRef] = useState(0);

  const confirmed = batch.annotations.filter((a) => a.confirmed).length;
  const allConfirmed = confirmed === batch.annotations.length && batch.annotations.length > 0;

  const startEdit = (a: FunctionalGroup) => {
    setEditingId(a.id);
    setEditRemark(a.remark || '');
    setEditPeak(a.peakWavenumber);
  };

  const saveEdit = (id: string) => {
    updateAnnotation(id, { remark: editRemark, peakWavenumber: editPeak });
    setEditingId(null);
  };

  const handleAdd = () => {
    const ref = FUNCTIONAL_GROUP_REFERENCE[selectedRef];
    addManualAnnotation({
      name: ref.name,
      nameCn: ref.nameCn,
      wavenumberStart: ref.wavenumberStart,
      wavenumberEnd: ref.wavenumberEnd,
      peakWavenumber: newPeak,
      confidence: 0.5,
      remark: newRemark,
    });
    setShowAdd(false);
    setNewRemark('');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-500 mb-1.5">Step 3 · 官能团标注</div>
          <h1 className="font-serif text-3xl font-semibold text-ink-900">官能团标注与补录确认</h1>
          <p className="mt-2 text-ink-500 max-w-2xl">
            每条标注需要人工确认后才会进入最终报告。反应条件晚到、反应时间漏记都可以在这里补录，原有数据不会被丢弃。
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runAnalysis('补录信息后重跑', '当前用户')} disabled={isLoading} className="btn-secondary">
            {isLoading ? <Clock size={16} className="animate-spin" /> : <Clock size={16} />} {isLoading ? '重算中…' : '补录后重跑'}
          </button>
          <button onClick={() => navigate('/export')} disabled={!allConfirmed} className="btn-primary">
            <FileEdit size={16} /> {allConfirmed ? '前往导出报告 →' : `还有 ${batch.annotations.length - confirmed} 条待确认`}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-ink-700" />
              <h2 className="sub-title">官能团标注列表（{batch.annotations.length}）</h2>
            </div>
            <button onClick={() => setShowAdd(true)} className="btn-secondary">
              <Plus size={16} /> 人工添加标注
            </button>
          </div>

          {showAdd && (
            <div className="mb-4 rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-ink-800">新增人工标注</span>
                <button onClick={() => setShowAdd(false)} className="text-ink-500 hover:text-ink-800"><X size={18} /></button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="label-text">选择官能团</label>
                  <select className="input-field" value={selectedRef} onChange={(e) => setSelectedRef(Number(e.target.value))}>
                    {FUNCTIONAL_GROUP_REFERENCE.map((r, i) => (
                      <option key={i} value={i}>{r.nameCn}（{r.wavenumberStart}-{r.wavenumberEnd} cm⁻¹）</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">特征峰波数 (cm⁻¹)</label>
                  <input type="number" className="input-field" value={newPeak} onChange={(e) => setNewPeak(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label-text">备注</label>
                  <input className="input-field" value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder="可选" />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={handleAdd} className="btn-primary"><Plus size={16} /> 添加此标注</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {batch.annotations.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border p-4 transition-all ${
                  a.confirmed ? 'border-moss-200 bg-moss-50/40' : a.isManualAdd ? 'border-amber-200 bg-amber-50/30' : 'border-ink-100 bg-white hover:border-ink-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <label className="inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={a.confirmed}
                        onChange={(e) => confirmAnnotation(a.id, e.target.checked, '当前用户')}
                        className="h-4 w-4 rounded border-ink-300 text-ink-800 focus:ring-ink-500"
                      />
                    </label>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-lg font-semibold text-ink-900">{a.nameCn}</span>
                      <span className="text-xs text-ink-500">{a.name}</span>
                      {a.isManualAdd && <span className="chip-amber"><UserPlus size={10} /> 人工添加</span>}
                      {a.confirmed && <span className="chip-green"><Check size={10} /> {a.confirmedBy} 于 {a.confirmedAt?.slice(5, 16).replace('T', ' ')}</span>}
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-ink-600">
                      <span>特征峰：<b className="font-mono text-ink-800">{a.peakWavenumber} cm⁻¹</b></span>
                      <span>范围：<span className="font-mono">{a.wavenumberStart}–{a.wavenumberEnd}</span></span>
                      <span>置信度：<span className={`rounded px-2 py-0.5 text-xs font-medium ${confidenceColor(a.confidence)}`}>{(a.confidence * 100).toFixed(0)}%</span></span>
                    </div>

                    {editingId === a.id ? (
                      <div className="mt-3 space-y-2 rounded-md bg-white p-3 ring-1 ring-ink-200">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <label className="label-text">特征峰波数</label>
                            <input type="number" className="input-field" value={editPeak} onChange={(e) => setEditPeak(Number(e.target.value))} />
                          </div>
                          <div>
                            <label className="label-text">备注</label>
                            <input className="input-field" value={editRemark} onChange={(e) => setEditRemark(e.target.value)} placeholder="添加备注说明" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="btn-ghost">取消</button>
                          <button onClick={() => saveEdit(a.id)} className="btn-primary"><Check size={14} /> 保存</button>
                        </div>
                      </div>
                    ) : (
                      a.remark && (
                        <div className="mt-2 rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-600">
                          <span className="font-medium text-ink-700">备注：</span>{a.remark}
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {editingId !== a.id && (
                      <>
                        <button onClick={() => startEdit(a)} className="btn-ghost" title="修改"><Edit3 size={16} /></button>
                        <button onClick={() => deleteAnnotation(a.id)} className="btn-ghost text-rose-600 hover:bg-rose-50" title="删除"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={18} className="text-ink-700" />
              <h2 className="sub-title">补录实验信息</h2>
            </div>
            <p className="mb-4 text-xs text-ink-500">反应条件晚到、反应时间漏记都可以在这里补录，系统会保留补录时间戳。</p>
            <div className="space-y-3">
              <div>
                <label className="label-text">反应条件</label>
                <textarea
                  className="input-field min-h-[72px]"
                  value={batch.supplementaryInfo.reactionConditions}
                  onChange={(e) => updateSupplementaryInfo({ reactionConditions: e.target.value })}
                  placeholder="如：160°C，氮气保护，催化剂..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-text">反应时长</label>
                  <input
                    type="number"
                    className="input-field"
                    value={batch.supplementaryInfo.reactionTime ?? ''}
                    placeholder="如：6"
                    onChange={(e) => updateSupplementaryInfo({ reactionTime: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="label-text">单位</label>
                  <select
                    className="input-field"
                    value={batch.supplementaryInfo.reactionTimeUnit}
                    onChange={(e) => updateSupplementaryInfo({ reactionTimeUnit: e.target.value })}
                  >
                    <option value="min">分钟 (min)</option>
                    <option value="h">小时 (h)</option>
                    <option value="d">天 (d)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-text">空白对照说明</label>
                <input
                  className="input-field"
                  value={batch.supplementaryInfo.blankControlNote}
                  onChange={(e) => updateSupplementaryInfo({ blankControlNote: e.target.value })}
                  placeholder="如：未做，或：纯 KBr 压片"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-text">操作人员</label>
                  <input
                    className="input-field"
                    value={batch.supplementaryInfo.operator}
                    onChange={(e) => updateSupplementaryInfo({ operator: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-text">样品来源</label>
                  <input
                    className="input-field"
                    value={batch.supplementaryInfo.sampleSource}
                    onChange={(e) => updateSupplementaryInfo({ sampleSource: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" />
              <h2 className="sub-title">确认进度</h2>
            </div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-ink-600">已确认 / 总数</span>
              <span className="font-semibold text-ink-900">{confirmed} / {batch.annotations.length}</span>
            </div>
            <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full rounded-full transition-all ${allConfirmed ? 'bg-gradient-to-r from-moss-400 to-moss-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`}
                style={{ width: `${batch.annotations.length ? (confirmed / batch.annotations.length) * 100 : 0}%` }}
              />
            </div>
            {allConfirmed ? (
              <div className="flex items-center gap-2 rounded-md bg-moss-50 p-3 text-sm text-moss-700">
                <CheckCircle2 size={18} /> 全部标注已确认，可以导出报告
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                <AlertCircle size={18} /> 还有 {batch.annotations.length - confirmed} 条标注需要人工确认
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
