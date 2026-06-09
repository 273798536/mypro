import { useAppStore } from '@/store';
import { sliceFormulaInfo, normalizeVector } from '@/utils/formulas';
import PointCloudScene from '@/components/PointCloudScene';
import {
  Calculator, Ruler, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ParamFieldProps {
  label: string;
  unit: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  formula?: string;
  note?: string;
}

function ParamField({ label, unit, value, min, max, step = 0.1, onChange, formula, note }: ParamFieldProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-xs text-slate-500 font-mono">{unit}</span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          className="industrial-input flex-1"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        <input
          type="range"
          className="flex-1 accent-slate-400"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      {formula && (
        <div className="mt-2 formula-block">
          <div>计算公式：<span className="text-slate-300">{formula}</span></div>
        </div>
      )}
      {note && (
        <div className="mt-1 text-xs text-slate-500">{note}</div>
      )}
    </div>
  );
}

export default function SlicePage() {
  const navigate = useNavigate();
  const { sliceParams, updateSliceParam, pointCloud, validateSliceBounds } = useAppStore();
  const validation = validateSliceBounds();

  const normalizeNormal = () => {
    const [nx, ny, nz] = normalizeVector(sliceParams.normalX, sliceParams.normalY, sliceParams.normalZ);
    updateSliceParam('normalX', nx);
    updateSliceParam('normalY', ny);
    updateSliceParam('normalZ', nz);
  };

  return (
    <div className="h-full flex">
      <div className="w-[420px] flex-shrink-0 border-r border-industrial-600 bg-industrial-800/40 overflow-auto">
        <div className="p-5 border-b border-industrial-600">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">点云切片参数</h2>
          <p className="text-xs text-slate-500">调整参数后三维视图实时更新切面位置</p>
        </div>

        {sliceParams.isOutOfBounds && (
          <div className="mx-5 mt-4 p-4 bg-alert-orange/10 border border-alert-orange/40 rounded-industrial">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-alert-orange flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-alert-orange mb-1">剖切面越界 — 已被拦截</div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {sliceParams.outOfBoundReason}
                </div>
              </div>
            </div>
          </div>
        )}

        {!sliceParams.isOutOfBounds && (
          <div className="mx-5 mt-4 p-3 bg-pass-green/10 border border-pass-green/40 rounded-industrial">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-pass-green" />
              <span className="text-sm text-pass-green">参数校验通过，切面与点云有有效交集</span>
            </div>
          </div>
        )}

        <div className="p-5">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">切面位置</span>
            </div>
            <ParamField
              label="X 方向位置"
              unit="mm"
              value={sliceParams.planeX}
              min={pointCloud?.bounds.minX ?? -200}
              max={pointCloud?.bounds.maxX ?? 200}
              onChange={v => updateSliceParam('planeX', v)}
              formula="切面经过点 P=(X,Y,Z)"
            />
            <ParamField
              label="Y 方向位置"
              unit="mm"
              value={sliceParams.planeY}
              min={pointCloud?.bounds.minY ?? -200}
              max={pointCloud?.bounds.maxY ?? 200}
              onChange={v => updateSliceParam('planeY', v)}
            />
            <ParamField
              label="Z 方向位置"
              unit="mm"
              value={sliceParams.planeZ}
              min={pointCloud?.bounds.minZ ?? 0}
              max={pointCloud?.bounds.maxZ ?? 400}
              onChange={v => updateSliceParam('planeZ', v)}
            />
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">法向量 (a, b, c)</span>
              </div>
              <button onClick={normalizeNormal} className="flex items-center gap-1 text-xs px-2 py-1 bg-industrial-700 rounded-industrial hover:bg-industrial-600 border border-industrial-600">
                <RefreshCw className="w-3 h-3" />
                归一化
              </button>
            </div>
            <ParamField
              label="法向量 X 分量 a"
              unit="无量纲"
              value={sliceParams.normalX}
              min={-1} max={1} step={0.01}
              onChange={v => updateSliceParam('normalX', v)}
              note="建议范围 [-1, 1]，使用归一化按钮确保模长=1"
            />
            <ParamField
              label="法向量 Y 分量 b"
              unit="无量纲"
              value={sliceParams.normalY}
              min={-1} max={1} step={0.01}
              onChange={v => updateSliceParam('normalY', v)}
            />
            <ParamField
              label="法向量 Z 分量 c"
              unit="无量纲"
              value={sliceParams.normalZ}
              min={-1} max={1} step={0.01}
              onChange={v => updateSliceParam('normalZ', v)}
            />
          </div>

          <div className="mb-5">
            <ParamField
              label="切片厚度 t"
              unit="mm"
              value={sliceParams.thickness_mm}
              min={0.1} max={50} step={0.1}
              onChange={v => updateSliceParam('thickness_mm', v)}
              formula="|a·xi + b·yi + c·zi - d| ≤ t/2"
              note="允许范围：0.1mm ~ 50mm，过薄切片点不足，过厚模糊层间特征"
            />
            <ParamField
              label="切片间距"
              unit="mm"
              value={sliceParams.spacing_mm}
              min={0.5} max={20} step={0.5}
              onChange={v => updateSliceParam('spacing_mm', v)}
              note="连续切片间的间隔距离，建议 ≥ 厚度的一半"
            />
          </div>

          <div className="mb-5 p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-alert-orange" />
              <span className="text-sm font-medium text-slate-200">失败原因速查</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {sliceFormulaInfo.failureCases.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-alert-orange font-mono">{c.charAt(0)}</span>
                  <span>{c.slice(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-5 formula-block">
            <div className="mb-1 text-slate-500">完整公式：</div>
            <div className="text-slate-200 text-sm">{sliceFormulaInfo.formula}</div>
            <div className="mt-2 mb-1 text-slate-500">单位：</div>
            <div className="text-slate-300">{sliceFormulaInfo.units}</div>
            <div className="mt-2 mb-1 text-slate-500">适用范围：</div>
            <div className="text-slate-300">{sliceFormulaInfo.range}</div>
          </div>

          <button
            disabled={!validation.valid}
            onClick={() => navigate('/outlier')}
            className={`w-full industrial-btn-primary flex items-center justify-center gap-2 ${!validation.valid ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            确认切片，进入离群点检测
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-5 py-3 border-b border-industrial-600 flex items-center justify-between bg-industrial-800/40">
          <div>
            <span className="text-sm text-slate-400">三维点云视图</span>
            <span className="text-xs text-slate-500 ml-3">橙色半透明平面为当前剖切面，红色表示越界</span>
          </div>
          {pointCloud && (
            <div className="text-xs font-mono text-slate-400">
              点云范围: X[{pointCloud.bounds.minX.toFixed(0)}, {pointCloud.bounds.maxX.toFixed(0)}] &nbsp;
              Y[{pointCloud.bounds.minY.toFixed(0)}, {pointCloud.bounds.maxY.toFixed(0)}] &nbsp;
              Z[{pointCloud.bounds.minZ.toFixed(0)}, {pointCloud.bounds.maxZ.toFixed(0)}] mm
            </div>
          )}
        </div>
        <div className="flex-1">
          <PointCloudScene showSlice />
        </div>

        <div className="h-[180px] border-t border-industrial-600 bg-industrial-800/40 overflow-auto p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">切片计算明细解释</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="detail-label mb-1">切面法向量模长</div>
              <div className="detail-value">
                {Math.sqrt(sliceParams.normalX ** 2 + sliceParams.normalY ** 2 + sliceParams.normalZ ** 2).toFixed(4)}
                {Math.abs(Math.sqrt(sliceParams.normalX ** 2 + sliceParams.normalY ** 2 + sliceParams.normalZ ** 2) - 1) > 0.01
                  ? <span className="text-alert-orange ml-2">（偏离1，建议归一化）</span>
                  : <span className="text-pass-green ml-2">（已归一化 ✓）</span>
                }
              </div>
            </div>
            <div>
              <div className="detail-label mb-1">切面平面方程常数项 d</div>
              <div className="detail-value">
                {(sliceParams.normalX * sliceParams.planeX + sliceParams.normalY * sliceParams.planeY + sliceParams.normalZ * sliceParams.planeZ).toFixed(2)} mm
              </div>
            </div>
            <div>
              <div className="detail-label mb-1">切片厚度半宽 t/2</div>
              <div className="detail-value">{(sliceParams.thickness_mm / 2).toFixed(2)} mm</div>
            </div>
            <div>
              <div className="detail-label mb-1">切面有效范围</div>
              <div className="detail-value">
                [d - t/2, d + t/2] = [{(sliceParams.normalX * sliceParams.planeX + sliceParams.normalY * sliceParams.planeY + sliceParams.normalZ * sliceParams.planeZ - sliceParams.thickness_mm / 2).toFixed(2)}, {(sliceParams.normalX * sliceParams.planeX + sliceParams.normalY * sliceParams.planeY + sliceParams.normalZ * sliceParams.planeZ + sliceParams.thickness_mm / 2).toFixed(2)}] mm
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
