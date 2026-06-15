import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const tealIconSvg = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17C10 17 8 15 8 12.5C8 10 10 8 12.5 8C15 8 17 10 17 12.5C17 15 15 17 12.5 17Z" fill="#0D7377" stroke="#fff" stroke-width="2"/>
  <circle cx="12.5" cy="12.5" r="4" fill="#fff"/>
</svg>`)}`;

const orangeIconSvg = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17C10 17 8 15 8 12.5C8 10 10 8 12.5 8C15 8 17 10 17 12.5C17 15 15 17 12.5 17Z" fill="#FF8C42" stroke="#fff" stroke-width="2"/>
  <circle cx="12.5" cy="12.5" r="4" fill="#fff"/>
</svg>`)}`;

const shadowSvg = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="41" height="41" viewBox="0 0 41 41">
  <ellipse cx="20" cy="20" rx="18" ry="6" fill="#000" opacity="0.3"/>
</svg>`)}`;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: tealIconSvg,
  iconUrl: tealIconSvg,
  shadowUrl: shadowSvg,
});

interface MapMarker {
  coord: [number, number];
  label: string;
  isOffset?: boolean;
}

interface MapRoute {
  coords: [number, number][];
  color: string;
}

interface MapViewProps {
  center: [number, number];
  zoom: number;
  markers: MapMarker[];
  routes?: MapRoute[];
}

const tealIcon = new L.Icon({
  iconUrl: tealIconSvg,
  iconRetinaUrl: tealIconSvg,
  shadowUrl: shadowSvg,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const orangeIcon = new L.Icon({
  iconUrl: orangeIconSvg,
  iconRetinaUrl: orangeIconSvg,
  shadowUrl: shadowSvg,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function MapView({ center, zoom, markers, routes }: MapViewProps) {
  return (
    <div className="h-96 rounded-xl overflow-hidden relative">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, i) => (
          <Marker
            key={i}
            position={marker.coord}
            icon={marker.isOffset ? orangeIcon : tealIcon}
          >
            <Popup>
              {marker.label}{marker.isOffset ? ' (偏移)' : ''}
            </Popup>
          </Marker>
        ))}
        {routes?.map((route, i) => (
          <Polyline
            key={i}
            positions={route.coords}
            pathOptions={{ color: route.color, weight: 4, opacity: 0.8 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
