import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Eye, RotateCcw, ArrowUp, ArrowLeft, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReactorStore, type PresetName } from '@/store/useReactorStore';

interface PresetConfig {
  camera: [number, number, number];
  target: [number, number, number];
}

const PRESETS: Record<Exclude<PresetName, null>, PresetConfig> = {
  front: { camera: [0, 2, 10], target: [0, 0.5, 0] },
  side: { camera: [10, 2, 0], target: [0, 0.5, 0] },
  top: { camera: [0, 10, 0.01], target: [0, 0, 0] },
  iso: { camera: [7, 6, 7], target: [0, 0.5, 0] },
};

interface AnimationState {
  animating: boolean;
  startCam: THREE.Vector3;
  endCam: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startTime: number;
  duration: number;
}

export function CameraPresetController() {
  const { camera, controls } = useThree();
  const animRef = useRef<AnimationState | null>(null);
  const orbitControls = controls as unknown as OrbitControlsImpl | null;
  const consumePresetRequest = useReactorStore((s) => s.consumePresetRequest);

  const startPreset = useCallback(
    (name: Exclude<PresetName, null>) => {
      const preset = PRESETS[name];
      if (!preset || !orbitControls) return;

      animRef.current = {
        animating: true,
        startCam: camera.position.clone(),
        endCam: new THREE.Vector3(...preset.camera),
        startTarget: orbitControls.target.clone(),
        endTarget: new THREE.Vector3(...preset.target),
        startTime: performance.now(),
        duration: 600,
      };
    },
    [camera, orbitControls]
  );

  useFrame(() => {
    const requested = consumePresetRequest();
    if (requested) startPreset(requested);

    const anim = animRef.current;
    if (!anim || !anim.animating || !orbitControls) return;

    const elapsed = performance.now() - anim.startTime;
    const t = Math.min(elapsed / anim.duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(anim.startCam, anim.endCam, eased);
    orbitControls.target.lerpVectors(anim.startTarget, anim.endTarget, eased);
    orbitControls.update();

    if (t >= 1) {
      anim.animating = false;
    }
  });

  return null;
}

interface PresetButtonsProps {
  className?: string;
}

export function PresetButtons({ className }: PresetButtonsProps) {
  const requestPreset = useReactorStore((s) => s.requestPreset);

  const presets: { name: Exclude<PresetName, null>; label: string; Icon: typeof Eye }[] = [
    { name: 'front', label: '正视', Icon: Eye },
    { name: 'side', label: '侧视', Icon: ArrowLeft },
    { name: 'top', label: '俯视', Icon: ArrowUp },
    { name: 'iso', label: '等轴', Icon: Layers },
  ];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {presets.map(({ name, label, Icon }) => (
        <button
          key={name}
          onClick={() => requestPreset(name)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700/50"
          title={label}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
      <button
        onClick={() => requestPreset('iso')}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700/50"
        title="重置视角"
      >
        <RotateCcw size={14} />
        <span className="hidden sm:inline">重置</span>
      </button>
    </div>
  );
}
