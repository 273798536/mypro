import { useState } from 'react';
import {
  Settings,
  Play,
  Database,
  AlertTriangle,
  Plus,
  Trash2,
  Upload,
  Gauge,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../store';
import { calculateCoverage } from '../utils/pathCalculator';
import { validateAllData } from '../utils/dataValidator';
import { saveSimulation } from '../utils/storage';
import type { FireStation } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function ControlPanel() {
  const {
    currentSimulation,
    isCalculating,
    updateParameters,
    addFireStation,
    removeFireStation,
    updateFireStation,
    setResults,
    setIsCalculating,
    addAlert,
    clearAlerts,
    addSimulationToHistory,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'parameters' | 'stations' | 'data'>('parameters');

  const handleRunSimulation = async () => {
    if (!currentSimulation) return;

    setIsCalculating(true);
    clearAlerts();

    const alerts = validateAllData(
      currentSimulation.fireStations,
      currentSimulation.buildings,
      currentSimulation.roadNodes,
      currentSimulation.roadEdges,
      currentSimulation.parameters
    );

    alerts.forEach((alert) => addAlert(alert));

    setTimeout(async () => {
      const results = calculateCoverage(
        currentSimulation.fireStations,
        currentSimulation.buildings,
        currentSimulation.roadNodes,
        currentSimulation.roadEdges,
        currentSimulation.parameters
      );

      setResults(results);

      const updatedSimulation = {
        ...currentSimulation,
        results,
        alerts,
      };

      await saveSimulation(updatedSimulation);
      addSimulationToHistory(updatedSimulation);

      setIsCalculating(false);
    }, 500);
  };

  const handleAddStation = () => {
    const newStation: FireStation = {
      id: generateId(),
      name: `新消防站 ${currentSimulation?.fireStations.length || 0 + 1}`,
      position: [
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80,
      ],
      responseTime: 5,
      vehicles: 5,
    };
    addFireStation(newStation);
  };

  if (!currentSimulation) {
    return (
      <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 h-full flex items-center justify-center">
        <p className="text-slate-400">正在加载数据...</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          模拟控制中心
        </h2>
        <p className="text-xs text-slate-400 mt-1 truncate">
          {currentSimulation.name}
        </p>
      </div>

      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
            activeTab === 'parameters'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gauge className="w-4 h-4 mx-auto mb-1" />
          参数
        </button>
        <button
          onClick={() => setActiveTab('stations')}
          className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
            activeTab === 'stations'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4 mx-auto mb-1" />
          消防站
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
            activeTab === 'data'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4 mx-auto mb-1" />
          数据
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'parameters' && (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <Clock className="w-4 h-4 text-orange-400" />
                响应时间阈值
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={currentSimulation.parameters.responseThreshold}
                  onChange={(e) =>
                    updateParameters({
                      responseThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>1分钟</span>
                  <span className="text-white font-bold">
                    {currentSimulation.parameters.responseThreshold} 分钟
                  </span>
                  <span>30分钟</span>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <Gauge className="w-4 h-4 text-green-400" />
                车速系数
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={currentSimulation.parameters.speedCoefficient}
                  onChange={(e) =>
                    updateParameters({
                      speedCoefficient: Number(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0.1x</span>
                  <span className="text-white font-bold">
                    {currentSimulation.parameters.speedCoefficient.toFixed(1)}x
                  </span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  调整参数后需要重新运行模拟才能看到更新后的结果
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stations' && (
          <div className="space-y-3">
            <button
              onClick={handleAddStation}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加消防站
            </button>

            <div className="space-y-2">
              {currentSimulation.fireStations.map((station) => (
                <div
                  key={station.id}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={station.name}
                      onChange={(e) =>
                        updateFireStation(station.id, { name: e.target.value })
                      }
                      className="bg-transparent text-sm font-medium text-white focus:outline-none flex-1"
                    />
                    <button
                      onClick={() => removeFireStation(station.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">车辆数:</span>
                      <input
                        type="number"
                        value={station.vehicles}
                        onChange={(e) =>
                          updateFireStation(station.id, {
                            vehicles: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-slate-700 rounded px-2 py-1 text-white ml-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">响应:</span>
                      <input
                        type="number"
                        value={station.responseTime}
                        onChange={(e) =>
                          updateFireStation(station.id, {
                            responseTime: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-slate-700 rounded px-2 py-1 text-white ml-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">拖放文件或点击上传</p>
              <p className="text-xs text-slate-500 mt-1">
                支持 GeoJSON, CSV 格式
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">建筑数量</span>
                <span className="text-white">
                  {currentSimulation.buildings.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">道路节点</span>
                <span className="text-white">
                  {currentSimulation.roadNodes.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">道路路段</span>
                <span className="text-white">
                  {currentSimulation.roadEdges.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">断路数量</span>
                <span className="text-red-400">
                  {currentSimulation.roadEdges.filter((e) => e.isBlocked).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleRunSimulation}
          disabled={isCalculating}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            isCalculating
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25'
          }`}
        >
          {isCalculating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              计算中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              运行模拟
            </>
          )}
        </button>
      </div>
    </div>
  );
}
