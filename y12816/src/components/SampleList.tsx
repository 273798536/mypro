import { useReportStore } from '@/store/useReportStore';
import { AlertCircle, CheckCircle2, HelpCircle, Clock, XCircle } from 'lucide-react';
import type { SampleStatus } from '@/types';

const statusConfig: Record<
  SampleStatus,
  { label: string; className: string; icon: typeof AlertCircle }
> = {
  待计算: { label: '待计算', className: 'badge-neutral', icon: Clock },
  计算完成: { label: '计算完成', className: 'badge-neutral', icon: HelpCircle },
  需人工复核: { label: '需人工复核', className: 'badge-warning', icon: AlertCircle },
  质控通过: { label: '质控通过', className: 'badge-success', icon: CheckCircle2 },
  质控不通过: { label: '质控不通过', className: 'badge-danger', icon: XCircle },
};

export default function SampleList() {
  const { samples, selectedSampleId, setSelectedSample } = useReportStore();

  return (
    <div className="card overflow-hidden animate-fade-in-up stagger-1">
      <div className="px-5 py-4 border-b border-warm-200/60 flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-warm-900">样本清单</h3>
        <span className="text-sm text-warm-500">共 {samples.length} 个样本</span>
      </div>
      <div className="overflow-auto max-h-[480px] scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-warm-50 sticky top-0">
            <tr className="text-warm-600">
              <th className="text-left px-5 py-2.5 font-medium">样本条码</th>
              <th className="text-left px-4 py-2.5 font-medium">类型</th>
              <th className="text-left px-4 py-2.5 font-medium">来源</th>
              <th className="text-left px-4 py-2.5 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample, idx) => {
              const status = statusConfig[sample.status];
              const Icon = status.icon;
              const isSelected = selectedSampleId === sample.id;
              return (
                <tr
                  key={sample.id}
                  onClick={() => setSelectedSample(sample.id)}
                  className={`cursor-pointer transition-colors duration-150 border-b border-warm-100 last:border-0 ${
                    isSelected
                      ? 'bg-teal-900/5'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-warm-50'
                      : 'bg-warm-50/50 hover:bg-warm-50'
                  } ${sample.hasBadData ? 'ring-1 ring-inset ring-amber-600/30' : ''}`}
                >
                  <td className="px-5 py-3 font-mono text-warm-900">{sample.barcode}</td>
                  <td className="px-4 py-3 text-warm-700">{sample.type}</td>
                  <td className="px-4 py-3 text-warm-600">{sample.source}</td>
                  <td className="px-4 py-3">
                    <span className={`${status.className} gap-1`}>
                      <Icon size={12} />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
