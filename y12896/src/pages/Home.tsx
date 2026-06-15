import { useEffect } from "react";
import { usePlaybackStore } from "@/store/playbackStore";
import TideChart from "@/components/TideChart";
import GateVisualization from "@/components/GateVisualization";
import EnergyDashboard from "@/components/EnergyDashboard";
import PlaybackTimeline from "@/components/PlaybackTimeline";
import AlertsPanel from "@/components/AlertsPanel";
import ControlSidebar from "@/components/ControlSidebar";
import GateOverrideWidget from "@/components/GateOverrideWidget";
import { cn } from "@/lib/utils";
import { Loader2, Waves } from "lucide-react";

export default function Home() {
  const {
    init,
    scenarios,
    scenario,
    tideData,
    calcResult,
    strategy,
    timezone,
    playbackIndex,
    isPlaying,
    playbackSpeed,
    loading,
    error,
    selectScenario,
    setStrategy,
    setTimezone,
    setPlaybackIndex,
    setIsPlaying,
    setPlaybackSpeed,
    getCurrentTimeline,
    runCalculation,
  } = usePlaybackStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isPlaying || !calcResult) return;
    const step = 200 / playbackSpeed;
    const timer = setInterval(() => {
      const next = playbackIndex + 1;
      if (next >= (calcResult?.timeline.length ?? 0)) {
        setIsPlaying(false);
        return;
      }
      setPlaybackIndex(next);
    }, step);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, playbackIndex, calcResult, setPlaybackIndex, setIsPlaying]);

  const currentTimeline = getCurrentTimeline();

  if (!scenario && scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-ocean-300">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        正在加载潮汐场景数据...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {error && (
        <div className="max-w-[1600px] mx-auto px-6 pt-4">
          <div className="rounded-xl bg-red-900/50 border border-tide-shutdown/40 text-red-100 px-4 py-2.5 text-sm">
            ⚠️ {error}
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-3 space-y-4">
            <ControlSidebar
              scenarios={scenarios}
              scenario={scenario}
              strategy={strategy}
              timezone={timezone}
              tideData={tideData}
              loading={loading}
              onScenarioChange={selectScenario}
              onStrategyChange={setStrategy}
              onTimezoneChange={setTimezone}
              onRefresh={runCalculation}
            />
          </div>

          <div className="col-span-6 space-y-5">
            <div className="rounded-2xl bg-gradient-to-r from-ocean-800/50 via-tide-green/10 to-ocean-800/50 border border-ocean-700/50 p-5 shadow-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-tide-green/30 to-ocean-400/30 flex items-center justify-center tide-ripple border border-tide-green/30">
                    <Waves className="w-7 h-7 text-tide-green" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {scenario?.name || "选择场景"}
                    </h2>
                    <p className="text-xs text-ocean-300 mt-0.5 max-w-md leading-relaxed">
                      {scenario?.description || "请从左侧选择一个潮汐场景开始演示"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <div className="text-[10px] text-ocean-400 uppercase tracking-wider">
                      总发电量
                    </div>
                    <div
                      className={cn(
                        "font-mono text-2xl font-bold",
                        calcResult?.totalEnergy ? "text-tide-green" : "text-ocean-500"
                      )}
                    >
                      {(calcResult?.totalEnergy ?? 0).toFixed(0)}
                      <span className="text-xs ml-1 text-ocean-400">kWh</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ocean-400 uppercase tracking-wider">
                      峰值功率
                    </div>
                    <div className="font-mono text-2xl font-bold text-tide-warning">
                      {(calcResult?.peakPower ?? 0).toFixed(0)}
                      <span className="text-xs ml-1 text-ocean-400">kW</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <TideChart
              tides={tideData?.data}
              timeline={calcResult?.timeline}
              highlightIndex={playbackIndex}
            />

            <PlaybackTimeline
              timeline={calcResult?.timeline ?? []}
              currentIndex={playbackIndex}
              isPlaying={isPlaying}
              speed={playbackSpeed}
              onIndexChange={setPlaybackIndex}
              onPlayToggle={() => setIsPlaying(!isPlaying)}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>

          <div className="col-span-3 space-y-5">
            <GateVisualization current={currentTimeline} />
            <EnergyDashboard result={calcResult} current={currentTimeline} />
            <GateOverrideWidget />
            <AlertsPanel
              alerts={calcResult?.alerts ?? []}
              timezoneWarning={tideData?.timezoneWarning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
