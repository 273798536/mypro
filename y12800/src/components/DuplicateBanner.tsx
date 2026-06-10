import { AlertTriangle } from 'lucide-react';
import type { Sample } from '../../shared/types';

interface DuplicateBannerProps {
  sample: Sample;
}

export default function DuplicateBanner({ sample }: DuplicateBannerProps) {
  if (!sample.isDuplicate) return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs">
      <AlertTriangle size={14} className="text-qc-amber mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-medium text-amber-800">条码重复: {sample.barcode}</p>
        <p className="text-amber-700">
          原始行号: {sample.originalRowNumber}
          {sample.imageFileName && <span className="ml-2">图片: {sample.imageFileName}</span>}
          {sample.sourceRemark && <span className="ml-2">备注: {sample.sourceRemark}</span>}
        </p>
        {sample.duplicateGroupId && (
          <p className="text-amber-600">重复组: {sample.duplicateGroupId}</p>
        )}
      </div>
    </div>
  );
}
