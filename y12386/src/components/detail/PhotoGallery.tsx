import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, X, Camera, Calendar, User, Tag } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { formatDateTime } from '@/utils/dataMapper';
import type { Photo } from '@/store/types';

interface PhotoGalleryProps {
  instrumentId: string;
}

const PhotoGallery = ({ instrumentId }: PhotoGalleryProps) => {
  const { getPhotosByInstrumentId } = useAppStore();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const photos = getPhotosByInstrumentId(instrumentId);

  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h3 className="title-section mb-4 flex items-center gap-2">
          <Image className="w-4 h-4" />
          照片留痕画廊
        </h3>
        <div className="text-center py-12 text-midnight-400">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无照片留痕</p>
          <p className="text-sm mt-1">该乐器暂无上传的照片记录</p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h3 className="title-section mb-6 flex items-center gap-2">
          <Image className="w-4 h-4" />
          照片留痕画廊
          <span className="text-xs text-midnight-400 ml-2">共 {photos.length} 张</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo: Photo, index: number) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedPhoto(photo)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-square rounded-btn overflow-hidden border border-midnight-600 hover:border-amber-gold-500 transition-colors">
                <img
                  src={photo.url}
                  alt={photo.description}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs text-white font-medium truncate">{photo.description}</p>
                    <p className="text-xs text-white/70 mt-1">{formatDateTime(photo.uploadTime)}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-midnight-400 mt-2 truncate">{photo.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full bg-midnight-800 rounded-btn overflow-hidden shadow-2xl"
            >
              <div className="relative">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.description}
                  className="w-full max-h-[70vh] object-contain bg-midnight-900"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <h4 className="text-lg font-medium text-midnight-100 mb-4">{selectedPhoto.description}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-midnight-400" />
                    <span className="text-midnight-400">分类：</span>
                    <span className="text-midnight-200">{selectedPhoto.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-midnight-400" />
                    <span className="text-midnight-400">上传：</span>
                    <span className="text-midnight-200">{formatDateTime(selectedPhoto.uploadTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-midnight-400" />
                    <span className="text-midnight-400">上传者：</span>
                    <span className="text-midnight-200">{selectedPhoto.uploader}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-midnight-400" />
                    <span className="text-midnight-400">关联事件：</span>
                    <span className="text-midnight-200 font-mono">{selectedPhoto.traceIds[0] || '-'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PhotoGallery;
