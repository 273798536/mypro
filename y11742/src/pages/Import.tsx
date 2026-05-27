import { useState, useRef, useMemo, useCallback, DragEvent, ChangeEvent } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import { formatDate } from '../utils/calculationEngine';
import type { DataSource, DuplicateStrategy, ImportFileInfo } from '../types';
import { generateId, mockContracts } from '../data/mockData';

const SOURCE_OPTIONS: { value: DataSource; label: string; color: string; icon: string }[] = [
  { value: 'contract', label: '疗程合同', color: 'bg-blue-100 text-blue-700', icon: '📋' },
  { value: 'installment', label: '分期账单', color: 'bg-purple-100 text-purple-700', icon: '💳' },
  { value: 'treatment', label: '已做项目', color: 'bg-green-100 text-green-700', icon: '✂️' },
  { value: 'gift', label: '赠品', color: 'bg-pink-100 text-pink-700', icon: '🎁' },
  { value: 'refund', label: '退款申请', color: 'bg-orange-100 text-orange-700', icon: '💰' },
  { value: 'settlement', label: '结算单', color: 'bg-gray-100 text-gray-700', icon: '📊' },
];

const STRATEGY_OPTIONS: { value: DuplicateStrategy; label: string; desc: string; color: string }[] = [
  {
    value: 'ignore',
    label: '忽略',
    desc: '跳过重复记录，仅导入新数据',
    color: 'border-blue-300 bg-blue-50 text-blue-700',
  },
  {
    value: 'overwrite',
    label: '覆盖',
    desc: '用新数据替换已存在的重复记录',
    color: 'border-orange-300 bg-orange-50 text-orange-700',
  },
  {
    value: 'append',
    label: '追加',
    desc: '保留旧记录，重复数据作为新记录追加',
    color: 'border-green-300 bg-green-50 text-green-700',
  },
];

const getSourceLabel = (source: DataSource) =>
  SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;

const getStatusStyle = (status: ImportFileInfo['status']) => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: '待处理' };
    case 'processing':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: '处理中' };
    case 'success':
      return { bg: 'bg-green-100', text: 'text-green-700', label: '成功' };
    case 'error':
      return { bg: 'bg-red-100', text: 'text-red-700', label: '失败' };
  }
};

type ParsedRow = Record<string, unknown>;

interface PreviewData {
  file: File;
  source: DataSource;
  rows: ParsedRow[];
  headers: string[];
  duplicateCount: number;
  totalCount: number;
}

