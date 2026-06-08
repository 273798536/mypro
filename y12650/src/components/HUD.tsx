import { useAppStore } from '../store';

export default function HUD() {
  const { currentCamera, collisions, safeDistance, pipelines, obstacles, savedViews } = useAppStore();

  const violations = collisions.filter((c) => c.isViolation).length;
  const warnings = collisions.filter((c) => !c.isViolation && c.distance < safeDistance * 1.5).length;

  return (
    <div className="hud-info">
      <div>
        <strong>相机位置：</strong>
        ({currentCamera.position.x.toFixed(1)}, {currentCamera.position.y.toFixed(1)},{' '}
        {currentCamera.position.z.toFixed(1)})
      </div>
      <div>
        <strong>观察目标：</strong>
        ({currentCamera.target.x.toFixed(1)}, {currentCamera.target.y.toFixed(1)},{' '}
        {currentCamera.target.z.toFixed(1)})
      </div>
      <div>
        <strong>管线：</strong>{pipelines.length} 条 · <strong>障碍物：</strong>
        {obstacles.length} 个 · <strong>已存视角：</strong>
        {savedViews.length}
      </div>
      <div>
        <strong>碰撞检测：</strong>
        <span style={{ color: violations > 0 ? '#e07070' : '#6ae08a' }}>
          {' '}
          越界 {violations}
        </span>
        <span style={{ color: warnings > 0 ? '#e0b060' : '#7a8ba6', marginLeft: 8 }}>
          接近 {warnings}
        </span>
      </div>
    </div>
  );
}
