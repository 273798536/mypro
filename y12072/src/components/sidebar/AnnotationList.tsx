import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/dataMapper';
import { FINGER_TYPE_COLORS } from '../../utils/colorScheme';

export function AnnotationList() {
  const selectedSegmentId = useAppStore(state => state.selectedSegmentId);
  const annotations = useAppStore(state => state.annotations);
  const selectPoints = useAppStore(state => state.selectPoints);
  const spacePoints = useAppStore(state => state.spacePoints);
  const currentTime = useAppStore(state => state.currentTime);
  const segments = useAppStore(state => state.segments);

  const segmentAnnotations = useMemo(() => {
    if (!selectedSegmentId) return [];
    return annotations
      .filter(a => a.segmentId === selectedSegmentId)
      .sort((a, b) => a.time - b.time);
  }, [selectedSegmentId, annotations]);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  const handleAnnotationClick = (annotationId: string) => {
    const point = spacePoints.find(p => p.annotationId === annotationId);
    if (point) {
      selectPoints([point.id]);
    }
  };

  if (!selectedSegmentId) {
    return (
      <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
        <h3 className="text-[#F5F0E6] font-medium mb-2 text-sm">指法标注</h3>
        <p className="text-[#A0A0A0] text-sm text-center py-6">
          请选择一个录音片段查看指法标注
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#F5F0E6] font-medium text-sm">指法标注</h3>
        <span className="text-[#A0A0A0] text-xs">
          {segmentAnnotations.length} 条
        </span>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {segmentAnnotations.map(annotation => {
          const point = spacePoints.find(p => p.annotationId === annotation.id);
          const isNearCurrent = selectedSegment && 
            Math.abs((selectedSegment.startTime + annotation.time) - currentTime) < 1;
          
          return (
            <div
              key={annotation.id}
              onClick={() => handleAnnotationClick(annotation.id)}
              className={`p-3 rounded cursor-pointer transition-all ${
                isNearCurrent
                  ? 'bg-[#8B2323]/20 border border-[#8B2323]'
                  : 'bg-[#2A2A3A] hover:bg-[#3A3A4A] border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: FINGER_TYPE_COLORS[annotation.fingerType] || '#888' }}
                  />
                  <span className="text-[#F5F0E6] text-sm font-medium">
                    {annotation.fingerType}
                  </span>
                  <span className="text-[#A0A0A0] text-xs font-mono">
                    {formatTime(annotation.time)}
                  </span>
                </div>
                
                {annotation.isMisaligned ? (
                  <span className="flex items-center gap-1 text-[#E74C3C] text-xs">
                    <AlertTriangle size={12} />
                    待确认
                  </span>
                ) : annotation.verified ? (
                  <span className="flex items-center gap-1 text-[#27AE60] text-xs">
                    <CheckCircle2 size={12} />
                    已确认
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[#F39C12] text-xs">
                    <Clock size={12} />
                    待审核
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#A0A0A0]">右手：</span>
                  <span className="text-[#F5F0E6]">{annotation.rightHand}</span>
                </div>
                <div>
                  <span className="text-[#A0A0A0]">左手：</span>
                  <span className="text-[#F5F0E6]">{annotation.leftHand}</span>
                </div>
                <div>
                  <span className="text-[#A0A0A0]">徽位：</span>
                  <span className="text-[#F5F0E6]">{annotation.fingerPosition} 徽</span>
                </div>
                <div>
                  <span className="text-[#A0A0A0]">置信度：</span>
                  <span className={`font-mono ${
                    annotation.confidence > 0.7 ? 'text-[#27AE60]' :
                    annotation.confidence > 0.5 ? 'text-[#F39C12]' : 'text-[#E74C3C]'
                  }`}>
                    {(annotation.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {point && (
                <div className="mt-2 text-xs text-[#A0A0A0] font-mono">
                  空间位置: ({point.x.toFixed(1)}, {point.y.toFixed(1)}, {point.z.toFixed(1)})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
