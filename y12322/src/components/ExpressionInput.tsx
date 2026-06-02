import { useState, useRef } from 'react';
import { Plus, Upload, Trash2, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { MaterialSource } from '@/types';

export default function ExpressionInput() {
  const [expression, setExpression] = useState('');
  const [stepSize, setStepSize] = useState('0.1');
  const [intervalA, setIntervalA] = useState('0');
  const [intervalB, setIntervalB] = useState('1');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addRawMaterial = useStore((s) => s.addRawMaterial);
  const rawMaterials = useStore((s) => s.rawMaterials);
  const activeMaterialId = useStore((s) => s.activeMaterialId);
  const setActiveMaterial = useStore((s) => s.setActiveMaterial);
  const removeRawMaterial = useStore((s) => s.removeRawMaterial);
  const updateRawMaterial = useStore((s) => s.updateRawMaterial);

  const handleAdd = (source: MaterialSource) => {
    if (!expression.trim()) return;
    const a = parseFloat(intervalA);
    const b = parseFloat(intervalB);
    const h = parseFloat(stepSize);
    if (isNaN(a) || isNaN(b) || isNaN(h) || h <= 0) return;

    addRawMaterial(expression.trim(), h, a, b, notes.trim(), source);
    setExpression('');
    setNotes('');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const parseLine = (line: string): { expression: string; stepSize: number; intervalA: number; intervalB: number; notes: string } | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    const tabParts = trimmed.split('\t');
    if (tabParts.length >= 5) {
      const [expr, hStr, aStr, bStr, note] = tabParts;
      const h = parseFloat(hStr);
      const a = parseFloat(aStr);
      const b = parseFloat(bStr);
      if (expr.trim() && !isNaN(h) && h > 0 && !isNaN(a) && !isNaN(b)) {
        return { expression: expr.trim(), stepSize: h, intervalA: a, intervalB: b, notes: note?.trim() ?? '' };
      }
    }

    const commaParts = trimmed.split(',');
    if (commaParts.length >= 5) {
      const [expr, hStr, aStr, bStr, ...noteParts] = commaParts;
      const h = parseFloat(hStr.trim());
      const a = parseFloat(aStr.trim());
      const b = parseFloat(bStr.trim());
      if (expr.trim() && !isNaN(h) && h > 0 && !isNaN(a) && !isNaN(b)) {
        return { expression: expr.trim(), stepSize: h, intervalA: a, intervalB: b, notes: noteParts.join(',').trim() };
      }
    }

    return {
      expression: trimmed,
      stepSize: parseFloat(stepSize) || 0.1,
      intervalA: parseFloat(intervalA) || 0,
      intervalB: parseFloat(intervalB) || 1,
      notes: '',
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item.expression && typeof item.expression === 'string') {
              addRawMaterial(
                item.expression.trim(),
                typeof item.stepSize === 'number' && item.stepSize > 0 ? item.stepSize : 0.1,
                typeof item.intervalA === 'number' ? item.intervalA : 0,
                typeof item.intervalB === 'number' ? item.intervalB : 1,
                typeof item.notes === 'string' ? item.notes : '',
                'import'
              );
            }
          }
        } catch {
          window.alert('JSON 文件解析失败，请检查格式是否正确');
        }
      } else {
        const lines = text.split('\n');
        for (const line of lines) {
          const parsed = parseLine(line);
          if (parsed) {
            addRawMaterial(parsed.expression, parsed.stepSize, parsed.intervalA, parsed.intervalB, parsed.notes, 'import');
          }
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">函数表达式</h3>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Upload size={12} />
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">f(x) =</label>
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="例如: 1/sqrt(x), x^2 + 1, sin(x)"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-amber-300 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">步长 h</label>
            <input
              type="number"
              value={stepSize}
              onChange={(e) => setStepSize(e.target.value)}
              step="0.01"
              min="0.001"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">区间 a</label>
            <input
              type="number"
              value={intervalA}
              onChange={(e) => setIntervalA(e.target.value)}
              step="0.1"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">区间 b</label>
            <input
              type="number"
              value={intervalB}
              onChange={(e) => setIntervalB(e.target.value)}
              step="0.1"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">课堂备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="输入课堂备注（可选）"
            rows={2}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
          />
        </div>

        <button
          onClick={() => handleAdd('manual')}
          disabled={!expression.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-900 rounded-md font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          添加并计算
        </button>
      </div>

      {rawMaterials.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-xs text-slate-400 uppercase tracking-wider">已添加的材料</h4>
          {rawMaterials.map((m) => (
            <div
              key={m.id}
              onClick={() => setActiveMaterial(m.id)}
              className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                m.id === activeMaterialId
                  ? 'border-amber-500/60 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-amber-300 truncate">
                      f(x) = {m.expression}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        m.source === 'import'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {m.source === 'import' ? '导入' : '手动'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    [{m.intervalA}, {m.intervalB}] h={m.stepSize}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRawMaterial(m.id);
                  }}
                  className="shrink-0 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {m.id === activeMaterialId && (
                <div className="mt-2 pt-2 border-t border-slate-700/60">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <FileText size={10} />
                    <span>课堂备注：</span>
                  </div>
                  <textarea
                    value={m.notes}
                    onChange={(e) => updateRawMaterial(m.id, { notes: e.target.value })}
                    placeholder="添加备注..."
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300 text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
