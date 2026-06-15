import { useState } from 'react';
import { Image, AlertCircle, Clock, MapPin, User, Eye, X } from 'lucide-react';
import type { Photo } from '../../shared/types.js';
import { calculateDistance, formatTime } from '../utils/geoUtils.js';

interface PhotoListProps {
  photos: Photo[];
  complaintLat: number;
  complaintLon: number;
}

export default function PhotoList({ photos, complaintLat, complaintLon }: PhotoListProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Image className="w-5 h-5 text-[#1e3a5f]" />
        巡检照片 ({photos.length}张)
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => {
          const distance = calculateDistance(complaintLat, complaintLon, photo.latitude, photo.longitude);
          const hasOffset = distance > 50;
          const staggerClass = `animate-stagger-${Math.min(index + 1, 5)}` as const;
          
          return (
            <div
              key={photo.id}
              className={`
                animate-fade-in ${staggerClass} opacity-0
                relative group rounded-lg overflow-hidden border border-slate-200
                hover:border-[#1e3a5f] hover:shadow-md transition-all duration-200
                ${photo.isNameMismatch ? 'ring-2 ring-red-500/50' : ''}
                ${hasOffset ? 'ring-2 ring-amber-500/50' : ''}
              `}
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="flex items-center gap-1.5 bg-white/90 text-slate-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-white transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    查看详情
                  </button>
                </div>
                
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>
                
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {photo.isNameMismatch && (
                    <div className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      名称不一致
                    </div>
                  )}
                  {hasOffset && (
                    <div className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      偏移{distance}米
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-2 bg-slate-50">
                <div className="text-xs font-medium text-slate-700 truncate" title={photo.originalName}>
                  {photo.originalName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(photo.takenAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h4 className="font-semibold text-slate-800">照片详情</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-0">
              <div className="bg-slate-100 flex items-center justify-center p-4">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.originalName}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] scrollbar-thin">
                <div>
                  <h5 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#1e3a5f]" />
                    基本信息
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">照片编号</span>
                      <span className="font-mono text-slate-700">{selectedPhoto.id}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">拍摄时间</span>
                      <span className="text-slate-700">{formatTime(selectedPhoto.takenAt)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">数据来源</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {selectedPhoto.source}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#1e3a5f]" />
                    位置信息
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">拍摄地址</span>
                      <span className="text-slate-700">{selectedPhoto.address}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">GPS坐标</span>
                      <span className="font-mono text-slate-700">
                        ({selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)})
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">与投诉点距离</span>
                      <span className={calculateDistance(complaintLat, complaintLon, selectedPhoto.latitude, selectedPhoto.longitude) > 50 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                        {calculateDistance(complaintLat, complaintLon, selectedPhoto.latitude, selectedPhoto.longitude)}米
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4 text-[#1e3a5f]" />
                    文件名称校验
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="text-xs text-slate-500 mb-1">原始文件名</div>
                      <div className="font-mono text-slate-700 break-all">{selectedPhoto.originalName}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="text-xs text-slate-500 mb-1">系统重命名</div>
                      <div className="font-mono text-slate-700 break-all">{selectedPhoto.systemName}</div>
                    </div>
                    {selectedPhoto.isNameMismatch && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        <div className="font-medium mb-1">⚠️ 名称不一致</div>
                        <div className="text-xs">
                          原始文件名"{selectedPhoto.originalName}"与系统重命名"{selectedPhoto.systemName}"不一致，
                          可能导致早晚高峰巡检口径不一致，需核实照片实际拍摄地点。
                        </div>
                      </div>
                    )}
                    {!selectedPhoto.isNameMismatch && (
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                        ✅ 名称一致，校验通过
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
