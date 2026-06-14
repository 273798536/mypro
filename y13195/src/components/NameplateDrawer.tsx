import { useStore } from '@/store/useStore';
import { X, Shield, ClipboardList } from 'lucide-react';

interface NameplateDrawerProps {
  open: boolean;
  equipmentCode: string | null;
  onClose: () => void;
}

export default function NameplateDrawer({ open, equipmentCode, onClose }: NameplateDrawerProps) {
  const getNameplateByCode = useStore((s) => s.getNameplateByCode);
  const getDuplicateRecords = useStore((s) => s.getDuplicateRecords);

  const nameplate = equipmentCode ? getNameplateByCode(equipmentCode) : undefined;
  const duplicates = equipmentCode ? getDuplicateRecords(equipmentCode) : [];

  const recordTypeTag = (type: 'smooth' | 'supplementary' | 'anomalous') => {
    const map = {
      smooth: 'tag-smooth',
      supplementary: 'tag-supplementary',
      anomalous: 'tag-anomalous',
    };
    const labelMap = {
      smooth: '正常',
      supplementary: '补充',
      anomalous: '异常',
    };
    return <span className={map[type]}>{labelMap[type]}</span>;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-base-900/60 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 z-50 h-full max-w-[400px] w-full bg-base-800 border-l border-base-600 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-600">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-industrial-blue" />
            <div>
              <h2 className="text-lg font-medium text-white">铭牌原始数据</h2>
              {equipmentCode && (
                <span className="text-xs text-base-400 font-mono">{equipmentCode}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-base-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-65px)] px-6 py-4 space-y-6">
          {nameplate ? (
            <div className="card-base space-y-4">
              <h3 className="section-title">铭牌信息</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-base-400">额定张力</span>
                  <div className="param-value">
                    {nameplate.ratedTension} <span className="text-base-400">N</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-base-400">校准日期</span>
                  <div className="param-value">{nameplate.calibrationDate}</div>
                </div>
                <div>
                  <span className="text-xs text-base-400">校准单位</span>
                  <div className="param-value">{nameplate.calibrationUnit}</div>
                </div>
                <div>
                  <span className="text-xs text-base-400">原始规格</span>
                  <div className="param-value">{nameplate.originalSpec}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-base text-center py-8 text-base-400">
              未找到铭牌数据
            </div>
          )}

          <div className="card-base space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-industrial-blue" />
              <h3 className="section-title">涉及记录</h3>
            </div>
            {duplicates.length > 0 ? (
              <div className="space-y-2">
                {duplicates.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between bg-base-700 border border-base-600 rounded px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-base-400 font-mono">{record.id}</span>
                      {recordTypeTag(record.recordType)}
                    </div>
                    <span className="text-sm text-base-300">{record.judgment}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-base-400 text-sm">无关联记录</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
