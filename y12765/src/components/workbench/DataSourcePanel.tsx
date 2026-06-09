import { useState } from 'react';
import { Table, Upload, Hash, ImageIcon, FileText } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import type { SourceRow } from '@/types';

export default function DataSourcePanel() {
  const { sourceRows, updateSourceRow, addSourceRows, temperatureProfiles, selectedProfileId, selectProfile, batchNumber, sourceNote, setBatchNumber, setSourceNote } = useVerificationStore();
  const [text, setText] = useState('');

  const handleParsePaste = () => {
    if (!text.trim()) return;
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: SourceRow[] = lines.map((line, idx) => ({
      rowNumber: idx + 2,
      rawContent: line.trim(),
      imageName: '',
      remark: '',
    }));
    addSourceRows(parsed);
    setText('');
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="card p-4 space-y-3">
        <div className="section-title !mb-2">
          <FileText size={18} className="text-brand-700" />
          批次信息
        </div>
        <div>
          <label className="label">批次号</label>
          <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="如 B20260608-03" />
        </div>
        <div>
          <label className="label">温度曲线版本</label>
          <select
            className="input"
            value={selectedProfileId || ''}
            onChange={(e) => selectProfile(e.target.value)}
          >
            {temperatureProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.version} · {p.name}
              </option>
            ))}
          </select>
          {selectedProfileId && (
            <p className="text-xs text-slate-500 mt-1">
              {temperatureProfiles.find((p) => p.id === selectedProfileId)?.description}
            </p>
          )}
        </div>
        <div>
          <label className="label">来源备注</label>
          <textarea
            className="input min-h-[56px]"
            value={sourceNote}
            onChange={(e) => setSourceNote(e.target.value)}
            placeholder="样品来源、检测机构、送检日期等备注"
          />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="section-title !mb-2">
          <Upload size={18} className="text-brand-700" />
          原始数据录入
        </div>
        <textarea
          className="input min-h-[80px] font-mono text-xs"
          placeholder="粘贴 CSV/表格行（每行一条，列顺序：名称,实测值,单位,执行标准,限量值）&#10;例如：&#10;山梨酸钾,0.45,mg/kg,GB 2760 山梨酸钾,0.5"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-secondary w-full" onClick={handleParsePaste}>
          <Table size={14} />
          解析为数据源（保留行号）
        </button>
      </div>

      <div className="card p-4 flex-1 overflow-hidden flex flex-col">
        <div className="section-title !mb-2">
          <Hash size={18} className="text-brand-700" />
          数据源表格
          <span className="ml-auto text-xs text-slate-500 font-sans font-normal">{sourceRows.length} 行</span>
        </div>
        {sourceRows.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8 border border-dashed rounded-md">
            暂无原始数据
          </div>
        ) : (
          <div className="overflow-auto -mx-2 px-2 flex-1">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left w-10">行号</th>
                  <th className="px-2 py-1.5 text-left">原始内容</th>
                  <th className="px-2 py-1.5 text-left w-28">
                    <span className="inline-flex items-center gap-1"><ImageIcon size={12} />图谱</span>
                  </th>
                  <th className="px-2 py-1.5 text-left w-28">备注</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-mono text-brand-700 font-semibold">L{row.rowNumber}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">{row.rawContent}</td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                        value={row.imageName}
                        placeholder="如 20260608-HPLC-001.png"
                        onChange={(e) => updateSourceRow(row.rowNumber, { imageName: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full px-1.5 py-1 text-xs rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                        value={row.remark}
                        placeholder="来源备注"
                        onChange={(e) => updateSourceRow(row.rowNumber, { remark: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
