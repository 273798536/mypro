import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSampleStore } from '@/store/useSampleStore';

export const SampleForm = () => {
  const navigate = useNavigate();
  const { addSample } = useSampleStore();
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    format: 'WAV',
    duration: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSample = {
      id: 's_' + Date.now(),
      ...formData,
      hash: Math.random().toString(36).substring(2, 14),
      createdBy: '音乐制作人',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      versions: [],
    };
    addSample(newSample);
    navigate('/samples');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/samples')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-2xl font-bold text-white">新增采样素材</h2>
      </div>

      <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              素材名称 *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="输入素材名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              来源 *
            </label>
            <input
              type="text"
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="如: Splice, Native Instruments"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                格式
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="WAV">WAV</option>
                <option value="MP3">MP3</option>
                <option value="FLAC">FLAC</option>
                <option value="AIFF">AIFF</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                时长（秒）
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="输入时长"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/samples')}
              className="px-6 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
