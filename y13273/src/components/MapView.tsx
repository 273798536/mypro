import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type { MapPoint } from '../types';

interface Props {
  point: MapPoint;
}

const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#1e40af;border:2px solid #fff;box-shadow:0 0 0 1px #1e40af;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const updatedIcon = L.divIcon({
  className: 'custom-marker updated',
  html: `<div style="position:relative;width:16px;height:16px;"><div style="position:absolute;inset:0;border-radius:50%;background:#d97706;border:2px solid #fff;box-shadow:0 0 0 1px #d97706;z-index:2;"></div><div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(217,119,6,0.35);animation:pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite;"></div></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function MapView({ point }: Props) {
  return (
    <div className="w-full h-64 border border-slateX-200 rounded-sm overflow-hidden">
      <MapContainer
        center={[point.lat, point.lng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[point.lat, point.lng]}
          icon={point.isUpdated ? updatedIcon : customIcon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-medium">{point.label}</div>
              {point.isUpdated && (
                <div className="text-xs text-amberX-600 mt-1">点位最近有补录更新</div>
              )}
            </div>
          </Popup>
        </Marker>
        <CircleMarker
          center={[point.lat, point.lng]}
          radius={point.isUpdated ? 45 : 30}
          pathOptions={{
            color: point.isUpdated ? '#d97706' : '#1e40af',
            fillColor: point.isUpdated ? '#d97706' : '#1e40af',
            fillOpacity: 0.08,
            weight: 1,
          }}
        />
      </MapContainer>
    </div>
  );
}
