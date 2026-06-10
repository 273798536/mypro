import { X, Clock, User, Calendar, Hash, FlaskConical, ArrowRightLeft, Trash2 } from 'lucide-react';
import { BarcodeConflict, ConflictResolution, Sample } from '@/types';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface ConflictResolutionModalProps {
  conflict: BarcodeConflict;
  onResolve: (resolution: ConflictResolution) => void;
  onClose: () => void;
}

const fieldLabels: Record<string, string> = {
  name: '样本名称',
  material: '材料类型',
  collector: '采集人',
  collectionTime: '采集时间',
  qualityLevel: '质量等级',
  status: '状态',
  invalidReason: '无效原因',
};

const fieldIcons: Record<string, React.ReactNode> = {
  name: <FlaskConical className="h-4 w-4" />,
  material: <Hash className="h-4 w-4" />,
  collector: <User className="h-4 w-4" />,
  collectionTime: <Calendar className="h-4 w-4" />,
};

function formatValue(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString('zh-CN');
  if (typeof value === 'string') return value;
  return String(value);
}

function findDifferences(sample1: Sample, sample2: Sample): string[] {
  const diffFields: string[] = [];
  const compareFields: (keyof Sample)[] = [
    'name',
    'material',
    'collector',
    'collectionTime',
    'qualityLevel',
    'status',
    'invalidReason',
  ];

  compareFields.forEach((field) => {
    const v1 = sample1[field];
    const v2 = sample2[field];
    if (v1 !== v2 && !(v1 instanceof Date && v2 instanceof Date && v1.getTime() === v2.getTime())) {
      diffFields.push(field);
    }
  });

  return diffFields;
}

export default function ConflictResolutionModal({
  conflict,
  onResolve,
  onClose,
}: ConflictResolutionModalProps) {
  const [sample1, sample2] = conflict.samples;
  const diffFields = findDifferences(sample1, sample2);

  const isNewer = (a: Sample, b: Sample) => new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime();
  const newerSample = isNewer(sample1, sample2) ? sample1 : sample2;
  const olderSample = isNewer(sample1, sample2) ? sample2 : sample1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">条码冲突解决</h2>
            <p className="mt-1 text-sm text-gray-500">
              条码 <span className="font-mono font-medium text-primary-600">{conflict.barcode}</span> 存在重复记录
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {[olderSample, newerSample].map((sample, index) => (
              <div
                key={sample.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                      index === 0
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-primary-100 text-primary-700'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {index === 0 ? '较早版本' : '较新版本'}
                  </span>
                  <StatusBadge status={sample.status} />
                </div>

                <h3 className="mt-3 text-lg font-semibold text-gray-900">{sample.name}</h3>
                <p className="text-sm text-gray-500">ID: {sample.id}</p>

                <div className="mt-4 space-y-3">
                  {Object.keys(fieldLabels).map((field) => {
                    const isDiff = diffFields.includes(field);
                    const value = sample[field as keyof Sample];
                    if (value === undefined || value === null) return null;

                    return (
                      <div
                        key={field}
                        className={cn(
                          'flex items-start gap-3 rounded-lg p-3 text-sm',
                          isDiff ? 'bg-yellow-50 ring-2 ring-yellow-200' : 'bg-gray-50'
                        )}
                      >
                        <div className="mt-0.5 text-gray-400">
                          {fieldIcons[field] || <Hash className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">{fieldLabels[field]}</p>
                          <p className={cn('font-medium', isDiff ? 'text-yellow-800' : 'text-gray-700')}>
                            {formatValue(value)}
                          </p>
                        </div>
                        {isDiff && (
                          <span className="text-xs font-medium text-yellow-600">差异</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    创建时间：{new Date(sample.createdAt).toLocaleString('zh-CN')}
                  </p>
                  <p className="text-xs text-gray-500">创建人：{sample.createdBy}</p>
                </div>
              </div>
            ))}
          </div>

          {diffFields.length > 0 && (
            <div className="mt-6 rounded-lg bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">
                发现 {diffFields.length} 处字段差异，请仔细核对后选择处理方式。
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 p-6">
          <button
            onClick={() => onResolve('keep_newest')}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            保留最新
          </button>
          <button
            onClick={() => onResolve('keep_oldest')}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Clock className="h-4 w-4" />
            保留最早
          </button>
          <button
            onClick={() => onResolve('merge')}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
          >
            <ArrowRightLeft className="h-4 w-4" />
            合并
          </button>
          <button
            onClick={() => onResolve('mark_invalid')}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            全部作废
          </button>
        </div>
      </div>
    </div>
  );
}
