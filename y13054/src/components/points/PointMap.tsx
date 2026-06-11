import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from './StatusBadge';
import { haversineDistance, formatDistance } from '@/utils/distance';

const CENTER: [number, number] = [36.074, 120.397];

const STATUS_COLORS: Record<string, string> = {
  processed: '#27AE60',
  pending_material: '#F39C12',
  manual_overruled: '#8E44AD',
  withdrawn: '#7F8C8D',
  suspended: '#C0392B',
};

function makeIcon(color: string, isAbnormal: boolean) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${isAbnormal ? '22px' : '16px'};
        height: ${isAbnormal ? '22px' : '16px'};
        background: ${color};
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 ${isAbnormal ? '3px' : '1px'} ${color}55, 0 2px 6px rgba(0,0,0,0.25);
        ${isAbnormal ? 'animation: pulse 1.8s ease-in-out infinite;' : ''}
      "></div>
    `,
    iconSize: isAbnormal ? [22, 22] : [16, 16],
    iconAnchor: isAbnormal ? [11, 11] : [8, 8],
  });
}

export default function PointMap() {
  const navigate = useNavigate();
  const { points, getFilteredPoints } = useAppStore();
  const filteredPoints = getFilteredPoints();

  const allPoints = filteredPoints.length > 0 ? filteredPoints : points;

  const abnormalIds = new Set(
    points.filter((p) => p.status === 'suspended' || p.status === 'withdrawn').map((p) => p.id)
  );

  const lines: { positions: [number, number][]; color: string; dash?: string }[] = [];
  points.forEach((p) => {
    if (p.adjacentPoints) {
      p.adjacentPoints.forEach((adjId) => {
        const adj = points.find((x) => x.id === adjId);
        if (adj && p.id < adjId) {
          const dist = haversineDistance(p.lat, p.lng, adj.lat, adj.lng);
          const isSuspendedPair =
            (p.status === 'suspended' && adj.status === 'suspended');
          lines.push({
            positions: [
              [p.lat, p.lng],
              [adj.lat, adj.lng],
            ],
            color: isSuspendedPair ? '#C0392B' : dist < 50 ? '#F39C12' : '#94a3b8',
            dash: isSuspendedPair ? '8 8' : undefined,
          });
        }
      });
    }
  });

  return (
    <div className="bg-white rounded-sm shadow-sm border border-sea-mist-dark flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-sea-mist-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-serif-cn text-deep-sea font-semibold text-sm">空间分布图</h3>
          <span className="text-xs text-gray-500 font-mono-data">
            中心 {CENTER[1].toFixed(3)}, {CENTER[0].toFixed(3)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-processed-green" />已处理
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-suspended-red" />挂起
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-withdrawn-gray" />已撤回
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-alert-orange" />待补/改判
          </span>
        </div>
      </div>
      <div className="flex-1 relative">
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(192,57,43,0.35), 0 2px 6px rgba(0,0,0,0.25); }
            50% { box-shadow: 0 0 0 8px rgba(192,57,43,0.08), 0 2px 6px rgba(0,0,0,0.25); }
          }
        `}</style>
        <MapContainer
          center={CENTER}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; CartoDB'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {lines.map((line, idx) => (
            <Polyline
              key={idx}
              positions={line.positions}
              color={line.color}
              weight={line.dash ? 2 : 1.5}
              opacity={line.dash ? 0.9 : 0.5}
              dashArray={line.dash}
            />
          ))}

          {allPoints.map((p) => {
            const color = STATUS_COLORS[p.status] || '#64748b';
            const isAbnormal = abnormalIds.has(p.id);
            return (
              <Marker
                key={p.id}
                position={[p.lat, p.lng]}
                icon={makeIcon(color, isAbnormal)}
                eventHandlers={{
                  click: () => navigate(`/point/${p.id}`),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[180px]">
                    <div className="font-mono-data font-semibold text-deep-sea text-sm">
                      {p.id}
                    </div>
                    <StatusBadge status={p.status as any} />
                    <div className="font-mono-data text-gray-600">
                      {p.lng.toFixed(4)}, {p.lat.toFixed(4)}
                    </div>
                    {p.windSpeed > 0 && (
                      <div>风速: <span className="font-mono-data">{p.windSpeed.toFixed(1)} m/s</span></div>
                    )}
                    <div>上报: {p.reporter}</div>
                    {p.adjacentPoints && p.adjacentPoints.length > 0 && (
                      <div className="pt-1 border-t border-gray-100 text-gray-500">
                        相邻点:
                        {p.adjacentPoints.map((adjId) => {
                          const adj = points.find((x) => x.id === adjId);
                          if (!adj) return null;
                          const d = haversineDistance(p.lat, p.lng, adj.lat, adj.lng);
                          return (
                            <span key={adjId} className="ml-1 font-mono-data">
                              {adjId}({formatDistance(d)})
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {p.note && (
                      <div className="text-gray-500 pt-1 border-t border-gray-100 italic">
                        {p.note.slice(0, 40)}{p.note.length > 40 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {points
            .filter((p) => p.status === 'suspended')
            .map((p) => (
              <CircleMarker
                key={`circle-${p.id}`}
                center={[p.lat, p.lng]}
                radius={22}
                pathOptions={{ color: '#C0392B', weight: 1.5, fill: false, dashArray: '4 4' }}
              />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
