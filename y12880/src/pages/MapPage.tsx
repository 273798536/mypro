import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Info, ChevronRight, X } from 'lucide-react';
import api from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { RiskBadge, DataStatusBadge } from '@/components/Badges';
import type { PlatformPoint, PlatformDetail, RiskLevel } from '@/types';

function createCustomIcon(riskLevel: RiskLevel) {
  const colors = {
    high: '#FF4D4D',
    medium: '#FFB020',
    low: '#00D4AA',
  };
  const color = colors[riskLevel];

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 20px; height: 20px;">
        <div style="
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.4;
          animation: pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 4px;
          left: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 10px ${color};
          border: 2px solid #04101a;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const [platforms, setPlatforms] = useState<PlatformPoint[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDetail | null>(null);
  const [activeLayer, setActiveLayer] = useState<'tide' | 'wave' | 'wind'>('tide');
  const [seaLayerData, setSeaLayerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { selectedPlatformId, setSelectedPlatformId } = useAppStore();

  const center: [number, number] = [30.3, 123.6];
  const zoom = 9;

  useEffect(() => {
    loadPlatforms();
  }, []);

  useEffect(() => {
    loadSeaLayer();
  }, [activeLayer]);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const res = await api.getPlatforms();
      setPlatforms(res.items);
    } finally {
      setLoading(false);
    }
  };

  const loadSeaLayer = async () => {
    try {
      const res = await api.getSeaLayer(activeLayer);
      setSeaLayerData(res);
    } catch (e) {
      // 忽略错误
    }
  };

  const handlePlatformClick = async (platform: PlatformPoint) => {
    setSelectedPlatformId(platform.id);
    try {
      const detail = await api.getPlatformDetail(platform.id);
      setSelectedPlatform(detail);
    } catch (e) {
      console.error('Failed to load platform detail', e);
    }
  };

  const closeDetail = () => {
    setSelectedPlatform(null);
    setSelectedPlatformId(null);
  };

  const layerLabels = {
    tide: '潮汐图层',
    wave: '浪高图层',
    wind: '风速图层',
  };

  const layerColors = {
    tide: ['#00D4AA', '#0A2540'],
    wave: ['#FFB020', '#0A2540'],
    wind: ['#FF4D4D', '#0A2540'],
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">地图联动</h1>
          <p className="text-sm text-ocean-200/50 mt-1">离岸平台分布与海况数据叠加</p>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-ocean-200/50" />
          <div className="flex rounded bg-ocean-700 p-1">
            {(['tide', 'wave', 'wind'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeLayer === layer
                    ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                    : 'text-ocean-200/60 hover:text-white'
                }`}
              >
                {layerLabels[layer]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative rounded-lg overflow-hidden card-ocean">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-ocean-200/40 z-10">
            加载地图数据中...
          </div>
        ) : null}

        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%', background: '#04101a' }}
          zoomControl={false}
        >
          <MapController center={center} zoom={zoom} />
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {platforms.map((platform) => (
            <Marker
              key={platform.id}
              position={[platform.lat, platform.lng]}
              icon={createCustomIcon(platform.riskLevel)}
              eventHandlers={{
                click: () => handlePlatformClick(platform),
              }}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-medium text-ocean-900">{platform.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {platform.equipmentCount} 台设备
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute bottom-4 left-4 card-ocean rounded-lg p-3 z-[1000]">
          <div className="text-xs text-ocean-200/50 mb-2">风险等级</div>
          <div className="space-y-1.5">
            {(['high', 'medium', 'low'] as RiskLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-2">
                <span className={`risk-dot risk-dot-${level}`} />
                <span className="text-xs text-ocean-100/70">
                  {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 card-ocean rounded-lg p-3 z-[1000]">
          <div className="text-xs text-ocean-200/50 mb-2">{layerLabels[activeLayer]}</div>
          <div className="flex items-center gap-2">
            <div
              className="w-24 h-2 rounded"
              style={{
                background: `linear-gradient(to right, ${layerColors[activeLayer][1]}, ${layerColors[activeLayer][0]})`,
              }}
            />
            <span className="text-xs text-ocean-100/60">
              {seaLayerData?.dataPoints?.length || 0} 个测点
            </span>
          </div>
        </div>

        {selectedPlatform && (
          <div className="absolute top-4 right-4 w-80 card-ocean rounded-lg overflow-hidden z-[1000] animate-slide-in-right">
            <div className="p-4 border-b border-teal-glow-500/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-white">{selectedPlatform.name}</h3>
                <p className="text-xs text-ocean-200/40 mt-0.5">
                  {selectedPlatform.description}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="p-1 rounded hover:bg-ocean-600/50 text-ocean-200/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ocean-200/60">风险等级</span>
                <RiskBadge level={selectedPlatform.riskLevel} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ocean-200/60">设备数量</span>
                <span className="text-sm text-white font-mono">
                  {selectedPlatform.equipment.length} 台
                </span>
              </div>

              <div className="pt-2 border-t border-teal-glow-500/10">
                <div className="text-xs text-ocean-200/50 mb-2">设备清单</div>
                <div className="space-y-2">
                  {selectedPlatform.equipment.map((eq) => (
                    <div
                      key={eq.id}
                      className="p-2 rounded bg-ocean-800/50 hover:bg-ocean-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">{eq.name}</span>
                        <RiskBadge level={eq.riskLevel} size="sm" />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-ocean-200/40">风险分 {eq.riskScore}</span>
                        <DataStatusBadge status={eq.dataStatus} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full btn-secondary py-2 rounded text-sm flex items-center justify-center gap-1 mt-2">
                查看风险详情 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
