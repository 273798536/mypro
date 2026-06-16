import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Complaint } from '@/types'

interface ComplaintMapProps {
  data: Complaint[]
}

const createCustomIcon = (color: string, pulse: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        ${pulse ? `<div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${color}; width: 24px; height: 24px; margin-left: -12px; margin-top: -12px;"></div>` : ''}
        <div class="relative rounded-full border-2 border-white shadow-lg" style="background-color: ${color}; width: 16px; height: 16px; margin-left: -8px; margin-top: -8px;"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

const getMarkerStyle = (complaint: Complaint) => {
  if (complaint.isDuplicate) {
    return { color: '#f5a623', pulse: false }
  }
  if (complaint.status === 'supplemented') {
    return { color: '#16c79a', pulse: true }
  }
  if (complaint.isAbnormal) {
    return { color: '#e94560', pulse: true }
  }
  return { color: '#f5f5f0', pulse: false }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '待复核',
    reviewing: '待复核',
    rejected: '已驳回',
    supplemented: '已补录',
  }
  return labels[status] || status
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 12)
  }, [center, map])
  return null
}

export default function ComplaintMap({ data }: ComplaintMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  const center: [number, number] = [39.9042, 116.4074]

  const supplementedComplaints = data.filter(c => c.status === 'supplemented' && c.originalLat && c.originalLng)

  return (
    <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20 h-full">
      <h3 className="text-fire-white text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-fire-orange rounded-full" />
        投诉分布
      </h3>
      <div ref={mapRef} className="h-[400px] rounded-lg overflow-hidden">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <MapController center={center} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {supplementedComplaints.map((complaint) => {
            if (!complaint.originalLat || !complaint.originalLng) return null
            const positions: [number, number][] = [
              [complaint.originalLat, complaint.originalLng],
              [complaint.lat, complaint.lng],
            ]
            return (
              <Polyline
                key={`line-${complaint.id}`}
                positions={positions}
                pathOptions={{
                  color: '#16c79a',
                  weight: 2,
                  dashArray: '5, 10',
                  opacity: 0.6,
                }}
              />
            )
          })}
          {data.map((complaint) => {
            const { color, pulse } = getMarkerStyle(complaint)
            const icon = createCustomIcon(color, pulse)
            return (
              <Marker
                key={complaint.id}
                position={[complaint.lat, complaint.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h4 className="font-semibold text-fire-white mb-2">{complaint.title}</h4>
                    <p className="text-fire-white/70 text-sm mb-1">{complaint.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {getStatusLabel(complaint.status)}
                      </span>
                      {complaint.isDuplicate && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-duplicate-yellow/20 text-duplicate-yellow">
                          重复
                        </span>
                      )}
                    </div>
                    {complaint.supplementNote && (
                      <p className="text-success-green text-xs mt-2 italic">{complaint.supplementNote}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-fire-white" />
          <span className="text-fire-white/60 text-sm">常规</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-fire-orange animate-pulse" />
          <span className="text-fire-white/60 text-sm">异常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-green animate-pulse" />
          <span className="text-fire-white/60 text-sm">已补录</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-duplicate-yellow" />
          <span className="text-fire-white/60 text-sm">重复</span>
        </div>
      </div>
    </div>
  )
}
