import { useState, useRef } from 'react';
import { Info, Camera, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { calculateVolume, formatVolume } from '@/utils/mathUtils';

export function DetailPanel({ canvas }: { canvas: HTMLCanvasElement | null }) {
  const { currentFunction, rotationAxis, solidParams, addHistoryRecord } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const volume = calculateVolume(currentFunction, rotationAxis, solidParams.precision);
  const hasReversedInterval = currentFunction.domain.isReversed;
  const hasInsufficientSlices = solidParams.slices < 16;

  const handleExportScreenshot = async () => {
    if (!canvas) return;
    
    setIsExporting(true);
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      
      addHistoryRecord({
        type: 'export',
        functionConfig: currentFunction,
        rotationAxis: rotationAxis,
        volume: volume,
        screenshot: dataUrl,
        remark: `截图导出 - ${currentFunction.expression} 绕 ${rotationAxis.axis.toUpperCase()} 轴`,
        tags: ['截图', '导出'],
        status: 'normal',
        issues: {
          reversedInterval: hasReversedInterval,
          axisConfusion: false,
          insufficientSlices: hasInsufficientSlices
        }
      });

      const link = document.createElement('a');
      link.download = `solid-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyParams = () => {
    const params = {
      function: currentFunction.expression,
      domain: [currentFunction.domain.start, currentFunction.domain.end],
      axis: rotationAxis.axis,
      slices: solidParams.slices,
      precision: solidParams.precision,
      volume: volume
    };
    navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-primary-400" />
        <h3 className="font-semibold text-white">数据详情</h3>
      </div>

      {(hasReversedInterval || hasInsufficientSlices) && (
        <div className="p-3 bg-warning-500/20 border border-warning-500/50 rounded-lg warning-glow space-y-2">
          <div className="flex items-center gap-2 text-warning-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">检测到潜在问题</span>
          </div>
          <ul className="text-xs text-warning-300 space-y-1">
            {hasReversedInterval && (
              <li>• 区间反向可能导致概念混淆</li>
            )}
            {hasInsufficientSlices && (
              <li>• 切片过少可能影响显示质量</li>
            )}
          </ul>
        </div>
      )}

      <div className="p-4 bg-dark-700/50 rounded-lg border border-primary-500/30">
        <div className="text-xs text-gray-400 mb-1">旋转体体积</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-primary-400 glow-text">
            V = {formatVolume(volume)}
          </span>
          <span className="text-xs text-gray-500">单位³</span>
        </div>
        <div className="mt-2 text-xs text-gray-500 font-mono">
          V = π ∫[a,b] f(x)² dx
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-400">参数对应表</div>
        <div className="bg-dark-700/30 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-700">
              <tr>
                <td className="py-2 px-3 text-gray-400">函数 f(x)</td>
                <td className="py-2 px-3 font-mono text-white text-right">
                  {currentFunction.expression}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">区间 [a, b]</td>
                <td className={`py-2 px-3 font-mono text-right ${hasReversedInterval ? 'text-warning-400' : 'text-white'}`}>
                  [{currentFunction.domain.start}, {currentFunction.domain.end}]
                  {hasReversedInterval && ' ↺'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">旋转轴</td>
                <td className="py-2 px-3 font-mono text-white text-right">
                  {rotationAxis.axis.toUpperCase()} 轴
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">切片数</td>
                <td className={`py-2 px-3 font-mono text-right ${hasInsufficientSlices ? 'text-warning-400' : 'text-white'}`}>
                  {solidParams.slices}
                  {hasInsufficientSlices && ' ⚠'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">计算精度</td>
                <td className="py-2 px-3 font-mono text-white text-right">
                  {solidParams.precision} 点
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-400">体积计算公式</div>
        <div className="p-3 bg-dark-800 rounded-lg font-mono text-xs text-gray-300">
          <div className="mb-1">// {rotationAxis.axis === 'x' ? '圆盘法' : '壳层法'}</div>
          <div>
            V = {rotationAxis.axis === 'x' 
              ? `π ∫[${currentFunction.domain.start},${currentFunction.domain.end}] (f(x))² dx`
              : `2π ∫[${currentFunction.domain.start},${currentFunction.domain.end}] x·f(x) dx`
            }
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700 space-y-2">
        <button
          onClick={handleExportScreenshot}
          disabled={!canvas || isExporting}
          className="w-full py-2 px-4 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-4 h-4" />
          {isExporting ? '导出中...' : '导出截图'}
        </button>
        <button
          onClick={handleCopyParams}
          className="w-full py-2 px-4 btn-secondary flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              复制参数
            </>
          )}
        </button>
      </div>
    </div>
  );
}
