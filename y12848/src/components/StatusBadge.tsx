import type { SampleStatus, ConclusionResult } from '../types';
import { getStatusText, getStatusColor, getConclusionText, getConclusionColor } from '../data/mockData';

interface StatusBadgeProps {
  status: SampleStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )}`}
    >
      {getStatusText(status)}
    </span>
  );
}

interface ConclusionBadgeProps {
  result: ConclusionResult;
}

export function ConclusionBadge({ result }: ConclusionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConclusionColor(
        result
      )}`}
    >
      {getConclusionText(result)}
    </span>
  );
}
