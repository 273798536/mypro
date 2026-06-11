import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, History, RotateCcw, Download, FileText, Plus, Receipt, AlertTriangle, FilePlus2, Sparkles } from 'lucide-react';
import { useBatchStore } from '@/store/batchStore';
import StatusBadge from '@/components/StatusBadge';
import MaterialTimeline from '@/components/MaterialTimeline';
import PaymentTable from '@/components/PaymentTable';
import type { Material, MaterialType } from '@shared/types';

type Preset = {
  key: string;
  type: MaterialType;
  label: string;
  name: string;
  content: string;
};

const PRESETS: Preset[] = [
  {
    key: 'bf-extra',
    type: 'bank_flow',
    label: '后补银行流水',
    name: '汇丰银行-税费划转副页-补录',
    content: '补录副页信息：2026-06-07 港币账户尾号7721 划付印花税 HKD 9,420.50、交易费 HKD 471.03、结算费 HKD 188.41；附银行电子回单编号 HK-20260607-7721',
  },
  {
    key: 'nm-extra',
    type: 'name_mismatch',
    label: '名称不一致说明',
    name: '客户名称差异-工商变更证明（补录）',
    content: '企业全称"长江投资控股集团股份有限公司"，银行端录入为"长江投控集团"，附市场监督管理局出具的《企业名称变更核准通知书》编号 GS-2026-0441，双方系同一主体',
  },
  {
    key: 'sp-extra',
    type: 'supplementary',
    label: '后补税费优惠说明',
    name: '后补：CEPA项下港股通交易优惠税率适用确认',
    content: '根据《内地与香港关于建立更紧密经贸关系的安排》补充协议十，本批次项下合资格机构投资者交易适用印花税 0.07%（原 0.1%），应调减 HKD 1,356.80；附中国证监会函件编号 CSRC-HK-2026-019',
  },
];

