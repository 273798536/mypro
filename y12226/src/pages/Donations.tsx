import { useState, useRef, ChangeEvent } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useStore } from '@/store/useStore';
import {
  Upload,
  RefreshCw,
  Search,
  X,
  Eye,
  FileText,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { DonationRecord, ProjectBudget, ExpenseReceipt, ConflictLog, PurposeLock } from '@/types';

const formatAmount = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'donation':
      return '捐赠记录';
    case 'budget':
      return '项目预算';
    case 'manual':
      return '人工确认';
    default:
      return source;
  }
};

const getConflictTypeLabel = (type: string): string => {
  switch (type) {
    case 'purpose_mismatch':
      return '用途不一致';
    case 'receipt_duplicate':
      return '票据重复';
    case 'refund_delayed':
      return '退款延迟';
    default:
      return type;
  }
};

const fieldMappingOptions = [
  { value: 'donorName', label: '捐赠人' },
  { value: 'amount', label: '金额' },
  { value: 'designatedPurpose', label: '指定用途' },
  { value: 'donationDate', label: '捐赠日期' },
  { value: 'projectId', label: '项目ID' },
];

const autoMapFields = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const keywordMap: Record<string, string> = {
    '捐赠人': 'donorName',
    'donor': 'donorName',
    '姓名': 'donorName',
    '金额': 'amount',
    'amount': 'amount',
    '捐赠金额': 'amount',
    '指定用途': 'designatedPurpose',
    '用途': 'designatedPurpose',
    'purpose': 'designatedPurpose',
    '捐赠日期': 'donationDate',
    '日期': 'donationDate',
    'date': 'donationDate',
    '项目ID': 'projectId',
    '项目': 'projectId',
    'project': 'projectId',
    'projectId': 'projectId',
  };

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();
    for (const [keyword, field] of Object.entries(keywordMap)) {
      if (lowerHeader.includes(keyword.toLowerCase()) && !Object.values(mapping).includes(field)) {
        mapping[header] = field;
        break;
      }
    }
  });

  return mapping;
};

