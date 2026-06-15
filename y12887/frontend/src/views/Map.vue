<template>
  <div>
    <h2 class="page-title">地图展示</h2>

    <div class="page-container" style="padding: 0;">
      <div class="map-toolbar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="浴场">
            <el-select v-model="filterForm.beach_id" placeholder="全部浴场" clearable @change="loadData">
              <el-option
                v-for="beach in beaches"
                :key="beach.id"
                :label="beach.name"
                :value="beach.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="风险等级">
            <el-select v-model="filterForm.risk_level" placeholder="全部等级" clearable @change="loadData">
              <el-option label="高风险" value="高风险" />
              <el-option label="中风险" value="中风险" />
              <el-option label="低风险" value="低风险" />
              <el-option label="正常" value="正常" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadData">刷新</el-button>
            <el-button @click="locateAll">全部定位</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="map-container" ref="mapContainer">
        <l-map
          ref="map"
          :zoom="12"
          :center="mapCenter"
          style="height: 600px; width: 100%;"
        >
          <l-tile-layer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            layer-type="base"
            name="OpenStreetMap"
          />

          <l-circle-marker
            v-for="record in mapData"
            :key="record.id"
            :lat-lng="[record.beach?.latitude, record.beach?.longitude]"
            :radius="12"
            :color="getMarkerColor(record.risk_level)"
            :fill-color="getMarkerColor(record.risk_level)"
            :fill-opacity="0.8"
            @click="showDetail(record)"
          >
            <l-popup>
              <div class="popup-content">
                <h4>{{ record.beach?.name }}</h4>
                <p><strong>风险等级:</strong>
                  <el-tag :type="getRiskTagType(record.risk_level)" size="small">
                    {{ record.risk_level }}
                  </el-tag>
                </p>
                <p><strong>风险评分:</strong> {{ record.risk_score }}</p>
                <p v-if="record.trajectory_drift">
                  <strong>轨迹漂移:</strong> {{ record.trajectory_drift }} 米
                  <el-tag v-if="record.is_drift_abnormal" type="danger" size="small">异常</el-tag>
                </p>
                <p v-if="record.water_quality_level">
                  <strong>水质等级:</strong> {{ record.water_quality_level }}
                  <el-tag v-if="record.is_water_abnormal" type="danger" size="small">异常</el-tag>
                </p>
                <div style="margin-top: 8px;">
                  <el-button type="primary" size="small" @click="goToDetail(record)">
                    查看详情
                  </el-button>
                </div>
              </div>
            </l-popup>
          </l-circle-marker>

          <l-circle
            v-for="beach in beaches"
            :key="'zone-' + beach.id"
            :lat-lng="[beach.latitude, beach.longitude]"
            :radius="beach.safe_zone_radius"
            color="#409eff"
            fill-color="#409eff"
            :fill-opacity="0.1"
            weight="2"
            dashArray="10, 10"
          >
            <l-popup>
              <div>
                <strong>{{ beach.name }}</strong><br/>
                安全区域半径: {{ beach.safe_zone_radius }} 米
              </div>
            </l-popup>
          </l-circle>
        </l-map>
      </div>

      <div class="map-legend">
        <div class="legend-title">图例</div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #f56c6c;"></span>
          <span>高风险</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #e6a23c;"></span>
          <span>中风险</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #409eff;"></span>
          <span>低风险</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #67c23a;"></span>
          <span>正常</span>
        </div>
        <div class="legend-item">
          <span class="legend-line"></span>
          <span>安全区域</span>
        </div>
      </div>
    </div>

    <div class="page-container" style="margin-top: 24px">
      <h3 style="margin-bottom: 16px">联动数据列表（与地图共用同一数据源）</h3>
      <el-table :data="mapData" style="width: 100%">
        <el-table-column label="浴场" width="150">
          <template #default="{ row }">
            {{ row.beach?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="risk_level" label="风险等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.risk_level)">{{ row.risk_level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="risk_score" label="风险评分" width="100" />
        <el-table-column prop="trajectory_drift" label="轨迹漂移" width="120">
          <template #default="{ row }">
            {{ row.trajectory_drift || '-' }} 米
            <el-tag v-if="row.is_drift_abnormal" type="danger" size="small">异常</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="water_quality_level" label="水质等级" width="120" />
        <el-table-column prop="process_time" label="处理时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.process_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="goToDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LMap, LTileLayer, LCircleMarker, LPopup, LCircle } from '@vue-leaflet/vue-leaflet'
import dayjs from 'dayjs'
import { getProcessingRecords } from '@/api'

const router = useRouter()
const map = ref(null)
const mapCenter = ref([36.0671, 120.3826])
const mapData = ref([])
const beaches = ref([])

const filterForm = reactive({
  beach_id: null,
  risk_level: ''
})

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const getMarkerColor = (level) => {
  const colors = {
    '高风险': '#f56c6c',
    '中风险': '#e6a23c',
    '低风险': '#409eff',
    '正常': '#67c23a'
  }
  return colors[level] || '#909399'
}

const getRiskTagType = (level) => {
  const types = {
    '高风险': 'danger',
    '中风险': 'warning',
    '低风险': 'primary',
    '正常': 'success'
  }
  return types[level] || 'info'
}

const loadData = async () => {
  try {
    const params = {}
    if (filterForm.beach_id) params.beach_id = filterForm.beach_id
    if (filterForm.risk_level) params.risk_level = filterForm.risk_level

    const records = await getProcessingRecords(params)
    mapData.value = records.filter(r => r.beach?.latitude && r.beach?.longitude)

    const beachSet = new Set()
    mapData.value.forEach(r => {
      if (r.beach && !beachSet.has(r.beach.id)) {
        beachSet.add(r.beach.id)
        beaches.value.push(r.beach)
      }
    })

    if (mapData.value.length > 0 && !filterForm.beach_id) {
      const first = mapData.value[0]
      mapCenter.value = [first.beach.latitude, first.beach.longitude]
    }
  } catch (error) {
    console.error('加载地图数据失败:', error)
  }
}

const showDetail = (record) => {
  console.log('点击记录:', record)
}

const goToDetail = (record) => {
  router.push(`/anomalies/${record.id}`)
}

const locateAll = () => {
  if (beaches.value.length > 0) {
    const lats = beaches.value.map(b => b.latitude)
    const lngs = beaches.value.map(b => b.longitude)
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    mapCenter.value = [centerLat, centerLng]
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.map-toolbar {
  padding: 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.map-container {
  position: relative;
}

.map-legend {
  position: absolute;
  top: 80px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;

  .legend-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 13px;

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-line {
      width: 24px;
      height: 2px;
      background: #409eff;
      border-radius: 2px;
    }
  }
}

.popup-content {
  min-width: 200px;

  h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
  }

  p {
    margin: 4px 0;
    font-size: 13px;
  }
}
</style>
