import { useState } from 'react';
import { Music, MapPin, AlertTriangle } from 'lucide-react';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import DetectionPanel from '@/components/DetectionPanel';
import { useCanvasStore } from '@/store/canvasStore';
import { sampleDatas } from '@/data/samples';

export default function Home() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const { loadSample, status } = useCanvasStore();
  
  const handleSampleSelect = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    const sample = sampleDatas.find(s => s.id === sampleId);
    if (sample) {
      loadSample(sample);
    }
  };
  
  const getSampleIcon = (id: string) => {
    switch (id) {
      case 'smooth':
        return <Music className="text-green-400" size={20} />;
      case 'pending':
        return <AlertTriangle className="text-yellow-400" size={20} />;
      case 'bad':
        return <MapPin className="text-red-400" size={20} />;
      default:
        return null;
    }
  };
  
  const getSampleBadge = (id: string) => {
    switch (id) {
      case 'smooth':
        return <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded-full text-xs">可直接用</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-xs">需复核</span>;
      case 'bad':
        return <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded-full text-xs">明显坏数据</span>;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white font-bold text-2xl mb-2">音乐节人流热区画板</h1>
          <p className="text-slate-400 text-sm">
            检测和分析音乐节人流热区数据中的常见问题：底图坐标不完整、比例尺错用没标清、结果导出不匹配
          </p>
        </div>
        
        {status === 'idle' && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 shadow-lg">
            <h2 className="text-white font-semibold text-lg mb-4">选择样例数据开始检测</h2>
            
            <div className="grid grid-cols-3 gap-4">
              {sampleDatas.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => handleSampleSelect(sample.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedSampleId === sample.id
                      ? 'bg-indigo-900/30 border-indigo-500'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getSampleIcon(sample.id)}
                    {getSampleBadge(sample.id)}
                  </div>
                  <h3 className="text-white font-medium text-sm mb-1">{sample.name}</h3>
                  <p className="text-slate-400 text-xs">{sample.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-xs text-slate-500">
                      {sample.hotspots.length} 个热点 · {sample.mapConfig.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedSampleId && (
              <div className="mt-4 p-3 bg-indigo-900/20 rounded-lg border border-indigo-800">
                <p className="text-indigo-300 text-sm">
                  已选择: {sampleDatas.find(s => s.id === selectedSampleId)?.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  点击热点可查看详情，使用工具栏控制检测流程
                </p>
              </div>
            )}
          </div>
        )}
        
        {status !== 'idle' && (
          <>
            <div className="mb-4">
              <Toolbar />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Canvas />
              </div>
              <div>
                <DetectionPanel />
              </div>
            </div>
          </>
        )}
        
        <div className="mt-6 bg-slate-800 rounded-lg p-4 shadow-lg">
          <h3 className="text-white font-semibold text-sm mb-3">使用说明</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">1. 选择样例</p>
              <p className="text-xs text-slate-300">从三种样例中选择一种开始检测</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">2. 查看检测</p>
              <p className="text-xs text-slate-300">实时查看坐标、比例尺等问题</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">3. 结算评分</p>
              <p className="text-xs text-slate-300">点击结算生成评分表</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">4. 导出复盘</p>
              <p className="text-xs text-slate-300">导出JSON或HTML报告</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}