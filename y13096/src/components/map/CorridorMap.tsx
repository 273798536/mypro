import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useReplayStore } from '../../store/replayStore';
import type { MaterialItem } from '../../../shared/types';
import { AnomalyBadges, ProcessStatusBadge } from '../common/Badges';
import { MapPin, FileText, MessageSquare } from 'lucide-react';

function offsetLngLat(lng: number, lat: number, dx: number, dy: number): [number, number] {
  const R = 6378137;
  const dLat = dy / R * 180 / Math.PI;
  const dLng = dx / (R * Math.cos(Math.PI * lat / 180)) * 180 / Math.PI;
  return [lat + dLat, lng + dLng] as [number, number];
}

function buildCorridorPolygon(points: MaterialItem[]): [number, number][] {
  const pts = points.filter(p => p.position).map(p => [p.position!.lat, p.position!.lng] as [number, number]);
  if (pts.length < 2) return [];
  const width = 420;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [lat, lng] = pts[i];
    let dx = 0, dy = 0;
    if (i === 0) {
      const [nlat, nlng] = pts[i + 1];
      dx = nlng - lng; dy = nlat - lat;
    } else if (i === pts.length - 1) {
      const [plat, plng] = pts[i - 1];
      dx = lng - plng; dy = lat - plat;
    } else {
      const [plat, plng] = pts[i - 1];
      const [nlat, nlng] = pts[i + 1];
      dx = nlng - plng; dy = nlat - plat;
    }
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    left.push(offsetLngLat(lng, lat, perpX * width, perpY * width).reverse() as [number, number]);
    right.unshift(offsetLngLat(lng, lat, -perpX * width, -perpY * width).reverse() as [number, number]);
  }
  return [...left, ...right];
}

function pointIcon(item: MaterialItem, selected: boolean, isCurrent: boolean): L.DivIcon {
  const classes = ['custom-point-marker'];
  if (item.attachmentMeta?.isLate || item.fillsGapId) classes.push('anomaly');
  else if (item.hasModifiedCaliber || item.processStatus === 'need_evidence' || item.processStatus === 'rejected') classes.push('warn');
  if (selected) classes.push('selected');
  const extraRing = isCurrent ? '<div class="ring" style="animation-duration:1.2s;border-color:#FFD93D;"></div>' : '';
  return L.divIcon({
    className: '',
    html: `<div class="${classes.join(' ')}"><div class="core"></div><div class="ring"></div>${extraRing}</div>`,
    iconSize: [22, 22],
    iconAnchor: [0, 0]
  });
}

const MapSync: React.FC = () => {
  const map = useMap();
  const camera = useReplayStore(s => s.camera);
  const setCamera = useReplayStore(s => s.setCamera);
  const currentTime = useReplayStore(s => s.currentTime);
  const all = useReplayStore(s => s.allMaterials);
  const initRef = useRef(false);
  const programmaticRef = useRef(false);
  const programmaticTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!initRef.current) {
      programmaticRef.current = true;
      map.setView([camera.center.lat, camera.center.lng], camera.zoom ?? 12, { animate: false });
      if (programmaticTimer.current) window.clearTimeout(programmaticTimer.current);
      programmaticTimer.current = window.setTimeout(() => { programmaticRef.current = false; }, 150);
      initRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (programmaticRef.current) return;
    const prev = map.getCenter();
    const prevZ = map.getZoom();
    const moved = Math.abs(prev.lat - camera.center.lat) > 0.0025
      || Math.abs(prev.lng - camera.center.lng) > 0.0025
      || Math.abs(prevZ - (camera.zoom ?? 12)) > 0.6;
    if (moved) {
      programmaticRef.current = true;
      map.setView([camera.center.lat, camera.center.lng], camera.zoom ?? 12, { animate: true, duration: 0.55 });
      if (programmaticTimer.current) window.clearTimeout(programmaticTimer.current);
      programmaticTimer.current = window.setTimeout(() => { programmaticRef.current = false; }, 900);
    }
  }, [camera.center.lat, camera.center.lng, camera.zoom]);

  useMapEvents({
    moveend: () => {
      if (programmaticRef.current) return;
      const c = map.getCenter();
      setCamera({ center: { lng: c.lng, lat: c.lat }, zoom: map.getZoom() });
    },
    zoomend: () => {
      if (programmaticRef.current) return;
      const c = map.getCenter();
      setCamera({ center: { lng: c.lng, lat: c.lat }, zoom: map.getZoom() });
    }
  });

  useEffect(() => {
    const pts = all.filter(m => m.position).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let target: MaterialItem | null = null;
    for (const p of pts) { if (p.timestamp <= currentTime) target = p; else break; }
    if (target) {
      const popup = document.querySelector<HTMLElement>(`[data-popup-id="${target.id}"]`);
      if (popup) popup.style.boxShadow = '0 0 14px rgba(255,217,61,0.9)';
      document.querySelectorAll<HTMLElement>('[data-popup-id]').forEach(el => {
        if (el.getAttribute('data-popup-id') !== target.id) el.style.boxShadow = '';
      });
    }
  }, [currentTime]);

  return null;
};

