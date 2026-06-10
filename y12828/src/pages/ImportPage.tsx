import { useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  User,
  Clock,
  FileSpreadsheet,
  Image,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useSampleStore } from '@/stores/sampleStore';
import { Empty } from '@/components/Empty';
import { cn } from '@/lib/utils';
import { ImportBatch, ImportPreviewItem } from '@/types';

export default function ImportPage() {
  const { users, versions, getFilteredDedupResults } = useSampleStore();

  const [importBatches, setImportBatches] = useState<ImportBatch[]>([
    {
      batchId: 'BATCH-20240115-001',
      fileName: '2024年1月15日测序结果.xlsx',
      importTime: Date.now() - 3600000,
      operatorId: users[0]?.id || '',
      totalRecords: 25,
      duplicateCount: 3,
      previewItems: [],
      status: 'completed',
    },
    {
      batchId: 'BATCH-20240115-002',
      fileName: '补录_样本BC-000123_测序结果.jpg',
      importTime: Date.now() - 1800000,
      operatorId: users[0]?.id || '',
      totalRecords: 1,
      duplicateCount: 1,
      previewItems: [],
      status: 'previewing',
    },
  ]);

  const [dragActive, setDragActive] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);

  const currentUser = users[0];

  const mockPreviewItems: ImportPreviewItem[] = useMemo(() => {
    return [
      {
        rowNumber: 1,
        barcode: 'BC-000123',
        data: { geneName: 'EGFR', variant: 'L858R' },
        isDuplicate: true,
        duplicateBarcode: 'BC-000123',
        conflictFields: ['alleleFrequency', 'qualityScore'],
      },
      {
        rowNumber: 2,
        barcode: 'BC-000124',
        data: { geneName: 'KRAS', variant: 'G12D' },
        isDuplicate: false,
      },
      {
        rowNumber: 3,
        barcode: 'BC-000125',
        data: { geneName: 'BRAF', variant: 'V600E' },
        isDuplicate: false,
      },
      {
        rowNumber: 4,
        barcode: 'BC-000126',
        data: { geneName: 'PIK3CA', variant: 'H1047R' },
        isDuplicate: true,
        duplicateBarcode: 'BC-000126',
        conflictFields: ['interpretation'],
      },
    ];
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      alert(`检测到 ${files.length} 个文件，即将开始导入...`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      alert(`已选择 ${files.length} 个文件，即将开始导入...`);
    }
  };

  const handleConfirmImport = (batch: ImportBatch) => {
    const confirmed = confirm(
      `确定要导入批次 ${batch.batchId} 吗？\n共 ${batch.totalRecords} 条记录，其中 ${batch.duplicateCount} 条条码重复。`
    );
    if (confirmed) {
      setImportBatches((prev) =>
        prev.map((b) =>
          b.batchId === batch.batchId ? { ...b, status: 'importing' } : b
        )
      );
      setTimeout(() => {
        setImportBatches((prev) =>
          prev.map((b) =>
            b.batchId === batch.batchId ? { ...b, status: 'completed' } : b
          )
        );
        alert('导入完成！系统已自动检测条码重复并保留所有原始来源信息。');
      }, 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-accent-100 text-accent-700';
      case 'importing':
        return 'bg-primary-100 text-primary-700';
      case 'previewing':
        return 'bg-warning-100 text-warning-700';
      case 'cancelled':
        return 'bg-danger-100 text-danger-700';
      default:
        return 'bg-lab-bg text-lab-text';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'importing':
        return '导入中';
      case 'previewing':
        return '待确认';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Upload size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">今日导入</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{importBatches.length}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">已完成</p>
              <p className="text-2xl font-bold font-mono text-lab-text">
                {importBatches.filter((b) => b.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">重复预警</p>
              <p className="text-2xl font-bold font-mono text-lab-text">
                {importBatches.reduce((sum, b) => sum + b.duplicateCount, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <FileText size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">总记录数</p>
              <p className="text-2xl font-bold font-mono text-lab-text">
                {importBatches.reduce((sum, b) => sum + b.totalRecords, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lab-card p-4 bg-warning-50 border border-warning-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-warning-800 mb-1">重复导入检测说明</h3>
            <p className="text-sm text-warning-700">
              导入时系统自动检测条码重复。遇到重复记录时，保留原始行号、图片名和来源备注。
              特别注意重复导入和补录以后有没有乱，别让同一件事出现两份矛盾结论。
              所有版本的原始来源都会被完整保留，真要追问时能回到那张表或那条记录。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div
            className={cn(
              'lab-card p-8 border-2 border-dashed transition-all text-center cursor-pointer',
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-lab-border hover:border-primary-300 hover:bg-primary-50/30'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <Upload size={32} className="text-primary-600" />
            </div>
            <h3 className="font-medium text-lab-text mb-2">拖拽文件到此处</h3>
            <p className="text-sm text-lab-textMuted mb-4">
              或点击选择文件上传
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-lab-bg rounded text-xs text-lab-textMuted">
                <FileSpreadsheet size={12} />
                .xlsx .xls .csv
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-lab-bg rounded text-xs text-lab-textMuted">
                <Image size={12} />
                .jpg .jpeg .png
              </span>
            </div>
          </div>

          <div className="lab-card p-4">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary-500" />
              导入批次列表
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {importBatches.map((batch) => {
                const operator = users.find((u) => u.id === batch.operatorId);
                const isSelected = selectedBatch?.batchId === batch.batchId;

                return (
                  <button
                    key={batch.batchId}
                    onClick={() => setSelectedBatch(batch)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      isSelected
                        ? 'bg-primary-50 border-2 border-primary-200 shadow-md'
                        : 'bg-lab-bg border-2 border-transparent hover:bg-primary-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-medium text-primary-600 text-sm">
                        {batch.batchId}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusColor(batch.status))}>
                        {getStatusLabel(batch.status)}
                      </span>
                    </div>
                    <p className="text-sm text-lab-text line-clamp-1 mb-2">{batch.fileName}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-lab-textMuted">
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {batch.totalRecords} 条
                      </span>
                      {batch.duplicateCount > 0 && (
                        <span className="flex items-center gap-1 text-warning-600">
                          <AlertTriangle size={12} />
                          {batch.duplicateCount} 条重复
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {dayjs(batch.importTime).format('HH:mm')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedBatch ? (
            <>
              <div className="lab-card p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-lab-text mb-1 flex items-center gap-2">
                      <FileText size={18} className="text-primary-500" />
                      批次详情 - {selectedBatch.batchId}
                    </h3>
                    <p className="text-sm text-lab-textMuted">{selectedBatch.fileName}</p>
                  </div>
                  <span className={cn('px-3 py-1 rounded-lg text-xs font-medium', getStatusColor(selectedBatch.status))}>
                    {getStatusLabel(selectedBatch.status)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-lab-bg rounded-lg">
                    <p className="text-xs text-lab-textMuted mb-1">总记录数</p>
                    <p className="text-xl font-bold font-mono text-lab-text">{selectedBatch.totalRecords}</p>
                  </div>
                  <div className="p-3 bg-lab-bg rounded-lg">
                    <p className="text-xs text-lab-textMuted mb-1">正常记录</p>
                    <p className="text-xl font-bold font-mono text-accent-600">
                      {selectedBatch.totalRecords - selectedBatch.duplicateCount}
                    </p>
                  </div>
                  <div className="p-3 bg-lab-bg rounded-lg">
                    <p className="text-xs text-lab-textMuted mb-1">条码重复</p>
                    <p className="text-xl font-bold font-mono text-warning-600">{selectedBatch.duplicateCount}</p>
                  </div>
                  <div className="p-3 bg-lab-bg rounded-lg">
                    <p className="text-xs text-lab-textMuted mb-1">操作人</p>
                    <p className="text-xl font-bold text-lab-text">
                      {users.find((u) => u.id === selectedBatch.operatorId)?.name || '-'}
                    </p>
                  </div>
                </div>

                {selectedBatch.status === 'previewing' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleConfirmImport(selectedBatch)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      <Sparkles size={16} />
                      确认导入
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-lab-bg text-lab-text rounded-lg hover:bg-danger-50 hover:text-danger-600 transition-colors text-sm font-medium">
                      <XCircle size={16} />
                      取消导入
                    </button>
                  </div>
                )}
              </div>

              <div className="lab-card p-4">
                <h4 className="font-medium text-lab-text mb-4 flex items-center gap-2">
                  <Search size={16} className="text-primary-500" />
                  导入预览 - 重复记录已标记
                </h4>

                <div className="overflow-x-auto">
                  <table className="data-table text-sm">
                    <thead>
                      <tr>
                        <th>行号</th>
                        <th>样本条码</th>
                        <th>基因名称</th>
                        <th>变异位点</th>
                        <th>状态</th>
                        <th>冲突字段</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPreviewItems.map((item) => (
                        <tr
                          key={item.rowNumber}
                          className={cn(item.isDuplicate && 'bg-warning-50/50')}
                        >
                          <td className="font-mono">{item.rowNumber}</td>
                          <td className="font-mono font-medium text-primary-600">{item.barcode}</td>
                          <td>{item.data.geneName}</td>
                          <td className="font-mono">{item.data.variant}</td>
                          <td>
                            {item.isDuplicate ? (
                              <span className="tag-warning flex items-center gap-1">
                                <AlertTriangle size={10} />
                                条码重复
                              </span>
                            ) : (
                              <span className="tag-accent flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                正常
                              </span>
                            )}
                          </td>
                          <td>
                            {item.conflictFields ? (
                              <span className="text-xs text-danger-600 font-mono">
                                {item.conflictFields.join(', ')}
                              </span>
                            ) : (
                              <span className="text-xs text-lab-textMuted">-</span>
                            )}
                          </td>
                          <td>
                            {item.isDuplicate && (
                              <button className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                                <ChevronRight size={12} />
                                查看重复详情
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 bg-warning-50 rounded-lg border border-warning-200">
                  <p className="text-xs text-warning-700">
                    <span className="font-medium">提示：</span>
                    条码重复记录已标记，导入后系统会保留所有版本的原始来源信息，
                    包括原始行号、文件名、来源备注等，便于后续追溯。
                    可在「重复处理」页面处理这些重复记录。
                  </p>
                </div>
              </div>
            </>
          ) : (
            <Empty
              title="选择导入批次"
              description="从左侧列表选择一个导入批次，查看详细信息和预览数据"
              icon={Upload}
            />
          )}
        </div>
      </div>
    </div>
  );
}
