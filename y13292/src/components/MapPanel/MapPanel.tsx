import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useComplaintStore } from '../../store/useComplaintStore';
import { statusLabels, sourceLabels } from '../../types';
import type { ComplaintPoint, ComplaintStatus } from '../../types';

const statusColors: Record<ComplaintStatus, string> = {
  normal: '#10B981',
  overload: '#F97316',
  pending: '#EAB308',
  confirmed: '#0EA5E9',
};

function createCustomIcon(status: ComplaintStatus, isSelected: boolean): L.DivIcon {
  const color = statusColors[status];
  const size = isSelected ? 20 : 14;
  const pulseClass = status === 'overload' ? 'map-pulse' : '';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-wrapper ${pulseClass}" style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.6)'};
        box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color};
        position: relative;
      ">
        ${isSelected ? '<div class="marker-ring" style="position:absolute;inset:-6px;border:2px solid #fff;border-radius:50%;animation:marker-pulse 1.5s ease-out infinite;"></div>' : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function MapController({ selectedPoint }: { selectedPoint: ComplaintPoint | undefined }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedPoint) {
      map.setView([selectedPoint.lat, selectedPoint.lng], 14, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedPoint, map]);
  
  return null;
}

export function MapPanel() {
  const { getFilteredPoints, getSelectedPoint, selectPoint, selectedPointId } = useComplaintStore();
  const points = getFilteredPoints();
  const selectedPoint = getSelectedPoint();
  const mapRef = useRef<L.Map | null>(null);

  const center: [number, number] = [31.2304, 121.4737];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-700/50">
      <style>{`
        .leaflet-container {
          background: #0f172a !important;
        }
        .leaflet-tile {
          filter: brightness(0.85) contrast(1.05) saturate(0.9);
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.8) !important;
          color: #64748b !important;
        }
        .leaflet-control-attribution a {
          color: #0ea5e9 !important;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes marker-pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .map-pulse::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: inherit;
          animation: map-pulse-anim 2s ease-out infinite;
        }
        @keyframes map-pulse-anim {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
        }
        .leaflet-popup-content {
          margin: 12px 14px;
        }
      `}</style>
      
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => {
          if (map) mapRef.current = map;
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        
        <MapController selectedPoint={selectedPoint} />
        
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={createCustomIcon(point.status, point.id === selectedPointId)}
            eventHandlers={{
              click: () => selectPoint(point.id),
            }}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-[160px]">
                <div className="font-semibold text-slate-100">{point.name}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColors[point.status] }}
                  />
                  <span className="text-slate-300">{statusLabels[point.status]}</span>
                </div>
                <div className="text-xs text-slate-400">
                  来源: {sourceLabels[point.source]}
                </div>
                {point.capacity && point.actualLoad && (
                  <div className="text-xs text-slate-400">
                    承载: {point.actualLoad}/{point.capacity} 人/时
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50 text-xs space-y-2 z-[400]">
        <div className="font-medium text-slate-200 mb-2">图例</div>
        {(['normal', 'overload', 'pending', 'confirmed'] as ComplaintStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColors[status] }}
            />
            <span className="text-slate-400">{statusLabels[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
