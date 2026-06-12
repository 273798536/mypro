import { useState } from 'react';
import {
  Camera,
  Search,
  Filter,
  AlertTriangle,
  MapPin,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { photoCategories } from '@/data/mockData';
import { formatDateTime, getRelativeTime } from '@/utils/formatters';
import Modal from '@/components/Modal';

export default function PhotosPage() {
  const { inspectionPhotos, isFirstVisit } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showIssueOnly, setShowIssueOnly] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const filteredPhotos = inspectionPhotos.filter((photo) => {
    const matchesCategory = selectedCategory === 'all' || photo.category === selectedCategory;
    const matchesSearch =
      photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIssue = !showIssueOnly || photo.hasIssue;
    return matchesCategory && matchesSearch && matchesIssue;
  });

  const currentPhotoIndex = selectedPhoto
    ? filteredPhotos.findIndex((p) => p.id === selectedPhoto)
    : -1;

  const openViewer = (photoId: string) => {
    setSelectedPhoto(photoId);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setSelectedPhoto(null);
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex - 1].id);
    }
  };

  const nextPhoto = () => {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex + 1].id);
    }
  };

  const currentPhoto = selectedPhoto
    ? inspectionPhotos.find((p) => p.id === selectedPhoto)
    : null;

  if (isFirstVisit) return null;

  const stations = Array.from(new Set(inspectionPhotos.map((p) => p.stationName)));
  const issueCount = inspectionPhotos.filter((p) => p.hasIssue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display mb-1">巡检照片</h1>
          <p className="text-gray-400 text-sm">出问题时回看，按时间和站点追溯</p>
        </div>
        <div className="flex items-center gap-2">
          {issueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs text-red-300">{issueCount} 个问题标记</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="搜索照片标题、站点、描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     placeholder:text-gray-600 focus:outline-none focus:border-ocean-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <div className="flex gap-1">
            {photoCategories.slice(0, 5).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowIssueOnly(!showIssueOnly)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
            showIssueOnly
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
          }`}
        >
          <AlertTriangle size={14} />
          仅显示问题
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5
                     hover:border-ocean-500/30 transition-all duration-300 cursor-pointer
                     hover:shadow-lg hover:shadow-ocean-500/10"
            style={{
              opacity: 0,
              animation: `fadeInUp 0.4s ease-out ${index * 50}ms forwards`,
            }}
            onClick={() => openViewer(photo.id)}
          >
            <div className="aspect-square relative overflow-hidden">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {photo.hasIssue && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 backdrop-blur-sm">
                  <AlertTriangle size={12} className="text-white" />
                  <span className="text-xs text-white font-medium">问题</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-xs text-white/80 line-clamp-2">{photo.description}</p>
              </div>
            </div>

            <div className="p-3">
              <h3 className="text-sm font-medium text-white mb-1 truncate">{photo.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin size={12} />
                <span className="truncate">{photo.stationName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                <Clock size={12} />
                <span>{getRelativeTime(photo.takenAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="py-16 text-center">
          <Camera size={48} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">暂无匹配的照片</p>
        </div>
      )}

      <Modal
        isOpen={viewerOpen}
        onClose={closeViewer}
        title={currentPhoto?.title || ''}
        size="xl"
      >
        {currentPhoto && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-deep-800">
              <img
                src={currentPhoto.imageUrl}
                alt={currentPhoto.title}
                className="w-full max-h-[60vh] object-contain"
              />
              
              {currentPhotoIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white
                           hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              
              {currentPhotoIndex < filteredPhotos.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white
                           hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {currentPhoto.hasIssue && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90">
                  <AlertTriangle size={14} className="text-white" />
                  <span className="text-sm text-white font-medium">
                    {currentPhoto.issueType || '存在问题'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">站点</p>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-ocean-400" />
                  <span className="text-sm text-white">{currentPhoto.stationName}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">拍摄时间</p>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-ocean-400" />
                  <span className="text-sm text-white">{formatDateTime(currentPhoto.takenAt)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">分类</p>
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-ocean-400" />
                  <span className="text-sm text-white">{currentPhoto.category}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">问题标记</p>
                <span className={`text-sm ${currentPhoto.hasIssue ? 'text-red-400' : 'text-emerald-400'}`}>
                  {currentPhoto.hasIssue ? '是' : '否'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">描述</p>
              <p className="text-sm text-gray-300">{currentPhoto.description}</p>
            </div>

            <div className="text-center text-xs text-gray-600">
              {currentPhotoIndex + 1} / {filteredPhotos.length}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
