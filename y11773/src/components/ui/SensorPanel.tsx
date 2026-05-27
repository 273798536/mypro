import { useState } from 'react';
import {
  Activity,
  Ruler,
  ThermometerSun,
  Zap,
  Calculator,
  Info,
  ChevronDown,
  ChevronUp,
  Camera,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { PHYSICS_CONSTANTS } from '../../types';
import { toKelvin, formatNumber, formatTime } from '../../utils/physics';
import html2canvas from 'html2canvas';

export function SensorPanel() {
  const {
    sensor,
    heatSource,
    validationResults,
    addSnapshot,
    setCurrentPage,
  } = useAppStore();

  const [showFormula, setShowFormula] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const tempKelvin = toKelvin(heatSource.temperature, heatSource.temperatureUnit);
  const { STEFAN_BOLTZMANN } = PHYSICS_CONSTANTS;

  const distanceValidation = validationResults.find((v) => v.parameterName === 'distance');
  const colorScaleValidation = validationResults.find((v) => v.parameterName === 'colorScale');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'error':
        return 'text-red-500 bg-red-500/20 border-red-500/50';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      default:
        return 'text-green-500 bg-green-500/20 border-green-500/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'error':
        return '错误';
      case 'warning':
        return '警告';
      default:
        return '正常';
    }
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const element = document.getElementById('main-container');
      if (element) {
        const canvas = await html2canvas(element, {
          backgroundColor: '#0a0e1a',
          scale: 2,
          logging: false,
        });
        const imageData = canvas.toDataURL('image/png');
        addSnapshot(imageData);
      }
    } catch (error) {
      console.error('截图失败:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white font-['Orbitron'] tracking-wider">
            传感器读数
          </h2>
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(sensor.status)}`}>
            {getStatusText(sensor.status)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">实时热辐射强度监测</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-slate-300">辐射强度</span>
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight">
            {formatNumber(sensor.measuredIntensity, 6)}
          </div>
          <div className="text-sm text-slate-400 font-mono">W/m²</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Ruler className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">距离</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {formatNumber(sensor.distance, 4)}
            </div>
            <div className="text-xs text-slate-500">米 (m)</div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <ThermometerSun className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">热源温度</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {formatNumber(tempKelvin, 2)}
            </div>
            <div className="text-xs text-slate-500">开尔文 (K)</div>
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-400">辐射出射度</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatNumber(
              heatSource.material.emissivity * STEFAN_BOLTZMANN * Math.pow(tempKelvin, 4),
              4
            )}
          </div>
          <div className="text-xs text-slate-500">W/m² (单位面积辐射功率)</div>
        </div>

        <button
          onClick={() => setShowFormula(!showFormula)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-all"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-300">计算过程</span>
          </div>
          {showFormula ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showFormula && (
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 space-y-3 text-sm">
            <div className="text-center text-slate-300 font-medium mb-3">
              斯蒂芬-玻尔兹曼定律 + 距离平方反比定律
            </div>

            <div className="p-3 bg-slate-900/50 rounded border border-slate-600 font-mono text-xs">
              <div className="text-purple-400 mb-2">I = εσT⁴A / 4πr²</div>
              <div className="space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>ε (发射率):</span>
                  <span className="text-white">{heatSource.material.emissivity.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>σ (常数):</span>
                  <span className="text-white">{STEFAN_BOLTZMANN.toExponential(2)} W/m²K⁴</span>
                </div>
                <div className="flex justify-between">
                  <span>T (温度):</span>
                  <span className="text-white">{tempKelvin.toFixed(2)} K</span>
                </div>
                <div className="flex justify-between">
                  <span>A (面积):</span>
                  <span className="text-white">{heatSource.area.toFixed(4)} m²</span>
                </div>
                <div className="flex justify-between">
                  <span>r (距离):</span>
                  <span className="text-white">{sensor.distance.toFixed(4)} m</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-600">
                <div className="flex justify-between text-green-400">
                  <span>I (强度):</span>
                  <span className="text-white font-bold">{formatNumber(sensor.measuredIntensity, 6)} W/m²</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              距离平方反比: 距离加倍，强度减为1/4
            </div>
          </div>
        )}

        {distanceValidation && distanceValidation.level !== 'info' && (
          <div className={`p-3 rounded-lg text-xs ${
            distanceValidation.level === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
          }`}>
            <p className="font-medium">⚠️ 距离警告</p>
            <p className="mt-1">{distanceValidation.message}</p>
            {distanceValidation.correction && (
              <p className="mt-1 opacity-80">💡 {distanceValidation.correction}</p>
            )}
          </div>
        )}

        {colorScaleValidation && colorScaleValidation.level !== 'info' && (
          <div className={`p-3 rounded-lg text-xs ${
            colorScaleValidation.level === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
          }`}>
            <p className="font-medium">🎨 色阶警告</p>
            <p className="mt-1">{colorScaleValidation.message}</p>
            {colorScaleValidation.correction && (
              <p className="mt-1 opacity-80">💡 {colorScaleValidation.correction}</p>
            )}
          </div>
        )}

        <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 flex items-center gap-1 mb-2">
            <Info className="w-3 h-3" />
            传感器校准信息
          </div>
          <p className="text-xs text-slate-500">{sensor.calibrationSource}</p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2.5 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Camera className="w-4 h-4" />
          {isCapturing ? '捕获中...' : '截图保存'}
        </button>

        <button
          onClick={() => setCurrentPage('report')}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded transition-all border border-slate-600 hover:border-slate-500"
        >
          <FileText className="w-4 h-4" />
          查看演示报告
        </button>

        <div className="text-xs text-slate-600 text-center mt-2">
          最后更新: {formatTime(Date.now())}
        </div>
      </div>
    </div>
  );
}
