import { Upload, FileText, Camera, StickyNote } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AttachedMaterial } from '@/types';

const TYPE_ICONS: Record<AttachedMaterial['type'], React.ReactNode> = {
  screenshot: <Camera size={14} />,
  note: <StickyNote size={14} />,
  file: <FileText size={14} />,
};

interface MaterialDropZoneProps {
  anomalyId: string;
}

export default function MaterialDropZone({ anomalyId }: MaterialDropZoneProps) {
  const anomalies = useStore((s) => s.anomalies);
  const addMaterial = useStore((s) => s.addMaterial);

  const anomaly = anomalies.find((a) => a.id === anomalyId);
  const materials = anomaly?.materials ?? [];

  const handleUpload = () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const id = `m-${Date.now()}`;
    addMaterial(anomalyId, {
      id,
      name: `备注材料_${id.slice(-4)}`,
      type: 'note',
      content: '自动生成的备注材料',
      uploadedAt: now,
    });
  };

  const handleMaterialClick = (material: AttachedMaterial) => {
    if (material.url) {
      window.open(material.url, '_blank');
    } else if (material.content) {
      alert(material.content);
    }
  };

  return (
    <div>
      <button
        onClick={handleUpload}
        className="w-full border border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-[#00E5A0] transition-colors cursor-pointer"
      >
        <Upload size={20} className="mx-auto mb-1 text-gray-500" />
        <span className="text-xs text-gray-500">拖拽或点击上传材料</span>
      </button>

      {materials.length > 0 && (
        <div className="mt-3 space-y-2">
          {materials.map((material) => (
            <button
              key={material.id}
              onClick={() => handleMaterialClick(material)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded hover:bg-gray-800 transition-colors text-left"
            >
              <span className="text-gray-400">{TYPE_ICONS[material.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate">{material.name}</p>
                <p className="text-xs text-gray-500">{material.uploadedAt.replace('T', ' ')}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