const generateId = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `DR-${dateStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
};

export default function Donations() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    donations,
    budgets,
    receipts,
    locks,
    conflicts,
    addDonations,
    detectConflicts,
    lockPurpose,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const [lockedPurpose, setLockedPurpose] = useState('');
  const [lockSource, setLockSource] = useState<'donation' | 'budget' | 'manual'>('donation');
  const [lockedBy, setLockedBy] = useState('财务人员');

  const filteredDonations = donations.filter((d) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return d.donorName.toLowerCase().includes(query) || d.id.toLowerCase().includes(query);
  });

  const handleFileSelect = (file: File) => {
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = results.data as Record<string, unknown>[];
          const cols = results.meta.fields || [];
          setHeaders(cols);
          setPreviewData(data.slice(0, 5));
          setFieldMapping(autoMapFields(cols));
        },
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        const cols = Object.keys(jsonData[0] || {});
        setHeaders(cols);
        setPreviewData(jsonData.slice(0, 5));
        setFieldMapping(autoMapFields(cols));
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = () => {
    const mappedDonations: DonationRecord[] = previewData.map((row) => {
      const mapped: Partial<DonationRecord> = {};
      Object.entries(fieldMapping).forEach(([header, field]) => {
        if (field) {
          (mapped as Record<string, unknown>)[field] = row[header];
        }
      });

      const now = new Date().toISOString();
      return {
        id: generateId(),
        donorName: String(mapped.donorName || ''),
        amount: Number(mapped.amount) || 0,
        designatedPurpose: String(mapped.designatedPurpose || ''),
        donationDate: String(mapped.donationDate || formatDate(now)),
        projectId: String(mapped.projectId || ''),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      } as DonationRecord;
    });

    addDonations(mappedDonations);
    setImportModalOpen(false);
    setPreviewData([]);
    setHeaders([]);
    setFieldMapping({});
  };

  const handleLockPurpose = () => {
    if (!selectedDonation || !lockedPurpose.trim()) return;
    lockPurpose(selectedDonation.id, lockedPurpose, lockSource, lockedBy);
    setSelectedDonation(null);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const openDetailPanel = (donation: DonationRecord) => {
    setSelectedDonation(donation);
    setLockedPurpose(donation.designatedPurpose);
    setLockSource('donation');
    setLockedBy('财务人员');
  };

  const donationBudget = selectedDonation
    ? budgets.find((b) => b.projectId === selectedDonation.projectId)
    : null;

  const donationReceipts = selectedDonation
    ? receipts.filter((r) => r.donationId === selectedDonation.id)
    : [];

  const donationConflicts = selectedDonation
    ? conflicts
        .filter((c) => c.donationId === selectedDonation.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const donationLock = selectedDonation
    ? locks.find((l) => l.donationId === selectedDonation.id)
    : null;

  const columns = [
    {
      key: 'select',
      header: '选择',
      width: '50',
      render: (row: DonationRecord) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
        />
      ),
    },
    {
      key: 'id',
      header: '记录ID',
      width: '160',
    },
    {
      key: 'donorName',
      header: '捐赠人',
    },
    {
      key: 'amount',
      header: '金额',
      render: (row: DonationRecord) => formatAmount(row.amount),
    },
    {
      key: 'designatedPurpose',
      header: '指定用途',
    },
    {
      key: 'donationDate',
      header: '捐赠日期',
    },
    {
      key: 'projectId',
      header: '关联项目',
      render: (row: DonationRecord) => {
        const budget = budgets.find((b) => b.projectId === row.projectId);
        return budget?.projectName || row.projectId;
      },
    },
    {
      key: 'receiptCount',
      header: '票据数',
      render: (row: DonationRecord) => receipts.filter((r) => r.donationId === row.id).length,
    },
    {
      key: 'conflictCount',
      header: '冲突数',
      render: (row: DonationRecord) => {
        const count = conflicts.filter((c) => c.donationId === row.id && !c.resolvedAt).length;
        return count > 0 ? (
          <span className="text-red-600 font-medium">{count}</span>
        ) : (
          <span className="text-slate-400">0</span>
        );
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (row: DonationRecord) => <StatusBadge status={row.status} type="donation" />,
    },
    {
      key: 'action',
      header: '操作',
      render: (row: DonationRecord) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDetailPanel(row);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
        >
          <Eye className="w-3 h-3" />
          查看明细
        </button>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-noto-serif-sc">
            捐赠记录管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">导入样例、查看记录、关联证据</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入样例数据
            </button>
            <button
              onClick={() => detectConflicts()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              检测冲突
            </button>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索捐赠人或记录ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-6">
            <DataTable<DonationRecord>
              columns={columns}
              data={filteredDonations}
              onRowClick={openDetailPanel}
              selectedId={selectedDonation?.id}
            />
          </div>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">导入捐赠记录</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-1">拖拽文件到此处，或点击选择文件</p>
                <p className="text-xs text-slate-400">支持 .csv 和 .xlsx 格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

              {previewData.length > 0 && (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">数据预览（前5行）</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {headers.map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left text-xs font-medium text-slate-600"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {previewData.map((row, idx) => (
                            <tr key={idx}>
                              {headers.map((header) => (
                                <td key={header} className="px-3 py-2 text-slate-700">
                                  {String(row[header] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">字段映射</h4>
                    <div className="space-y-2">
                      {headers.map((header) => (
                        <div key={header} className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-40 truncate">{header}</span>
                          <ChevronUp className="w-4 h-4 text-slate-400 rotate-90" />
                          <select
                            value={fieldMapping[header] || ''}
                            onChange={(e) =>
                              setFieldMapping({ ...fieldMapping, [header]: e.target.value })
                            }
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">-- 请选择 --</option>
                            {fieldMappingOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={previewData.length === 0}
                  className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  确认导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDonation && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelectedDonation(null)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-800">捐赠记录详情</h3>
              <button
                onClick={() => setSelectedDonation(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  基本信息
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">记录ID</span>
                    <span className="text-sm text-slate-700 font-mono">{selectedDonation.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">捐赠人</span>
                    <span className="text-sm text-slate-700">{selectedDonation.donorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">金额</span>
                    <span className="text-sm text-slate-700 font-semibold">
                      {formatAmount(selectedDonation.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">指定用途</span>
                    <span className="text-sm text-slate-700">{selectedDonation.designatedPurpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">捐赠日期</span>
                    <span className="text-sm text-slate-700">{selectedDonation.donationDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">项目ID</span>
                    <span className="text-sm text-slate-700 font-mono">{selectedDonation.projectId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">状态</span>
                    <StatusBadge status={selectedDonation.status} type="donation" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  关联项目预算
                </h4>
                {donationBudget ? (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">项目名称</span>
                      <span className="text-sm text-slate-700">{donationBudget.projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">预算金额</span>
                      <span className="text-sm text-slate-700">{formatAmount(donationBudget.budgetAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">预算用途</span>
                      <span className="text-sm text-slate-700">{donationBudget.purpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">已匹配金额</span>
                      <span className="text-sm text-slate-700">{formatAmount(donationBudget.matchedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">预算状态</span>
                      <StatusBadge status={donationBudget.status} type="budget" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                    未关联预算
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  关联支出票据
                </h4>
                {donationReceipts.length > 0 ? (
                  <div className="space-y-2">
                    {donationReceipts.map((receipt: ExpenseReceipt) => (
                      <div key={receipt.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{receipt.id}</span>
                          <StatusBadge status={receipt.status} type="receipt" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <span>{formatAmount(receipt.amount)}</span>
                          <span>{receipt.receiptDate}</span>
                        </div>
                        {receipt.ocrText && (
                          <p className="text-xs text-slate-400 line-clamp-2">{receipt.ocrText}</p>
                        )}
                        <div className="mt-2 text-right">
                          <button className="text-xs text-teal-600 hover:text-teal-700">
                            查看票据
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                    暂无关联票据
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  冲突记录
                </h4>
                {donationConflicts.length > 0 ? (
                  <div className="space-y-2">
                    {donationConflicts.map((conflict: ConflictLog) => (
                      <div key={conflict.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            {getConflictTypeLabel(conflict.conflictType)}
                          </span>
                          <StatusBadge status={conflict.severity} type="severity" />
                          {conflict.resolvedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              已解决
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <Clock className="w-3 h-3" />
                              待处理
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{conflict.description}</p>
                        {conflict.resolution && (
                          <p className="text-xs text-emerald-600 mt-2">
                            解决方案：{conflict.resolution}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                    暂无冲突记录
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-600" />
                  用途锁定
                </h4>
                {donationLock ? (
                  <div className="bg-emerald-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">用途已锁定</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">锁定用途</span>
                      <span className="text-sm text-emerald-800 font-medium">{donationLock.lockedPurpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">锁定来源</span>
                      <span className="text-sm text-emerald-800">{getSourceLabel(donationLock.source)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">锁定时间</span>
                      <span className="text-sm text-emerald-800">{formatDateTime(donationLock.lockedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">操作人</span>
                      <span className="text-sm text-emerald-800">{donationLock.lockedBy}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">锁定用途</label>
                      <input
                        type="text"
                        value={lockedPurpose}
                        onChange={(e) => setLockedPurpose(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="请输入锁定用途"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-2">锁定来源</label>
                      <div className="flex gap-4">
                        {(['donation', 'budget', 'manual'] as const).map((source) => (
                          <label key={source} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="source"
                              value={source}
                              checked={lockSource === source}
                              onChange={() => setLockSource(source)}
                              className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-slate-700">{getSourceLabel(source)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">操作人</label>
                      <input
                        type="text"
                        value={lockedBy}
                        onChange={(e) => setLockedBy(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="请输入操作人"
                      />
                    </div>
                    <button
                      onClick={handleLockPurpose}
                      disabled={!lockedPurpose.trim()}
                      className="w-full py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      锁定用途
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
