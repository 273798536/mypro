import { useState, useEffect, useRef } from 'react';
import {
  Download,
  X,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  captureElementAsImage,
  generateStatusText,
  downloadTextFile,
  downloadDataUrlAsFile,
} from '@/utils/export';
import type { BankTransaction } from '@/types';
import {
  formatAmountWithYuan,
  getStatusLabel,
} from '@/utils/reconciliation';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  transaction: BankTransaction;
  latestConclusion?: string;
}

export default function ExportModal({
  open,
  onClose,
  transaction,
  latestConclusion,
}: ExportModalProps) {
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [downloaded, setDownloaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const txSnap = useRef<BankTransaction | null>(null);
  const latestConclusionSnap = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      txSnap.current = transaction;
      latestConclusionSnap.current = latestConclusion;
      setPreviewUrl(null);
      setStatusText('');
      setDownloaded(false);
      setErrorMsg('');
    }
  }, [open, transaction, latestConclusion]);

  const buildText = (tx: BankTransaction, lc?: string) =>
    generateStatusText({
      bankSerialNo: tx.bankSerialNo,
      amount: formatAmountWithYuan(tx.amount),
      counterparty: tx.counterparty,
      status: getStatusLabel(tx.status),
      supplementRemark: tx.supplementRemark,
      approverName: tx.approverName,
      approverNameChanged: tx.approverNameChanged,
      lastConclusion: lc,
    });

  const handlePreview = async () => {
    setCapturing(true);
    setErrorMsg('');
    try {
      const img = await captureElementAsImage('export-capture-region');
      const tx = txSnap.current ?? transaction;
      const lc = latestConclusionSnap.current ?? latestConclusion;
      setPreviewUrl(img);
      setStatusText(buildText(tx, lc));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '截图失败';
      setErrorMsg(msg);
      console.error('[ExportModal] capture failed:', e);
    } finally {
      setCapturing(false);
    }
  };

  const handleDownloadAll = () => {
    if (!previewUrl) return;
    const tx = txSnap.current ?? transaction;
    const lc = latestConclusionSnap.current ?? latestConclusion;
    const text = buildText(tx, lc);
    const base = `对账说明-${tx.bankSerialNo}-${Date.now()}`;
    try {
      downloadDataUrlAsFile(previewUrl, `${base}.png`);
      downloadTextFile(text, `${base}.txt`);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '下载失败';
      setErrorMsg(msg);
      console.error('[ExportModal] download failed:', e);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-sm animate-fade-up">
      <div className="bg-white border border-navy-100 rounded-[3px] shadow-card-hover w-[760px] max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-navy-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-navy-600" strokeWidth={2} />
            <h3 className="font-serif text-lg font-semibold text-navy-700">
              导出复核说明
            </h3>
            <span className="chip bg-navy-50 text-navy-500">
              流水 {transaction.bankSerialNo}
            </span>
            <span className="chip bg-cream text-navy-600">
              当前状态：{getStatusLabel(transaction.status)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          <div className="p-3 bg-amber/8 border border-amber/20 rounded-sm flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-dark shrink-0 mt-0.5" strokeWidth={2} />
            <div className="text-xs text-navy-700 leading-relaxed">
              <span className="font-medium">页面看到的状态 = 导出文件里的说法。</span>
              每次打开弹窗都会清空上次生成的截图，请重新点击"生成页面截图预览"以确保与当前数据一致。
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div className="text-xs text-red-700">{errorMsg}</div>
            </div>
          )}

          {downloaded && (
            <div className="p-3 bg-emerald/10 border border-emerald/30 rounded-sm flex items-center gap-2 animate-fade-up">
              <CheckCircle2 className="w-4 h-4 text-emerald-dark shrink-0" strokeWidth={2.2} />
              <div className="text-xs text-emerald-dark font-medium">
                已下载：.png 截图 + .txt 说明（格式可正常被系统打开，中文已写入 BOM）
              </div>
            </div>
          )}

          <div>
            <label className="label-text">步骤 1 · 生成与当前页面一致的截图 + 文字</label>
            <button
              onClick={handlePreview}
              disabled={capturing}
              className="btn-secondary w-full justify-center disabled:opacity-60"
            >
              {capturing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  正在截取当前页面……
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" strokeWidth={1.8} />
                  生成页面截图预览（读取当前最新数据）
                </>
              )}
            </button>
          </div>

          {previewUrl && (
            <div className="space-y-3 animate-fade-up">
              <div>
                <div className="label-text flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" strokeWidth={1.8} />
                  页面截图（与当前页面一致）
                </div>
                <div className="border border-navy-200 rounded-sm overflow-hidden bg-navy-50 max-h-[220px] overflow-auto">
                  <img
                    src={previewUrl}
                    alt="页面预览"
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <div>
                <div className="label-text flex items-center gap-1">
                  <FileText className="w-3 h-3" strokeWidth={1.8} />
                  状态文字说明（与页面说法一致，随本次生成一起确定）
                </div>
                <pre className="font-mono text-xs text-navy-700 bg-cream/60 border border-navy-100 rounded-sm px-4 py-3 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-auto">
                  {statusText}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-navy-100 flex items-center justify-end gap-3 bg-navy-50/30">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={!previewUrl}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" strokeWidth={1.8} />
            下载截图 + 文字说明
          </button>
        </div>
      </div>
    </div>
  );
}
