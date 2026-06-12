import { X, AlertTriangle, Link2, Image as ImageIcon, User } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useOrphanStore } from '@/store/useOrphanStore';
import { usePointStore } from '@/store/usePointStore';
import { formatTime } from '@/utils/storage';
import { useState } from 'react';

interface OrphanListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrphanList({ isOpen, onClose }: OrphanListProps) {
  const { screenshots, markRelinked } = useOrphanStore();
  const { points, setSelectedPoint } = usePointStore();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const unlinked = screenshots.filter(s => !s.isRelinked);

  const getPointName = (pointId: string) => {
    return points.find(p => p.id === pointId)?.name || pointId;
  };

  const handleGoToPoint = (pointId: string) => {
    setSelectedPoint(pointId);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="条件丢失的截图记录"
        className="max-w-2xl"
      >
        <div className="mb-4 p-3 bg-aviation-orange/10 border border-aviation-orange/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-aviation-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-aviation-orange">
                这些截图缺少视图条件关联
              </p>
              <p className="text-[11px] text-space-400 mt-0.5">
                由于上传时未记录当前视图条件，这些截图无法还原当时的视角。
                请尽快重新关联视图条件，避免混入正常复核结果。
              </p>
            </div>
          </div>
        </div>

        {unlinked.length === 0 ? (
          <div className="text-center py-12 text-space-500">
            <ImageIcon className="mx-auto mb-2" size={32} />
            <p className="text-sm">暂无条件丢失的截图</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {unlinked.map(screenshot => (
              <div
                key={screenshot.id}
                className="flex gap-3 p-3 bg-space-800/50 border border-aviation-orange/30 rounded-lg hover:border-aviation-orange/50 transition-colors"
              >
                <div
                  className="w-20 h-14 rounded bg-space-700 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage(screenshot.imageUrl)}
                >
                  <img
                    src={screenshot.imageUrl}
                    alt="条件丢失截图"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs text-space-200 cursor-pointer hover:text-space-100 hover:underline"
                      onClick={() => handleGoToPoint(screenshot.pointId)}
                    >
                      {getPointName(screenshot.pointId)}
                    </span>
                    <span className="text-[10px] text-aviation-orange bg-aviation-orange/10 px-1.5 py-0.5 rounded">
                      条件丢失
                    </span>
                  </div>
                  <p className="text-[11px] text-space-400 mb-2 line-clamp-2">
                    {screenshot.lostReason}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-space-500">
                      {formatTime(screenshot.createdAt)}
                    </span>
                    <button
                      onClick={() => markRelinked(screenshot.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-space-700 hover:bg-space-600 rounded text-space-300 hover:text-space-100 transition-colors"
                    >
                      <Link2 size={10} />
                      标记已关联
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-space-700">
          <p className="text-[10px] text-space-500 text-center">
            共 {unlinked.length} 条记录需要处理
          </p>
        </div>
      </Modal>

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="截图预览"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
