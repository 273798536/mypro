import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { useCalcStore } from '@/store/useCalcStore';

export function useMapView() {
  const mapRef = useRef<LeafletMap | null>(null);
  const activePresetId = useCalcStore(s => s.activeViewId);
  const presets = useCalcStore(s => s.viewPresets);
  const activePreset = presets.find(p => p.id === activePresetId);

  useEffect(() => {
    if (!mapRef.current || !activePreset) return;
    mapRef.current.setView(activePreset.center, activePreset.zoom, { animate: true });
  }, [activePresetId]);

  function setMapInstance(m: LeafletMap | null) {
    mapRef.current = m;
  }

  function getCurrentView() {
    if (!mapRef.current) return null;
    const c = mapRef.current.getCenter();
    const z = mapRef.current.getZoom();
    const b = mapRef.current.getBounds();
    return {
      center: [c.lat, c.lng] as [number, number],
      zoom: z,
      bounds: [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]] as [[number, number], [number, number]],
    };
  }

  return { mapRef, setMapInstance, getCurrentView, activePreset };
}

export function useImportProgress() {
  const [stage, setStage] = useState<'idle' | 'parsing' | 'validating' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const reset = () => { setStage('idle'); setProgress(0); setErrors([]); };
  return { stage, setStage, progress, setProgress, errors, setErrors, reset };
}

export function useReviewScreenshot() {
  const [isScreenshot, setIs] = useState(false);
  const toggle = () => setIs(v => !v);
  return { isScreenshot, setIs, toggle };
}
