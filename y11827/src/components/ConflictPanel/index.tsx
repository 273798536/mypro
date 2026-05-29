import { useState } from 'react';
import { Clock, Wrench, Users, AlertTriangle, AlertCircle, X, ArrowRight } from 'lucide-react';
import type { Conflict, ConflictType } from '../../types';
import { useGameStore } from '../../store/gameStore';

const typeConfig: Record<ConflictType, { label: string; icon: typeof Clock }> = {
  changeover: { label: '换场超时', icon: Clock },
  equipment: { label: '设备冲突', icon: Wrench },
  crowd: { label: '人流拥堵', icon: Users },
};

const severityColors = {
  error: { border: '#FF2D55', bg: 'rgba(255,45,85,0.1)', text: '#FF2D55' },
  warning: { border: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: '#F59E0B' },
};

function ConflictCard({ conflict, isSelected, onSelect }: { conflict: Conflict; isSelected: boolean; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[conflict.type];
  const colors = severityColors[conflict.severity];
  const Icon = config.icon;
  const SeverityIcon = conflict.severity === 'error' ? AlertTriangle : AlertCircle;

  return (
    <div
      onClick={onSelect}
      className="rounded-lg cursor-pointer transition-all"
      style={{
        border: `1px solid ${isSelected ? colors.border : 'rgba(255,255,255,0.08)'}`,
        background: isSelected ? colors.bg : 'rgba(15,23,42,0.6)',
        boxShadow: isSelected ? `0 0 12px ${colors.border}40` : 'none',
      }}
    >
      <div className="flex items-start gap-2 p-3">
        <SeverityIcon size={16} style={{ color: colors.text, flexShrink: 0, marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: `${colors.text}20`, color: colors.text }}
            >
              <Icon size={12} />
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{conflict.description}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-1 mt-2 text-xs transition-colors"
            style={{ color: colors.text }}
          >
            <span>{expanded ? '收起溯源' : '查看溯源'}</span>
            <ArrowRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          {expanded && (
            <div
              className="mt-2 p-2 rounded text-xs leading-relaxed"
              style={{ background: '#1E293B', borderLeft: `3px solid ${colors.text}` }}
            >
              <span className="text-gray-500">溯源：</span>
              <span className="text-gray-300">{conflict.sourceRef}</span>
            </div>
          )}
        </div>
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); useGameStore.getState().selectConflict(null); }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConflictPanel() {
  const conflicts = useGameStore((s) => s.conflicts);
  const selectedConflictId = useGameStore((s) => s.selectedConflictId);
  const selectConflict = useGameStore((s) => s.selectConflict);

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
          <AlertCircle size={20} className="text-green-400" />
        </div>
        <span className="text-green-400 text-sm font-medium">无冲突</span>
      </div>
    );
  }

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-1 pb-2 mb-2 border-b border-white/5">
        <AlertTriangle size={14} className="text-gray-400" />
        <span className="text-sm text-gray-300 font-medium">冲突检测</span>
        {errorCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(255,45,85,0.15)', color: '#FF2D55' }}>
            {errorCount} 严重
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
            {warningCount} 警告
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            isSelected={selectedConflictId === conflict.id}
            onSelect={() => selectConflict(conflict.id)}
          />
        ))}
      </div>
    </div>
  );
}
