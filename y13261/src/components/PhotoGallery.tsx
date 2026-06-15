import { useState } from 'react';
import { Camera, MapPin, Edit2, Plus, Image as ImageIcon, Clock, User } from 'lucide-react';
import type { Photo } from '@/types';

interface PhotoGalleryProps {
  photos: Photo[];
  onAddPhoto?: (photo: Omit<Photo, 'id'>) => void;
}

function PhotoCard({ photo }: { photo: Photo }) {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="bg-white border border-steel-100 rounded-md overflow-hidden shadow-sm hover:shadow-card transition-shadow">
      <div
        className="aspect-[4/3] bg-gradient-to-br from-steel-100 to-steel-50 flex items-center justify-center cursor-pointer relative"
        onClick={() => setShowNote(!showNote)}
      >
        <div className="text-center">
          <ImageIcon size={32} className="text-steel-300 mx-auto mb-2" />
          <p className="text-xs text-steel-400">点击查看详情</p>
        </div>
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          📷 现场照片
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-steel-500 mb-2">
          <MapPin size={12} />
          <span className="truncate">{photo.locationDesc}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-steel-300">
          <div className="flex items-center gap-1">
            <User size={10} />
            <span>{photo.uploader}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{photo.uploadTime.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {showNote && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="pt-3 border-t border-steel-100">
            <div className="text-xs text-steel-400 mb-1.5 flex items-center gap-1">
              <Edit2 size={10} />
              补录变更说明
            </div>
            <p className="text-sm text-primary-600 bg-primary-50 rounded p-2 leading-relaxed">
              {photo.changeNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhotoGallery({ photos, onAddPhoto }: PhotoGalleryProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [locationDesc, setLocationDesc] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [pointX, setPointX] = useState('50');
  const [pointY, setPointY] = useState('50');

  const handleSubmit = () => {
    if (!locationDesc.trim()) return;

    const autoNote = changeNote || `补录${locationDesc}照片，供复核参考`;

    onAddPhoto?.({
      reviewId: '',
      url: '',
      locationDesc,
      changeNote: autoNote,
      uploadTime: new Date().toLocaleString('zh-CN'),
      uploader: '老何',
      point: { x: Number(pointX), y: Number(pointY) },
    });

    setLocationDesc('');
    setChangeNote('');
    setPointX('50');
    setPointY('50');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-primary-500" />
          <span className="text-sm font-medium text-steel-700">现场照片</span>
          <span className="text-xs text-steel-400">共 {photos.length} 张</span>
        </div>
        {onAddPhoto && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
          >
            <Plus size={14} />
            补录照片
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-primary-50/50 border border-primary-100 rounded-md p-4 space-y-3 animate-fade-in">
          <div className="text-sm font-medium text-steel-700 mb-2">补录现场照片</div>

          <div>
            <label className="text-xs text-steel-500 block mb-1">点位描述</label>
            <input
              type="text"
              value={locationDesc}
              onChange={(e) => setLocationDesc(e.target.value)}
              placeholder="例如：西南角雨水口"
              className="w-full px-3 py-2 border border-steel-200 rounded-md text-sm focus:outline-none focus:border-primary-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-steel-500 block mb-1">X坐标 (%)</label>
              <input
                type="number"
                value={pointX}
                onChange={(e) => setPointX(e.target.value)}
                className="w-full px-3 py-2 border border-steel-200 rounded-md text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-steel-500 block mb-1">Y坐标 (%)</label>
              <input
                type="number"
                value={pointY}
                onChange={(e) => setPointY(e.target.value)}
                className="w-full px-3 py-2 border border-steel-200 rounded-md text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-steel-500 block mb-1">
              变更说明 <span className="text-steel-300">（留空将自动生成）</span>
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="描述这次补录带来的变化..."
              className="w-full px-3 py-2 border border-steel-200 rounded-md text-sm focus:outline-none focus:border-primary-400 resize-none h-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 transition-colors"
            >
              确认补录
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-steel-500 text-sm hover:text-steel-700 transition-colors"
            >
              取消
            </button>
          </div>

          <p className="text-xs text-steel-400">
            💡 补录后，地图点位和页面摘要将自动更新，记录这次补录的变更
          </p>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-8 text-steel-400 text-sm">
          暂无现场照片
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
}
