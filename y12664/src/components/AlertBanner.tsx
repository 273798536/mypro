import type { ValidationIssue } from '@/types';
import { AlertTriangle, AlertCircle, Camera, XCircle } from 'lucide-react';

interface Props {
  issues: ValidationIssue[];
  onDismiss?: (index: number) => void;
}

function issueIcon(type: ValidationIssue['type']) {
  if (type === 'camera_lost') return <Camera className="w-5 h-5" />;
  if (type === 'out_of_bounds') return <AlertTriangle className="w-5 h-5" />;
  return <XCircle className="w-5 h-5" />;
}

function bannerStyle(type: ValidationIssue['type']) {
  if (type === 'camera_lost') return 'bg-red-900/40 border-red-500/60 text-red-100';
  if (type === 'out_of_bounds') return 'bg-amber-900/40 border-amber-500/60 text-amber-100';
  return 'bg-orange-900/40 border-orange-500/60 text-orange-100';
}

export default function AlertBanner({ issues }: Props) {
  if (issues.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 w-full">
      {issues.map((iss, idx) => (
        <div
          key={`${iss.type}-${iss.cageId ?? 'global'}-${idx}`}
          className={`flex items-start gap-3 px-4 py-3 border rounded-lg backdrop-blur-sm ${bannerStyle(iss.type)}`}
        >
          <div className="mt-0.5 flex-shrink-0">{issueIcon(iss.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 opacity-70" />
              <span className="font-semibold tracking-wide">{iss.message}</span>
            </div>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">{iss.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
