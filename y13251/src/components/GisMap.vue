<template>
  <div class="gis-map card" style="flex: 1; min-height: 360px; display: flex; flex-direction: column">
    <div class="flex-between p-16" style="border-bottom: 1px solid #ebeef5">
      <div class="section-title" style="margin-bottom: 0">
        <el-icon :size="18" color="#409eff"><Location /></el-icon>
        <span style="margin-left: 6px">GIS点位分布</span>
      </div>
      <div style="display: flex; gap: 8px; font-size: 12px; color: #606266">
        <span class="legend"><i style="background: #67c23a"></i>已确认</span>
        <span class="legend"><i style="background: #e6a23c"></i>复核中</span>
        <span class="legend"><i style="background: #909399"></i>待复核</span>
        <span class="legend"><i style="background: #f56c6c"></i>有争议/重复投诉</span>
      </div>
    </div>
    <div ref="mapContainer" style="flex: 1; min-height: 0"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import { useReviewStore } from '@/store/review'
import type { GisPoint } from '@/types'

const mapContainer = ref<HTMLDivElement | null>(null)
const store = useReviewStore()

let map: L.Map | null = null
const markers: Map<string, L.Marker> = new Map()

const statusColor = (p: GisPoint) => {
  if (p.duplicateComplaint || p.status === 'disputed') return '#f56c6c'
  if (p.status === 'confirmed') return '#67c23a'
  if (p.status === 'reviewing') return '#e6a23c'
  return '#909399'
}

const makeIcon = (color: string, hasAbnormal: boolean) => {
  const abnormalDot = hasAbnormal
    ? '<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#f56c6c;border:2px solid #fff;border-radius:50%;z-index:2"></div>'
    : ''
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="position:relative">
      ${abnormalDot}
      <div style="width:30px;height:30px;background:${color};border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  })
}

function renderMarkers() {
  if (!map) return
  markers.forEach((m) => m.remove())
  markers.clear()

  const abnormalSet = store.allAbnormalPointIds

  store.filteredPoints.forEach((p) => {
    const hasAbnormal = abnormalSet.has(p.id)
    const marker = L.marker([p.lat, p.lng], {
      icon: makeIcon(statusColor(p), hasAbnormal)
    })
      .addTo(map!)
      .bindPopup(
        `<div style="min-width:200px">
          <b style="font-size:14px">${p.name}</b><br/>
          <span style="color:#909399;font-size:12px">${p.address}</span>
          <hr style="margin:8px 0;border:none;border-top:1px dashed #eee"/>
          <div style="font-size:12px;line-height:1.8">
            编号：${p.id}<br/>
            核定容量：<b>${p.capacity}</b> 个摆位<br/>
            当前摆位：${p.currentCapacity} 个<br/>
            投诉数：<span style="color:${p.complaintCount > 4 ? '#f56c6c' : '#606266'}">${p.complaintCount}</span> 条
            ${p.duplicateComplaint ? '<br/><span style="color:#f56c6c">⚠️ 存在重复投诉</span>' : ''}
          </div>
        </div>`
      )
    marker.on('click', () => store.selectPoint(p.id))
    markers.set(p.id, marker)
  })

  if (store.selectedPointId && markers.has(store.selectedPointId)) {
    const mk = markers.get(store.selectedPointId)!
    map.panTo(mk.getLatLng(), { animate: true })
    mk.openPopup()
  }
}

function initMap() {
  if (!mapContainer.value || map) return
  map = L.map(mapContainer.value, {
    center: [31.2304, 121.4737],
    zoom: 12,
    zoomControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18
  }).addTo(map)

  renderMarkers()
}

onMounted(() => {
  nextTick(() => {
    initMap()
  })
})

watch(
  () => store.filteredPoints,
  () => {
    nextTick(renderMarkers)
  },
  { deep: true }
)

watch(
  () => store.selectedPointId,
  (id) => {
    if (id && markers.has(id)) {
      markers.get(id)!.openPopup()
    }
  }
)
</script>

<style lang="scss" scoped>
.legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    display: inline-block;
  }
}
:deep(.leaflet-container) {
  height: 100%;
  border-radius: 0 0 4px 4px;
}
:deep(.custom-pin) {
  background: transparent;
  border: none;
}
</style>
