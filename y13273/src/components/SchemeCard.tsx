import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, Clock, FileImage } from 'lucide-react';
import type { Scheme } from '../types';
import { useSchemeStore } from '../store/useSchemeStore';
import { formatRelative } from '../utils/time';

interface Props {
  scheme: Scheme;
}

const statusLabel: Record<Scheme['status'], string> = {
  draft: '草稿',
  reviewing: '评审中',
  finalized: '已确定',
};

const statusClass: Record<Scheme['status'], string> = {
  draft: 'bg-slateX-100 text-slateX-600 border-slateX-200',
  reviewing: 'bg-engineering-50 text-engineering-700 border-engineering-200',
  finalized: 'bg-slateX-700 text-white border-slateX-700',
};

export function SchemeCard({ scheme }: Props) {
  const navigate = useNavigate();
  const allMaterials = useSchemeStore((s) => s.materials);

  const schemeMaterials = useMemo(
    () => allMaterials.filter((m) => m.schemeId === scheme.id),
    [allMaterials, scheme.id]
  );
  const overloadCount = useMemo(
    () => schemeMaterials.filter((m) => m.isCapacityOverload).length,
    [schemeMaterials]
  );

  return (
    <button
      type="button"
      onClick={() => navigate(`/scheme/${scheme.id}`)}
      className="relative text-left bg-white border border-slateX-200 p-4 rounded-sm hover:border-engineering-600 hover:shadow-sm transition-all group"
    >
      {scheme.hasCapacityOverload && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-alert-50 border border-alert-500 rounded-sm">
          <AlertTriangle size={12} className="text-alert-600" />
          <span className="text-xs text-alert-700 font-medium">容量超限</span>
        </div>
      )}

      <div className="pr-24">
        <h3 className="font-serif text-base text-slateX-900 leading-snug group-hover:text-engineering-800">
          {scheme.name}
        </h3>
      </div>

      <p className="mt-2 text-sm text-slateX-600 line-clamp-2 min-h-[2.5rem]">
        {scheme.conclusion}
      </p>

      <div className="mt-4 flex items-center flex-wrap gap-x-3 gap-y-1.5 text-xs text-slateX-500 font-mono">
        <span className={`px-1.5 py-0.5 border rounded-sm ${statusClass[scheme.status]}`}>
          {statusLabel[scheme.status]}
        </span>
        <span className="flex items-center gap-1">
          <FileImage size={12} />
          {schemeMaterials.length} 份材料
          {overloadCount > 0 && (
            <span className="text-alert-600">（{overloadCount} 超限）</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {scheme.mapPoint.label}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock size={12} />
          {formatRelative(scheme.updatedAt)}
        </span>
      </div>
    </button>
  );
}
