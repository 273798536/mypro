import { ThreeScene } from '../components/three/Scene';
import { ControlPanel } from '../components/ControlPanel';
import { DataCards } from '../components/DataCards';
import { AlertBanner } from '../components/AlertBanner';
import { HoverTooltip } from '../components/HoverTooltip';
import { ScenarioManager } from '../components/ScenarioManager';
import { ComparisonChart } from '../components/ComparisonChart';
import { ExportTools } from '../components/ExportTools';

export default function Home() {
  return (
    <div className="w-full h-screen bg-gray-950 relative overflow-hidden">
      <ThreeScene />

      <AlertBanner />
      <ScenarioManager />
      <ControlPanel />
      <DataCards />
      <ComparisonChart />
      <ExportTools />
      <HoverTooltip />

      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">☀️</span>
          太阳能板角度试算
        </h1>
        <p className="text-xs text-gray-500 mt-1">校园节能小组 · 发电估算工具</p>
      </div>
    </div>
  );
}
