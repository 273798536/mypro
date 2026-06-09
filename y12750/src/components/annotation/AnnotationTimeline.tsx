import { useState } from 'react';
import { MessageSquarePlus, Send, FlaskConical, AlertTriangle, LineChart, FileText } from 'lucide-react';
import type { Annotation, TitrationRecord } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  record: TitrationRecord;
}

const refTypeIcon = {
  calculation: FlaskConical,
  spectrum: LineChart,
  general: FileText,
};

const refTypeLabel = {
  calculation: '配平计算',
  spectrum: '谱图判读',
  general: '综合',
};

export default function AnnotationTimeline({ record }: Props) {
  const currentRole = useAppStore((s) => s.currentRole);
  const addAnnotation = useAppStore((s) => s.addAnnotation);
  const { setHighlightedRefId } = useAppStore();
  const [newContent, setNewContent] = useState('');
  const [newRefType, setNewRefType] = useState<'calculation' | 'spectrum' | 'general'>('general');

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    addAnnotation(record.id, {
      author: '陈监测员',
      content: newContent.trim(),
      refType: newRefType,
    });
    setNewContent('');
  };

  const canAdd = currentRole !== 'student';

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-lab-blue font-semibold flex items-center gap-2 mb-4">
        <span className="w-1 h-6 bg-lab-blue rounded-full" />
        异常留痕时间线
        <span className="text-xs font-sans font-normal text-gray-500 ml-2">
          ({record.annotations.length} 条批注)
        </span>
      </h3>

      {record.annotations.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-paper/50 rounded-sm-plus border border-dashed border-paper-dark">
          暂无复核批注
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-paper-dark" />

          <div className="space-y-5">
            {record.annotations.map((ann, idx) => {
              const Icon = refTypeIcon[ann.refType];
              return (
                <div
                  key={ann.id}
                  className="relative animate-fade-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onMouseEnter={() => ann.refId && setHighlightedRefId(ann.refId)}
                  onMouseLeave={() => setHighlightedRefId(null)}
                >
                  <div
                    className={`absolute -left-6 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      ann.refType === 'general' ? 'bg-lab-blue' : 'bg-lab-yellow'
                    }`}
                  >
                    <Icon size={9} className="text-white" />
                  </div>

                  <div className="bg-white rounded-sm-plus border border-paper-dark p-4 card-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-lab-blue">
                          {ann.author}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-paper rounded-full text-gray-500">
                          {refTypeLabel[ann.refType]}
                          {ann.refId && ` · 关联步骤 ${ann.refId}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono-chem">
                        {ann.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{ann.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canAdd && (
        <div className="mt-6 p-4 bg-white rounded-sm-plus border border-paper-dark">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquarePlus size={16} className="text-lab-blue" />
            <span className="text-sm font-medium text-gray-700">添加复核批注</span>
          </div>

          <div className="flex gap-2 mb-3">
            {(['calculation', 'spectrum', 'general'] as const).map((t) => {
              const Icon = refTypeIcon[t];
              return (
                <button
                  key={t}
                  onClick={() => setNewRefType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all btn-press ${
                    newRefType === t
                      ? 'bg-lab-blue text-white'
                      : 'bg-paper text-gray-600 hover:bg-paper-dark'
                  }`}
                >
                  <Icon size={12} />
                  {refTypeLabel[t]}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="输入批注内容，按回车提交..."
              className="flex-1 px-4 py-2 text-sm border border-paper-dark rounded-sm-plus focus:outline-none focus:border-lab-blue focus:ring-1 focus:ring-lab-blue/30 bg-paper/50"
            />
            <button
              onClick={handleSubmit}
              disabled={!newContent.trim()}
              className="px-4 py-2 bg-lab-blue text-white rounded-sm-plus hover:bg-lab-blue-light transition-colors btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
            >
              <Send size={14} />
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
