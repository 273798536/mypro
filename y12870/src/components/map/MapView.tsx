import { useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Polygon, Popup, ZoomControl, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { useCalcStore } from '@/store/useCalcStore';
import { useMapView } from '@/hooks/useMapView';
import type { EnergyDevice, ResultStatus } from '@/types';
import MapLegend from './MapLegend';
import ViewPresetDrawer from './ViewPresetDrawer';

const STATUS_COLORS: Record<ResultStatus, string> = {
  AVAILABLE: '#0E7C7B',
  DEFERRED: '#E9A23B',
  RECOLLECT: '#D64045',
};

function makeDeviceIcon(status: ResultStatus, inNoGo: boolean) {
  const color = inNoGo ? '#D64045' : STATUS_COLORS[status];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <defs>
        <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#0A2540" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path filter="url(#s)" d="M18 0 C28 0, 36 8, 36 18 C36 30, 18 44, 18 44 C18 44, 0 30, 0 18 C0 8, 8 0, 18 0 Z"
        fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="18" cy="18" r="6.5" fill="#FFFFFF" opacity="0.95"/>
      <text x="18" y="21" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="${color}">⚡</text>
      ${inNoGo ? `<circle cx="30" cy="8" r="5" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"/><text x="30" y="11" text-anchor="middle" font-size="8" font-weight="700" fill="${color}">!</text>` : ''}
    </svg>`;
  return L.divIcon({
    className: 'device-marker',
    html: svg,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -42],
  });
}

function NoGoLayer() {
  const zones = useCalcStore(s => s.noGoZones);
  return (
    <>
      {zones.map(z => (
        <Polygon
          key={z.id}
          positions={z.coordinates}
          pathOptions={{
            color: '#D64045', weight: 2, opacity: 0.9,
            fillColor: '#D64045', fillOpacity: 0.14, dashArray: '6 4',
          }}
        >
          <Popup>
            <div className="p-1">
              <div className="font-semibold text-status-recollect flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-status-recollect" />
                {z.name}
              </div>
              <div className="text-xs text-ocean-700 mt-1">
                类型：{z.type === 'channel' ? '航道缓冲区' : z.type === 'reserve' ? '海洋保护区' : '锚地'}<br />
                设备落点越界需重新选点
              </div>
            </div>
          </Popup>
        </Polygon>
      ))}
    </>
  );
}

function DeviceMarkers() {
  const devices = useCalcStore(s => s.devices);
  return (
    <>
      {devices.map(d => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={makeDeviceIcon(d.status, !!d.inNoGoZone)}
        >
          <Popup>
            <PopupContent device={d} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function PopupContent({ device }: { device: EnergyDevice }) {
  const statusLabel: Record<ResultStatus, string> = {
    AVAILABLE: '可用', DEFERRED: '暂缓', RECOLLECT: '需重新选点',
  };
  return (
    <div className="min-w-[200px] text-sm">
      <div className="font-semibold text-ocean-900 mb-1 pb-1 border-b border-slate-200">
        {device.name}
      </div>
      <div className="space-y-0.5 text-xs mt-1 font-mono tabular-nums">
        <div>坐标：{device.lat.toFixed(4)}, {device.lng.toFixed(4)}</div>
        <div>额定功率：{device.ratedPower} kW</div>
        <div>转换效率：{Math.round(device.efficiency * 100)}%</div>
        <div>
          状态：
          <span className={`inline-block px-1.5 py-0.5 rounded ml-1 ${
            device.status === 'AVAILABLE' ? 'bg-status-available-soft text-status-available'
            : device.status === 'DEFERRED' ? 'bg-status-deferred-soft text-status-deferred'
            : 'bg-status-recollect-soft text-status-recollect'
          }`}>
            {statusLabel[device.status]}
          </span>
        </div>
        {device.inNoGoZone && (
          <div className="text-status-recollect font-medium mt-1">⚠ 位点越界，位于禁布区内</div>
        )}
        {device.notes && <div className="text-ocean-700 mt-1">备注：{device.notes}</div>}
      </div>
    </div>
  );
}

function MapEventsBinder() {
  useMapEvents({
    moveend: () => { /* 预留：后续可联动视角选择 */ },
  });
  return null;
}

function MapInstanceBridge() {
  const map = useMap();
  const { setMapInstance } = useMapView();
  useEffect(() => { setMapInstance(map); }, [map, setMapInstance]);
  return <MapEventsBinder />;
}

interface Props { pickMode?: boolean; onPick?: (lat: number, lng: number) => void }

export default function MapView({ pickMode, onPick }: Props) {
  const presets = useCalcStore(s => s.viewPresets);
  const activeId = useCalcStore(s => s.activeViewId);
  const screenshot = useCalcStore(s => s.screenshotMode);
  const { setMapInstance, getCurrentView } = useMapView();

  const active = presets.find(p => p.id === activeId);
  const initialCenter: [number, number] = active?.center ?? [30.165, 122.14];
  const initialZoom = active?.zoom ?? 12;

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-ocean-100">
      <MapContainer
        center={initialCenter} zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        scrollWheelZoom={!pickMode || undefined}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> + 海图样式'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={17}
        />
        <NoGoLayer />
        <DeviceMarkers />
        <MapInstanceBridge />
        <PickHandler pickMode={pickMode} onPick={onPick} />
        {!screenshot && <ZoomControl position="bottomright" />}
      </MapContainer>

      <MapLegend />
      {!screenshot && (
        <ViewPresetDrawer
          getCurrentView={getCurrentView}
          setMapInstance={setMapInstance}
        />
      )}
      {pickMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] px-4 py-2 rounded-full
                        bg-ocean-900 text-white text-xs font-medium shadow-lg">
          📍 选点模式：点击海图选择设备落点（或取消）
        </div>
      )}
    </div>
  );
}

function PickHandler({ pickMode, onPick }: Props) {
  useMapEvents({
    click: (e) => { if (pickMode && onPick) onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}
