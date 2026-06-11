import { MapPin, Navigation, Users } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type { Point } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { haversineDistance, formatDistance } from '@/utils/distance';
import StatusBadge from '@/components/points/StatusBadge';

interface Props {
  point: Point;
}

function smallIcon(color: string, isMain: boolean) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${isMain ? '18px' : '12px'};
        height: ${isMain ? '18px' : '12px'};
        background: ${color};
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: isMain ? [18, 18] : [12, 12],
    iconAnchor: isMain ? [9, 9] : [6, 6],
  });
}

const STATUS_COLORS: Record<string, string> = {
  processed: '#27AE60',
  pending_material: '#F39C12',
  manual_overruled: '#8E44AD',
  withdrawn: '#7F8C8D',
  suspended: '#C0392B',
};

export default function SpaceCard({ point }: Props) {
  const { points, fieldMappings } = useAppStore();
  const adjPoints = point.adjacentPoints
    ?.map((id) => points.find((p) => p.id === id))
    .filter(Boolean) as Point[];

  const usedMappings = fieldMappings.filter((fm) => {
    return point.rawFields && Object.keys(point.rawFields).includes(fm.sourceField);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-sea-mist-dark rounded-sm p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-cn text-lg font-semibold text-deep-sea">{point.id}</h3>
              <StatusBadge status={point.status} />
            </div>
            <div className="text-xs text-gray-500 mt-1">方案: {point.scenarioId}</div>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <div>创建: <span className="font-mono-data">{point.createdAt}</span></div>
            <div>更新: <span className="font-mono-data">{point.updatedAt}</span></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-sea-mist/50 rounded-sm p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Navigation className="w-3 h-3" strokeWidth={1.8} />
              坐标（统一字段）
            </div>
            <div className="mt-1 font-mono-data text-sm text-deep-sea">
              {point.lng.toFixed(6)}, {point.lat.toFixed(6)}
            </div>
          </div>
          <div className="bg-sea-mist/50 rounded-sm p-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3 h-3" strokeWidth={1.8} />
              上报人 / 风速
            </div>
            <div className="mt-1 text-sm text-deep-sea">
              {point.reporter}
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-mono-data">
                {point.windSpeed > 0 ? `${point.windSpeed.toFixed(1)} m/s` : '—'}
              </span>
            </div>
          </div>
        </div>

        {usedMappings.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-500 mb-2">字段来源（已完成映射，保留原始字段名）:</div>
            <div className="flex flex-wrap gap-1.5">
              {usedMappings.map((fm) => (
                <span
                  key={fm.sourceField}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-800 rounded-sm border border-amber-100 font-mono-data"
                >
                  {fm.sourceField}
                  <span className="text-amber-500">→</span>
                  {fm.targetField}
                </span>
              ))}
            </div>
          </div>
        )}

        {point.rawFields && (
          <details className="mt-3 border-t border-gray-100 pt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-deep-sea select-none">
              查看原始上报字段
            </summary>
            <pre className="mt-2 bg-gray-50 p-2 rounded-sm text-[11px] font-mono-data text-gray-600 overflow-auto">
              {JSON.stringify(point.rawFields, null, 2)}
            </pre>
          </details>
        )}
      </div>

      <div className="bg-white border border-sea-mist-dark rounded-sm overflow-hidden shadow-sm">
        <div className="px-4 py-2 border-b border-sea-mist-dark flex items-center gap-2">
          <MapPin className="w-4 h-4 text-deep-sea" strokeWidth={1.8} />
          <h4 className="font-serif-cn text-sm font-semibold text-deep-sea">空间定位与相邻点位</h4>
        </div>
        <div style={{ height: '240px' }}>
          <MapContainer
            center={[point.lat, point.lng]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; CartoDB'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {adjPoints?.map((adj) => (
              <Polyline
                key={`line-${adj.id}`}
                positions={[
                  [point.lat, point.lng],
                  [adj.lat, adj.lng],
                ]}
                color={point.status === 'suspended' && adj.status === 'suspended' ? '#C0392B' : '#94a3b8'}
                weight={2}
                opacity={0.7}
                dashArray={point.status === 'suspended' && adj.status === 'suspended' ? '6 6' : undefined}
              />
            ))}

            {adjPoints?.map((adj) => {
              const d = haversineDistance(point.lat, point.lng, adj.lat, adj.lng);
              const midLat = (point.lat + adj.lat) / 2;
              const midLng = (point.lng + adj.lng) / 2;
              return (
                <Marker
                  key={`dist-label-${adj.id}`}
                  position={[midLat, midLng]}
                  icon={L.divIcon({
                    className: '',
                    html: `<div style="
                      background: rgba(255,255,255,0.92);
                      padding: 1px 5px;
                      font-size: 10px;
                      font-family: JetBrains Mono, monospace;
                      border: 1px solid ${d < 50 ? '#C0392B' : '#cbd5e1'};
                      border-radius: 2px;
                      color: ${d < 50 ? '#C0392B' : '#475569'};
                      white-space: nowrap;
                    ">${formatDistance(d)}</div>`,
                    iconSize: [1, 1],
                    iconAnchor: [0, 0],
                  })}
                />
              );
            })}

            {point.status === 'suspended' && (
              <CircleMarker
                center={[point.lat, point.lng]}
                radius={30}
                pathOptions={{ color: '#C0392B', weight: 1.5, fill: false, dashArray: '4 4' }}
              />
            )}

            {adjPoints?.map((adj) => (
              <Marker
                key={`adj-${adj.id}`}
                position={[adj.lat, adj.lng]}
                icon={smallIcon(STATUS_COLORS[adj.status] || '#64748b', false)}
              />
            ))}

            <Marker
              position={[point.lat, point.lng]}
              icon={smallIcon(STATUS_COLORS[point.status] || '#64748b', true)}
            />
          </MapContainer>
        </div>
        {adjPoints && adjPoints.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-600">
            <span className="text-gray-500">相邻点位:</span>
            {adjPoints.map((adj) => {
              const d = haversineDistance(point.lat, point.lng, adj.lat, adj.lng);
              const tooClose = d < 50;
              return (
                <span
                  key={adj.id}
                  className={`ml-2 px-1.5 py-0.5 rounded-sm font-mono-data ${
                    tooClose ? 'bg-red-50 text-suspended-red' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {adj.id} — {formatDistance(d)}
                  {tooClose && <span className="ml-1">(异常)</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-sea-mist-dark rounded-sm p-4 shadow-sm">
        <h4 className="font-serif-cn text-sm font-semibold text-deep-sea mb-2">备注</h4>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {point.note || '暂无备注'}
        </p>
      </div>
    </div>
  );
}
