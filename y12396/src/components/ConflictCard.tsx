import { useNavigate } from 'react-router-dom';
import { Flag, Edit3, Clock, AlertTriangle } from 'lucide-react';
import type { Conflict } from '@/lib/api';

const conflictTypeLabels: Record<string, string> = {
  audio_bpm_mismatch: '音频与BPM不一致',
  beat_bpm_jump: '节拍与BPM跳级矛盾',
  rush_miss_simultaneous: '抢拍与漏拍同时出现',
  bpm_jump_late: 'BPM跳级晚到',
};

interface ConflictCardProps {
  conflict: Conflict;
  practiceId: string;
  onFlag: (conflictId: string) => void;
}

export default function ConflictCard({ conflict, practiceId, onFlag }: ConflictCardProps) {
  const navigate = useNavigate();
  const typeLabel = conflictTypeLabels[conflict.conflictType] || conflict.conflictType;

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-5 hover:border-amber-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className={`w-4 h-4 ${conflict.severity === 'high' ? 'text-conflict-red' : conflict.severity === 'medium' ? 'text-amber-primary' : 'text-pending-yellow'}`} />
          <span className="font-display font-semibold text-sm text-text-primary">{typeLabel}</span>
          <span className={`w-2 h-2 rounded-full ${conflict.severity === 'high' ? 'bg-conflict-red' : conflict.severity === 'medium' ? 'bg-amber-primary' : 'bg-pending-yellow'}`} />
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          conflict.status === 'flagged' ? 'bg-orange-500/15 text-orange-400' :
          conflict.status === 'resolved' ? 'bg-correction-green/15 text-correction-green' :
          'bg-pending-yellow/15 text-pending-yellow'
        }`}>
          {conflict.status === 'flagged' ? '已留痕' : conflict.status === 'resolved' ? '已解决' : '待处理'}
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-4 leading-relaxed">{conflict.description}</p>

      {conflict.eventOrder && conflict.eventOrder.length > 0 && (
        <div className="mb-4 bg-dark-secondary rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
            <Clock className="w-3 h-3" />
            <span>事件顺序</span>
          </div>
          <div className="space-y-1.5">
            {conflict.eventOrder.map((evt, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-dark-tertiary flex items-center justify-center text-text-muted text-[10px] flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-text-secondary">
                  {typeof evt === 'string' ? evt : `${evt.label} (t=${evt.timestamp}s)`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {conflict.involvedEvidence && conflict.involvedEvidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {conflict.involvedEvidence.map((evidence, idx) => (
            <span key={idx} className="text-xs bg-dark-tertiary text-text-secondary px-2 py-0.5 rounded">
              {typeof evidence === 'string' ? evidence : `${evidence.source}: ${evidence.detail}`}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-dark-border">
        {conflict.status === 'pending' && (
          <button
            onClick={() => onFlag(conflict.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors"
          >
            <Flag className="w-3 h-3" />
            留痕
          </button>
        )}
        {conflict.status !== 'resolved' && (
          <button
            onClick={() => navigate(`/practices/${practiceId}/edit?conflictId=${conflict.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-primary/15 text-amber-primary hover:bg-amber-primary/25 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            修正
          </button>
        )}
      </div>
    </div>
  );
}
