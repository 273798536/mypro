import { AlertTriangle, User } from 'lucide-react';
import type { RecordStatus } from '../../types';
import StatusBadge from './StatusBadge';

interface Props {
  status: RecordStatus;
  reviewer: string;
  lineNumber: number;
  children: React.ReactNode;
}

export default function StudentMask({ status, reviewer, lineNumber, children }: Props) {
  if (status === 'passed') {
    return <>{children}</>;
  }

  const isError = status === 'error';

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-30 blur-[1px]">{children}</div>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div
          className={`max-w-sm w-full rounded-sm-plus p-5 shadow-xl border-2 ${
            isError
              ? 'bg-white border-lab-red'
              : 'bg-white border-lab-yellow'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle
              size={24}
              className={isError ? 'text-lab-red' : 'text-lab-yellow'}
            />
            <StatusBadge status={status} />
          </div>

          <h4 className="font-semibold text-gray-800 mb-2">
            {isError ? '该数据存在异常，不可使用' : '该数据正在复核中'}
          </h4>

          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {isError
              ? '此条滴定记录存在明显问题（如浓度填错、谱图无突跃等），计算结果不可信。'
              : '环境监测员正在进一步确认该数据的准确性，请耐心等待。'}
          </p>

          <div className="flex items-center gap-2 p-3 bg-paper rounded-sm-plus text-sm">
            <User size={14} className="text-lab-blue" />
            <span className="text-gray-600">
              请联系：<span className="font-medium text-lab-blue">{reviewer}</span>
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              原始记录第 <span className="font-mono-chem font-semibold">{lineNumber}</span> 行
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
