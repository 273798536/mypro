import { useGameStore } from '../store/gameStore';
import { Station } from '../types';

interface GameBoardProps {
  selectedBus: string | null;
  onSelectBus: (busId: string | null) => void;
}

export default function GameBoard({ selectedBus, onSelectBus }: GameBoardProps) {
  const stations = useGameStore(state => state.stations);
  const lines = useGameStore(state => state.lines);
  const buses = useGameStore(state => state.buses);
  const closedStationId = useGameStore(state => state.closedStationId);

  const getStationById = (id: string) => stations.find(s => s.id === id);

  const getBusesAtStation = (stationId: string) => {
    return buses.filter(bus => {
      const line = lines.find(l => l.id === bus.lineId);
      if (!line) return false;
      return line.stations[bus.currentStationIndex] === stationId;
    });
  };

  const renderLines = () => {
    return lines.map(line => {
      const lineStations = line.stations.map(id => getStationById(id)).filter(Boolean) as Station[];

      if (lineStations.length < 2) return null;

      const pathData = lineStations.map((s, i) =>
        `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`
      ).join(' ');

      return (
        <path
          key={line.id}
          d={pathData}
          stroke={line.color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      );
    });
  };

  const renderStations = () => {
    return stations.map(station => {
      const loadRate = station.passengerFlow / station.maxCapacity;
      const isClosed = station.id === closedStationId;
      const busesAtStation = getBusesAtStation(station.id);

      let fillColor = '#fff';
      if (loadRate > 0.9) fillColor = '#F53F3F';
      else if (loadRate > 0.7) fillColor = '#FF7D00';
      else if (loadRate > 0.5) fillColor = '#FFAA00';

      return (
        <g key={station.id}>
          <circle
            cx={station.x}
            cy={station.y}
            r={station.isTransfer ? 18 : 14}
            fill={fillColor}
            stroke={station.isTransfer ? '#165DFF' : '#86909C'}
            strokeWidth={station.isTransfer ? 3 : 2}
            className={isClosed ? 'opacity-50' : ''}
          />

          {station.isTransfer && (
            <circle
              cx={station.x}
              cy={station.y}
              r={22}
              fill="none"
              stroke="#165DFF"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          <text
            x={station.x}
            y={station.y + 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={loadRate > 0.7 ? '#fff' : '#333'}
          >
            {busesAtStation.length}
          </text>

          <text
            x={station.x}
            y={station.y - 28}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
            fontWeight="500"
          >
            {station.name}
          </text>

          <rect
            x={station.x - 20}
            y={station.y + 22}
            width="40"
            height="8"
            rx="4"
            fill="#e5e7eb"
          />
          <rect
            x={station.x - 19}
            y={station.y + 23}
            width={Math.min(38, 38 * loadRate)}
            height="6"
            rx="3"
            fill={loadRate > 0.9 ? '#F53F3F' : loadRate > 0.7 ? '#FF7D00' : '#00B42A'}
          />

          <text
            x={station.x}
            y={station.y + 45}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {station.passengerFlow}/{station.maxCapacity}
          </text>

          {isClosed && (
            <g>
              <line
                x1={station.x - 20}
                y1={station.y - 20}
                x2={station.x + 20}
                y2={station.y + 20}
                stroke="#F53F3F"
                strokeWidth="3"
              />
              <line
                x1={station.x + 20}
                y1={station.y - 20}
                x2={station.x - 20}
                y2={station.y + 20}
                stroke="#F53F3F"
                strokeWidth="3"
              />
            </g>
          )}
        </g>
      );
    });
  };

  const renderBuses = () => {
    return buses.map(bus => {
      const line = lines.find(l => l.id === bus.lineId);
      if (!line) return null;

      const stationId = line.stations[bus.currentStationIndex];
      const station = getStationById(stationId);
      if (!station) return null;

      const lineStations = line.stations.map(id => getStationById(id)).filter(Boolean) as Station[];
      const busIndexInLine = lineStations.findIndex(s => s.id === stationId);

      const offsetIndex = buses.filter(
        b => b.id !== bus.id &&
          b.lineId === bus.lineId &&
          line.stations[b.currentStationIndex] === stationId
      ).findIndex(b => b.id === bus.id);

      const offsetAngle = (offsetIndex + 1) * (Math.PI / 4);
      const offsetX = Math.cos(offsetAngle) * 20;
      const offsetY = Math.sin(offsetAngle) * 20;

      const isSelected = selectedBus === bus.id;
      const isBroken = bus.status === 'broken';
      const isStopped = bus.status === 'stopped';

      let statusColor = line.color;
      if (isBroken) statusColor = '#F53F3F';
      else if (isStopped) statusColor = '#86909C';

      return (
        <g
          key={bus.id}
          transform={`translate(${station.x + (offsetIndex > -1 ? offsetX : busIndexInLine * 5)}, ${station.y + (offsetIndex > -1 ? offsetY : 0)})`}
          onClick={() => onSelectBus(isSelected ? null : bus.id)}
          className="cursor-pointer"
        >
          <rect
            x="-15"
            y="-10"
            width="30"
            height="20"
            rx="4"
            fill={statusColor}
            stroke={isSelected ? '#333' : 'none'}
            strokeWidth={isSelected ? 3 : 0}
            className={isBroken ? 'animate-pulse-critical' : ''}
          />

          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="10"
            fill="#fff"
            fontWeight="bold"
          >
            🚌
          </text>

          {isSelected && (
            <g>
              <rect
                x="-50"
                y="-50"
                width="100"
                height="35"
                rx="6"
                fill="white"
                stroke="#333"
                strokeWidth="1"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
              />
              <text
                x="0"
                y="-35"
                textAnchor="middle"
                fontSize="10"
                fill="#333"
                fontWeight="bold"
              >
                {bus.plateNumber}
              </text>
              <text
                x="0"
                y="-22"
                textAnchor="middle"
                fontSize="9"
                fill="#666"
              >
                {bus.driverName} | {bus.continuousDriving.toFixed(1)}h
              </text>
              <text
                x="0"
                y="-10"
                textAnchor="middle"
                fontSize="9"
                fill={isBroken ? '#F53F3F' : isStopped ? '#86909C' : '#00B42A'}
              >
                {isBroken ? '⚠️ 故障' : isStopped ? '⏸️ 停靠' : `✅ ${bus.passengerCount}/${bus.maxPassengers}人`}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🗺️ 调度棋盘</h2>

      <div className="bg-gray-50 rounded-xl overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <svg width="600" height="500" viewBox="0 0 600 500" className="w-full h-auto">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="600" height="500" fill="url(#grid)" />

          {renderLines()}
          {renderStations()}
          {renderBuses()}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-safe-green"></div>
          <span className="text-gray-600">客流正常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-warning-orange"></div>
          <span className="text-gray-600">客流偏高</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-passenger-red"></div>
          <span className="text-gray-600">客流超载</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-dashed border-traffic-blue"></div>
          <span className="text-gray-600">换乘站</span>
        </div>
      </div>
    </div>
  );
}
