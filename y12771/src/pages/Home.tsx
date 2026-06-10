import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Database, AlertTriangle, CheckCircle2, XCircle, Sparkles, RefreshCw, Download } from 'lucide-react';
import { useBatchStore } from '../store/batchStore';
import { parseSpectrumText, generateCsvSample } from '../utils/parser';
import { sampleBatchReport } from '../data/mockData';
import type { SpectrumRow, ParseWarning, ParseStatus } from '../../shared/types';

const statusStyles: Record<ParseStatus, { bg: string; chip: string; label: string }> = {
  normal: { bg: '', chip: 'chip-green', label: '正常' },
  supplemented: { bg: 'bg-amber-50', chip: 'chip-amber', label: '含补录' },
  missing: { bg: 'bg-rose-50', chip: 'chip-rose', label: '缺失/待处理' },
  error: { bg: 'bg-rose-100', chip: 'chip-rose', label: '错误' },
};

function warningIcon(t: ParseWarning['type']) {
  if (t === 'missing_unit' || t === 'reaction_time_missing' || t === 'blank_control_missing') return <XCircle size={14} className="text-rose-500" />;
  if (t === 'old_format_header' || t === 'remark_detected') return <AlertTriangle size={14} className="text-amber-500" />;
  return <AlertTriangle size={14} className="text-ink-500" />;
}

export default function Home() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsed, setParsed] = useState<{ rows: SpectrumRow[]; warnings: ParseWarning[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const setParseResult = useBatchStore((s) => s.setParseResult);
  const setBatchData = useBatchStore((s) => s.setBatchData);
  const loadSample = useBatchStore((s) => s.loadSampleData);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    setFileName(f.name);
    const text = await f.text();
    const res = parseSpectrumText(text, f.name);
    setParsed({ rows: res.data, warnings: res.warnings });
    setParseResult(res);
  };

  const loadSampleData = () => {
    setBatchData(JSON.parse(JSON.stringify(sampleBatchReport)));
    setFileName('样例数据_聚酯薄膜改性B2025-1212.csv');
    setParsed({ rows: sampleBatchReport.spectrumData.slice(0, 25), warnings: sampleBatchReport.parseWarnings });
  };

  const downloadSample = () => {
    const csv = generateCsvSample();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '红外谱图样例_含混乱数据.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-500 mb-1.5">Step 1 · 数据准备</div>
          <h1 className="font-serif text-3xl font-semibold text-ink-900">上传与解析红外谱图数据</h1>
          <p className="mt-2 text-ink-500 max-w-2xl">
            系统会自动识别旧表头、补录备注、漏填单位等混乱情况，所有解析结果都会保留原始文本，不会丢数据。
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadSample} className="btn-secondary">
            <Download size={16} /> 下载样例 CSV
          </button>
          <button onClick={loadSampleData} className="btn-primary">
            <Sparkles size={16} /> 载入贴近日常的样例
          </button>
        </div>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
          dragging ? 'border-amber-500 bg-amber-50' : 'border-ink-200 bg-white hover:border-ink-400 hover:bg-ink-50'
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ink-100 to-ink-200">
          <Upload size={28} className="text-ink-700" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-ink-900">拖拽文件到这里，或点击选择</h3>
        <p className="mt-1.5 text-sm text-ink-500">支持 CSV / TXT / TSV 格式，也可以粘贴旧版 Excel 另存为的文本</p>
        {fileName && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-moss-50 px-4 py-2 text-sm text-moss-700">
            <CheckCircle2 size={16} /> {fileName} · 已解析
          </div>
        )}
      </div>

      {parsed && (
        <>
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <h2 className="sub-title">解析提示（{parsed.warnings.length}）</h2>
              </div>
              <span className="text-xs text-ink-500">这些是系统检测到的情况，不一定是错误，数据不会被丢弃</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {parsed.warnings.map((w, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                  <div className="mt-0.5">{warningIcon(w.type)}</div>
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-ink-800">{w.message}</div>
                    {w.suggestedFix && <div className="mt-0.5 text-xs text-ink-500">建议：{w.suggestedFix}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-ink-700" />
                <h2 className="sub-title">解析结果预览</h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="chip-green">正常</span>
                <span className="chip-amber">含补录备注</span>
                <span className="chip-rose">缺失/待处理</span>
              </div>
            </div>
            <div className="max-h-96 overflow-auto scrollbar-thin">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-ink-50/95 backdrop-blur">
                  <tr>
                    <th className="table-th">行号</th>
                    <th className="table-th">波数 (cm⁻¹)</th>
                    <th className="table-th">吸光度</th>
                    <th className="table-th">单位</th>
                    <th className="table-th">原始备注</th>
                    <th className="table-th">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {parsed.rows.slice(0, 30).map((r) => {
                    const s = statusStyles[r.parseStatus];
                    return (
                      <tr key={r.rowIndex} className={`${s.bg} hover:bg-ink-50/50`}>
                        <td className="table-td font-mono text-xs">{r.rowIndex + 1}</td>
                        <td className="table-td font-mono">{r.wavenumber ?? <span className="text-rose-500">缺失</span>}</td>
                        <td className="table-td font-mono">{r.absorbance !== null ? r.absorbance.toFixed(3) : <span className="text-rose-500">缺失</span>}</td>
                        <td className="table-td">{r.rawUnit || <span className="text-amber-600 text-xs">未填</span>}</td>
                        <td className="table-td text-xs text-ink-600 max-w-xs truncate">{r.remark || '-'}</td>
                        <td className="table-td"><span className={s.chip}>{s.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsed.rows.length > 30 && (
              <div className="border-t border-ink-100 bg-ink-50 px-6 py-3 text-xs text-ink-500">
                共 {parsed.rows.length} 行，仅展示前 30 行
              </div>
            )}
          </section>

          <div className="flex justify-end gap-3">
            <button onClick={() => { setParsed(null); setFileName(''); }} className="btn-secondary">
              <RefreshCw size={16} /> 重新上传
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              <FileText size={16} /> 进入批次报告看板
            </button>
          </div>
        </>
      )}
    </div>
  );
}