export default function Import() {
  const importData = useStore((s) => s.importData);
  const contracts = useStore((s) => s.contracts);
  const installmentBills = useStore((s) => s.installmentBills);
  const treatmentRecords = useStore((s) => s.treatmentRecords);
  const gifts = useStore((s) => s.gifts);
  const refundRequests = useStore((s) => s.refundRequests);
  const settlements = useStore((s) => s.settlements);
  const importFiles = useStore((s) => s.importFiles);

  const [selectedSource, setSelectedSource] = useState<DataSource>('contract');
  const [strategy, setStrategy] = useState<DuplicateStrategy>('ignore');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [history, setHistory] = useState<ImportFileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allHistory = useMemo(
    () => [...importFiles, ...history].sort((a, b) => b.uploadTime - a.uploadTime),
    [importFiles, history]
  );

  const currentSourceRecords = useMemo(() => {
    switch (selectedSource) {
      case 'contract':
        return contracts;
      case 'installment':
        return installmentBills;
      case 'treatment':
        return treatmentRecords;
      case 'gift':
        return gifts;
      case 'refund':
        return refundRequests;
      case 'settlement':
        return settlements;
    }
  }, [selectedSource, contracts, installmentBills, treatmentRecords, gifts, refundRequests, settlements]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const parseFile = useCallback(
    async (file: File): Promise<{ rows: ParsedRow[]; headers: string[] }> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            if (!data) {
              reject(new Error('文件读取失败'));
              return;
            }
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
            const headers =
              json.length > 0
                ? Object.keys(json[0])
                : XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];
            resolve({ rows: json, headers });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsBinaryString(file);
      });
    },
    []
  );

  const handleFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    const file = fileList[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setError('仅支持 .xlsx、.xls、.csv 格式的文件');
      return;
    }
    setError(null);
    try {
      const { rows, headers } = await parseFile(file);
      const existingIds = new Set(currentSourceRecords.map((r) => (r as { id?: string }).id ?? ''));
      const duplicateCount = rows.filter((row) => {
        const id = row['id'] ?? row['ID'] ?? row['合同编号'] ?? row['合同号'];
        return id ? existingIds.has(String(id)) : false;
      }).length;
      setPreview({
        file,
        source: selectedSource,
        rows,
        headers,
        duplicateCount,
        totalCount: rows.length,
      });
    } catch (err) {
      setError((err as Error).message ?? '解析文件失败');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!preview) return;
    const data = preview.rows.map((row) => ({
      ...row,
      id: String(row['id'] ?? row['ID'] ?? row['合同编号'] ?? row['合同号'] ?? generateId()),
      importTime: Date.now(),
      source: `${preview.file.name} 导入`,
    }));

    const info: ImportFileInfo = {
      id: generateId(),
      name: preview.file.name,
      source: preview.source,
      size: preview.file.size,
      uploadTime: Date.now(),
      status: 'success',
      recordCount: preview.totalCount,
      errorCount: 0,
      duplicateCount: preview.duplicateCount,
      strategy,
    };

    try {
      importData(preview.source, data as Array<{ id: string }>, strategy);
      setHistory((h) => [info, ...h]);
      showToast(`成功导入 ${preview.totalCount} 条记录`);
      setPreview(null);
    } catch (err) {
      info.status = 'error';
      info.errorMessage = (err as Error).message;
      setHistory((h) => [info, ...h]);
      setError((err as Error).message);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setError(null);
  };

  const handleRemoveHistory = (id: string) => {
    setHistory((h) => h.filter((item) => item.id !== id));
  };

  const handleLoadMockData = () => {
    const now = Date.now();
    const data = mockContracts.map((c) => ({
      ...c,
      id: c.id,
      importTime: now,
      source: '示例数据',
    }));
    const info: ImportFileInfo = {
      id: generateId(),
      name: '示例数据.xlsx',
      source: 'contract',
      size: 10240,
      uploadTime: now,
      status: 'success',
      recordCount: data.length,
      errorCount: 0,
      duplicateCount: 0,
      strategy: 'append',
    };
    importData('contract', data as Array<{ id: string }>, 'append');
    setHistory((h) => [info, ...h]);
    showToast(`已加载 ${data.length} 条示例合同数据`);
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导入</h1>
          <p className="text-sm text-gray-500 mt-1">支持 Excel、CSV 格式文件的批量导入与管理</p>
        </div>
        <button
          onClick={handleLoadMockData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-[#165DFF] hover:text-[#165DFF] transition-colors"
        >
          <FileText className="w-4 h-4" />
          加载示例数据
        </button>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-green-50 border border-green-200 rounded-lg shadow-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择数据源</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSelectedSource(opt.value);
                    setPreview(null);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedSource === opt.value
                      ? 'border-[#165DFF] bg-[#165DFF]/5 ring-1 ring-[#165DFF]'
                      : 'border-gray-200 hover:border-[#165DFF]/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    共 {currentSourceRecords.length} 条记录
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                文件上传
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  当前: {getSourceLabel(selectedSource)}
                </span>
              </h2>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#165DFF] bg-[#165DFF]/5'
                  : 'border-gray-200 hover:border-[#165DFF] hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#165DFF]/10 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7 text-[#165DFF]" />
                </div>
                <p className="text-base font-medium text-gray-900">
                  点击选择文件 或 拖拽文件到此处
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  支持 .xlsx、.xls、.csv 格式,单个文件最大 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>

            {preview && (
              <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#165DFF]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{preview.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(preview.file.size)} · {preview.totalCount} 条记录
                        {preview.duplicateCount > 0 && (
                          <span className="ml-2 text-orange-600">
                            · {preview.duplicateCount} 条重复
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelPreview();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">数据预览</p>
                  <div className="overflow-x-auto max-h-64 border border-gray-100 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {preview.headers.map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                            {preview.headers.map((h) => (
                              <td
                                key={h}
                                className="px-3 py-2 text-gray-700 whitespace-nowrap"
                              >
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.rows.length > 20 && (
                    <p className="text-xs text-gray-500 mt-2">
                      仅显示前 20 行,共 {preview.rows.length} 行
                    </p>
                  )}
                </div>

                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">重复数据处理策略</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {STRATEGY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStrategy(opt.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          strategy === opt.value
                            ? opt.color + ' ring-2 ring-offset-1 ring-current'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs mt-1 opacity-80">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 flex items-center justify-end gap-3">
                  <button
                    onClick={handleCancelPreview}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-4 py-2 text-sm text-white bg-[#165DFF] rounded-lg hover:bg-[#0E42CC] flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    确认导入
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">导入历史</h2>
              <span className="text-xs text-gray-500">共 {allHistory.length} 条</span>
            </div>
            {allHistory.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无导入记录</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allHistory.map((item) => {
                  const statusStyle = getStatusStyle(item.status);
                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {getSourceLabel(item.source)}
                            </span>
                            <span>{item.recordCount} 条记录</span>
                            {item.duplicateCount > 0 && (
                              <span className="text-orange-600">
                                {item.duplicateCount} 条重复
                              </span>
                            )}
                            <span>· {formatDate(item.uploadTime)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-xs px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.label}
                        </span>
                        <button
                          onClick={() => handleRemoveHistory(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">已导入记录</h2>
              <span className="text-xs text-gray-500">
                数据源: {getSourceLabel(selectedSource)}
              </span>
            </div>
            {currentSourceRecords.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无数据</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentSourceRecords.map((rec) => {
                  const r = rec as { id: string; importTime: number; source?: string };
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg border border-gray-100 hover:border-[#165DFF]/30 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {r.id}
                          </p>
                          {r.source && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              来源: {r.source}
                            </p>
                          )}
                        </div>
                        <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(r.importTime)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">导入说明</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>支持 Excel (.xlsx, .xls) 和 CSV 格式</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>文件第一行为列名,建议包含 id 或 合同编号 字段</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>重复数据检测基于 id / 合同编号 字段</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>选择合适的重复策略后确认导入即可</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>导入数据后将立即影响退款计算,请谨慎操作</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
