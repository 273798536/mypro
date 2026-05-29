import { useState, useCallback, useEffect } from 'react';
import { Camera, Save, Trash2, RotateCcw } from 'lucide-react';
import { useSurfaceStore } from '@/store/useSurfaceStore';
import type { ViewpointSnapshot } from '@/types';

export default function ViewpointPanel() {
  const viewpoints = useSurfaceStore((s) => s.viewpoints);
  const saveViewpoint = useSurfaceStore((s) => s.saveViewpoint);
  const deleteViewpoint = useSurfaceStore((s) => s.deleteViewpoint);
  const setConfig = useSurfaceStore((s) => s.setConfig);
  const recompute = useSurfaceStore((s) => s.recompute);
  const loadViewpoints = useSurfaceStore((s) => s.loadViewpoints);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    loadViewpoints();
  }, [loadViewpoints]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const camera = (canvas as any).__three_fiber?.camera;
    if (!camera) return;

    saveViewpoint(
      name.trim(),
      [camera.position.x, camera.position.y, camera.position.z],
      [0, 0, 0],
      [camera.up.x, camera.up.y, camera.up.z],
      camera.zoom
    );
    setName('');
    setSaving(false);
  }, [name, saveViewpoint]);

  const handleRestore = useCallback((vp: ViewpointSnapshot) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const camera = (canvas as any).__three_fiber?.camera;
    const controls = (canvas as any).__three_fiber?.controls;
    if (camera) {
      camera.position.set(...vp.position);
      camera.up.set(...vp.up);
      camera.zoom = vp.zoom;
      camera.updateProjectionMatrix();
    }
    if (controls) {
      controls.target.set(...vp.target);
      controls.update();
    }

    if (vp.config) {
      setConfig(vp.config);
      setTimeout(() => recompute(), 0);
    }
  }, [setConfig, recompute]);

  const handleDelete = useCallback((id: string) => {
    deleteViewpoint(id);
  }, [deleteViewpoint]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#00e5c8] uppercase tracking-wider">
          <Camera size={16} />
          视角管理
        </div>
        <button
          onClick={() => setSaving(!saving)}
          className="px-2 py-1 bg-[#00e5c8]/10 border border-[#00e5c8]/30 rounded text-xs text-[#00e5c8] hover:bg-[#00e5c8]/20 transition-all"
        >
          <Save size={12} />
        </button>
      </div>

      {saving && (
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="视角名称"
            className="flex-1 bg-[#0d1520] border border-[#1a2a3a] rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00e5c8]/50"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-[#00e5c8]/20 text-[#00e5c8] rounded text-xs"
          >
            保存
          </button>
        </div>
      )}

      {viewpoints.length === 0 ? (
        <div className="text-xs text-gray-600 text-center py-2">暂无保存的视角</div>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {viewpoints.map((vp) => (
            <div key={vp.id} className="flex items-center justify-between bg-[#0d1520] border border-[#1a2a3a] rounded px-2 py-1.5">
              <button
                onClick={() => handleRestore(vp)}
                className="flex-1 text-left text-xs text-gray-300 hover:text-[#00e5c8] transition-colors"
              >
                <RotateCcw size={10} className="inline mr-1" />
                {vp.name}
              </button>
              <button
                onClick={() => handleDelete(vp.id)}
                className="text-gray-600 hover:text-red-400 transition-colors ml-2"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
