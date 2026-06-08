import { useParams, Link } from 'react-router-dom';
import { Edit3, History, Download, Camera, Ruler, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';
import { SandboxBreadcrumb } from '@/components/Breadcrumb';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import ScreenshotGrid from '@/components/ScreenshotGrid';
import { formatDateTime, getUnitText, convertInclination } from '@/utils/helpers';

export default function SandboxDetail() {
  const { id } = useParams<{ id: string }>();
  const sandbox = useSandboxStore((s) => s.getSandbox(id || ''));
  const history = useSandboxStore((s) => s.getSandboxHistory(id || ''));
  const exportSandbox = useSandboxStore((s) => s.exportSandbox);

  if (!sandbox) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <SandboxBreadcrumb />
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4 opacity-40">🪐</div>
          <div className="text-lg text-space-200 font-medium mb-2">沙盘不存在</div>
          <Link to="/" className="text-gold-400 hover:text-gold-300 text-sm">返回列表</Link>
        </div>
      </div>
    );
  }

  const latestVersion = history.length > 0 ? history[history.length - 1].version : 1;
  const latestModifier = history.length > 0 ? history[history.length - 1].modifiedBy : '-';

  const convertedDegree = sandbox.unit === 'radian'
    ? convertInclination(sandbox.inclination, 'radian', 'degree')
    : sandbox.inclination;
  const convertedRadian = sandbox.unit === 'degree'
    ? convertInclination(sandbox.inclination, 'degree', 'radian')
    : sandbox.inclination;

  const hasUnitWarning = sandbox.unit === 'radian' && sandbox.inclination > 6.28;
  const hasCameraWarning = Math.abs(sandbox.cameraView.x) > 100 || Math.abs(sandbox.cameraView.y) > 100 || Math.abs(sandbox.cameraView.z) > 100 || sandbox.cameraView.zoom < 0.1 || sandbox.cameraView.zoom > 5;
  const hasOverlapWarning = sandbox.modelOverlap;
  const anyWarning = hasUnitWarning || hasCameraWarning || hasOverlapWarning;

  const handleExport = () => {
    const data = exportSandbox(sandbox.id);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sandbox.name.replace(/\s+/g, '_')}_v${latestVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <SandboxBreadcrumb />

      <PageHeader
        title={sandbox.name}
        description={`创建于 ${formatDateTime(sandbox.createdAt)} · 最后更新 ${formatDateTime(sandbox.updatedAt)}`}
        actions={
          <>
            <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出
            </button>
            <Link to={`/sandbox/${sandbox.id}/history`} className="btn-secondary inline-flex items-center gap-2">
              <History className="w-4 h-4" />
              历史 ({latestVersion})
            </Link>
            <Link to={`/sandbox/${sandbox.id}/edit`} className="btn-primary inline-flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              修正
            </Link>
          </>
        }
      />

      {anyWarning && (
        <div className="card p-4 mb-6 border-amber-600/40 bg-amber-950/15">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-300 mb-2">检测到潜在问题</div>
              <ul className="text-sm text-amber-200/90 space-y-1">
                {hasUnitWarning && (
                  <li>
                    <span className="font-medium">单位换算异常：</span>
                    当前单位为弧度但数值 {sandbox.inclination} rad（约 {convertedDegree.toFixed(1)}°）远超 2π ≈ 6.28 rad 的合理范围，可能是度/弧度混淆。
                  </li>
                )}
                {hasOverlapWarning && (
                  <li>
                    <span className="font-medium">模型重叠：</span>
                    当前标记为模型存在重叠，演示时观众可能产生误解。
                  </li>
                )}
                {hasCameraWarning && (
                  <li>
                    <span className="font-medium">视角参数异常：</span>
                    当前坐标或缩放在极端范围，实际渲染画面可能不可见或不符合预期。
                  </li>
                )}
              </ul>
            </div>
            <Link to={`/sandbox/${sandbox.id}/edit`} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              去修正
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="section-title">
              <Camera className="w-5 h-5 text-gold-400" />
              截图清单
            </h3>
            <ScreenshotGrid screenshots={sandbox.screenshots} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="section-title">
              <CheckCircle className="w-5 h-5 text-gold-400" />
              基本信息
            </h3>
            <div className="space-y-4">
              <div>
                <div className="label">当前状态</div>
                <StatusBadge status={sandbox.status} />
              </div>
              <div>
                <div className="label">版本</div>
                <div className="data-mono">v{latestVersion} · 由 {latestModifier} 修改</div>
              </div>
              {sandbox.notes && (
                <div>
                  <div className="label">备注</div>
                  <div className="text-sm text-space-200 bg-space-900/60 rounded-lg px-3 py-2 border-l-2 border-gold-500/60">
                    {sandbox.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-title">
              <Ruler className="w-5 h-5 text-gold-400" />
              轨道倾角
            </h3>
            <div className="bg-space-900/60 rounded-lg p-4 mb-3">
              <div className="text-xs text-space-400 mb-1">当前值</div>
              <div className="text-3xl font-bold font-mono text-gold-300">
                {sandbox.inclination}
              </div>
              <div className="text-sm text-space-300 mt-1">{getUnitText(sandbox.unit)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-space-900/40 rounded px-2.5 py-2">
                <div className="text-space-400 mb-0.5">度 (°)</div>
                <div className="font-mono text-space-100">{convertedDegree.toFixed(4)}°</div>
              </div>
              <div className="bg-space-900/40 rounded px-2.5 py-2">
                <div className="text-space-400 mb-0.5">弧度 (rad)</div>
                <div className="font-mono text-space-100">{convertedRadian.toFixed(6)}</div>
              </div>
            </div>
            {hasUnitWarning && (
              <div className="mt-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-700/50 rounded px-2.5 py-2">
                ⚠️ 合理范围约 0 ~ 2π rad (0 ~ 360°)，当前值偏大
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="section-title">
              <Camera className="w-5 h-5 text-gold-400" />
              视角参数
            </h3>
            <div className="space-y-2.5">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="flex items-center justify-between">
                  <span className="text-sm text-space-300 uppercase font-mono">{axis}</span>
                  <span className={`font-mono text-sm ${Math.abs(sandbox.cameraView[axis]) > 100 ? 'text-amber-400' : 'text-gold-300'}`}>
                    {sandbox.cameraView[axis].toFixed(3)}
                  </span>
                </div>
              ))}
              <div className="h-px bg-space-700/60 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-space-300 uppercase font-mono">zoom</span>
                <span className={`font-mono text-sm ${sandbox.cameraView.zoom < 0.1 || sandbox.cameraView.zoom > 5 ? 'text-amber-400' : 'text-gold-300'}`}>
                  ×{sandbox.cameraView.zoom.toFixed(3)}
                </span>
              </div>
            </div>
            {hasCameraWarning && (
              <div className="mt-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-700/50 rounded px-2.5 py-2">
                ⚠️ 视角参数在极端范围
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
