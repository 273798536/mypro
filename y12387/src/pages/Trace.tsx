import { useState } from 'react';
import { Header } from '@/components/common/Header';
import { useSampleStore } from '@/store/useSampleStore';
import { useTrackStore } from '@/store/useTrackStore';
import { useLicenseStore } from '@/store/useLicenseStore';
import { traceForward, traceBackward, flattenTraceTree } from '@/utils/traceUtils';
import { ArrowRight, ArrowLeft, Search, Music, Disc, FileCheck } from 'lucide-react';

export const Trace = () => {
  const { samples } = useSampleStore();
  const { tracks } = useTrackStore();
  const { licenses } = useLicenseStore();
  const [traceDirection, setTraceDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedId, setSelectedId] = useState('');
  const [traceResult, setTraceResult] = useState<any>(null);

  const handleTrace = () => {
    if (!selectedId) return;

    if (traceDirection === 'forward') {
      const result = traceForward(selectedId, samples, tracks, licenses);
      setTraceResult(result);
    } else {
      const result = traceBackward(selectedId, licenses, tracks, samples);
      setTraceResult(result);
    }
  };

  const getNodeColor = (type: string, status: string) => {
    if (status === 'danger') return 'bg-danger/20 border-danger/50 text-danger';
    if (status === 'warning') return 'bg-warning/20 border-warning/50 text-warning';
    if (type === 'sample') return 'bg-accent/20 border-accent/50 text-accent';
    if (type === 'track') return 'bg-success/20 border-success/50 text-success';
    return 'bg-purple-500/20 border-purple-500/50 text-purple-400';
  };

  const getNodeIcon = (type: string) => {
    if (type === 'sample') return <Music className="w-4 h-4" />;
    if (type === 'track') return <Disc className="w-4 h-4" />;
    return <FileCheck className="w-4 h-4" />;
  };

  const renderNode = (node: any, level = 0) => {
    return (
      <div key={node.id} className="relative">
        {level > 0 && (
          <div className="absolute left-0 top-1/2 w-8 h-px bg-white/20 -translate-x-8" />
        )}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getNodeColor(node.type, node.status)} mb-2`}
          style={{ marginLeft: level * 64 }}
        >
          {getNodeIcon(node.type)}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/20" />
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="双向追溯" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">追溯设置</h3>
            
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => { setTraceDirection('forward'); setSelectedId(''); setTraceResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                  traceDirection === 'forward'
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-white/10 text-gray-400 hover:bg-white/5'
                }`}
              >
                <ArrowRight className="w-5 h-5" />
                <span>正向追溯（素材→曲目→授权）</span>
              </button>
              <button
                onClick={() => { setTraceDirection('backward'); setSelectedId(''); setTraceResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                  traceDirection === 'backward'
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-white/10 text-gray-400 hover:bg-white/5'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>反向追溯（授权→曲目→素材）</span>
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 appearance-none"
                >
                  <option value="">
                    {traceDirection === 'forward' ? '选择采样素材...' : '选择授权报告...'}
                  </option>
                  {(traceDirection === 'forward' ? samples : licenses).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleTrace}
                disabled={!selectedId}
                className="px-6 py-3 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                开始追溯
              </button>
            </div>
          </div>

          {traceResult && (
            <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-6">追溯链路</h3>
              <div className="pl-8">
                {renderNode(traceResult)}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-4">追溯节点列表</h4>
                <div className="space-y-2">
                  {flattenTraceTree(traceResult).map((node, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg ${getNodeColor(node.type, node.status)}`}
                    >
                      {getNodeIcon(node.type)}
                      <span className="text-sm font-medium">{node.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {node.type === 'sample' ? '采样素材' : node.type === 'track' ? '曲目项目' : '授权报告'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
