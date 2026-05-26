import { useCallback } from 'react';
import { Scissors, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function SliceControls() {
  const slicePlane = useStore((state) => state.slicePlane);
  const setSlicePlane = useStore((state) => state.setSlicePlane);

  const handleNormalChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      setSlicePlane({
        normal: { ...slicePlane.normal, [axis]: value },
      });
    },
    [slicePlane.normal, setSlicePlane]
  );

  const handleDistanceChange = useCallback(
    (value: number) => {
      setSlicePlane({ distance: value });
    },
    [setSlicePlane]
  );

  const handleContourCountChange = useCallback(
    (value: number) => {
      setSlicePlane({ contourCount: Math.max(1, Math.min(20, value)) });
    },
    [setSlicePlane]
  );

  const toggleVisibility = useCallback(() => {
    setSlicePlane({ visible: !slicePlane.visible });
  }, [slicePlane.visible, setSlicePlane]);

  const toggleContours = useCallback(() => {
    setSlicePlane({ showContours: !slicePlane.showContours });
  }, [slicePlane.showContours, setSlicePlane]);

  const setNormalPreset = useCallback(
    (preset: 'xy' | 'xz' | 'yz') => {
      const normals = {
        xy: { x: 0, y: 0, z: 1 },
        xz: { x: 0, y: 1, z: 0 },
        yz: { x: 1, y: 0, z: 0 },
      };
      setSlicePlane({ normal: normals[preset], distance: 0 });
    },
    [setSlicePlane]
  );

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors size={18} className="text-primary-500" />
          <h3 className="font-display text-lg font-semibold text-primary-500">
            切片平面
          </h3>
        </div>
        <button
          onClick={toggleVisibility}
          className="p-2 rounded-lg hover:bg-space-600 transition-colors"
          title={slicePlane.visible ? '隐藏切片' : '显示切片'}
        >
          {slicePlane.visible ? (
            <Eye size={18} className="text-primary-500" />
          ) : (
            <EyeOff size={18} className="text-space-400" />
          )}
        </button>
      </div>

      {slicePlane.visible && (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setNormalPreset('xy')}
              className="btn-secondary flex-1 text-xs"
            >
              XY平面
            </button>
            <button
              onClick={() => setNormalPreset('xz')}
              className="btn-secondary flex-1 text-xs"
            >
              XZ平面
            </button>
            <button
              onClick={() => setNormalPreset('yz')}
              className="btn-secondary flex-1 text-xs"
            >
              YZ平面
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-space-300 font-medium">法向量方向</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-space-400">X</label>
                <input
                  type="number"
                  value={slicePlane.normal.x.toFixed(2)}
                  onChange={(e) => handleNormalChange('x', parseFloat(e.target.value) || 0)}
                  className="w-full input-control text-sm"
                  step="0.1"
                  min="-1"
                  max="1"
                />
              </div>
              <div>
                <label className="text-xs text-space-400">Y</label>
                <input
                  type="number"
                  value={slicePlane.normal.y.toFixed(2)}
                  onChange={(e) => handleNormalChange('y', parseFloat(e.target.value) || 0)}
                  className="w-full input-control text-sm"
                  step="0.1"
                  min="-1"
                  max="1"
                />
              </div>
              <div>
                <label className="text-xs text-space-400">Z</label>
                <input
                  type="number"
                  value={slicePlane.normal.z.toFixed(2)}
                  onChange={(e) => handleNormalChange('z', parseFloat(e.target.value) || 0)}
                  className="w-full input-control text-sm"
                  step="0.1"
                  min="-1"
                  max="1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-space-300">平面位置</label>
              <span className="text-sm text-space-400">
                {slicePlane.distance.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              value={slicePlane.distance}
              onChange={(e) => handleDistanceChange(parseFloat(e.target.value))}
              min="-5"
              max="5"
              step="0.1"
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-space-600">
            <span className="text-sm text-space-300">显示等高线</span>
            <button
              onClick={toggleContours}
              className={`w-12 h-6 rounded-full transition-colors ${
                slicePlane.showContours
                  ? 'bg-primary-500'
                  : 'bg-space-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                  slicePlane.showContours ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {slicePlane.showContours && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm text-space-300">等高线数量</label>
                <span className="text-sm text-space-400">
                  {slicePlane.contourCount}
                </span>
              </div>
              <input
                type="range"
                value={slicePlane.contourCount}
                onChange={(e) => handleContourCountChange(parseInt(e.target.value))}
                min="1"
                max="20"
                step="1"
                className="w-full"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
