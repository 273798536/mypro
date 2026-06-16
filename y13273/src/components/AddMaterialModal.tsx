import { useState } from 'react';
import { X, AlertTriangle, Upload } from 'lucide-react';
import type { Material, TimelineEntry, SourceChannel } from '../types';

interface Props {
  schemeId: string;
  operator: string;
  onClose: () => void;
  onSubmit: (material: Material, timeline: TimelineEntry) => void;
}

const channelOptions: { value: SourceChannel; label: string }[] = [
  { value: 'wechat', label: '微信' },
  { value: 'onsite', label: '现场巡检' },
  { value: 'email', label: '邮件附件' },
  { value: 'other', label: '其他' },
];

const sampleImages = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bus%20stop%20inspection%20photo%20realistic&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20road%20construction%20survey%20photo&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=busy%20bus%20station%20peak%20hours&image_size=square',
];

const sampleFilenames = [
  'IMG_现场随手拍_模糊_未命名.jpg',
  '微信图片_20260615_182234.jpg',
  'wx_camera_1718445600890.jpeg',
  '邮件附件_容量验算_截图.png',
];

export function AddMaterialModal({ schemeId, operator, onClose, onSubmit }: Props) {
  const [originalFilename, setOriginalFilename] = useState(sampleFilenames[0]);
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>('wechat');
  const [isLateArrival, setIsLateArrival] = useState(false);
  const [isCapacityOverload, setIsCapacityOverload] = useState(false);
  const [isDirty, setIsDirty] = useState(true);
  const [note, setNote] = useState('');
  const [thumbnail, setThumbnail] = useState(sampleImages[0]);

  const handleSubmit = () => {
    const now = new Date().toISOString();
    const materialId = `m-${Date.now()}`;
    const material: Material = {
      id: materialId,
      schemeId,
      originalFilename,
      sourceChannel,
      uploadedAt: now,
      isCapacityOverload,
      isLateArrival,
      note,
      thumbnailUrl: thumbnail,
      isDirty,
    };
    const entry: TimelineEntry = {
      id: `t-${Date.now()}`,
      schemeId,
      type: 'material_add',
      operator,
      timestamp: now,
      changeSummary: `补录巡检照片 1 张${isLateArrival ? '（晚到附件）' : ''}${isCapacityOverload ? '（容量超限）' : ''}`,
      materialIds: [materialId],
    };
    onSubmit(material, entry);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-slateX-200 rounded-sm w-full max-w-xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slateX-200">
          <h3 className="font-serif text-base text-slateX-900">补录巡检照片</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slateX-400 hover:text-slateX-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="flex items-start gap-4">
            <div className="w-28 h-28 border border-slateX-200 rounded-sm overflow-hidden bg-slateX-50 flex-shrink-0">
              <img src={thumbnail} alt="预览" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs text-slateX-600 mb-1">原始文件名（保留原始来源，不做清洗）</label>
                <select
                  value={originalFilename}
                  onChange={(e) => setOriginalFilename(e.target.value)}
                  className="w-full h-8 px-2 text-xs font-mono border border-slateX-200 rounded-sm bg-white focus:outline-none focus:border-engineering-600"
                >
                  {sampleFilenames.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slateX-600 mb-1">示例缩略图</label>
                <div className="flex gap-2">
                  {sampleImages.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setThumbnail(img)}
                      className={`w-10 h-10 rounded-sm overflow-hidden border-2 ${
                        thumbnail === img ? 'border-engineering-600' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt={`样例${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slateX-600 mb-1">来源渠道</label>
            <div className="flex gap-2 flex-wrap">
              {channelOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSourceChannel(c.value)}
                  className={`px-3 py-1.5 text-xs border rounded-sm transition-colors ${
                    sourceChannel === c.value
                      ? 'bg-engineering-800 border-engineering-800 text-white'
                      : 'bg-white border-slateX-200 text-slateX-600 hover:border-slateX-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slateX-600 mb-1">备注说明（为何影响比选结论）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：比选截止后2天收到，改变了高峰客流估算..."
              rows={3}
              className="w-full px-2 py-1.5 text-sm border border-slateX-200 rounded-sm focus:outline-none focus:border-engineering-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 p-2 border border-slateX-200 rounded-sm cursor-pointer hover:bg-slateX-50">
              <input
                type="checkbox"
                checked={isLateArrival}
                onChange={(e) => setIsLateArrival(e.target.checked)}
                className="w-4 h-4 accent-alert-600"
              />
              <div className="text-xs">
                <div className="font-medium text-alert-700 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  晚到附件
                </div>
                <div className="text-slateX-500">比选截止后收到</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 border border-slateX-200 rounded-sm cursor-pointer hover:bg-slateX-50">
              <input
                type="checkbox"
                checked={isCapacityOverload}
                onChange={(e) => setIsCapacityOverload(e.target.checked)}
                className="w-4 h-4 accent-alert-600"
              />
              <div className="text-xs">
                <div className="font-medium text-alert-700 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  容量超限
                </div>
                <div className="text-slateX-500">材料涉及超限</div>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 border border-slateX-200 rounded-sm cursor-pointer hover:bg-slateX-50">
              <input
                type="checkbox"
                checked={isDirty}
                onChange={(e) => setIsDirty(e.target.checked)}
                className="w-4 h-4 accent-slateX-700"
              />
              <div className="text-xs">
                <div className="font-medium text-slateX-700 flex items-center gap-1">
                  <Upload size={11} />
                  保留原始痕迹
                </div>
                <div className="text-slateX-500">不清洗文件名/图片</div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slateX-200 bg-slateX-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-slateX-200 bg-white text-slateX-600 rounded-sm hover:bg-slateX-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1.5 text-sm bg-engineering-800 text-white rounded-sm hover:bg-engineering-900"
          >
            确认补录（写入时间线）
          </button>
        </div>
      </div>
    </div>
  );
}
