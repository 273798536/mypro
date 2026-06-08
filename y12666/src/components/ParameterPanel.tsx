import { useState } from 'react';
import {
  Wind,
  Compass,
  Ruler,
  Mountain,
  AlertTriangle,
  RefreshCw,
  Camera,
  Eye,
  Trash2,
  AlertOctagon,
} from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { getOutOfBoundsTurbineIds } from '@/utils/wakeCalculation';
import html2canvas from 'html2canvas';
import type { ScreenshotCapture } from '@/types';

export default function ParameterPanel() {
  const params = useProjectStore((s) => s.params);
  const setParams = useProjectStore((s) => s.setParams);
  const screenshots = useProjectStore((s) => s.screenshots);
  const addScreenshot = useProjectStore((s) => s.addScreenshot);
  const removeScreenshot = useProjectStore((s) => s.removeScreenshot);
  const viewpoints = useProjectStore((s) => s.viewpoints);
  const removeViewpoint = useProjectStore((s) => s.removeViewpoint);
  const wakeResults = useProjectStore((s) => s.wakeResults);
  const setHighlight = useProjectStore((s) => s.setHighlight);
  const showEdgeCaseModal = useProjectStore((s) => s.setShowEdgeCaseModal);
  const wrongConversion = useProjectStore((s) => s.wrongUnitConversion);
  const applyOffset = useProjectStore((s) => s.applyCoordinateOffset);
  const activeEdgeCaseId = useProjectStore((s) => s.activeEdgeCaseId);

  const [capturing, setCapturing] = useState(false);
  const [viewpointName, setViewpointName] = useState('');

  const outOfBoundsIds = getOutOfBoundsTurbineIds(wakeResults);

  const saveViewpoint = () => {
    const name = viewpointName.trim() || `视角 ${viewpoints.length + 1}`;
    const helpers = (window as any).__sceneHelpers;
    if (helpers?.saveViewpoint) {
      helpers.saveViewpoint(name);
      setViewpointName('');
    }
  };

  const restoreViewpoint = (vp: any) => {
    const helpers = (window as any).__sceneHelpers;
    if (helpers?.restoreViewpoint) {
      helpers.restoreViewpoint(vp);
    }
  };

  const captureScreenshot = async () => {
    const container = document.getElementById('scene-container');
    if (!container) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#081A32',
        scale: 1.5,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const helpers = (window as any).__sceneHelpers;
      const currentVp = helpers?.saveViewpoint
        ? helpers.saveViewpoint('临时')
        : null;

      const shot: Omit<ScreenshotCapture, 'id' | 'createdAt'> = {
        name: `截图 ${screenshots.length + 1}`,
        viewpoint: currentVp || {
          name: '当前视角',
          position: [0, 0, 0] as [number, number, number],
          target: [0, 0, 0] as [number, number, number],
        },
        dataUrl,
        parameterSnapshot: JSON.parse(JSON.stringify(params)),
        colorLegendNotes: '标准尾流损失色阶：青→绿→黄→橙→红',
        isOutOfBounds: outOfBoundsIds.length > 0,
        outOfBoundsTurbines: outOfBoundsIds,
      };
      addScreenshot(shot);
    } finally {
      setCapturing(false);
    }
  };

  const highlightOOB = () => {
    if (outOfBoundsIds.length > 0) {
      setHighlight({
        turbineIds: outOfBoundsIds,
        type: 'out-of-bounds',
      });
      setTimeout(() => setHighlight(null), 3000);
    }
  };

  return (
    <div className="w-[320px] h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <div className="panel-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wind size={16} className="text-wake-teal" />
          <span className="font-engineering text-sm text-sea-mist font-semibold">风况参数</span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-sea-mist/70">风速</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={params.windSpeed}
                  onChange={(e) => setParams({ windSpeed: parseFloat(e.target.value) || 0 })}
                  className="w-16 bg-ocean-slate/60 border border-wake-teal/20 rounded px-2 py-0.5 text-right font-engineering text-sm text-sea-mist focus:outline-none focus:border-wake-teal"
                  step="0.5"
                />
                <select
                  value={params.windSpeedUnit}
                  onChange={(e) =>
                    setParams({ windSpeedUnit: e.target.value as 'm/s' | 'knots' })
                  }
                  className="bg-ocean-slate/60 border border-wake-teal/20 rounded px-1.5 py-0.5 text-xs text-sea-mist focus:outline-none focus:border-wake-teal"
                >
                  <option value="m/s">m/s</option>
                  <option value="knots">节</option>
                </select>
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={25}
              step={0.5}
              value={params.windSpeed}
              onChange={(e) => setParams({ windSpeed: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-sea-mist/70 flex items-center gap-1">
                <Compass size={12} />
                风向
              </label>
              <span className="font-engineering text-sm text-sea-mist">{params.windDirection}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={params.windDirection}
              onChange={(e) => setParams({ windDirection: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-sea-mist/70 flex items-center gap-1">
                <Ruler size={12} />
                风机间距倍数
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={params.spacingMultiple}
                  onChange={(e) => setParams({ spacingMultiple: parseFloat(e.target.value) || 0 })}
                  className="w-14 bg-ocean-slate/60 border border-wake-teal/20 rounded px-2 py-0.5 text-right font-engineering text-sm text-sea-mist focus:outline-none focus:border-wake-teal"
                  step="0.5"
                />
                <select
                  value={params.spacingUnit}
                  onChange={(e) =>
                    setParams({ spacingUnit: e.target.value as 'D' | 'km' | 'nautical_mile' })
                  }
                  className="bg-ocean-slate/60 border border-wake-teal/20 rounded px-1 py-0.5 text-xs text-sea-mist focus:outline-none focus:border-wake-teal"
                >
                  <option value="D">D(直径)</option>
                  <option value="km">km</option>
                  <option value="nautical_mile">海里</option>
                </select>
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={15}
              step={0.5}
              value={params.spacingMultiple}
              onChange={(e) => setParams({ spacingMultiple: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-sea-mist/70 flex items-center gap-1">
                <Mountain size={12} />
                轮毂高度
              </label>
              <span className="font-engineering text-sm text-sea-mist">{params.hubHeight} m</span>
            </div>
            <input
              type="range"
              min={60}
              max={140}
              step={5}
              value={params.hubHeight}
              onChange={(e) => setParams({ hubHeight: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-sea-mist/70">湍流强度</label>
              <span className="font-engineering text-sm text-sea-mist">
                {(params.turbulenceIntensity * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={0.04}
              max={0.18}
              step={0.01}
              value={params.turbulenceIntensity}
              onChange={(e) => setParams({ turbulenceIntensity: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {(wrongConversion || applyOffset || activeEdgeCaseId) && (
          <div className="mt-3 p-2 rounded bg-alert-orange/15 border border-alert-orange/40 animate-blink-border">
            <div className="flex items-center gap-1.5 text-alert-orange text-xs font-semibold">
              <AlertOctagon size={12} />
              边界案例已激活
            </div>
            <div className="text-[11px] text-sea-mist/70 mt-1">
              {wrongConversion && <div>• 单位换算错误模式已开启</div>}
              {applyOffset && <div>• 坐标人工备注偏移已应用</div>}
              {activeEdgeCaseId && <div>• 测试案例ID: {activeEdgeCaseId}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="panel-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-engineering text-sm text-sea-mist font-semibold flex items-center gap-2">
            <Eye size={16} className="text-wake-teal" />
            视角管理
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="视角名称"
            value={viewpointName}
            onChange={(e) => setViewpointName(e.target.value)}
            className="flex-1 bg-ocean-slate/60 border border-wake-teal/20 rounded px-2 py-1 text-xs text-sea-mist placeholder:text-sea-mist/40 focus:outline-none focus:border-wake-teal"
          />
          <button className="btn-secondary !py-1 !px-3 text-xs" onClick={saveViewpoint}>
            保存视角
          </button>
        </div>

        {viewpoints.length === 0 ? (
          <div className="text-xs text-sea-mist/40 text-center py-3">暂无保存的视角</div>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {viewpoints.map((vp) => (
              <div
                key={vp.id}
                className="flex items-center justify-between bg-ocean-slate/40 rounded px-2 py-1.5 group"
              >
                <button
                  onClick={() => restoreViewpoint(vp)}
                  className="text-xs text-sea-mist/90 hover:text-wake-teal font-engineering text-left flex-1"
                >
                  {vp.name}
                </button>
                <button
                  onClick={() => removeViewpoint(vp.id)}
                  className="text-sea-mist/30 hover:text-alert-orange opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-engineering text-sm text-sea-mist font-semibold flex items-center gap-2">
            <Camera size={16} className="text-wake-teal" />
            截图清单
            {outOfBoundsIds.length > 0 && (
              <button
                onClick={highlightOOB}
                className="ml-auto text-alert-orange text-[10px] flex items-center gap-1 hover:underline"
              >
                <AlertTriangle size={10} />
                高亮 {outOfBoundsIds.length} 个越界
              </button>
            )}
          </span>
        </div>

        <button
          onClick={captureScreenshot}
          disabled={capturing}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2"
        >
          <Camera size={14} />
          {capturing ? '正在截取...' : '截取当前视角'}
        </button>

        {screenshots.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {screenshots.map((shot) => (
              <div
                key={shot.id}
                className={`relative rounded overflow-hidden border ${
                  shot.isOutOfBounds ? 'border-alert-orange/60 animate-blink-border' : 'border-wake-teal/20'
                }`}
              >
                <img src={shot.dataUrl} alt={shot.name} className="w-full h-20 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep-sea/95 to-transparent px-1.5 py-1">
                  <div className="text-[10px] font-engineering text-sea-mist truncate">
                    {shot.name}
                  </div>
                </div>
                <button
                  onClick={() => removeScreenshot(shot.id)}
                  className="absolute top-1 right-1 bg-deep-sea/70 rounded p-0.5 text-sea-mist/60 hover:text-alert-orange"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-card p-4">
        <button
          onClick={() => showEdgeCaseModal(true)}
          className="btn-alert w-full text-sm flex items-center justify-center gap-2"
        >
          <AlertTriangle size={14} />
          打开边界案例库
        </button>
      </div>
    </div>
  );
}
