import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, CheckCircle2, FileText, Layers3, Save, X } from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { useFilterStore } from '@/store/useFilterStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import type { ReconciliationStatus, TimelineItem } from '@/types';
import { STATUS_LABEL } from '@/types';
import { buildFilterLabel } from '@/utils/exporter';
import { formatDateTime, formatMoney, formatNumber } from '@/utils/parser';

const STATUSES: ReconciliationStatus[] = ['confirmed', 'pending', 'returned'];

export default function ReconciliationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const store = useReconciliationStore();
  const snap = useFilterStore((s) => s.snapshot());
  const record = store.getById(id || '');

  const [nextStatus, setNextStatus] = useState<ReconciliationStatus | ''>('');
  const [reason, setReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [shotDesc, setShotDesc] = useState('');
  const [shotImage, setShotImage] = useState<string | null>(null);
  const [statusPulse, setStatusPulse] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const logs = store.getLogsByRecordId(id || '');
  const notes = store.getNotesByRecordId(id || '');
  const shots = store.getScreenshotsByRecordId(id || '');

  const timeline: TimelineItem[] = useMemo(() => {
    if (!record) return [];
    const items: TimelineItem[] = [];
    if (record) {
      items.push({
        kind: 'created', id: 'seed_' + record.id,
        createdAt: record.createdAt, operator: '系统导入',
        sourceBatch: record.sourceBatch,
      });
    }
    for (const l of logs) {
      items.push({
      kind: 'status', id: l.id, createdAt: l.createdAt, operator: l.operator,
      fromStatus: l.fromStatus, toStatus: l.toStatus, reason: l.reason,
    });
    }
    for (const n of notes) {
      items.push({ kind: 'note', id: n.id, createdAt: n.createdAt, operator: n.operator, content: n.content });
    }
    for (const s of shots) {
      items.push({
        kind: 'screenshot', id: s.id, createdAt: s.createdAt, operator: s.operator,
        description: s.description, imageData: s.imageData,
        filterSnapshot: s.filterSnapshot,
      });
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [record, logs, notes, shots]);

  if (!record) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-ink-300">
      <p className="mb-3">未找到该对账记录。</p>
      <Link to="/" className="inline-flex items-center gap-1 text-amber-gold hover:underline">
        <ArrowLeft size={14} /> 返回列表
      </Link>
      </div>
    );
  }

  const confirmStatus = () => {
    if (!nextStatus || !reason.trim()) return;
    store.updateStatus(record.id, nextStatus, reason.trim());
    setNextStatus('');
    setReason('');
    setStatusPulse(true);
    setTimeout(() => setStatusPulse(false), 600);
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    store.addNote(record.id, noteText.trim());
    setNoteText('');
  };

  const handlePickFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setShotImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addScreenshot = () => {
    if (!shotImage) return;
    store.addScreenshot(record.id, shotImage, shotDesc.trim(), snap);
    setShotImage(null);
    setShotDesc('');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) handlePickFile(file);
        break;
      }
    }
  };

  return (
    <div className="flex h-full flex-col" onPaste={handlePaste}>
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-900/60 px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-amber-gold"
          >
            <ArrowLeft size={15} />
            返回列表
          </button>
          <span className="text-ink-600">|</span>
          <h2 className="font-serif text-lg font-semibold text-ink-100">
            对账详情
          </h2>
          <StatusBadge status={record.status} pulse={statusPulse} />
        </div>
        <div className="font-mono-num text-xs text-ink-400">
          {record.contractCode} · {record.tradeDate}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <section className="flex w-1/2 flex-col gap-5 overflow-y-auto border-r border-ink-700 p-8">
          <div className="grid grid-cols-2 gap-4">
            <Info label="合约代码" value={record.contractCode} mono />
            <Info label="交易日期" value={record.tradeDate} />
            <Info label="银行流水号" value={record.bankSerial || '—'} mono />
            <Info label="来源批次" value={record.sourceBatch} />
            <Info label="现货价" value={formatNumber(record.spotPrice, 2)} mono accent />
            <Info label="期货价" value={formatNumber(record.futuresPrice, 2)} mono accent />
            <Info
              label="基差"
              value={formatNumber(record.basis, 4)}
              mono
              accent
              highlight={record.basis >= 0 ? 'positive' : 'negative'}
            />
            <Info label="对账金额" value={formatMoney(record.amount)} mono accent />
          </div>

          <div className="rounded-sm border border-ink-700 bg-ink-800/60">
            <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <h3 className="flex items-center gap-2 font-serif text-sm font-semibold text-ink-100">
                <Layers3 size={14} className="text-amber-gold" />
                税费 / 汇率分列
              </h3>
              {record.isPaymentSplit && (
                <span className="rounded-sm border border-amber-gold/40 bg-amber-gold/10 px-2 py-0.5 text-[11px] text-amber-gold">
                  回款拆分组：{record.paymentGroupId}
                </span>
              )}
            </header>
            <div className="space-y-3 p-4">
              <div className="rounded-sm border border-ink-600 bg-ink-900/70 p-3">
                <div className="mb-1 text-[10px uppercase tracking-wider text-ink-500">原始混列字段</div>
                <div className="font-mono-num text-sm text-ink-300">
                  {record.rawMixedField || <span className="text-ink-500">—</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={
                    'rounded-sm border p-3 ' +
                    (record.taxAmount !== null
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-ink-600 bg-ink-900/70')
                  }
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">
                    税费（自动拆分）
                  </div>
                  <div className="font-mono-num text-lg text-ink-100">
                    {record.taxAmount === null ? (
                      <span className="text-rose-400">待人工确认</span>
                    ) : (
                      formatNumber(record.taxAmount, 2)
                    )}
                  </div>
                </div>
                <div
                  className={
                    'rounded-sm border p-3 ' +
                    (record.exchangeRate !== null
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-ink-600 bg-ink-900/70')
                  }
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">
                  汇率（自动拆分）
                  </div>
                  <div className="font-mono-num text-lg text-ink-100">
                    {record.exchangeRate === null ? (
                      <span className="text-rose-400">待人工确认</span>
                    ) : (
                      formatNumber(record.exchangeRate, 4)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-ink-700 bg-ink-800/60">
            <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <h3 className="flex items-center gap-2 font-serif text-sm font-semibold text-ink-100">
                <FileText size={14} className="text-amber-gold" />
                添加备注
              </h3>
            </header>
            <div className="p-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="输入备注内容，将按当前用户和时间自动记录..."
                rows={3}
                className="w-full resize-none rounded-sm border border-ink-700 bg-ink-900/70 p-3 text-sm text-ink-100 placeholder-ink-500 focus:border-amber-gold focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={addNote}
                  disabled={!noteText.trim()}
                  className="flex items-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-4 py-1.5 text-sm font-medium text-amber-gold transition hover:bg-amber-gold/20 hover:shadow-glow-amber disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save size={14} />
                  保存备注
                </button>
              </div>
              </div>
          </div>

          <div className="rounded-sm border border-ink-700 bg-ink-800/60">
            <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <h3 className="flex items-center gap-2 font-serif text-sm font-semibold text-ink-100">
                <Camera size={14} className="text-amber-gold" />
                截图说明
                <span className="ml-2 text-[10px] font-normal text-ink-400">
                  自动记录当前筛选口径：
                  <span className="font-mono-num text-ink-300">
                    {buildFilterLabel(snap as any)}
                  </span>
                </span>
              </h3>
            </header>
            <div className="p-4">
              <div
                onClick={() => fileRef.current?.click()}
                className={
                  'flex min-h-[120 cursor-pointer items-center justify-center rounded-sm border-2 border-dashed p-4 text-center text-sm transition ' +
                  (shotImage
                    ? 'border-amber-gold/50 bg-amber-gold/5'
                    : 'border-ink-600 hover:border-ink-500 hover:bg-ink-900/50')
                }
              >
                {shotImage ? (
                <div className="w-full space-y-2">
                  <img src={shotImage} alt="preview" className="mx-auto max-h-48 object-contain" />
                  <div className="text-xs text-ink-400">
                    点击更换，或直接粘贴（Ctrl/⌘+V）
                  </div>
                  </div>
              ) : (
                <div className="space-y-1 text-ink-400">
                  <Camera size={24} className="mx-auto opacity-50" />
                  <div>点击选择截图，或直接 Ctrl/⌘+V 粘贴</div>
                </div>
              )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePickFile(e.target.files[0])}
              />
              <input
                type="text"
                value={shotDesc}
                onChange={(e) => setShotDesc(e.target.value)}
                placeholder="截图说明（如：2025-06 期货基差对账当日筛选口径说明"
                className="mt-3 w-full rounded-sm border border-ink-700 bg-ink-900/70 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-amber-gold focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                {shotImage && (
                  <button
                  onClick={() => setShotImage(null)}
                  className="flex items-center gap-1.5 rounded-sm border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-300 hover:border-ink-400 hover:text-ink-100"
                >
                  <X size={14} />
                  取消
                </button>
                )}
                <button
                onClick={addScreenshot}
                disabled={!shotImage}
                className="flex items-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-4 py-1.5 text-sm font-medium text-amber-gold transition hover:bg-amber-gold/20 hover:shadow-glow-amber disabled:cursor-not-allowed disabled:opacity-40"
              >
                  <Save size={14} />
                保存截图说明
              </button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex w-1/2 flex-col overflow-y-auto p-8">
          <div className="mb-6 flex items-center gap-2">
            <h3 className="flex items-center gap-2 font-serif text-sm font-semibold text-ink-100">
              <CheckCircle2 size={14} className="text-amber-gold" />
              历史操作时间线
            </h3>
          </div>
          <Timeline items={timeline} />
        </section>
      </div>

      <div className="border-t-2 border-amber-gold/30 bg-ink-900/90 px-8 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-ink-200">人工改判：</span>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const active = nextStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setNextStatus(s)}
                  className={
                    'rounded-sm border-2 px-3 py-1 text-sm transition ' +
                    (active
                      ? s === 'confirmed'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : s === 'pending'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-rose-500 bg-rose-500/10 text-rose-400'
                      : 'border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-400 hover:text-ink-100'
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="改判理由（必填）"
            className="ml-2 flex-1 min-w-[240px] rounded-sm border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-ink-100 placeholder-ink-500 focus:border-amber-gold focus:outline-none"
          />
          <button
            onClick={confirmStatus}
            disabled={!nextStatus || !reason.trim()}
            className="flex items-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-4 py-1.5 text-sm font-medium text-amber-gold transition hover:bg-amber-gold/20 hover:shadow-glow-amber disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={14} />
            确认改判
          </button>
        </div>
        <div className="mt-2 text-[11px] text-ink-500">
          上次更新：{formatDateTime(record.updatedAt)} · 当前状态将记录操作人：阿禾，变更后将自动写入历史操作日志，并用于月底复核。
        </div>
      </div>
    </div>
  );
}

interface InfoProps {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  highlight?: 'positive' | 'negative';
}

function Info({ label, value, mono, accent, highlight }: InfoProps) {
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/50 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div
        className={
          'mt-1 text-sm ' +
          (mono ? 'font-mono-num ' : '') +
          (accent ? 'text-ink-100' : 'text-ink-200') +
          (highlight === 'positive' ? ' text-emerald-400' : '') +
          (highlight === 'negative' ? ' text-rose-400' : '')
        }
      >
        {value}
      </div>
    </div>
  );
}
