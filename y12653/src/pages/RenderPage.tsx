import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import { Eye, RotateCw, Layers, EyeOff } from 'lucide-react';
import { SceneContent } from '@/components/three/ReactorScene';
import ClipPlaneVisuals from '@/components/three/ClipPlaneVisuals';
import { PresetButtons, CameraPresetController } from '@/components/three/CameraPresets';
import TimeAxis from '@/components/three/TimeAxis';
import ConclusionList from '@/components/records/ConclusionList';
import { useRecordsStore } from '@/store/useRecordsStore';
import { useReactorStore } from '@/store/useReactorStore';
import type { Verdict, MisreadReason, ReactorPart } from '@/types';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const mockEvents = [
  { ts: 10, label: '开始进料' },
  { ts: 25, label: '加热升温' },
  { ts: 40, label: '搅拌启动' },
  { ts: 55, label: '恒温反应' },
  { ts: 75, label: '降温冷却' },
  { ts: 90, label: '出料完成' },
];

function CameraController({ type, autoRotate }: {
  type: 'perspective' | 'orthographic';
  autoRotate: boolean;
}) {
  if (type === 'orthographic') {
    return (
      <>
        <OrthographicCamera makeDefault position={[6, 5, 8]} zoom={50} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </>
    );
  }
  return (
    <>
      <PerspectiveCamera makeDefault position={[6, 5, 8]} fov={45} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export default function RenderPage() {
  const [timeValue, setTimeValue] = useState(50);
  const [cameraType, setCameraType] = useState<'perspective' | 'orthographic'>('perspective');
  const [autoRotate, setAutoRotate] = useState(false);
  const [opacityFix, setOpacityFix] = useState(false);

  const riskNotes = useRecordsStore((state) => state.riskNotes);
  const markMisread = useRecordsStore((state) => state.markMisread);
  const finalizeConclusion = useRecordsStore((state) => state.finalizeConclusion);
  const parts = useReactorStore((state) => state.parts);

  function getPartName(partId: string): string {
    const found = parts.find((p: ReactorPart) => p.id === partId);
    return found ? found.name : partId;
  }

  function handleConfirmNote(noteId: string, verdict: Verdict) {
    const note = riskNotes.find((n) => n.id === noteId);
    if (!note) return;

    finalizeConclusion({
      part_id: note.part_id,
      summary: `复核结论：${note.content.substring(0, 30)}${note.content.length > 30 ? '...' : ''}`,
      verdict,
      finalized_at: Date.now(),
      finalized_by: '复核工程师',
      linked_note_ids: [noteId],
      supplements: `3D复核确认，部件：${getPartName(note.part_id)}`,
    });
  }

  function handleMarkMisread(noteId: string, reason: MisreadReason) {
    markMisread(noteId, reason);
  }

  const pendingNotes = useMemo(() => {
    return riskNotes.filter((n) => !n.is_misread && !n.conclusion_id);
  }, [riskNotes]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm shrink-0">
        <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Eye size={16} className="text-cyan-400" />
          3D 渲染复核
          <span className="text-xs font-normal text-slate-500">月底/课前检查</span>
        </h1>

        <div className="flex items-center gap-3">
          <PresetButtons />

          <div className="h-6 w-px bg-slate-700" />

          <button
            onClick={() => setCameraType(cameraType === 'perspective' ? 'orthographic' : 'perspective')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors',
              cameraType === 'orthographic'
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            )}
            title="切换透视/正交"
          >
            <Layers size={14} />
            {cameraType === 'perspective' ? '透视' : '正交'}
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors',
              autoRotate
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            )}
            title="自动旋转"
          >
            <RotateCw
              size={14}
              className={cn(autoRotate && 'animate-spin')}
              style={{ animationDuration: '3s' }}
            />
            自动旋转
          </button>

          <button
            onClick={() => setOpacityFix(!opacityFix)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors',
              opacityFix
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            )}
            title="透明遮挡修正"
          >
            <EyeOff size={14} />
            透明修正
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <Canvas
              shadows
              gl={{
                antialias: true,
                localClippingEnabled: true,
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <color attach="background" args={['#0A1628']} />
              <fog attach="fog" args={['#0A1628', 15, 40]} />

              <CameraController type={cameraType} autoRotate={autoRotate} />

              <SceneContent mode="render" />
              <ClipPlaneVisuals />
              <CameraPresetController />

              {cameraType === 'perspective' && (
                <EffectComposer multisampling={0}>
                  <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={0.6} />
                  <FXAA />
                </EffectComposer>
              )}
            </Canvas>
          </div>

          <div className="shrink-0">
            <TimeAxis value={timeValue} onChange={setTimeValue} events={mockEvents} />
          </div>
        </div>

        <div className="w-80 shrink-0 border-l border-slate-800 p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">复核待确认</h2>
            <span className="text-xs text-slate-500">{pendingNotes.length} 条</span>
          </div>

          <div className="flex-1 min-h-0">
            <ConclusionList
              showOnlyPendingNotes
              onConfirmNote={handleConfirmNote}
            />
          </div>

          <div className="pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-500 mb-2">快捷操作：</p>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (pendingNotes.length > 0) {
                    handleMarkMisread(pendingNotes[0].id, 'occlusion');
                  }
                }}
                disabled={pendingNotes.length === 0}
              >
                <EyeOff size={12} />
                遮挡误读
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (pendingNotes.length > 0) {
                    handleMarkMisread(pendingNotes[0].id, 'timing_mismatch');
                  }
                }}
                disabled={pendingNotes.length === 0}
              >
                <EyeOff size={12} />
                时机不匹配
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (pendingNotes.length > 0) {
                    handleMarkMisread(pendingNotes[0].id, 'other');
                  }
                }}
                disabled={pendingNotes.length === 0}
              >
                <EyeOff size={12} />
                其他误读
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
