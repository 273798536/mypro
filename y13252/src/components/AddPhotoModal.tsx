import { useState } from 'react';
import { X, Camera, MapPin, User, Loader2, AlertCircle } from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore.js';

interface AddPhotoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddPhotoModal({ open, onClose }: AddPhotoModalProps) {
  const { addPhoto, loading, selectedComplaintId } = useComplaintStore();
  const [formData, setFormData] = useState({
    originalName: '',
    systemName: '',
    url: '',
    latitude: 31.2304,
    longitude: 121.4737,
    address: '',
    source: '现场补录'
  });
  const [previewUrl, setPreviewUrl] = useState('');

  const samplePrompts = [
    '夜市外摆摊位，夜间街道，小吃摊，路灯照明，城市夜景，真实场景，摄影照片',
    '城管巡检现场，街道占道经营，夜市摊位，人行道，城市管理，真实场景照片',
    '夜市美食街，人流密集，外摆桌椅，霓虹灯，夜晚城市生活，写实摄影'
  ];

  const generateImageUrl = (prompt: string) => {
    const encoded = encodeURIComponent(prompt);
    return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=square_hd`;
  };

  const handleQuickFill = () => {
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    const url = generateImageUrl(randomPrompt);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = `${now.getHours()}${now.getMinutes().toString().padStart(2, '0')}`;
    
    setFormData(prev => ({
      ...prev,
      originalName: `夜市外摆_红旗路_${dateStr}_${timeStr}.jpg`,
      systemName: `夜市外摆_红旗路_${dateStr}_${timeStr}.jpg`,
      url: url,
      address: '红旗路123号门口'
    }));
    setPreviewUrl(url);
  };

  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;
    
    await addPhoto(selectedComplaintId, formData);
    onClose();
    setFormData({
      originalName: '',
      systemName: '',
      url: '',
      latitude: 31.2304,
      longitude: 121.4737,
      address: '',
      source: '现场补录'
    });
    setPreviewUrl('');
  };

  const isNameMismatch = formData.originalName && formData.systemName && formData.originalName !== formData.systemName;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#1e3a5f]" />
            补录现场照片
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin">
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  原始文件名
                </label>
                <input
                  type="text"
                  value={formData.originalName}
                  onChange={e => setFormData(prev => ({ ...prev, originalName: e.target.value }))}
                  placeholder="如：夜市外摆_红旗路_20260616_2030.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  系统重命名
                </label>
                <input
                  type="text"
                  value={formData.systemName}
                  onChange={e => setFormData(prev => ({ ...prev, systemName: e.target.value }))}
                  placeholder="如：夜市外摆_红旗路_20260616_2030.jpg"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent ${
                    isNameMismatch ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {isNameMismatch && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    名称不一致，系统将标记此照片
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  照片URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.url}
                    onChange={e => handleUrlChange(e.target.value)}
                    placeholder="输入图片URL或点击右侧快速填充"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="px-3 py-2 bg-[#1e3a5f] text-white text-xs rounded-lg hover:bg-[#2a4a70] transition-colors whitespace-nowrap"
                  >
                    快速填充
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    纬度
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={e => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    经度
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={e => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  拍摄地址
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="如：红旗路123号门口"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  数据来源
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="如：现场补录-周姐"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="w-48 flex-shrink-0">
              <div className="text-sm font-medium text-slate-700 mb-1.5">照片预览</div>
              <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    暂无预览
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <div>坐标: ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})</div>
                <div>地址: {formData.address || '未填写'}</div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !formData.url || !formData.originalName || !formData.systemName}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              确认补录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
