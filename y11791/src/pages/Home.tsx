import { CloudRain } from 'lucide-react';
import { ParameterPanel } from '../components/ParameterPanel';
import { ResultPanel } from '../components/ResultPanel';
import { SimulationChart } from '../components/SimulationChart';
import { SampleSelector } from '../components/SampleSelector';
import { ActionToolbar } from '../components/ActionToolbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-200">
              <CloudRain className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                雨滴终端速度模拟器
              </h1>
              <p className="text-slate-500 text-sm">气象科普教学工具 · 数值积分模拟</p>
            </div>
          </div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            通过调整雨滴大小、空气密度和阻力系数等参数，直观观察雨滴下落过程中速度的变化规律，
            理解终端速度的物理原理。
          </p>
        </header>

        <div id="simulation-container">
          <div className="mb-6">
            <ActionToolbar />
          </div>

          <div className="mb-6">
            <SampleSelector />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <ParameterPanel />
            </div>

            <div className="lg:col-span-8 space-y-6">
              <SimulationChart />
              <ResultPanel />
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-slate-400 text-sm">
          <p>基于球体空气阻力模型 · 欧拉数值积分方法</p>
          <p className="mt-1">终端速度公式: vₜ = √(8rρᵥₐₜₑᵣg / 3C𝒹ρₐᵢᵣ)</p>
        </footer>
      </div>
    </div>
  );
}
