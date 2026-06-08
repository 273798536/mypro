import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Calendar, AlertCircle, EyeOff, Plus } from 'lucide-react';
import type { RiskLevel, PartSystem } from '@/types';
import { useReactorStore } from '@/store/useReactorStore';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate, fmtRisk, fmtStatus } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const systemLabels: Record<PartSystem, string> = {
  stirring: '搅拌系统',
  heating: '加热系统',
  sealing: '密封系统',
  temp: '测温系统',
  vessel: '釜体',
  motor: '电机',
};

const riskBadgeVariant: Record<RiskLevel, 'default' | 'orange' | 'green' | 'red' | 'yellow'> = {
  low: 'green',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

const riskLevels: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
  { value: 'critical', label: '危急' },
];

export default function PartDetailPanel() {
  const navigate = useNavigate();
  const parts = useReactorStore((s) => s.parts);
  const selectedPartId = useReactorStore((s) => s.selectedPartId);
  const clipPlanes = useReactorStore((s) => s.clipPlanes);
  const setClip = useReactorStore((s) => s.setClip);
  const toggleClipEnabled = useReactorStore((s) => s.toggleClipEnabled);
  const selectPart = useReactorStore((s) => s.selectPart);
  const riskNotes = useRecordsStore((s) => s.riskNotes);
  const addRiskNote = useRecordsStore((s) => s.addRiskNote);
  const markMisread = useRecordsStore((s) => s.markMisread);
  const jumpTo3D = useRecordsStore((s) => s.jumpTo3D);
  const pushToast = useAppStore((s) => s.pushToast);

  const [noteContent, setNoteContent] = useState('');
  const [noteLevel, setNoteLevel] = useState<RiskLevel>('medium');

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId) || null,
    [parts, selectedPartId]
  );

  const partNotes = useMemo(
    () =>
      selectedPartId
        ? riskNotes
            .filter((n) => n.part_id === selectedPartId)
            .sort((a, b) => b.created_at - a.created_at)
        : [],
    [riskNotes, selectedPartId]
  );

  const handleSubmitNote = () => {
    if (!selectedPartId || !noteContent.trim()) return;
    const result = addRiskNote({
      part_id: selectedPartId,
      content: noteContent.trim(),
      level: noteLevel,
      created_at: Date.now(),
      created_by: '展馆讲解员',
      clip_x: clipPlanes.x,
      clip_y: clipPlanes.y,
      clip_z: clipPlanes.z,
    });
    pushToast(
      result.duplicated ? '备注已添加，检测到疑似重复记录' : '备注添加成功',
      result.duplicated ? 'warning' : 'success'
    );
    setNoteContent('');
  };

  const handleJumpTo3D = (noteId: string) => {
    const { partId, clip } = jumpTo3D(noteId);
    selectPart(partId);
    setClip('x', clip.x);
    setClip('y', clip.y);
    setClip('z', clip.z);
    if (clip.enabled && !clipPlanes.enabled) toggleClipEnabled();
    else if (!clip.enabled && clipPlanes.enabled) toggleClipEnabled();
    navigate('/section');
  };

  if (!selectedPart) {
    return (
      <div className="glass w-80 h-full flex flex-col items-center justify-center p-6">
        <Info className="w-10 h-10 text-steel-300 mb-3" />
        <p className="text-sm text-steel-300 text-center">请从左侧选择一个部件查看详情</p>
      </div>
    );
  }

  const statusFmt = fmtStatus(selectedPart.status);
  const statusVariant =
    selectedPart.status === 'normal' ? 'green' : selectedPart.status === 'warning' ? 'yellow' : 'red';

  return (
    <div className="glass w-80 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">{selectedPart.name}</h3>
            <p className="text-xs text-steel-300">规格：{selectedPart.spec}</p>
          </div>
          <Badge variant={statusVariant}>{statusFmt.label}</Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-steel-100">
            <span className="text-steel-300 w-14">系统</span>
            <Badge variant="default" className="text-[10px]">
              {systemLabels[selectedPart.system]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-steel-100">
            <Calendar className="w-3.5 h-3.5 text-steel-300" />
            <span className="text-steel-300 w-14">上次巡检</span>
            <span>{fmtDate(selectedPart.last_inspected_at)}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-steel-100 leading-relaxed">{selectedPart.description}</p>
      </div>

      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-accent-orange" />
          <h4 className="text-sm font-medium text-white">录入备注</h4>
        </div>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="描述发现的问题或异常..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-steel-300 focus:outline-none focus:border-accent-orange/50 resize-none mb-2"
        />
        <div className="flex items-center gap-2">
          <select
            value={noteLevel}
            onChange={(e) => setNoteLevel(e.target.value as RiskLevel)}
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent-orange/50"
          >
            {riskLevels.map((l) => (
              <option key={l.value} value={l.value} className="bg-primary-900">
                {l.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleSubmitNote} disabled={!noteContent.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            提交
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <span>风险备注</span>
          <span className="text-xs text-steel-300">({partNotes.length})</span>
        </h4>
        {partNotes.length === 0 ? (
          <p className="text-xs text-steel-300 text-center py-6">暂无风险备注</p>
        ) : (
          <ul className="space-y-2">
            {partNotes.map((note) => {
              const risk = fmtRisk(note.level);
              return (
                <li
                  key={note.id}
                  className={cn(
                    'p-3 rounded border text-xs',
                    note.is_misread
                      ? 'bg-white/5 border-white/5 opacity-60'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant={riskBadgeVariant[note.level]}>{risk.label}</Badge>
                    <span className="text-[10px] text-steel-300">{fmtDate(note.created_at)}</span>
                  </div>
                  <p className="text-steel-100 leading-relaxed mb-2">{note.content}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {note.is_misread && (
                      <Badge variant="default" className="text-[10px]">
                        <EyeOff className="w-3 h-3 mr-1" />
                        误读
                      </Badge>
                    )}
                    {note.is_duplicate && (
                      <Badge variant="yellow" className="text-[10px]">
                        重复
                      </Badge>
                    )}
                    {!note.is_misread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={() => markMisread(note.id, 'other')}
                      >
                        <EyeOff className="w-3 h-3 mr-1" />
                        标记误读
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 px-2"
                      onClick={() => handleJumpTo3D(note.id)}
                    >
                      定位3D
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
