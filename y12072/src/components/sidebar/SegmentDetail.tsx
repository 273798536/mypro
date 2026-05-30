import { useMemo, useState } from 'react';
import { FileAudio, Clock, Disc3, Plus, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/dataMapper';
import { QUALITY_COLORS } from '../../utils/colorScheme';
import { QUALITY_LABELS } from '../../types';

export function SegmentDetail() {
  const selectedSegmentId = useAppStore(state => state.selectedSegmentId);
  const segments = useAppStore(state => state.segments);
  const annotations = useAppStore(state => state.annotations);
  const issues = useAppStore(state => state.issues);
  const addConclusion = useAppStore(state => state.addConclusion);
  const conclusions = useAppStore(state => state.conclusions);
  const [newConclusionTitle, setNewConclusionTitle] = useState('');
  const [newConclusionContent, setNewConclusionContent] = useState('');
  const [showConclusionForm, setShowConclusionForm] = useState(false);

  const segment = useMemo(() => {
    return segments.find(s => s.id === selectedSegmentId);
  }, [selectedSegmentId, segments]);

  const segmentAnnotations = useMemo(() => {
    return annotations.filter(a => a.segmentId === selectedSegmentId);
  }, [selectedSegmentId, annotations]);

  const segmentIssues = useMemo(() => {
    return issues.filter(i => i.relatedSegmentIds.includes(selectedSegmentId || ''));
  }, [selectedSegmentId, issues]);

  const segmentConclusions = useMemo(() => {
    return conclusions.filter(c => c.segmentIds.includes(selectedSegmentId || ''));
  }, [selectedSegmentId, conclusions]);

  const handleAddConclusion = () => {
    if (!selectedSegmentId || !newConclusionTitle.trim()) return;
    
    addConclusion({
      title: newConclusionTitle,
      content: newConclusionContent,
      dataVersion: 'v1.0',
      segmentIds: [selectedSegmentId],
      annotationVersions: segmentAnnotations.reduce((acc, a) => {
        acc[a.id] = 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    setNewConclusionTitle('');
    setNewConclusionContent('');
    setShowConclusionForm(false);
  };

  if (!segment) {
    return (
      <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
        <h3 className="text-[#F5F0E6] font-medium mb-2 text-sm">片段详情</h3>
        <p className="text-[#A0A0A0] text-sm text-center py-6">
          请选择一个录音片段查看详情
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#F5F0E6] font-medium text-sm">片段详情</h3>
        <span
          className="px-2 py-0.5 rounded text-xs"
          style={{
            backgroundColor: `${QUALITY_COLORS[segment.quality]}20`,
            color: QUALITY_COLORS[segment.quality]
          }}
        >
          {QUALITY_LABELS[segment.quality]}
        </span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <FileAudio size={14} className="text-[#A0A0A0]" />
          <span className="text-[#F5F0E6] text-sm font-medium">{segment.name}</span>
        </div>
        
        <p className="text-[#A0A0A0] text-xs leading-relaxed">
          {segment.description}
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#2A2A3A] rounded p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[#A0A0A0] text-xs mb-1">
              <Clock size={10} />
              时长
            </div>
            <div className="text-[#F5F0E6] font-mono text-sm">
              {formatTime(segment.duration)}
            </div>
          </div>
          <div className="bg-[#2A2A3A] rounded p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[#A0A0A0] text-xs mb-1">
              <Disc3 size={10} />
              标注
            </div>
            <div className="text-[#F5F0E6] font-mono text-sm">
              {segmentAnnotations.length}
            </div>
          </div>
          <div className="bg-[#2A2A3A] rounded p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[#A0A0A0] text-xs mb-1">
              <MessageSquare size={10} />
              问题
            </div>
            <div className="text-[#F5F0E6] font-mono text-sm">
              {segmentIssues.length}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#A0A0A0]">时间范围：</span>
          <span className="text-[#F5F0E6] font-mono">
            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
          </span>
        </div>
      </div>
      
      {segmentConclusions.length > 0 && (
        <div className="border-t border-[#3A3A4A] pt-3 mb-3">
          <h4 className="text-[#F5F0E6] text-xs font-medium mb-2">研究结论</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {segmentConclusions.map(conclusion => (
              <div key={conclusion.id} className="bg-[#2A2A3A] rounded p-2">
                <div className="text-[#F5F0E6] text-xs font-medium mb-1">
                  {conclusion.title}
                </div>
                <p className="text-[#A0A0A0] text-xs line-clamp-2">
                  {conclusion.content}
                </p>
                <div className="text-[#888] text-xs mt-1 font-mono">
                  v{conclusion.dataVersion} · {new Date(conclusion.updatedAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!showConclusionForm ? (
        <button
          onClick={() => setShowConclusionForm(true)}
          className="w-full py-2 bg-[#2A2A3A] hover:bg-[#3A3A4A] text-[#F5F0E6] text-xs rounded transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          添加研究结论
        </button>
      ) : (
        <div className="border-t border-[#3A3A4A] pt-3 space-y-2">
          <input
            type="text"
            value={newConclusionTitle}
            onChange={(e) => setNewConclusionTitle(e.target.value)}
            placeholder="结论标题..."
            className="w-full px-3 py-2 bg-[#2A2A3A] border border-[#3A3A4A] rounded text-[#F5F0E6] text-sm focus:outline-none focus:border-[#8B2323]"
          />
          <textarea
            value={newConclusionContent}
            onChange={(e) => setNewConclusionContent(e.target.value)}
            placeholder="详细描述..."
            rows={3}
            className="w-full px-3 py-2 bg-[#2A2A3A] border border-[#3A3A4A] rounded text-[#F5F0E6] text-sm focus:outline-none focus:border-[#8B2323] resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddConclusion}
              className="flex-1 py-2 bg-[#8B2323] hover:bg-[#A52A2A] text-white text-xs rounded transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setShowConclusionForm(false)}
              className="px-4 py-2 bg-[#2A2A3A] hover:bg-[#3A3A4A] text-[#A0A0A0] text-xs rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
