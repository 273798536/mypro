import { Link } from 'react-router-dom';
import { Camera, Clock, Image, AlertTriangle, ChevronRight } from 'lucide-react';
import type { Sandbox } from '@/types';
import StatusBadge from './StatusBadge';
import { formatDateTime, getUnitText, convertInclination } from '@/utils/helpers';

interface SandboxCardProps {
  sandbox: Sandbox;
}

export default function SandboxCard({ sandbox }: SandboxCardProps) {
  const hasWarning = sandbox.unit === 'radian' && sandbox.inclination > 6.28 || sandbox.modelOverlap;
  const convertedValue = sandbox.unit === 'radian'
    ? convertInclination(sandbox.inclination, 'radian', 'degree').toFixed(1)
    : null;

  return (
    <Link
      to={`/sandbox/${sandbox.id}`}
      className="card card-hover block p-5 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-base font-semibold text-space-50 group-hover:text-gold-300 transition-colors truncate">
            {sandbox.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={sandbox.status} size="sm" />
            {hasWarning && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-900/30 border border-amber-600/40 rounded-md px-2 py-0.5">
                <AlertTriangle className="w-3 h-3" />
                异常
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-space-500 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-space-900/60 rounded-lg px-3 py-2.5">
          <div className="text-xs text-space-400 mb-1">轨道倾角</div>
          <div className="data-mono">
            {sandbox.inclination} {getUnitText(sandbox.unit)}
          </div>
          {convertedValue !== null && Number(convertedValue) > 360 && (
            <div className="text-xs text-amber-400 mt-1">≈ {convertedValue}° 已超出</div>
          )}
        </div>
        <div className="bg-space-900/60 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-space-400 mb-1">
            <Camera className="w-3 h-3" />
            视角
          </div>
          <div className="data-mono text-xs">
            ({sandbox.cameraView.x.toFixed(1)}, {sandbox.cameraView.y.toFixed(1)}, {sandbox.cameraView.z.toFixed(1)})
          </div>
          <div className="text-xs text-space-400 mt-0.5">缩放 ×{sandbox.cameraView.zoom.toFixed(2)}</div>
        </div>
      </div>

      {sandbox.notes && (
        <div className="text-xs text-space-300 bg-space-900/40 border-l-2 border-gold-500/60 px-3 py-2 rounded-r mb-4 line-clamp-2">
          {sandbox.notes}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-space-700/50">
        <div className="flex items-center gap-1.5 text-xs text-space-400">
          <Image className="w-3.5 h-3.5" />
          <span>{sandbox.screenshots.length} 张截图</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-space-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDateTime(sandbox.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
