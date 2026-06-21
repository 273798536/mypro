import { useState } from 'react';
import { Upload, FileText, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { ImportRecordInput } from '@shared/types';

export function ImportPanel() {
  const doImport = useApp((s) => s.doImport);
  const pushToast = useApp((s) => s.pushToast);
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const parseText = (raw: string): ImportRecordInput[] => {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const result: ImportRecordInput[] = [];
    for (const line of lines) {
      const parts = line.split(/[,，\t|\s]+/).filter(Boolean);
      if (parts.length < 2) continue;
      const [recordNo, paramVersion, ...rest] = parts;
      let remark = '';
      let isLate = false;
      for (const p of rest) {
        if (/迟|晚|补交|late/i.test(p)) isLate = true;
        else remark += (remark ? ' ' : '') + p;
      }
      result.push({
        recordNo,
        paramVersion,
        remark: remark || undefined,
        isLateSubmission: isLate || undefined,
      });
    }
    return result;
  };

  const handleSubmit = () => {
    const items = parseText(text);
    if (items.length === 0) {
      pushToast('error', '至少需要一条有效记录（编号 + 参数版本）');
      return;
    }
    doImport(items);
    setText('');
  };

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  const demo = () => {
    setText(
      [
        'TOPO-2026-0150 v2.3.1',
        'TOPO-2026-0151 v2.3.0 阿乔口头备注：参数是小李下午发我的',
        'TOPO-2026-152 v2.3.1 编号少了一位',
        'TOPO-2026-0153 v2.2.7 迟到补交 昨天晚上才给我',
      ].join('\n'),
    );
    pushToast('info', '已填入贴近现场的示例数据，可直接导入');
  };

  return (
    <div className="rounded-lg border border-white/10 bg-surface-800/60 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold">数据导入</h3>
        </div>
        <button
          onClick={demo}
          className="text-[11px] px-2 py-1 rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1 transition"
        >
          <Sparkles className="w-3 h-3" />
          填入示例
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={`p-3 border-2 border-dashed m-3 rounded transition-colors ${
          dragOver ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10'
        }`}
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-xs text-zinc-300">
            拖拽 <span className="text-sky-300 font-mono">.txt/.csv</span> 到这里，或在下方直接粘贴
          </p>
          <p className="text-[11px] text-amber-300">数据不必干净，编号不一致、口头备注、迟到材料都照单全收</p>
        </div>
        <label className="block mt-2">
          <input
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <span className="block text-center text-xs text-sky-400 hover:text-sky-300 cursor-pointer transition">
            点击选择文件
          </span>
        </label>
      </div>

      <div className="px-3 pb-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'每行一条，格式：\nTOPO-2026-0150 v2.3.1\nTOPO-2026-0151 v2.3.0 口头备注 迟到补交'}
          className="w-full h-28 px-3 py-2 rounded bg-surface-900/70 border border-white/10 text-xs font-mono text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-sky-500/40 scroll-thin"
        />
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[11px] text-zinc-500">
            {parseText(text).length > 0 ? `已识别 ${parseText(text).length} 条` : '粘贴或上传后，系统会自动拆分字段'}
          </p>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 text-xs font-medium rounded bg-sky-500 text-white hover:bg-sky-400 transition shadow-md shadow-sky-500/20"
          >
            导入入库（幂等）
          </button>
        </div>
      </div>
    </div>
  );
}
