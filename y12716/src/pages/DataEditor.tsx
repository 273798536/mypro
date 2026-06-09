import { useRef, useState } from 'react';
import { Upload, Plus, FileJson, Database, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { DataTable } from '@/components/DataTable';
import { useAppStore } from '@/store/useAppStore';
import type { Question } from '@/types';
import { useDataValidator } from '@/hooks/useDataValidator';

export default function DataEditor() {
  const { questions, setQuestions, addQuestion, runCalculation } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const { validate, parseCSV } = useDataValidator();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        let imported: Question[];
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          imported = Array.isArray(data) ? data : data.questions || [];
        } else {
          imported = parseCSV(text);
        }

        const validation = validate(imported);
        if (!validation.valid && validation.errors.length > 0) {
          setImportStatus({ type: 'err', msg: `导入失败：${validation.errors[0]}` });
          return;
        }

        const merged = [...questions];
        for (const q of imported) {
          const idx = merged.findIndex((m) => m.id === q.id);
          if (idx >= 0) merged[idx] = { ...merged[idx], ...q };
          else merged.push(q);
        }
        setQuestions(merged);
        setImportStatus({ type: 'ok', msg: `成功导入 ${imported.length} 条记录（含 ${validation.gaps.length} 条数据缺口）` });
        setTimeout(() => runCalculation(), 100);
      } catch (err) {
        setImportStatus({ type: 'err', msg: `解析失败：${(err as Error).message}` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddNew = () => {
    const nextNum = questions.length + 1;
    const newQ: Question = {
      id: `Q${String(nextNum).padStart(3, '0')}`,
      name: '新题目',
      difficulty: 3,
      chapter: '第一章-基础概念',
      unit: '分钟',
      errorRate: 0.3,
      dependencies: [],
      notes: '',
      source: 'manual',
    };
    addQuestion(newQ);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#d4a24c]" />
            <h3 className="font-serif text-sm font-semibold">批量导入</h3>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            支持 CSV / JSON 格式。CSV 需包含 <span className="text-[#d4a24c]">id</span> 和{' '}
            <span className="text-[#d4a24c]">name</span> 列。
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-md border border-[#2a4a73] bg-[#1e3a5f] px-3 py-2 text-xs text-gray-200 transition-all hover:border-[#d4a24c] hover:text-[#d4a24c]"
            >
              选择文件
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1 rounded-md bg-gradient-to-r from-[#d4a24c] to-[#b8873a] px-3 py-2 text-xs font-semibold text-[#0a1828] shadow transition-all hover:shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              新增
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={handleFileUpload}
          />
          {importStatus && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-[11px] ${
                importStatus.type === 'ok'
                  ? 'border-[#2d936c]/40 bg-[#2d936c]/10 text-[#7bc9a7]'
                  : 'border-[#c85353]/40 bg-[#c85353]/10 text-[#e99090]'
              }`}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {importStatus.msg}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-[#4a8ec2]" />
            <h3 className="font-serif text-sm font-semibold">数据源分布</h3>
          </div>
          <div className="space-y-2">
            {[
              { key: 'shared_drive', label: '共享盘-学生错题', color: '#2d936c' },
              { key: 'legacy_sheet', label: '旧表-题目清单', color: '#4a8ec2' },
              { key: 'draft_note', label: '草稿-人工备注', color: '#d4a24c' },
              { key: 'manual', label: '手动录入', color: '#c07098' },
            ].map((src) => {
              const count = questions.filter((q) => q.source === src.key).length;
              const pct = questions.length ? (count / questions.length) * 100 : 0;
              return (
                <div key={src.key}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-gray-300">{src.label}</span>
                    <span className="font-mono" style={{ color: src.color }}>
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#1e3a5f]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: src.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4 text-white">
          <div className="mb-3 flex items-center gap-2">
            <FileJson className="h-4 w-4 text-[#d4a24c]" />
            <h3 className="font-serif text-sm font-semibold">CSV 模板列说明</h3>
          </div>
          <div className="space-y-1.5 text-[11px] text-gray-400">
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-[#d4a24c]">id</span>
              <span className="col-span-2">题目ID，必填，如 Q001</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-[#d4a24c]">name</span>
              <span className="col-span-2">题目名称，必填</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-gray-500">difficulty</span>
              <span className="col-span-2">难度 1-5，可选</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-gray-500">chapter</span>
              <span className="col-span-2">所属章节，可选</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-gray-500">unit</span>
              <span className="col-span-2">单位（分钟/题），可选</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-gray-500">errorRate</span>
              <span className="col-span-2">错题率 0-1，可选</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-gray-500">dependencies</span>
              <span className="col-span-2">用 ; 分隔的前置题ID，可选</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="font-mono text-gray-500">source</span>
              <span className="col-span-2">数据来源，可选</span>
            </div>
          </div>
        </div>
      </div>

      <DataTable />
    </div>
  );
}
