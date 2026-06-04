import { AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState } from 'react';

export function ValidationPanel() {
  const {
    annotations,
    validationResults,
    selectedAnnotationId,
    setSelectedAnnotationId,
    updateAnnotationManualNote,
    deleteAnnotation,
    getCurrentSample
  } = useStore();

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const sample = getCurrentSample();

  const validCount = annotations.filter(a => a.isValid).length;
  const invalidCount = annotations.filter(a => !a.isValid).length;
  const duplicateCount = annotations.filter(a => a.isDuplicate).length;

  const startEditNote = (annotationId: string, currentNote?: string) => {
    setEditingNoteId(annotationId);
    setNoteText(currentNote || '');
  };

  const saveNote = (annotationId: string) => {
    updateAnnotationManualNote(annotationId, noteText);
    setEditingNoteId(null);
    setNoteText('');
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-mono text-sm font-bold text-slate-800 tracking-wide">校验面板</h2>
      </div>

      <div className="p-4 border-b border-slate-200">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-green-50 border border-green-200 rounded">
            <div className="text-lg font-bold text-green-700 font-mono">{validCount}</div>
            <div className="text-[10px] text-green-600 font-mono">有效</div>
          </div>
          <div className="p-2 bg-red-50 border border-red-200 rounded">
            <div className="text-lg font-bold text-red-700 font-mono">{invalidCount}</div>
            <div className="text-[10px] text-red-600 font-mono">无效</div>
          </div>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded">
            <div className="text-lg font-bold text-amber-700 font-mono">{duplicateCount}</div>
            <div className="text-[10px] text-amber-600 font-mono">重复</div>
          </div>
        </div>
      </div>

      {sample && sample.manualNotes.length > 0 && (
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-xs font-mono font-bold text-amber-700 mb-2 flex items-center gap-1">
            <FileText size={12} />
            人工备注（原话保留）
          </h3>
          <div className="space-y-2">
            {sample.manualNotes.map((note, i) => (
              <div
                key={i}
                className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-mono whitespace-pre-wrap"
              >
                <span className="text-amber-600 mr-1">{i + 1}.</span>
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-mono font-bold text-slate-600 mb-3">标注列表</h3>
          <div className="space-y-2">
            {annotations.map((annotation, index) => {
              const results = validationResults.get(annotation.id) || [];
              const hasBlockers = results.some(r => r.blocked);
              const isSelected = selectedAnnotationId === annotation.id;

              return (
                <div
                  key={annotation.id}
                  className={`p-3 rounded border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : hasBlockers
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedAnnotationId(annotation.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-slate-400"
                        style={{ backgroundColor: annotation.color }}
                      />
                      <span className="text-xs font-mono text-slate-700">
                        标注 #{index + 1} · L{annotation.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {annotation.isValid ? (
                        <CheckCircle size={14} className="text-green-600" />
                      ) : (
                        <XCircle size={14} className="text-red-600" />
                      )}
                      {annotation.isDuplicate && (
                        <AlertTriangle size={14} className="text-amber-600" />
                      )}
                    </div>
                  </div>

                  {hasBlockers && annotation.blockReason && (
                    <div className="mb-2 p-2 bg-red-100 border border-red-200 rounded text-[10px] text-red-700 font-mono">
                      🚫 {annotation.blockReason}
                    </div>
                  )}

                  {results.filter(r => r.severity === 'warning').map((result, i) => (
                    <div key={i} className="mb-2 p-2 bg-amber-100 border border-amber-200 rounded text-[10px] text-amber-700 font-mono">
                      ⚠️ {result.message}
                    </div>
                  ))}

                  {editingNoteId === annotation.id ? (
                    <div className="space-y-1">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded font-mono"
                        rows={2}
                        placeholder="输入人工备注..."
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveNote(annotation.id);
                          }}
                          className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded font-mono"
                        >
                          保存
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNoteId(null);
                          }}
                          className="px-2 py-1 text-[10px] bg-slate-200 text-slate-700 rounded font-mono"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {annotation.manualNote ? (
                        <div className="flex-1 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 font-mono mr-2">
                          📝 {annotation.manualNote}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">无备注</span>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditNote(annotation.id, annotation.manualNote);
                          }}
                          className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-mono"
                        >
                          {annotation.manualNote ? '编辑' : '添加'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(annotation.id);
                          }}
                          className="px-2 py-1 text-[10px] bg-red-100 hover:bg-red-200 text-red-600 rounded font-mono"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-slate-400 font-mono">
                    顶点: {annotation.points.length}个 · ID: {annotation.id.slice(0, 8)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <h3 className="text-xs font-mono font-bold text-slate-600 mb-2">拦截判定规则</h3>
        <div className="text-[10px] text-slate-500 font-mono space-y-1">
          <p>• 重叠率 ≥ 30% → 判定为重复标注</p>
          <p>• 颜色/等级不在规则内 → 无效</p>
          <p>• 标注越界 → 警告（不拦截）</p>
          <p>• 所有拦截原因随报告导出</p>
        </div>
      </div>
    </div>
  );
}
