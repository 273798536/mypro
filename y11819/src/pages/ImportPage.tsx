import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { DataType, ValidationIssue } from '../../shared/types';

const TABS: { key: DataType; label: string; desc: string }[] = [
  { key: 'berth', label: '靠泊记录', desc: '船舶靠泊时间、NOR、免费期' },
  { key: 'handling', label: '装卸记录', desc: '装卸起止、暂停时间与原因' },
  { key: 'contract', label: '合同费率', desc: '费率阶梯、免费期、有效期' },
  { key: 'weather', label: '天气豁免', desc: '恶劣天气起止、类型、证据' },
];

const FIELD_LABELS: Record<string, string> = {
  vessel_name: '船名',
  port: '港口',
  berth_start: '靠泊开始',
  berth_end: '靠泊结束',
  notice_time: 'NOR 通知时间',
  free_period_end: '免费期结束',
  voyage_number: '航次',
  berth_id: '靠泊ID',
  handling_start: '装卸开始',
  handling_end: '装卸结束',
  operation_type: '操作类型',
  quantity: '数量',
  pause_hours: '暂停小时',
  pause_reason: '暂停原因',
  free_hours: '免费期小时',
  currency: '币种',
  rate_tier1: '第一档费率',
  rate_tier1_max_days: '第一档最大天数',
  rate_tier2: '第二档费率',
  rate_tier2_max_days: '第二档最大天数',
  rate_tier3: '第三档费率',
  valid_from: '生效日期',
  valid_to: '失效日期',
  weather_start: '天气开始',
  weather_end: '天气结束',
  weather_type: '天气类型',
  evidence: '证据',
};

