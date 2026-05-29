import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import MapCanvas from '@/components/MapCanvas';
import BatteryPanel from '@/components/BatteryPanel';
import FlightStatusBar from '@/components/FlightStatusBar';
import EventPopup from '@/components/EventPopup';
import ChoiceDialog from '@/components/ChoiceDialog';

export default function FlyingPage() {
  const navigate = useNavigate();
  const {
    currentLevel,
    plannedWaypoints,
    flightState,
    flightEvents,
    windFieldVersion,
    windChanges,
    showEventPopup,
    activeChoicePoint,
    isFlying,
    updateFlightTick,
    dismissEventPopup,
    resolveChoice,
    startFlight,
    phase,
  } = useGameStore();

  const intervalRef = useRef<NodeJS.Timeout>();
  const tickRef = useRef(updateFlightTick);

  useEffect(() => {
    tickRef.current = updateFlightTick;
  }, [updateFlightTick]);

  useEffect(() => {
    if (phase === 'result') {
      navigate('/result');
    }
  }, [phase, navigate]);

  useEffect(() => {
    if (currentLevel && !flightState) {
      startFlight();
    }
  }, [currentLevel, flightState, startFlight]);

  useEffect(() => {
    if (!isFlying || activeChoicePoint) return;

    const tick = () => {
      tickRef.current(0.05);
    };

    intervalRef.current = setInterval(tick, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFlying, activeChoicePoint]);

  useEffect(() => {
    if (!currentLevel) {
      const timer = setTimeout(() => {
        if (!useGameStore.getState().currentLevel) {
          navigate('/');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentLevel, navigate]);

  if (!currentLevel) {
    return null;
  }

  if (!flightState) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">正在初始化飞行...</p>
        </div>
      </div>
    );
  }

  const currentWpIndex = flightState.currentWaypointIndex;
  const totalWps = plannedWaypoints.length;

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      <FlightStatusBar
        position={flightState.position}
        heading={flightState.heading}
        battery={flightState.battery}
        speed={flightState.speed}
        currentWaypoint={currentWpIndex + 1}
        totalWaypoints={totalWps}
        elapsed={flightState.elapsed}
        windAtPosition={flightState.windAtPosition}
        isHeadwind={flightState.isHeadwind}
      />

      <div className="flex-1 flex">
        <div className="flex-1 p-4 pb-4">
          <div className="h-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
            <MapCanvas
              gridSize={currentLevel.gridSize}
              waypoints={plannedWaypoints}
              noFlyZones={currentLevel.noFlyZones}
              windField={currentLevel.windField}
              dronePosition={flightState.position}
              droneHeading={flightState.heading}
              plannedPath={plannedWaypoints}
              home={currentLevel.home}
              windChanges={windChanges}
              showWindOverlay={false}
              editable={false}
              onWaypointsChange={() => {}}
            />
          </div>
        </div>

        <div className="w-72 bg-slate-800/50 border-l border-slate-700 p-4 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="font-bold mb-3">电池状态</h3>
            <BatteryPanel
              battery={flightState.battery}
              drainRate={flightState.drainRate}
              isHeadwind={flightState.isHeadwind}
              headwindCoefficient={currentLevel.headwindMultiplier}
              minReturnBattery={currentLevel.minReturnBattery}
              maxBattery={currentLevel.batteryCapacity}
            />
          </div>

          <div className="bg-slate-900 rounded-xl p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-bold mb-3">飞行事件</h3>
            <div className="flex-1 overflow-auto space-y-2">
              {flightEvents.slice().reverse().map((event, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-xs border ${
                    event.type === 'no_fly_zone_enter'
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : event.type === 'low_battery' || event.type === 'return_battery_critical'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : event.type === 'headwind_start'
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                      : event.type === 'waypoint_reached'
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="font-medium">
                    [{event.timestamp.toFixed(1)}s] {event.message}
                  </div>
                </div>
              ))}
              {flightEvents.length === 0 && (
                <div className="text-slate-500 text-sm text-center py-4">
                  等待飞行事件...
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {windFieldVersion === 2 && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
                风场 v2 模式 — 已标记变更区域
              </div>
            )}
          </div>
        </div>
      </div>

      <EventPopup
        event={showEventPopup.show ? showEventPopup.event : null}
        onDismiss={dismissEventPopup}
      />

      <ChoiceDialog
        choicePoint={activeChoicePoint}
        onSelect={resolveChoice}
      />
    </div>
  );
}
