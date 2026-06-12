import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Wind, Waves, Radio, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store';
import type { Station, Sample } from '@/types';

function createIcon(color: string, selected: boolean, label: string) {
  const size = selected ? 32 : 24;
  const border = selected ? 4 : 3;
  const borderColor = color;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      position:relative;
      width:${size}px;height:${size}px;
      background:${color};
      border:${border}px solid ${selected ? '#fff' : borderColor};
      border-radius:50%;
      box-shadow:0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,0.4);
      animation: marker-pulse 2s infinite;
    "><span style="
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      font-size:10px;font-weight:bold;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);
    ">${label}</span>
    <style>@keyframes marker-pulse { 0% { box-shadow:0 0 0 0 ${color}66, 0 2px 8px rgba(0,0,0,0.4); } 70% { box-shadow:0 0 0 10px ${color}00, 0 2px 8px rgba(0,0,0,0.4); } 100% { box-shadow:0 0 0 0 ${color}00, 0 2px 8px rgba(0,0,0,0.4); } }</style>
    </div>`,
    iconSize: [size + border * 2, size + border * 2],
    iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
  });
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 10, { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

function getMarkerColor(station: Station, samples: Sample[]): string {
  const stationSamples = samples.filter((s) => s.stationId === station.id);
  const hasAnomaly = stationSamples.some((s) => s.anomalies?.length > 0);
  const hasCritical = stationSamples.some((s) =>
    s.anomalies?.some((a) => a.type === 'recalibrate'),
  );
  if (hasCritical) return '#ef4444';
  if (hasAnomaly) return '#f59e0b';
  return '#2e8b57';
}

function StationPanel({ station, samples }: { station: Station; samples: Sample[] }) {
  const stationSamples = samples.filter((s) => s.stationId === station.id);
  const latest = stationSamples[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">{station.name}</h2>
        <p className="text-xs text-slate-500">
          {station.region} · ({station.latitude.toFixed(2)}, {station.longitude.toFixed(2)})
        </p>
        <p className="text-xs text-slate-500 mt-1">
          样本数 {stationSamples.length} · 异常数 {station.anomalyCount ?? 0}
        </p>
      </div>

      {latest && (
        <>
          {latest.weatherForecast?.[0] && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 mb-1.5">最新气象</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 rounded p-2 flex items-center gap-1.5 text-xs">
                  <Wind className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-300">{latest.weatherForecast[0].windSpeed} m/s {latest.weatherForecast[0].windDirection}</span>
                </div>
                <div className="bg-slate-800/50 rounded p-2 flex items-center gap-1.5 text-xs">
                  <Waves className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-300">浪高 {latest.weatherForecast[0].waveHeight} m</span>
                </div>
              </div>
            </div>
          )}

          {latest.tideData?.[0] && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 mb-1.5">潮汐数据</h3>
              <div className="bg-slate-800/50 rounded p-2 text-xs text-slate-300">
                <p>潮型 {latest.tideData[0].tideType} · 时区 {latest.tideData[0].timezone}</p>
                {!latest.tideData[0].timezoneValid && (
                  <p className="text-red-400 mt-1">时区异常：{latest.tideData[0].timezoneError}</p>
                )}
              </div>
            </div>
          )}

          {latest.buoyData?.[0] && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 mb-1.5">浮标数据</h3>
              <div className="bg-slate-800/50 rounded p-2 text-xs text-slate-300">
                <p className="flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  {latest.buoyData[0].isLate ? (
                    <span className="text-warning-amber">数据晚到</span>
                  ) : (
                    <span className="text-success-green">数据已到</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <h3 className="text-xs font-semibold text-slate-400 mb-1.5">样本列表</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {stationSamples.map((s) => (
            <div key={s.id} className="bg-slate-800/50 rounded p-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300">{s.sampleDate}</span>
                <span className={s.status === 'reviewed' ? 'text-success-green' : s.status === 'rejected' ? 'text-red-400' : 'text-warning-amber'}>
                  {s.status === 'reviewed' ? '通过' : s.status === 'rejected' ? '未通过' : '待复核'}
                </span>
              </div>
              {s.anomalies?.length > 0 && (
                <div className="mt-1 flex gap-1 flex-wrap">
                  {s.anomalies?.map((a) => (
                    <span key={a.id} className={`text-[10px] px-1 py-0.5 rounded ${a.type === 'supplement' ? 'bg-warning-amber/20 text-warning-amber' : 'bg-red-500/20 text-red-400'}`}>
                      {a.type === 'supplement' ? '补材料' : '改口径'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {stationSamples.length === 0 && (
            <p className="text-slate-600 text-xs">暂无样本</p>
          )}
        </div>
      </div>

      {latest && latest.anomalies?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning-amber" /> 异常列表
          </h3>
          <div className="space-y-1.5">
            {latest.anomalies?.map((a) => (
              <div key={a.id} className={`text-xs rounded p-2 ${a.type === 'supplement' ? 'bg-warning-amber/10 border border-warning-amber/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="font-medium text-white">{a.type === 'supplement' ? '需补材料' : '需改口径'}</p>
                <p className="text-slate-400 mt-0.5">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MapView() {
  const { stations, samples, selectedStationId, fetchStations, fetchSamples, selectStation } = useAppStore();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchStations();
    fetchSamples();
  }, [fetchStations, fetchSamples]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedStationId) ?? null,
    [stations, selectedStationId],
  );

  const handleMarkerClick = (station: Station) => {
    selectStation(station.id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">
      <div className="w-[40%] flex-shrink-0 rounded-lg overflow-hidden border border-slate-800">
        <MapContainer
          center={[30.5, 122.8]}
          zoom={8}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {selectedStation && (
            <MapFlyTo lat={selectedStation.latitude} lng={selectedStation.longitude} />
          )}
          {stations.map((st) => {
            const color = getMarkerColor(st, samples);
            const selected = st.id === selectedStationId;
            const label = st.name.charAt(0);
            return (
              <Marker
                key={st.id}
                position={[st.latitude, st.longitude]}
                icon={createIcon(color, selected, label)}
                eventHandlers={{ click: () => handleMarkerClick(st) }}
              >
                <Tooltip direction="right" offset={[10, 0]} permanent>
                  <span className="font-medium">{st.name}</span>
                </Tooltip>
                <Popup>
                  <span className="text-sm font-medium">{st.name}</span>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-900 rounded-lg border border-slate-800 p-4" key={refreshKey}>
        {selectedStation ? (
          <StationPanel station={selectedStation} samples={samples} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600">
            点击地图上的站位标记查看详情
          </div>
        )}
      </div>
    </div>
  );
}
