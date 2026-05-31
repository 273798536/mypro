import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/store';
import { FREQUENCY_BANDS } from '@/types';
import html2canvas from 'html2canvas';
import { Download, MapPin, AlertTriangle, FileImage, FileJson } from 'lucide-react';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 12px; height: 12px; background: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const barrierIcon = createCustomIcon('#f97316');
const roadIcon = createCustomIcon('#10b981');

export const MapPage = () => {
  const { barriers, residentPoints, results, loadMockData, runValidation } = useAppStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (barriers.length === 0) {
      loadMockData();
    }
  }, [barriers.length, loadMockData]);

  useEffect(() => {
    runValidation();
  }, [barriers, residentPoints, runValidation]);

  const center: [number, number] = [32.0603, 118.7969];

  const barrierPoints: [number, number][] = barriers.map((b) => [
    b.position.lat,
    b.position.lng,
  ]);

  const exportAsPNG = async () => {
    if (!mapRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `声学隔音墙评估_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('导出失败:', error);
    }
    setExporting(false);
  };

  const exportAsGeoJSON = () => {
    const features: unknown[] = [];

    barriers.forEach((barrier) => {
      features.push({
        type: 'Feature',
        properties: {
          type: 'barrier',
          name: barrier.name,
          height: barrier.height,
          length: barrier.length,
          materialId: barrier.materialId,
        },
        geometry: {
          type: 'Point',
          coordinates: [barrier.position.lng, barrier.position.lat],
        },
      });
    });

    residentPoints.forEach((point) => {
      const result = results.find((r) => r.residentPointId === point.id);
      features.push({
        type: 'Feature',
        properties: {
          type: 'resident',
          name: point.name,
          receiverHeight: point.receiverHeight,
          distanceFromRoad: point.distanceFromRoad,
          totalAttenuation: result?.totalAttenuation,
          unit: result?.unit,
        },
        geometry: {
          type: 'Point',
          coordinates: [point.position.lng, point.position.lat],
        },
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      name: '声学隔音墙评估结果',
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
        },
      },
      features,
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.download = `声学隔音墙评估_${new Date().toISOString().slice(0, 10)}.geojson`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const getNoiseLevelColor = (attenuation: number | undefined) => {
    if (attenuation === undefined) return '#64748b';
    const baseLevel = 75;
    const level = baseLevel - attenuation;
    if (level > 70) return '#ef4444';
    if (level > 60) return '#f97316';
    if (level > 55) return '#eab308';
    return '#10b981';
  };

  return (
    <div className="min-h-screen bg-primary-950 pl-64">
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-display text-white mb-2">地图导出</h1>
            <p className="text-primary-400">
              GIS可视化展示隔音墙位置、噪声影响范围及评估结果
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportAsPNG}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-800 text-white hover:bg-primary-700 transition-all text-sm disabled:opacity-50"
            >
              <FileImage size={16} />
              {exporting ? '导出中...' : '导出PNG'}
            </button>
            <button
              onClick={exportAsGeoJSON}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange text-white hover:bg-accent-orange/90 transition-all text-sm"
            >
              <FileJson size={16} />
              导出GeoJSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div
              ref={mapRef}
              className="bg-primary-900/80 border border-primary-700 rounded-xl overflow-hidden"
              style={{ height: '600px' }}
            >
              <MapContainer
                center={center}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {barrierPoints.length > 1 && (
                  <Polyline
                    positions={barrierPoints}
                    pathOptions={{ color: '#f97316', weight: 4, opacity: 0.8 }}
                  />
                )}

                {barriers.map((barrier) => (
                  <Marker
                    key={barrier.id}
                    position={[barrier.position.lat, barrier.position.lng]}
                    icon={barrierIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-accent-orange mb-1">
                          {barrier.name}
                        </div>
                        <div className="text-primary-600 space-y-0.5">
                          <div>高度: {barrier.height}m</div>
                          <div>长度: {barrier.length}m</div>
                          <div>距道路: {barrier.distanceFromRoad}m</div>
                        </div>
                      </div>
                    </Popup>
                    <Circle
                      center={[barrier.position.lat, barrier.position.lng]}
                      radius={barrier.length / 2}
                      pathOptions={{
                        color: '#f97316',
                        fillColor: '#f97316',
                        fillOpacity: 0.1,
                        weight: 1,
                      }}
                    />
                  </Marker>
                ))}

                {residentPoints.map((point) => {
                  const result = results.find((r) => r.residentPointId === point.id);
                  const color = getNoiseLevelColor(result?.totalAttenuation);
                  return (
                    <Marker
                      key={point.id}
                      position={[point.position.lat, point.position.lng]}
                      icon={createCustomIcon(color)}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold text-accent-blue mb-1">
                            {point.name}
                          </div>
                          <div className="text-primary-600 space-y-0.5">
                            <div>距道路: {point.distanceFromRoad}m</div>
                            <div>接收高度: {point.receiverHeight}m</div>
                            {result && (
                              <div className="mt-2 pt-2 border-t border-primary-200">
                                <div className="font-mono font-bold" style={{ color }}>
                                  衰减量: {result.totalAttenuation} {result.unit}
                                </div>
                                <div className="grid grid-cols-4 gap-1 mt-2">
                                  {FREQUENCY_BANDS.slice(0, 4).map((band) => (
                                    <div key={band} className="text-[10px] text-center">
                                      <div className="text-primary-400">{band}Hz</div>
                                      <div className="font-mono">
                                        {result.insertionLoss[band] ?? '—'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                      {result && (
                        <Circle
                          center={[point.position.lat, point.position.lng]}
                          radius={50}
                          pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.2,
                            weight: 1,
                          }}
                        />
                      )}
                    </Marker>
                  );
                })}

                <Marker
                  position={[32.0598, 118.7958]}
                  icon={roadIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-accent-green mb-1">
                        长江路 (主干道)
                      </div>
                      <div className="text-primary-600">
                        <div>车流量: 2400辆/h</div>
                        <div>限速: 60km/h</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-accent-orange" />
                图例说明
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-orange border-2 border-white" />
                  <span className="text-sm text-primary-300">隔音墙位置</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-blue border-2 border-white" />
                  <span className="text-sm text-primary-300">居民接收点</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-green border-2 border-white" />
                  <span className="text-sm text-primary-300">道路噪声源</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-red border-2 border-white" />
                  <span className="text-sm text-primary-300">噪声级 &gt;70dB</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-orange border-2 border-white" />
                  <span className="text-sm text-primary-300">噪声级 60-70dB</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white" />
                  <span className="text-sm text-primary-300">噪声级 55-60dB</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-accent-green border-2 border-white" />
                  <span className="text-sm text-primary-300">噪声级 &lt;55dB</span>
                </div>
              </div>
            </div>

            <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Download size={18} className="text-accent-blue" />
                导出选项
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-primary-800/50 rounded-lg">
                  <div className="text-sm font-medium text-white mb-1">PNG 图片</div>
                  <p className="text-xs text-primary-400">
                    导出当前地图视图为高清图片，包含所有标注和图例
                  </p>
                </div>
                <div className="p-3 bg-primary-800/50 rounded-lg">
                  <div className="text-sm font-medium text-white mb-1">GeoJSON 数据</div>
                  <p className="text-xs text-primary-400">
                    导出所有点位的地理坐标和属性数据，可在GIS软件中打开
                  </p>
                </div>
              </div>
            </div>

            {results.length === 0 && (
              <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-accent-orange mt-0.5" />
                  <div>
                    <p className="text-sm text-accent-orange font-medium">暂无计算结果</p>
                    <p className="text-xs text-primary-400 mt-1">
                      请先在"声衰减计算"页面执行计算，计算结果将显示在地图上
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
