import { useAppStore } from '../store';
import { defaultCameraPresets } from '../utils/constants';

export default function CameraControlPanel() {
  const scene = useAppStore((s) => s.scene);
  const applyPreset = useAppStore((s) => s.applyCameraPreset);
  const resetCamera = useAppStore((s) => s.resetCamera);

  return (
    <div className="absolute top-4 left-4 z-10 w-72 card bg-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-sand-800">相机视角控制</h3>
        <span
          className={`badge ${
            scene.isCameraLost
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}
        >
          {scene.isCameraLost ? '视角丢失' : '正常'}
        </span>
      </div>

      {scene.isCameraLost && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm font-medium text-red-800 mb-1">⚠ 相机视角异常</div>
          <div className="text-xs text-red-700 leading-relaxed">
            当前相机位置无效，三维视图可能无法正常显示沙丘体素。下方按钮可快速恢复视角，
            该异常已自动记录到异常监控中心。
          </div>
          <button
            onClick={resetCamera}
            className="btn btn-danger mt-2 w-full text-sm"
          >
            恢复默认视角
          </button>
        </div>
      )}

      <div className="mb-3">
        <div className="text-xs text-sand-600 mb-2 font-medium">预设视角</div>
        <div className="grid grid-cols-2 gap-2">
          {defaultCameraPresets.map((p, i) => (
            <button
              key={p.name}
              onClick={() => applyPreset(i)}
              className="btn btn-secondary text-xs py-1.5"
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-sand-200 pt-3">
        <div className="text-xs text-sand-600 mb-2 font-medium">当前视角参数</div>
        <div className="text-xs font-mono text-sand-700 space-y-1 bg-sand-50 p-2 rounded">
          <div>
            位置 XYZ: [{scene.cameraPosition.map((v) => v.toFixed(1)).join(', ')}]
          </div>
          <div>
            目标 XYZ: [{scene.cameraTarget.map((v) => v.toFixed(1)).join(', ')}]
          </div>
        </div>
      </div>
    </div>
  );
}
