import { useRef } from 'react';
import { useFilmStore } from '@/store/useFilmStore';
import { parseRawInput } from '@/utils/parser';
import { Upload, FileText } from 'lucide-react';

export default function LayerInput() {
  const { layers, setLayers, setRawInput, addLayer, removeLayer, updateLayer } = useFilmStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePasteOrType = (text: string) => {
    setRawInput(text);
    const parsed = parseRawInput(text);
    setLayers(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      handlePasteOrType(text);
      if (textareaRef.current) textareaRef.current.value = text;
    };
    reader.readAsText(file);
  };

  const handleCellEdit = (index: number, field: string, value: string) => {
    const layer = layers[index];
    if (!layer) return;
    const updates: Record<string, unknown> = {};
    if (field === 'material') updates.material = value;
    if (field === 'n') updates.n = value === '' ? null : parseFloat(value);
    if (field === 'k') updates.k = value === '' ? null : parseFloat(value);
    if (field === 'd') {
      const dVal = value === '' ? null : parseFloat(value);
      updates.d = dVal;
      updates.status = {
        ...layer.status,
        zeroThickness: dVal === 0,
        missingColumns: false,
      };
    }
    if (field === 'note') updates.note = value;
    updateLayer(index, updates);
  };

  const getRowClass = (layer: (typeof layers)[0]) => {
    const s = layer.status;
    if (s.isEmpty) return 'bg-[#1a1f2e]/50';
    if (s.isComment) return 'bg-slate-800/40 italic text-slate-500';
    if (s.zeroThickness) return 'bg-amber-900/20 border-l-2 border-amber-500';
    if (s.missingRefractiveIndex) return 'bg-red-900/20 border-l-2 border-red-500';
    if (s.missingColumns) return 'bg-orange-900/20 border-l-2 border-orange-500';
    return '';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg border border-cyan-600/30 hover:bg-cyan-600/30 transition-colors text-sm">
            <Upload size={14} />
            导入文件
          </button>
        </div>
        <span className="text-xs text-slate-500">支持 CSV / TSV / TXT，或直接粘贴到下方</span>
      </div>

      <textarea
        ref={textareaRef}
        placeholder={`粘贴膜层参数，每行一层，格式：&#10;材料名  折射率n  消光系数k  层厚d(nm)  备注&#10;&#10;示例：&#10;TiO2  2.35  0  50  高折射率层&#10;SiO2  1.46  0  80  低折射率层&#10;# 这是备注行&#10;&#10;空行会自动识别并标记`}
        onChange={(e) => handlePasteOrType(e.target.value)}
        className="w-full h-32 bg-[#0d1117] border border-slate-700 rounded-lg p-3 text-sm text-slate-300 font-mono resize-y placeholder:text-slate-600 focus:outline-none focus:border-cyan-600/50"
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 tracking-wide">膜层结构表</h3>
        <button
          onClick={addLayer}
          className="px-3 py-1 text-xs bg-cyan-600/20 text-cyan-400 rounded border border-cyan-600/30 hover:bg-cyan-600/30 transition-colors"
        >
          + 添加层
        </button>
      </div>

      <div className="overflow-auto max-h-[360px] rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0d1117] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-2 py-2 text-left w-10">#</th>
              <th className="px-2 py-2 text-left">材料</th>
              <th className="px-2 py-2 text-left">n</th>
              <th className="px-2 py-2 text-left">k</th>
              <th className="px-2 py-2 text-left">d(nm)</th>
              <th className="px-2 py-2 text-left">备注</th>
              <th className="px-2 py-2 text-left w-20">状态</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer, i) => {
              const s = layer.status;
              const isEditable = !s.isEmpty && !s.isComment;
              return (
                <tr key={i} className={`border-t border-slate-800 ${getRowClass(layer)}`}>
                  <td className="px-2 py-1.5 text-slate-500 font-mono text-xs">{layer.rowIndex}</td>
                  {isEditable ? (
                    <>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={layer.material}
                          onChange={(e) => handleCellEdit(i, 'material', e.target.value)}
                          className="w-full bg-transparent text-slate-200 text-sm px-1 py-0.5 rounded focus:outline-none focus:bg-slate-800"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={layer.n ?? ''}
                          onChange={(e) => handleCellEdit(i, 'n', e.target.value)}
                          className="w-16 bg-transparent text-cyan-400 text-sm px-1 py-0.5 rounded font-mono focus:outline-none focus:bg-slate-800"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.001"
                          value={layer.k ?? ''}
                          onChange={(e) => handleCellEdit(i, 'k', e.target.value)}
                          className="w-16 bg-transparent text-slate-300 text-sm px-1 py-0.5 rounded font-mono focus:outline-none focus:bg-slate-800"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={layer.d ?? ''}
                          onChange={(e) => handleCellEdit(i, 'd', e.target.value)}
                          className="w-16 bg-transparent text-amber-400 text-sm px-1 py-0.5 rounded font-mono focus:outline-none focus:bg-slate-800"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={layer.note}
                          onChange={(e) => handleCellEdit(i, 'note', e.target.value)}
                          className="w-full bg-transparent text-slate-400 text-xs px-1 py-0.5 rounded focus:outline-none focus:bg-slate-800"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={5} className="px-2 py-1.5 text-xs text-slate-500 truncate max-w-0">
                        {s.isEmpty ? '(空行)' : layer.note}
                      </td>
                    </>
                  )}
                  <td className="px-1 py-1.5">
                    <div className="flex flex-wrap gap-0.5">
                      {s.zeroThickness && (
                        <span className="text-[10px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          d=0
                        </span>
                      )}
                      {s.missingRefractiveIndex && (
                        <span className="text-[10px] px-1 py-0.5 bg-red-500/20 text-red-400 rounded">
                          n?
                        </span>
                      )}
                      {s.missingColumns && (
                        <span className="text-[10px] px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                          缺列
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1.5">
                    <button
                      onClick={() => removeLayer(i)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                      title="删除行"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
            {layers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-600 text-sm">
                  <FileText size={24} className="mx-auto mb-2 opacity-50" />
                  粘贴或输入膜层参数开始
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
