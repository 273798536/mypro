import React from 'react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/utils/time';

export const MaterialViewer: React.FC = () => {
  const { showMaterialViewer, setShowMaterialViewer, materials, selectedMaterialId } = useAppStore();
  const material = materials.find(m => m.id === selectedMaterialId);

  return (
    <Modal
      isOpen={showMaterialViewer}
      onClose={() => setShowMaterialViewer(false)}
      title="素材详情"
      size="lg"
    >
      {material ? (
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="bg-neutral-100 rounded-xl overflow-hidden">
                <img
                  src={material.dataUrl}
                  alt={material.name}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="lg:w-64 space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">素材名称</h3>
                <p className="text-sm text-neutral-600 break-all">{material.name}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">审核状态</h3>
                <StatusBadge status={material.status} />
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">导入时间</h3>
                <p className="text-sm text-neutral-600">{formatDateTime(material.importedAt)}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">素材哈希</h3>
                <p className="text-xs text-neutral-500 font-mono break-all bg-neutral-100 p-2 rounded">
                  {material.hash}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">用于去重校验</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-neutral-400">
          <p>未找到素材</p>
        </div>
      )}
    </Modal>
  );
};
