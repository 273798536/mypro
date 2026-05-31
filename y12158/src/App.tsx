import { useState } from 'react';
import { Waves } from 'lucide-react';
import type { ScenarioType } from './types';
import { getScenarioData } from './data/mockData';
import { TideChart } from './components/TideChart';
import { TideTable } from './components/TideTable';
import { DeviceStatusPanel } from './components/DeviceStatusPanel';
import { PriceCalendar } from './components/PriceCalendar';
import { ScenarioSwitcher } from './components/ScenarioSwitcher';

function App() {
  const [currentScenario, setCurrentScenario] = useState<ScenarioType>('normal');
  const scenarioData = getScenarioData(currentScenario);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">潮汐能发电窗口演示系统</h1>
                <p className="text-xs text-gray-500">Tidal Energy Generation Window Simulator</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              当前场景: <span className="font-semibold text-gray-700">{scenarioData.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TideChart
              data={scenarioData.tideData}
              generationWindows={scenarioData.generationWindows}
            />
            <TideTable data={scenarioData.tideData} />
          </div>

          <div className="space-y-6">
            <ScenarioSwitcher
              currentScenario={currentScenario}
              onScenarioChange={setCurrentScenario}
              stats={scenarioData.stats}
              description={scenarioData.description}
            />
            <DeviceStatusPanel data={scenarioData.deviceStatus} />
            <PriceCalendar data={scenarioData.priceData} />
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>⚠️ 演示数据仅供教学演示使用，不代表实际运行数据</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
