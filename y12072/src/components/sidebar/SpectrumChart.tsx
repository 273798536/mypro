import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { formatFrequency } from '../../utils/dataMapper';

export function SpectrumChart() {
  const selectedSegmentId = useAppStore(state => state.selectedSegmentId);
  const spectrums = useAppStore(state => state.spectrums);
  const annotations = useAppStore(state => state.annotations);
  const currentTime = useAppStore(state => state.currentTime);
  
  const selectedSpectrum = useMemo(() => {
    if (!selectedSegmentId) return null;
    
    const segmentSpectrums = spectrums.filter(s => s.segmentId === selectedSegmentId);
    if (segmentSpectrums.length === 0) return null;
    
    const segmentAnnotations = annotations.filter(a => a.segmentId === selectedSegmentId);
    const currentAnnotationTime = currentTime - (segmentSpectrums[0]?.time || 0);
    
    let closest = segmentSpectrums[0];
    let minDiff = Math.abs(closest.time - currentAnnotationTime);
    
    segmentSpectrums.forEach(s => {
      const diff = Math.abs(s.time - currentAnnotationTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    });
    
    return closest;
  }, [selectedSegmentId, spectrums, annotations, currentTime]);

  const chartData = useMemo(() => {
    if (!selectedSpectrum) return [];
    
    return selectedSpectrum.frequencyBins.map((value, index) => ({
      frequency: Math.pow(10, (index / 31) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20)),
      energy: value,
      isMissing: selectedSpectrum.missingBands.includes(index)
    }));
  }, [selectedSpectrum]);

  if (!selectedSegmentId) {
    return (
      <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
        <h3 className="text-[#F5F0E6] font-medium mb-2 text-sm">频谱特征</h3>
        <p className="text-[#A0A0A0] text-sm text-center py-8">
          请选择一个录音片段查看频谱特征
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
      <h3 className="text-[#F5F0E6] font-medium mb-2 text-sm">频谱特征</h3>
      
      {selectedSpectrum && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#2A2A3A] rounded p-2">
              <div className="text-[#A0A0A0] text-xs">频谱质心</div>
              <div className="text-[#F5F0E6] font-mono text-sm">
                {formatFrequency(selectedSpectrum.centroid)}
              </div>
            </div>
            <div className="bg-[#2A2A3A] rounded p-2">
              <div className="text-[#A0A0A0] text-xs">频谱带宽</div>
              <div className="text-[#F5F0E6] font-mono text-sm">
                {formatFrequency(selectedSpectrum.bandwidth)}
              </div>
            </div>
            <div className="bg-[#2A2A3A] rounded p-2">
              <div className="text-[#A0A0A0] text-xs">滚降点</div>
              <div className="text-[#F5F0E6] font-mono text-sm">
                {formatFrequency(selectedSpectrum.rolloff)}
              </div>
            </div>
            <div className="bg-[#2A2A3A] rounded p-2">
              <div className="text-[#A0A0A0] text-xs">缺失频段</div>
              <div className="text-[#E74C3C] font-mono text-sm">
                {selectedSpectrum.missingBands.length > 0 
                  ? `${selectedSpectrum.missingBands.length} 个` 
                  : '无'}
              </div>
            </div>
          </div>
          
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A5276" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1A5276" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis
                  dataKey="frequency"
                  scale="log"
                  domain={[20, 20000]}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()}
                  stroke="#888"
                  fontSize={10}
                />
                <YAxis stroke="#888" fontSize={10} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E1E2A', border: '1px solid #3A3A4A' }}
                  labelStyle={{ color: '#F5F0E6' }}
                  formatter={(value: number) => [value.toFixed(3), '能量']}
                  labelFormatter={(label) => formatFrequency(label)}
                />
                <Area
                  type="monotone"
                  dataKey="energy"
                  stroke="#1A5276"
                  fillOpacity={1}
                  fill="url(#colorEnergy)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {selectedSpectrum.missingBands.length > 0 && (
            <div className="mt-2 p-2 bg-[#E67E22]/10 border border-[#E67E22]/30 rounded text-xs text-[#E67E22]">
              ⚠️ 检测到 {selectedSpectrum.missingBands.length} 个缺失频段，请联系音频技术人员核对
            </div>
          )}
        </>
      )}
    </div>
  );
}
