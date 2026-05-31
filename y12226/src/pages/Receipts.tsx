import { useState, useRef, ChangeEvent } from 'react';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import { useStore } from '@/store/useStore';
import {
  Upload,
  Search,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import type { ExpenseReceipt, DonationRecord } from '@/types';

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

const generateId = (existingIds: string[]): string => {
  const maxNum = existingIds
    .filter(id => id.startsWith('ER-'))
    .map(id => {
      const match = id.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .reduce((max, num) => Math.max(max, num), 0);
  return `ER-${String(maxNum + 1).padStart(3, '0')}`;
};

interface UploadFile {
  file: File;
  preview: string;
  donationId: string;
  amount: number;
  receiptDate: string;
  ocrText: string;
}

type FilterTab = 'all' | 'linked' | 'unlinked' | 'duplicate';

export default function Receipts() {
  const { receipts, donations, addReceipts, updateReceipt, detectConflicts } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDonationId, setLinkDonationId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const filteredReceipts = receipts.filter((r) => {
    if (filterTab === 'linked' && r.status !== 'linked') return false;
    if (filterTab === 'unlinked' && r.status !== 'unlinked') return false;
    if (filterTab === 'duplicate' && r.status !== 'duplicate') return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const donation = donations.find(d => d.id === r.donationId);
    return (
      r.id.toLowerCase().includes(query) ||
      (donation?.donorName?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadFile[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      donationId: '',
      amount: 0,
      receiptDate: formatDate(new Date().toISOString()),
      ocrText: '',
    }));

    setUploadFiles([...uploadFiles, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeUploadFile = (index: number) => {
    const newFiles = [...uploadFiles];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview);
    }
    newFiles.splice(index, 1);
    setUploadFiles(newFiles);
  };

  const updateUploadFile = (index: number, updates: Partial<UploadFile>) => {
    const newFiles = [...uploadFiles];
    newFiles[index] = { ...newFiles[index], ...updates };
    setUploadFiles(newFiles);
  };

  const handleUpload = () => {
    const newReceipts: ExpenseReceipt[] = uploadFiles.map((uf) => {
      const donation = donations.find(d => d.id === uf.donationId);
      return {
        id: generateId([...receipts.map(r => r.id), ...uploadFiles.map((_, i) => `ER-${900 + i}`)]),
        donationId: uf.donationId,
        projectId: donation?.projectId || '',
        amount: uf.amount,
        receiptDate: uf.receiptDate,
        imageUrl: uf.preview,
        ocrText: uf.ocrText,
        status: uf.donationId ? 'linked' : 'unlinked',
        uploadedAt: new Date().toISOString(),
      };
    });

    addReceipts(newReceipts);
    detectConflicts();
    setUploadModalOpen(false);
    setUploadFiles([]);
  };

  const openViewer = (index: number) => {
    setSelectedReceiptIndex(index);
    setViewerModalOpen(true);
  };

  const closeViewer = () => {
    setViewerModalOpen(false);
  };

  const prevReceipt = () => {
    setSelectedReceiptIndex((prev) =>
      prev > 0 ? prev - 1 : filteredReceipts.length - 1
    );
  };

  const nextReceipt = () => {
    setSelectedReceiptIndex((prev) =>
      prev < filteredReceipts.length - 1 ? prev + 1 : 0
    );
  };

  const handleLinkReceipt = () => {
    const receipt = filteredReceipts[selectedReceiptIndex];
    const donation = donations.find(d => d.id === linkDonationId);
    if (receipt && linkDonationId) {
      updateReceipt(receipt.id, {
        donationId: linkDonationId,
        projectId: donation?.projectId || '',
        status: 'linked',
      });
      detectConflicts();
      setLinkDialogOpen(false);
      setLinkDonationId('');
    }
  };

  const getDonorName = (receipt: ExpenseReceipt): string => {
    if (receipt.status === 'unlinked') return '未关联';
    const donation = donations.find(d => d.id === receipt.donationId);
    return donation?.donorName || '未关联';
  };

  const getDonation = (donationId: string): DonationRecord | undefined => {
    return donations.find(d => d.id === donationId);
  };

  const currentReceipt = filteredReceipts[selectedReceiptIndex];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'linked', label: '已关联' },
    { key: 'unlinked', label: '未关联' },
    { key: 'duplicate', label: '重复票据' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-noto-serif-sc">
            支出票据管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">票据图片查看、导入、关联匹配</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              上传票据
            </button>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    filterTab === tab.key
                      ? 'bg-white text-slate-800 shadow-sm font-medium'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索捐赠人或票据ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {filteredReceipts.map((receipt, index) => (
            <div
              key={receipt.id}
              onClick={() => openViewer(index)}
              className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
            >
              <div className="relative">
                {receipt.imageUrl ? (
                  <img
                    src={receipt.imageUrl}
                    alt={receipt.id}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                {(receipt.status === 'unlinked' || receipt.status === 'duplicate') && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                      {receipt.status === 'unlinked' ? '未关联' : '重复'}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-slate-800">
                    {formatAmount(receipt.amount)}
                  </p>
                  <StatusBadge status={receipt.status} type="receipt" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{receipt.receiptDate}</span>
                  <span className="text-slate-700">{getDonorName(receipt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReceipts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无票据数据</p>
          </div>
        )}
      </div>

      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-800">上传支出票据</h3>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFiles([]);
                }}
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
                <p className="text-xs text-slate-400">支持 .jpg, .png, .pdf 格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

              {uploadFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">文件预览</h4>
                  <div className="space-y-4">
                    {uploadFiles.map((uf, index) => (
                      <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex gap-4">
                          <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200">
                            {uf.preview ? (
                              <img src={uf.preview} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-8 h-8 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-slate-700 truncate max-w-xs">
                                {uf.file.name}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeUploadFile(index);
                                }}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-slate-500" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">关联捐赠ID</label>
                                <select
                                  value={uf.donationId}
                                  onChange={(e) => updateUploadFile(index, { donationId: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                  <option value="">-- 请选择 --</option>
                                  {donations.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.id} - {d.donorName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">金额</label>
                                <input
                                  type="number"
                                  value={uf.amount}
                                  onChange={(e) => updateUploadFile(index, { amount: Number(e.target.value) })}
                                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  placeholder="请输入金额"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">票据日期</label>
                                <input
                                  type="date"
                                  value={uf.receiptDate}
                                  onChange={(e) => updateUploadFile(index, { receiptDate: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">OCR文本</label>
                              <textarea
                                value={uf.ocrText}
                                onChange={(e) => updateUploadFile(index, { ocrText: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                rows={2}
                                placeholder="OCR识别的票据内容"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setUploadModalOpen(false);
                    setUploadFiles([]);
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploadFiles.length === 0}
                  className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  上传并关联
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewerModalOpen && currentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeViewer}
          />
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={prevReceipt}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={nextReceipt}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8">
              {currentReceipt.imageUrl ? (
                <img
                  src={currentReceipt.imageUrl}
                  alt={currentReceipt.id}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-[60vh] bg-white/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-24 h-24 text-white/50" />
                </div>
              )}
            </div>

            <div className="bg-white rounded-t-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{currentReceipt.id}</h3>
                    <StatusBadge status={currentReceipt.status} type="receipt" />
                  </div>
                  <p className="text-3xl font-bold text-slate-800">
                    {formatAmount(currentReceipt.amount)}
                  </p>
                </div>
                {currentReceipt.status === 'unlinked' && (
                  <button
                    onClick={() => setLinkDialogOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    关联捐赠记录
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">关联捐赠: </span>
                  <span className="text-slate-800 font-medium">
                    {getDonation(currentReceipt.donationId)
                      ? `${currentReceipt.donationId} - ${getDonation(currentReceipt.donationId)?.donorName}`
                      : '未关联'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">票据日期: </span>
                  <span className="text-slate-800 font-medium">{currentReceipt.receiptDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">上传时间: </span>
                  <span className="text-slate-800 font-medium">{formatDateTime(currentReceipt.uploadedAt)}</span>
                </div>
              </div>

              {currentReceipt.ocrText && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">OCR文本</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {currentReceipt.ocrText}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  {selectedReceiptIndex + 1} / {filteredReceipts.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={prevReceipt}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    前一张
                  </button>
                  <button
                    onClick={nextReceipt}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    后一张
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {linkDialogOpen && currentReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">关联捐赠记录</h3>
              <button
                onClick={() => {
                  setLinkDialogOpen(false);
                  setLinkDonationId('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  选择要关联的捐赠记录，关联后将自动检测用途匹配和潜在冲突。
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-2">选择捐赠记录</label>
                <select
                  value={linkDonationId}
                  onChange={(e) => setLinkDonationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- 请选择 --</option>
                  {donations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} - {d.donorName} ({formatAmount(d.amount)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setLinkDialogOpen(false);
                    setLinkDonationId('');
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleLinkReceipt}
                  disabled={!linkDonationId}
                  className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  确认关联
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
