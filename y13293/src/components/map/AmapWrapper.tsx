import { useEffect, useRef } from 'react';
import type { GisPoint } from '@/types';
import { STATUS_COLORS } from '@/types';

declare global {
  interface Window {
    AMap?: any;
  }
}

interface AmapWrapperProps {
  points: GisPoint[];
  onPointClick?: (point: GisPoint) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: '#dc2626',
  processing: '#2563eb',
  evidence_needed: '#d97706',
  completed: '#166534',
  merged: '#64748b',
};

export function AmapWrapper({
  points,
  onPointClick,
  center = [104.0668, 30.6574],
  zoom = 13,
  className,
}: AmapWrapperProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || window.AMap) return;
    const script = document.createElement('script');
    script.src =
      'https://webapi.amap.com/maps?v=2.0&key=demo';
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (window.AMap && !mapInstance.current) {
      initMap();
    }
  }, [points]);

  const initMap = () => {
    if (!mapRef.current || !window.AMap || mapInstance.current) return;
    try {
      mapInstance.current = new window.AMap.Map(mapRef.current, {
        center,
        zoom,
        mapStyle: 'amap://styles/normal',
      });
      renderMarkers();
    } catch {
      // AMap demo key 可能加载失败，忽略
    }
  };

  const renderMarkers = () => {
    if (!mapInstance.current || !window.AMap) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    points.forEach((p) => {
      try {
        const color = statusColors[p.status] || '#64748b';
        const marker = new window.AMap.Marker({
          position: [p.lng, p.lat],
          title: p.name,
          content: `<div style="
            width:16px;height:16px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 3px rgba(0,0,0,0.3);
          "></div>`,
          offset: new window.AMap.Pixel(-8, -8),
        });
        marker.on('click', () => onPointClick?.(p));
        marker.setMap(mapInstance.current);
        markersRef.current.push(marker);
      } catch {
        // ignore
      }
    });
  };

  useEffect(() => {
    renderMarkers();
  }, [points]);

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full bg-slate-100 relative">
        {!window.AMap && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="mb-2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p>地图组件加载中（或使用 Demo Key 未加载）</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-sm px-4">
              {points.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onPointClick?.(p)}
                  className={`px-2 py-1 text-xs rounded cursor-pointer border ${STATUS_COLORS[p.status]}`}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