export default function ImportPage() {
  const { activeTab, setActiveTab, importWarnings, setImportWarnings, importLoading, setImportLoading } = useAppStore();
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [uploadResult, setUploadResult] = useState<{ count: number; missing: string[] } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', activeTab);

    try {
      const res = await fetch('/api/import/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setUploadResult({ count: data.recordCount, missing: data.missingFields || [] });
        setImportWarnings(data.warnings || []);
        const recRes = await fetch(`/api/import/records?type=${activeTab}`);
        const recData = await recRes.json();
        if (recData.success) setRecords(recData.records || []);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setImportLoading(false);
    }
  }, [activeTab, setImportWarnings, setImportLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleCellEdit = async (rowIdx: number, field: string) => {
    const record = records[rowIdx] as Record<string, unknown>;
    const rowId = record.id as string;
    if (!rowId) return;

    try {
      await fetch('/api/import/record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, rowId, updates: { [field]: editValue } }),
      });

      setRecords((prev) =>
        prev.map((r, i) => (i === rowIdx ? { ...r, [field]: editValue } : r))
      );
      setEditingCell(null);

      const valRes = await fetch(`/api/import/validate?type=${activeTab}`);
      const valData = await valRes.json();
      setImportWarnings(valData.issues || []);
    } catch (err) {
      console.error('Edit failed:', err);
    }
  };

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const getFieldStatus = (row: number, field: string): 'error' | 'warning' | 'ok' | null => {
    return importWarnings.find((w) => w.row === row && w.field === field)?.severity || null;
  };

  const warningForCell = (row: number, field: string): ValidationIssue | undefined => {
    return importWarnings.find((w) => w.row === row && w.field === field);
  };

  const errorCount = importWarnings.filter((w) => w.severity === 'error').length;
  const warningCount = importWarnings.filter((w) => w.severity === 'warning').length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-navy-900">数据导入与校验</h2>
        <p className="text-steel-500 mt-1">上传靠泊记录、装卸记录、合同费率和天气豁免数据，系统自动校验并给出修正提示</p>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setRecords([]); setUploadResult(null); setImportWarnings([]); }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-steel-600 border border-steel-200 hover:bg-steel-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-start gap-6">
          <div
            className="flex-1 border-2 border-dashed border-steel-300 rounded-xl p-8 text-center hover:border-port-400 hover:bg-port-50/30 transition-all cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-steel-400 mx-auto mb-3" />
            <p className="text-navy-800 font-medium">拖拽文件到此处或点击上传</p>
            <p className="text-steel-400 text-sm mt-1">支持 CSV、Excel（.xlsx/.xls）格式</p>
            <p className="text-steel-400 text-xs mt-2">{TABS.find((t) => t.key === activeTab)?.desc}</p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>

          {importLoading && (
            <div className="flex items-center gap-2 text-port-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">正在解析...</span>
            </div>
          )}
        </div>
      </div>

      {uploadResult && (
        <div className="card p-4 mb-6 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-port-500" />
              <span className="text-sm text-navy-800">
                成功导入 <strong className="font-mono">{uploadResult.count}</strong> 条记录
              </span>
            </div>
            <div className="flex items-center gap-3">
              {errorCount > 0 && (
                <span className="badge-error"><XCircle className="w-3 h-3 mr-1" />{errorCount} 个错误</span>
              )}
              {warningCount > 0 && (
                <span className="badge-warning"><AlertTriangle className="w-3 h-3 mr-1" />{warningCount} 个警告</span>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <span className="badge-success"><CheckCircle2 className="w-3 h-3 mr-1" />校验通过</span>
              )}
            </div>
          </div>

          {uploadResult.missing.length > 0 && (
            <div className="mt-3 pt-3 border-t border-steel-100">
              <p className="text-xs text-steel-500 mb-1">缺失字段：</p>
              <div className="flex flex-wrap gap-1.5">
                {uploadResult.missing.map((f) => (
                  <span key={f} className="field-missing text-xs">
                    {FIELD_LABELS[f] || f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="card mb-6 overflow-hidden animate-fade-in">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <h3 className="text-sm font-semibold text-amber-800">校验提示（点击表格行可查看详情）</h3>
          </div>
          <div className="divide-y divide-steel-100 max-h-60 overflow-y-auto">
            {importWarnings.map((w, i) => (
              <div key={i} className={`px-4 py-3 text-sm ${w.severity === 'error' ? 'bg-red-50/50' : 'bg-amber-50/30'}`}>
                <div className="flex items-start gap-2">
                  {w.severity === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-navy-800">
                      第 <span className="font-mono">{w.row}</span> 行 ·{' '}
                      <span className="font-medium">{FIELD_LABELS[w.field] || w.field}</span>
                      ：{w.message}
                    </p>
                    <p className="text-steel-500 text-xs mt-0.5">💡 {w.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-steel-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-800">数据预览</h3>
            <span className="text-xs text-steel-400">{records.length} 条记录</span>
          </div>
          <div className="table-container border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th className="w-8"></th>
                  {Object.keys(records[0]).filter(k => k !== 'id' && k !== 'created_at').map((key) => (
                    <th key={key}>{FIELD_LABELS[key] || key}</th>
                  ))}
                  <th className="w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row, rowIdx) => {
                  const rowNumber = rowIdx + 1;
                  const hasIssues = importWarnings.some((w) => w.row === rowNumber);
                  const isExpanded = expandedRows.has(rowIdx);

                  return (
                    <>
                      <tr key={rowIdx} className={hasIssues ? 'bg-amber-50/30' : ''}>
                        <td>
                          <button onClick={() => toggleRow(rowIdx)} className="text-steel-400 hover:text-navy-800">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        {Object.entries(row).filter(([k]) => k !== 'id' && k !== 'created_at').map(([key, val]) => {
                          const status = getFieldStatus(rowNumber, key);
                          const warning = warningForCell(rowNumber, key);
                          const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.field === key;

                          return (
                            <td key={key} className="relative">
                              {isEditing ? (
                                <input
                                  className="input-field text-xs font-mono"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellEdit(rowIdx, key)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCellEdit(rowIdx, key)}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className={`font-mono text-xs ${
                                    status === 'error' ? 'field-missing' : status === 'warning' ? 'text-amber-600' : 'text-navy-800'
                                  }`}
                                  title={warning?.suggestion}
                                >
                                  {val == null || val === '' ? '—' : String(val)}
                                </span>
                              )}
                              {!isEditing && status && (
                                <button
                                  className="absolute -right-1 -top-1 w-4 h-4 bg-port-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                  onClick={() => { setEditingCell({ rowIdx, field: key }); setEditValue(String(val ?? '')); }}
                                  title="修正此字段"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td>
                          <button
                            className="text-port-500 hover:text-port-600 text-xs font-medium"
                            onClick={() => {
                              const firstMissing = importWarnings.find(w => w.row === rowNumber);
                              if (firstMissing) {
                                setEditingCell({ rowIdx, field: firstMissing.field });
                                setEditValue(String((row as Record<string, unknown>)[firstMissing.field] ?? ''));
                              }
                            }}
                          >
                            修正
                          </button>
                        </td>
                      </tr>
                      {isExpanded && importWarnings.filter(w => w.row === rowNumber).map((w, wi) => (
                        <tr key={`${rowIdx}-detail-${wi}`} className="bg-amber-50/20">
                          <td></td>
                          <td colSpan={Object.keys(records[0]).filter(k => k !== 'id' && k !== 'created_at').length + 1}>
                            <div className="text-xs py-1">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${w.severity === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
                              <span className="font-medium">{FIELD_LABELS[w.field] || w.field}</span>
                              {' · '}
                              {w.message}
                              <span className="text-steel-500 ml-2">💡 {w.suggestion}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!records.length && !uploadResult && (
        <div className="text-center py-16 text-steel-400">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">上传文件后，数据预览将在此展示</p>
        </div>
      )}
    </div>
  );
}