const TYPE_META: Record<MaterialType, { label: string; color: string; bg: string; Icon: typeof Receipt }> = {
  bank_flow: { label: '银行流水', color: 'text-primary-700', bg: 'bg-primary-50 border-primary-200', Icon: Receipt },
  name_mismatch: { label: '名称不一致', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', Icon: AlertTriangle },
  supplementary: { label: '后补说明', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', Icon: FilePlus2 },
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { current, fetchBatch, rerunBatch, reviseConclusion, exportCSV, exportProgress, uploadMaterials, loading } = useBatchStore();
  const [reviseOpen, setReviseOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [customType, setCustomType] = useState<MaterialType>('supplementary');
  const [customName, setCustomName] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [newConclusion, setNewConclusion] = useState('');
  const [reviseReason, setReviseReason] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchBatch(id);
  }, [id, fetchBatch]);

  useEffect(() => {
    if (current) {
      setNewConclusion(current.conclusion);
    }
  }, [current]);

  if (!current && loading) {
    return <div className="animate-pulse h-96 rounded-2xl bg-white border border-zinc-200" />;
  }
  if (!current) return <div className="text-zinc-500">未找到批次</div>;

  const handleRerun = async () => {
    if (!id) return;
    await rerunBatch(id);
    setToast('重跑已启动，稍后刷新');
    setTimeout(() => setToast(null), 2200);
  };

  const handleRevise = async () => {
    if (!id || !newConclusion.trim() || !reviseReason.trim()) {
      setToast('新结论与改判原因为必填');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    await reviseConclusion(id, { newConclusion: newConclusion.trim(), reviseReason: reviseReason.trim(), newRemark: newRemark.trim() });
    setReviseOpen(false);
    setReviseReason('');
    setNewRemark('');
    setToast('改判已保存，历史已记录');
    setTimeout(() => setToast(null), 2200);
  };

  const handleExport = async () => {
    if (!id) return;
    const r = await exportCSV(id);
    setToast(r.message);
    setTimeout(() => setToast(null), 2800);
  };

  const togglePreset = (key: string) => {
    setSelectedPresets((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const resetUploadForm = () => {
    setSelectedPresets(new Set());
    setCustomType('supplementary');
    setCustomName('');
    setCustomContent('');
    setMode('preset');
  };

  const buildMaterials = (): Material[] => {
    const list: Material[] = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    for (const p of PRESETS) {
      if (selectedPresets.has(p.key)) {
        list.push({
          id: `mat-${Date.now()}-${p.key}`,
          type: p.type,
          name: p.name,
          uploadedAt: now,
          content: p.content,
        });
      }
    }
    if (mode === 'custom' && customName.trim() && customContent.trim()) {
      list.push({
        id: `mat-${Date.now()}-custom`,
        type: customType,
        name: customName.trim(),
        uploadedAt: now,
        content: customContent.trim(),
      });
    }
    return list;
  };

  const handleUpload = async () => {
    if (!id) return;
    const mats = buildMaterials();
    if (mats.length === 0) {
      setToast('请至少选择一份预设或填写自定义材料');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setSubmitting(true);
    const r = await uploadMaterials(id, mats);
    setToast(r.message);
    setTimeout(() => setToast(null), 3000);
    setSubmitting(false);
    if (r.ok) {
      setUploadOpen(false);
      resetUploadForm();
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-700 transition-colors">
          <ArrowLeft size={15} />
          返回批次列表
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-zinc-200 p-6 mb-6 shadow-[0_1px_2px_rgba(10,15,31,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-semibold text-primary-900">{current.batchNo}</h2>
              <StatusBadge status={current.status} />
              {current.history.length > 0 && (
                <Link to={`/batch/${current.id}/history`} className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800">
                  <History size={13} />
                  查看 {current.history.length} 次改判历史
                </Link>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-2">日期：{current.date} · 材料 {current.materialCount} 份 · 回款拆分 {current.payments.length} 行</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium border border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 transition-colors">
              <Plus size={14} />
              补录材料
            </button>
            <button onClick={handleRerun} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium border border-primary-200 text-primary-700 bg-white hover:bg-primary-50 transition-colors">
              <RotateCcw size={14} />
              重跑复核
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">
              <Download size={14} />
              导出CSV明细
            </button>
            <button onClick={() => setReviseOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium border border-red-200 text-red-700 bg-white hover:bg-red-50 transition-colors">
              <FileText size={14} />
              改判结论
            </button>
          </div>
        </div>
        <div className="mt-5 p-4 rounded-xl bg-primary-50/60 border border-primary-100">
          <p className="text-xs text-primary-700 font-medium mb-1">当前复核结论</p>
          <p className="text-sm text-primary-900 leading-relaxed">{current.conclusion}</p>
        </div>
        {exportProgress !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
              <span>正在校验页面状态与CSV一致性并导出...</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-accent-emerald rounded-full transition-all duration-500" style={{ width: `${exportProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 rounded-2xl bg-white border border-zinc-200 p-6 shadow-[0_1px_2px_rgba(10,15,31,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-primary-900">材料时间线</h3>
            <span className="text-xs text-zinc-400">以银行为主线</span>
          </div>
          <MaterialTimeline materials={current.materials} />
        </section>

        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-primary-900">回款拆分明细</h3>
            <span className="text-xs text-zinc-400 font-num">含来源行号与影响范围</span>
          </div>
          <PaymentTable payments={current.payments} />
        </section>
      </div>

      {reviseOpen && (
        <div className="fixed inset-0 z-50 bg-primary-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-1">改判复核结论</h3>
            <p className="text-xs text-zinc-500 mb-5">保存后旧材料快照、新备注与改判原因将写入历史，不可撤销</p>

            <label className="block mb-4">
              <span className="text-sm font-medium text-zinc-700">新结论</span>
              <textarea
                value={newConclusion}
                onChange={(e) => setNewConclusion(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                placeholder="请输入新的复核结论"
              />
            </label>
            <label className="block mb-4">
              <span className="text-sm font-medium text-zinc-700">新备注 <span className="text-zinc-400 font-normal">（可选）</span></span>
              <input
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                placeholder="例如：附港交所通函、调整p-006金额"
              />
            </label>
            <label className="block mb-5">
              <span className="text-sm font-medium text-zinc-700">改判原因 <span className="text-red-500">*</span></span>
              <textarea
                value={reviseReason}
                onChange={(e) => setReviseReason(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                placeholder="请详细说明改判原因，例如：后补凭证改变了原结论"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button onClick={() => setReviseOpen(false)} className="px-4 py-2 rounded-md text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">取消</button>
              <button onClick={handleRevise} className="px-4 py-2 rounded-md text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">保存改判</button>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-primary-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-primary-900">补录材料</h3>
                <p className="text-xs text-zinc-500 mt-0.5">相同名称+类型的材料提交两次只算一份，重复项会被标记为「重复（已跳过）」</p>
              </div>
              <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
                <button
                  onClick={() => setMode('preset')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    mode === 'preset' ? 'bg-white text-primary-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><Sparkles size={12} />快捷模板</span>
                </button>
                <button
                  onClick={() => setMode('custom')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    mode === 'custom' ? 'bg-white text-primary-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  自定义
                </button>
              </div>
            </div>

            {mode === 'preset' ? (
              <div className="mt-4 space-y-2">
                {PRESETS.map((p) => {
                  const meta = TYPE_META[p.type];
                  const Icon = meta.Icon;
                  const active = selectedPresets.has(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePreset(p.key)}
                      type="button"
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        active
                          ? 'border-primary-300 bg-primary-50/60 ring-2 ring-primary-100'
                          : `${meta.bg} hover:shadow-sm`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} className={meta.color} />
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label} · {p.label}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-primary-500 text-white' : 'bg-white/60 text-zinc-400 border border-zinc-200'}`}>
                          {active ? '已选' : '点击选择'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-800">{p.name}</p>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.content}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">材料类型</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {(Object.keys(TYPE_META) as MaterialType[]).map((t) => {
                      const meta = TYPE_META[t];
                      const Icon = meta.Icon;
                      const active = customType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCustomType(t)}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            active
                              ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-100'
                              : `${meta.bg} hover:shadow-sm`
                          }`}
                        >
                          <Icon size={15} className={`${meta.color} mx-auto mb-1`} />
                          <p className={`text-xs font-medium ${meta.color}`}>{meta.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">材料名称</span>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                    placeholder="例如：后补：某某补充说明"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">材料内容</span>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    rows={5}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition font-mono text-xs"
                    placeholder="粘贴凭证/函件的主要内容"
                  />
                </label>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                {mode === 'preset' ? `已选 ${selectedPresets.size} 份模板` : (customName && customContent ? '已填写 1 份自定义材料' : '请填写名称与内容')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setUploadOpen(false); resetUploadForm(); }}
                  className="px-4 py-2 rounded-md text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                >取消</button>
                <button
                  onClick={handleUpload}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >{submitting ? '提交中...' : `补录${mode === 'preset' && selectedPresets.size > 0 ? ` (${selectedPresets.size})` : ''}`}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-primary-900 text-white text-sm shadow-xl animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}
