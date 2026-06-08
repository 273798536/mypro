import { create } from 'zustand';
import type { ReactorPart, ClipPlanes } from '../types';
import { loadLS, saveLS } from '../utils/storage';

export type PresetName = 'front' | 'side' | 'top' | 'iso' | null;

interface ReactorState {
  parts: ReactorPart[];
  selectedPartId: string | null;
  clipPlanes: ClipPlanes;
  cameraPreset: PresetName;
  requestedPreset: PresetName;
}

interface ReactorActions {
  setParts: (parts: ReactorPart[]) => void;
  selectPart: (id: string | null) => void;
  setClip: (axis: 'x' | 'y' | 'z', value: number) => void;
  toggleClipEnabled: () => void;
  resetClip: () => void;
  focusPart: (id: string) => [number, number, number] | null;
  requestPreset: (preset: PresetName) => void;
  consumePresetRequest: () => PresetName;
}

const initialParts = loadLS<ReactorPart[]>('parts', []);
const initialSelected = loadLS<string | null>('reactor_selected', null);
const initialClip = loadLS<ClipPlanes>('reactor_clip', { x: 0, y: 0, z: 0, enabled: false });
const initialCamera = loadLS<PresetName>('reactor_camera', null);

export const useReactorStore = create<ReactorState & ReactorActions>((set, get) => ({
  parts: initialParts,
  selectedPartId: initialSelected,
  clipPlanes: initialClip,
  cameraPreset: initialCamera,
  requestedPreset: null,
  setParts: (parts) => {
    saveLS('parts', parts);
    set({ parts });
  },
  selectPart: (id) => {
    saveLS('reactor_selected', id);
    set({ selectedPartId: id });
  },
  setClip: (axis, value) => {
    const next = { ...get().clipPlanes, [axis]: value };
    saveLS('reactor_clip', next);
    set({ clipPlanes: next });
  },
  toggleClipEnabled: () => {
    const next = { ...get().clipPlanes, enabled: !get().clipPlanes.enabled };
    saveLS('reactor_clip', next);
    set({ clipPlanes: next });
  },
  resetClip: () => {
    const next: ClipPlanes = { x: 0, y: 0, z: 0, enabled: false };
    saveLS('reactor_clip', next);
    set({ clipPlanes: next });
  },
  focusPart: (id) => {
    const part = get().parts.find((p) => p.id === id);
    if (!part) return null;
    saveLS('reactor_selected', id);
    set({ selectedPartId: id });
    return part.position;
  },
  requestPreset: (preset) => {
    set({ requestedPreset: preset, cameraPreset: preset });
    if (preset) saveLS('reactor_camera', preset);
  },
  consumePresetRequest: () => {
    const req = get().requestedPreset;
    if (req) set({ requestedPreset: null });
    return req;
  },
}));
