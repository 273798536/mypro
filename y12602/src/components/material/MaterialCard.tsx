import React from 'react';
import { X, Eye, Check } from 'lucide-react';
import { Material } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useMaterials } from '@/hooks/useMaterials';
import { StatusBadge } from '@/components/common/StatusBadge';

interface MaterialCardProps {
  material: Material;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ material }) => {
  const { selectedMaterialId, selectMaterial, setShowMaterialViewer, gameStatus } = useAppStore();
  const { removeMaterial } = useMaterials();

  const isSelected = selectedMaterialId === material.id;
  const canSelect = gameStatus === 'playing';

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-accent shadow-medium scale-[1.02]' 
          : 'border-transparent hover:border-neutral-300'
      } ${!canSelect && 'opacity-70 cursor-not-allowed'}`}
      onClick={() => canSelect && selectMaterial(isSelected ? null : material.id)}
    >
      <div className="aspect-video bg-neutral-100 relative overflow-hidden">
        <img
          src={material.dataUrl}
          alt={material.name}
          className="w-full h-full object-cover"
        />
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMaterialViewer(true);
              selectMaterial(material.id);
            }}
            className="p-1.5 bg-white/90 rounded-lg hover:bg-white shadow-sm"
            title="查看大图"
          >
            <Eye size={14} className="text-neutral-600" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              removeMaterial(material.id);
              if (isSelected) selectMaterial(null);
            }}
            className="p-1.5 bg-white/90 rounded-lg hover:bg-danger hover:text-white shadow-sm"
            title="删除"
          >
            <X size={14} className="text-neutral-600 hover:text-white" />
          </button>
        </div>

        {isSelected && (
          <div className="absolute top-2 left-2">
            <div className="p-1.5 bg-accent text-white rounded-lg shadow-sm">
              <Check size={14} />
            </div>
          </div>
        )}

        <div className="absolute bottom-2 right-2">
          <StatusBadge status={material.status} size="sm" />
        </div>
      </div>

      <div className="p-2.5">
        <p className="text-xs font-medium text-neutral-700 truncate" title={material.name}>
          {material.name}
        </p>
        <p className="text-[10px] text-neutral-400 mt-0.5">
          {new Date(material.importedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};