export const CorridorMap: React.FC = () => {
  const all = useReplayStore(s => s.allMaterials);
  const filter = useReplayStore(s => s.filter);
  const selectedId = useReplayStore(s => s.selectedMaterialId);
  const selectMaterial = useReplayStore(s => s.selectMaterial);
  const currentTime = useReplayStore(s => s.currentTime);
  const gaps = useReplayStore(s => s.timelineGaps);

  const filtered = useMemo(() => {
    return all.filter(m => {
      const t = m.timestamp;
      if (t < filter.dateRange.start || t > filter.dateRange.end) return false;
      if (!filter.materialTypes.includes(m.type)) return false;
      if (filter.hasModifiedCaliber !== null && m.hasModifiedCaliber !== filter.hasModifiedCaliber) return false;
      if (!filter.processStatuses.includes(m.processStatus)) return false;
      const tags: ('normal' | 'gap' | 'late' | 'modified')[] = ['normal'];
      if (m.attachmentMeta?.isLate) tags.push('late');
      if (m.hasModifiedCaliber) tags.push('modified');
      if (m.fillsGapId) tags.push('gap');
      if (!tags.some(tag => filter.anomalyStatus.includes(tag as any))) return false;
      return true;
    });
  }, [all, filter]);

  const sortedAll = useMemo(() =>
    all.filter(m => m.position).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [all]);

  const corridor = useMemo(() => buildCorridorPolygon(sortedAll), [sortedAll]);

  const routeLine = useMemo(() =>
    sortedAll.map(p => [p.position!.lat, p.position!.lng] as [number, number]),
    [sortedAll]);

  const currentFramePoint = useMemo(() => {
    let target: MaterialItem | null = null;
    for (const p of sortedAll) { if (p.timestamp <= currentTime) target = p; else break; }
    return target;
  }, [sortedAll, currentTime]);

  const gapRects = useMemo(() => {
    const rects: { positions: [number, number][]; severity: 'warning' | 'critical' }[] = [];
    for (const g of gaps) {
      let before: MaterialItem | null = null, after: MaterialItem | null = null;
      for (const p of sortedAll) {
        if (p.timestamp <= g.start) before = p;
        if (!after && p.timestamp >= g.end) after = p;
      }
      if (!before || !after) continue;
      const bl = before.position!, al = after.position!;
      const midLat = (bl.lat + al.lat) / 2;
      const midLng = (bl.lng + al.lng) / 2;
      const dLat = al.lat - bl.lat, dLng = al.lng - bl.lng;
      const len = Math.hypot(dLat, dLng) || 0.001;
      const px = -dLat / len * 0.006, py = dLng / len * 0.006;
      rects.push({
        positions: [
          [bl.lat + px, bl.lng + py],
          [al.lat + px, al.lng + py],
          [al.lat - px, al.lng - py],
          [bl.lat - px, bl.lng - py]
        ],
        severity: g.severity
      });
    }
    return rects;
  }, [gaps, sortedAll]);

  return (
    <div className="relative h-full w-full rounded-md overflow-hidden border border-aero-border shadow-[0_0_24px_rgba(0,212,170,0.06)] aero-corner">
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="aero-panel-inner px-3 py-1.5 text-[11px] font-mono text-aero-muted border flex items-center gap-2 pointer-events-auto">
          <MapPin size={12} className="text-aero-line" />
          走廊飞行轨迹 · {sortedAll.length} 个航路点
        </div>
        <div className="aero-panel-inner px-3 py-1.5 text-[11px] font-mono flex items-center gap-3 border pointer-events-auto">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-aero-line shadow-glow-cyan"></span>正常点位</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-aero-warn shadow-glow-warn"></span>口径/待证</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-aero-danger shadow-glow-danger"></span>缺段/晚到</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-aero-track"></span>当前帧</span>
        </div>
      </div>

      <MapContainer
        center={[31.275, 121.58]}
        zoom={12}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#061224' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
        />
        <MapSync />

        {corridor.length > 2 && (
          <Polygon
            positions={corridor}
            pathOptions={{
              color: 'rgba(0, 212, 170, 0.55)',
              weight: 1,
              fillColor: 'rgba(0, 212, 170, 0.10)',
              fillOpacity: 0.7
            }}
          />
        )}

        {gapRects.map((r, i) => (
          <Polygon
            key={i}
            positions={r.positions}
            pathOptions={{
              color: r.severity === 'critical' ? '#FF4D4F' : '#FF7A45',
              weight: 1.5,
              dashArray: '4 3',
              fillColor: r.severity === 'critical' ? '#FF4D4F' : '#FF7A45',
              fillOpacity: 0.18
            }}
          />
        ))}

        {routeLine.length > 1 && (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: '#00D4AA', weight: 2.5, opacity: 0.85 }}
          />
        )}

        {filtered.map(m => m.position && (
          <Marker
            key={m.id}
            position={[m.position.lat, m.position.lng]}
            icon={pointIcon(m, selectedId === m.id, currentFramePoint?.id === m.id)}
            eventHandlers={{ click: () => selectMaterial(m.id) }}
          >
            <Popup>
              <div data-popup-id={m.id} className="min-w-[240px] p-1 rounded transition-shadow">
                <div className="flex items-center gap-2 mb-1.5">
                  {m.type === 'point' && <MapPin size={13} className="text-aero-line" />}
                  {m.type === 'attachment' && <FileText size={13} className="text-sky-400" />}
                  {m.type === 'oral' && <MessageSquare size={13} className="text-violet-400" />}
                  <span className="text-[12px] font-semibold text-aero-text">{m.name}</span>
                </div>
                <div className="font-mono text-[10px] text-aero-muted mb-1.5">
                  {m.timestamp} · ({m.position.lng.toFixed(4)}, {m.position.lat.toFixed(4)})
                  {m.position.altitude !== undefined && ` · ${m.position.altitude}m`}
                </div>
                <div className="mb-1.5"><AnomalyBadges item={m} /></div>
                <div><ProcessStatusBadge status={m.processStatus} /></div>
                {m.processNote && (
                  <div className="mt-1.5 text-[10px] text-aero-muted/80 italic border-t border-aero-border/40 pt-1">
                    💬 {m.processNote}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
