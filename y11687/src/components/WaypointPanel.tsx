import { useState } from 'react';
import { useFlightStore } from '../store/useFlightStore';
import { X, Plus, Trash2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Waypoint } from '../types';
import { airports } from '../data/airports';

const WaypointPanel = () => {
  const {
    currentRoute,
    selectedWaypointId,
    selectWaypoint,
    addWaypoint,
    removeWaypoint,
    updateWaypoint,
  } = useFlightStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddAirport, setShowAddAirport] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [customName, setCustomName] = useState('');

  if (!currentRoute) return null;

  const handleAddAirport = (airport: Waypoint) => {
    const newWaypoint: Waypoint = {
      ...airport,
      id: `${airport.id}-${Date.now()}`,
    };
    addWaypoint(newWaypoint);
    setShowAddAirport(false);
  };

  const handleAddCustomWaypoint = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);

    if (isNaN(lat) || isNaN(lng) || !customName.trim()) {
      alert('请填写有效的经纬度和名称');
      return;
    }

    const newWaypoint: Waypoint = {
      id: `custom-${Date.now()}`,
      name: customName,
      lat,
      lng,
      alt: 10000,
      type: 'waypoint',
    };

    addWaypoint(newWaypoint);
    setCustomLat('');
    setCustomLng('');
    setCustomName('');
  };

  const handleToggleAlternate = (waypoint: Waypoint) => {
    updateWaypoint(waypoint.id, { isAlternate: !waypoint.isAlternate });
  };

  return (
    <div className="absolute left-4 bottom-4 w-96 z-10">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            <span className="text-white font-semibold">航点列表</span>
            <span className="text-slate-400 text-sm">({currentRoute.waypoints.length})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {isExpanded && (
          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {currentRoute.waypoints.map((waypoint, index) => (
                <div
                  key={waypoint.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedWaypointId === waypoint.id
                      ? 'bg-blue-600/30 border border-blue-500'
                      : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50'
                  }`}
                  onClick={() => selectWaypoint(waypoint.id)}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm truncate">{waypoint.name}</span>
                      {waypoint.iataCode && (
                        <span className="text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                          {waypoint.iataCode}
                        </span>
                      )}
                      {waypoint.isAlternate && (
                        <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">
                          备降
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {waypoint.lat.toFixed(4)}°N, {waypoint.lng.toFixed(4)}°E
                    </div>
                  </div>
                  {waypoint.type === 'airport' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAlternate(waypoint);
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        waypoint.isAlternate
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {waypoint.isAlternate ? '取消备降' : '设为备降'}
                    </button>
                  )}
                  {currentRoute.waypoints.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWaypoint(waypoint.id);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddAirport(!showAddAirport)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加机场
              </button>
            </div>

            {showAddAirport && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">选择机场</span>
                  <button
                    onClick={() => setShowAddAirport(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {airports.map((airport) => (
                    <button
                      key={airport.id}
                      onClick={() => handleAddAirport(airport)}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-700 rounded text-sm text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-medium">{airport.iataCode}</span>
                        <span className="truncate">{airport.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-slate-400 text-sm mb-2">或添加自定义航点</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="名称"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="bg-slate-700 text-white px-2 py-1 rounded text-sm col-span-2"
                    />
                    <input
                      type="number"
                      placeholder="纬度"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      step="0.0001"
                      className="bg-slate-700 text-white px-2 py-1 rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="经度"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      step="0.0001"
                      className="bg-slate-700 text-white px-2 py-1 rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddCustomWaypoint}
                    className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    添加自定义航点
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaypointPanel;
