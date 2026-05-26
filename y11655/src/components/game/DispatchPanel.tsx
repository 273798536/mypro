import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Route } from '../../types';
import { Button } from '../common/Button';
import { Route as RouteIcon, Plus, Minus } from 'lucide-react';

interface DispatchPanelProps {
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
  onEnterRerouteMode: (route: Route) => void;
}

export const DispatchPanel: React.FC<DispatchPanelProps> = ({
  selectedRouteId,
  onSelectRoute,
  onEnterRerouteMode,
}) => {
  const { routes, vehicles, stations, adjustInterval, dispatchVehicle, suspendRoute, resumeRoute } = useGameStore();
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const getRouteVehicles = (routeId: string) => {
    return vehicles.filter((v) => v.routeId === routeId);
  };

  const getStationName = (stationId: string) => {
    return stations.find((s) => s.id === stationId)?.name || stationId;
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-dispatch-text-muted mb-2">线路列表</div>
      {routes.map((route) => {
        const routeVehicles = getRouteVehicles(route.id);
        const isExpanded = expandedRouteId === route.id;
        const isSelected = selectedRouteId === route.id;

        return (
          <div
            key={route.id}
            className={`bg-dispatch-bg border rounded-lg overflow-hidden transition-all ${
              isSelected ? 'border-dispatch-primary' : 'border-dispatch-border'
            }`}
          >
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-dispatch-panel/50"
              onClick={() => {
                onSelectRoute(isSelected ? null : route.id);
                setExpandedRouteId(isExpanded ? null : route.id);
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: route.color }}
                />
                <div>
                  <div className="font-mono font-semibold text-sm flex items-center gap-2">
                    {route.name}
                    {route.status === 'detoured' && (
                      <span className="text-xs px-2 py-0.5 bg-dispatch-warning/20 text-dispatch-warning rounded">
                        绕行
                      </span>
                    )}
                    {route.status === 'suspended' && (
                      <span className="text-xs px-2 py-0.5 bg-dispatch-danger/20 text-dispatch-danger rounded">
                        停运
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-dispatch-text-muted">
                    {routeVehicles.length} 辆车 · 发车间隔 {route.interval}s
                  </div>
                </div>
              </div>
              <div className="text-dispatch-text-muted text-sm">
                {isExpanded ? '−' : '+'}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-dispatch-border pt-3">
                <div>
                  <div className="text-xs text-dispatch-text-muted mb-1">站点列表</div>
                  <div className="flex flex-wrap gap-1">
                    {route.stations.map((stationId, index) => {
                      const station = stations.find((s) => s.id === stationId);
                      return (
                        <span
                          key={stationId}
                          className={`text-xs px-2 py-1 rounded ${
                            station?.isBlocked
                              ? 'bg-dispatch-danger/20 text-dispatch-danger'
                              : 'bg-dispatch-panel text-dispatch-text'
                          }`}
                        >
                          {index + 1}. {getStationName(stationId)}
                          {station?.isBlocked && ' ⚠️'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-dispatch-text-muted mb-1">运行车辆</div>
                  <div className="space-y-1">
                    {routeVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between text-xs bg-dispatch-panel rounded px-2 py-1"
                      >
                        <span className="font-mono">{vehicle.plateNumber}</span>
                        <span className="text-dispatch-text-muted">
                          {vehicle.passengers}/{vehicle.capacity}人 · 下一站点 {Math.ceil(vehicle.nextStationTime)}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustInterval(route.id, Math.max(10, route.interval - 5));
                      }}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="px-2 text-sm font-mono">{route.interval}s</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustInterval(route.id, Math.min(120, route.interval + 5));
                      }}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchVehicle(route.id);
                    }}
                  >
                    <Plus size={14} className="mr-1" />
                    派车
                  </Button>

                  <Button
                    size="sm"
                    variant="warning"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEnterRerouteMode(route);
                    }}
                  >
                    <RouteIcon size={14} className="mr-1" />
                    改线
                  </Button>

                  {route.status !== 'suspended' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        suspendRoute(route.id);
                      }}
                    >
                      停运
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        resumeRoute(route.id);
                      }}
                    >
                      恢复
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
