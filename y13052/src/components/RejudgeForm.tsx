import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, XCircle, Loader2, CheckSquare, Link2, FilePlus, Paperclip, Clock, type LucideIcon } from 'lucide-react';
import type { CaseStatus, PreReviewCase, RejudgeRequest, SupplementRequest } from '../../shared/types.js';
import { STATUS_LABEL } from '../../shared/types.js';
import { useAppStore } from '@/store/appStore.js';
import { formatDateShort } from '@/lib/api.js';

type Mode = 'rejudge' | 'supplement';

export default function RejudgeForm({
  cs, linkedPhotos, linkedObjects, linkedAttachments, onToggleAttachment, onClearSelection,
}: {
  cs: PreReviewCase;
  linkedPhotos: string[];
  linkedObjects: string[];
  linkedAttachments: string[];
  onToggleAttachment: (id: string) => void;
  onClearSelection: () => void;
}) {
  const navigate = useNavigate();
  const { rejudgeCase, supplementCase, setSuccess } = useAppStore();

  const [mode, setMode] = useState<Mode>('rejudge');
  const [toStatus, setToStatus] = useState<CaseStatus>('approved');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('老何');
  const [markAbnormal, setMarkAbnormal] = useState(false);
  const [abnormalNote, setAbnormalNote] = useState('');

  const [suppReason, setSuppReason] = useState('');
  const [suppOperator, setSuppOperator] = useState('老何');
  const [suppExtra, setSuppExtra] = useState<{ fileName: string; fileType: SupplementRequest['extraAttachments'][number]['fileType']; description: string }[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<SupplementRequest['extraAttachments'][number]['fileType']>('pdf');
  const [newFileDesc, setNewFileDesc] = useState('');
  const [suppTimeline, setSuppTimeline] = useState<{ title: string; description: string }[]>([]);
  const [newTlTitle, setNewTlTitle] = useState('');
  const [newTlDesc, setNewTlDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLinks = linkedPhotos.length > 0 || linkedObjects.length > 0 || linkedAttachments.length > 0;
  const unlinkedAtts = cs.attachments.filter((a) => !a.linkedToConclusion);

  const resetForms = () => {
    setReason('');
    setMarkAbnormal(false);
    setAbnormalNote('');
    setSuppReason('');
    setSuppExtra([]);
    setSuppTimeline([]);
    setNewFileName('');
    setNewFileDesc('');
    setNewTlTitle('');
    setNewTlDesc('');
  };

  const handleRejudge = async () => {
    if (!reason.trim()) { setError('请填写改判原因'); return; }
    setLoading(true); setError(null);
    try {
      const body: RejudgeRequest = {
        toStatus,
        reason: reason.trim(),
        operator: operator.trim() || '老何',
        linkedPhotoIds: linkedPhotos,
        linkedObjectIds: linkedObjects,
        linkedAttachmentIds: linkedAttachments,
        markAbnormal: markAbnormal || undefined,
        abnormalNote: abnormalNote.trim() || undefined,
      };
      await rejudgeCase(cs.id, body);
      onClearSelection();
      resetForms();
      setTimeout(() => navigate('/history'), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally { setLoading(false); }
  };

  const handleSupplement = async () => {
    if (!suppReason.trim()) { setError('请填写补录原因'); return; }
    setLoading(true); setError(null);
    try {
      const body: SupplementRequest = {
        operator: suppOperator.trim() || '老何',
        reason: suppReason.trim(),
        extraAttachments: suppExtra.length > 0 ? suppExtra.map((a) => ({ ...a, uploadedBy: suppOperator.trim() || '老何' })) : undefined,
        extraTimeline: suppTimeline.length > 0 ? suppTimeline.map((t) => ({ ...t, timestamp: new Date().toISOString() })) : undefined,
        linkedAttachmentIds: linkedAttachments.length > 0 ? linkedAttachments : undefined,
      };
      await supplementCase(cs.id, body);
      onClearSelection();
      resetForms();
      setTimeout(() => navigate('/history'), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="eng-card p-4 space-y-4 border-t-4 border-t-marine-600">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-sm">
          {([
            { k: 'rejudge', label: '改判操作', icon: CheckSquare },
            { k: 'supplement', label: '补录记录', icon: FilePlus },
          ] as { k: Mode; label: string; icon: LucideIcon }[]).map((t) => (
            <button
              key={t.k}
              onClick={() => { setMode(t.k); setError(null); setSuccess(null); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                mode === t.k ? 'bg-white text-marine-700 shadow-sm' : 'text-slate-500 hover:text-marine-600'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        {hasLinks && (
          <span className="eng-chip bg-marine-50 text-marine-700 border-marine-200 text-[11px]">
            <Link2 className="w-3 h-3" />
            已关联 {linkedPhotos.length} 照片 · {linkedObjects.length} 对象 · {linkedAttachments.length} 附件
          </span>
        )}
      </div>

      {mode === 'rejudge' && (
        <div className="space-y-4">
          <div>
            <label className="eng-label">改判状态</label>
            <div className="grid grid-cols-2 gap-2">
              {(['approved', 'rejected', 'pending', 'abnormal'] as CaseStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setToStatus(s)}
                  className={`px-3 py-2 rounded-sm border-2 text-xs font-medium transition-all ${
                    toStatus === s
                      ? s === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-engineering'
                        : s === 'rejected'
                          ? 'bg-red-600 text-white border-red-600 shadow-engineering'
                          : s === 'abnormal'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-engineering'
                            : 'bg-sky-500 text-white border-sky-500 shadow-engineering'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-marine-300'
                  }`}
                >
                  {s === 'approved' && <CheckCircle2 className="w-3 h-3 inline-block mr-1" />}
                  {s === 'rejected' && <XCircle className="w-3 h-3 inline-block mr-1" />}
                  {s === 'abnormal' && <AlertTriangle className="w-3 h-3 inline-block mr-1" />}
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="eng-label">复核人</label>
            <input className="eng-input" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="请输入复核人姓名" />
          </div>
          <div>
            <label className="eng-label">改判原因 *</label>
            <textarea
              className="eng-input min-h-[70px] resize-y"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明改判原因，建议引用巡检照片的原始行号或具体对象"
            />
          </div>

          {unlinkedAtts.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm space-y-2">
              <p className="text-xs font-semibold text-rose-800 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                关联晚到附件到本次改判结论
              </p>
              <div className="space-y-1">
                {unlinkedAtts.map((a) => (
                  <label key={a.id} className="flex items-start gap-2 p-2 bg-white border border-rose-100 rounded-sm cursor-pointer hover:bg-rose-100/50">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-3.5 h-3.5 accent-rose-600"
                      checked={linkedAttachments.includes(a.id)}
                      onChange={() => onToggleAttachment(a.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{a.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">上传：{formatDateShort(a.uploadedAt)} · {a.uploadedBy}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm">
            <input
              type="checkbox"
              id="markAbnormal"
              className="mt-0.5 w-4 h-4 accent-amber-500"
              checked={markAbnormal}
              onChange={(e) => setMarkAbnormal(e.target.checked)}
            />
            <div className="flex-1">
              <label htmlFor="markAbnormal" className="text-xs font-semibold text-amber-800 flex items-center gap-1 cursor-pointer">
                <AlertTriangle className="w-3.5 h-3.5" />
                标记为异常数据
              </label>
              <p className="text-[11px] text-amber-700 mt-0.5">当巡检照片原始数据缺段、缺失或可疑时勾选</p>
              {markAbnormal && (
                <input
                  className="eng-input mt-2 !py-1.5 text-xs"
                  placeholder="异常说明（如：原始二维表第X-X行数据丢失）"
                  value={abnormalNote}
                  onChange={(e) => setAbnormalNote(e.target.value)}
                />
              )}
            </div>
          </div>

          {error && <div className="p-2 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700">{error}</div>}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              当前：<span className="font-mono font-semibold text-slate-700">{STATUS_LABEL[cs.status]}</span>
              {' → '}
              目标：<span className="font-mono font-semibold text-marine-700">{STATUS_LABEL[toStatus]}</span>
            </span>
            <div className="flex items-center gap-2">
              <button className="eng-btn" onClick={onClearSelection} disabled={loading || !hasLinks}>清空关联</button>
              <button className="eng-btn-primary" onClick={handleRejudge} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                提交改判
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'supplement' && (
        <div className="space-y-4">
          <div>
            <label className="eng-label">补录人</label>
            <input className="eng-input" value={suppOperator} onChange={(e) => setSuppOperator(e.target.value)} placeholder="请输入补录人姓名" />
          </div>
          <div>
            <label className="eng-label">补录原因 *</label>
            <textarea
              className="eng-input min-h-[60px] resize-y"
              value={suppReason}
              onChange={(e) => setSuppReason(e.target.value)}
              placeholder="请说明补录资料的来源与原因"
            />
          </div>

          {unlinkedAtts.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-sm space-y-2">
              <p className="text-xs font-semibold text-indigo-800 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                将已有晚到附件标记为「已关联结论」
              </p>
              <div className="space-y-1">
                {unlinkedAtts.map((a) => (
                  <label key={a.id} className="flex items-start gap-2 p-2 bg-white border border-indigo-100 rounded-sm cursor-pointer hover:bg-indigo-100/50">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-3.5 h-3.5 accent-indigo-600"
                      checked={linkedAttachments.includes(a.id)}
                      onChange={() => onToggleAttachment(a.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{a.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FilePlus className="w-3.5 h-3.5" />
              新增附件（可选）
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                className="eng-input !py-1 text-xs flex-1 min-w-[120px]"
                placeholder="文件名（如：补充报告2024.pdf）"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
              <select
                className="eng-input !py-1 text-xs !w-auto"
                value={newFileType}
                onChange={(e) => setNewFileType(e.target.value as SupplementRequest['extraAttachments'][number]['fileType'])}
              >
                <option value="pdf">PDF</option>
                <option value="image">图片</option>
                <option value="excel">Excel</option>
                <option value="other">其他</option>
              </select>
              <input
                className="eng-input !py-1 text-xs flex-1 min-w-[140px]"
                placeholder="文件说明"
                value={newFileDesc}
                onChange={(e) => setNewFileDesc(e.target.value)}
              />
              <button
                className="eng-btn !px-2 !py-1 text-xs"
                onClick={() => {
                  if (!newFileName.trim()) return;
                  setSuppExtra([...suppExtra, { fileName: newFileName.trim(), fileType: newFileType, description: newFileDesc.trim() || '未填写说明' }]);
                  setNewFileName(''); setNewFileDesc('');
                }}
              >
                + 添加
              </button>
            </div>
            {suppExtra.length > 0 && (
              <div className="space-y-1 mt-2">
                {suppExtra.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-sm">
                    <div>
                      <p className="text-xs font-mono text-slate-800">{a.fileName}</p>
                      <p className="text-[10px] text-slate-500">{a.fileType.toUpperCase()} · {a.description}</p>
                    </div>
                    <button className="text-[10px] text-red-600 hover:underline" onClick={() => setSuppExtra(suppExtra.filter((_, j) => j !== i))}>移除</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              补录时间轴说明（可选）
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                className="eng-input !py-1 text-xs flex-1 min-w-[120px]"
                placeholder="事件标题（如：现场二次复核照片采集）"
                value={newTlTitle}
                onChange={(e) => setNewTlTitle(e.target.value)}
              />
              <input
                className="eng-input !py-1 text-xs flex-1 min-w-[180px]"
                placeholder="事件描述"
                value={newTlDesc}
                onChange={(e) => setNewTlDesc(e.target.value)}
              />
              <button
                className="eng-btn !px-2 !py-1 text-xs"
                onClick={() => {
                  if (!newTlTitle.trim()) return;
                  setSuppTimeline([...suppTimeline, { title: newTlTitle.trim(), description: newTlDesc.trim() || '无描述' }]);
                  setNewTlTitle(''); setNewTlDesc('');
                }}
              >
                + 添加
              </button>
            </div>
            {suppTimeline.length > 0 && (
              <div className="space-y-1 mt-2">
                {suppTimeline.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{t.title}</p>
                      <p className="text-[10px] text-slate-500">{t.description}</p>
                    </div>
                    <button className="text-[10px] text-red-600 hover:underline" onClick={() => setSuppTimeline(suppTimeline.filter((_, j) => j !== i))}>移除</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="p-2 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700">{error}</div>}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              将新增：{suppExtra.length} 个附件 · {suppTimeline.length} 条时间轴
            </span>
            <div className="flex items-center gap-2">
              <button className="eng-btn" onClick={onClearSelection} disabled={loading || !hasLinks}>清空关联</button>
              <button className="eng-btn-primary" onClick={handleSupplement} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                提交补录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
