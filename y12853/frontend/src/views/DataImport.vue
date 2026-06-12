<template>
  <div class="page-wrapper">
    <el-card style="margin-bottom: 16px;">
      <template #header>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>📥 导入 / 补录（潮汐 + 水质）</strong>
          <el-tag type="danger" size="small" effect="dark">
            ⚠️ 重复导入会自动去重；补录请显式打开「补录模式」避免双份结论
          </el-tag>
        </div>
      </template>
      <el-alert
        type="warning" :closable="false" show-icon
        title="幂等说明：同一批数据二次导入只更新差异，不会重复创建；补录时需标记 is_reimport=true 并填 superseded_batch_id 才能替代旧批次结论。"
      />
    </el-card>

    <el-tabs v-model="tab">
      <el-tab-pane label="🌊 潮汐导入" name="tide">
        <el-card>
          <el-form :inline="true" :model="tideOpt" label-width="100px">
            <el-form-item label="操作人"><el-input v-model="tideOpt.operator" /></el-form-item>
            <el-form-item label="来源文件"><el-input v-model="tideOpt.source_file" placeholder="可选" /></el-form-item>
            <el-form-item label="补录模式">
              <el-switch v-model="tideOpt.is_reimport" active-text="是（补录）" inactive-text="否（正常）" />
            </el-form-item>
            <el-form-item v-if="tideOpt.is_reimport" label="替代批次号">
              <el-input v-model="tideOpt.superseded_batch_id" placeholder="填写被替换的老批次号" />
            </el-form-item>
            <el-form-item>
              <el-space>
                <el-button @click="fillDemoTide">填充示例潮汐（24条）</el-button>
                <el-button type="primary" @click="submitTide">提交导入</el-button>
              </el-space>
            </el-form-item>
          </el-form>
          <el-divider />
          <el-alert type="info" :closable="false" show-icon title="本次待导入潮汐记录预览" />
          <el-table :data="tideRecords.slice(0, 50)" size="small" max-height="280">
            <el-table-column prop="port_code" label="港口" width="90" />
            <el-table-column label="时间" width="150">
              <template #default="{row}">{{ row.record_time }}</template>
            </el-table-column>
            <el-table-column prop="tide_height" label="潮高(m)" width="90" align="right" />
            <el-table-column prop="tide_type" label="潮型" width="90" align="center">
              <template #default="{row}">
                <el-tag size="small" :type="row.tide_type === 'HIGH' ? 'success' : (row.tide_type === 'LOW' ? 'warning' : 'info')">{{ row.tide_type }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:8px; color:#909399;">共 {{ tideRecords.length }} 条（仅展示前50条）</div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="💧 水质导入" name="water">
        <el-card>
          <el-form :inline="true" :model="waterOpt" label-width="100px">
            <el-form-item label="操作人"><el-input v-model="waterOpt.operator" /></el-form-item>
            <el-form-item label="来源文件"><el-input v-model="waterOpt.source_file" /></el-form-item>
            <el-form-item label="补录模式">
              <el-switch v-model="waterOpt.is_reimport" active-text="是" inactive-text="否" />
            </el-form-item>
            <el-form-item v-if="waterOpt.is_reimport" label="替代批次号">
              <el-input v-model="waterOpt.superseded_batch_id" />
            </el-form-item>
            <el-form-item label="混入负深度">
              <el-switch v-model="waterOpt.include_neg" active-text="演示用" inactive-text="否" />
            </el-form-item>
            <el-form-item>
              <el-space>
                <el-button @click="fillDemoWater">填充示例水质（32条）</el-button>
                <el-button type="primary" @click="submitWater">提交导入</el-button>
              </el-space>
            </el-form-item>
          </el-form>
          <el-divider />
          <el-table :data="waterRecords.slice(0,50)" size="small" max-height="280">
            <el-table-column prop="station_code" label="站号" width="90" />
            <el-table-column label="时间" width="150">
              <template #default="{row}">{{ row.record_time }}</template>
            </el-table-column>
            <el-table-column prop="water_depth" label="水深(m)" width="100" align="right">
              <template #default="{row}">
                <span :style="{ color: row.water_depth <= 0 ? '#f56c6c' : '#303133', fontWeight: row.water_depth <= 0 ? 'bold' : '' }">
                  {{ row.water_depth }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="water_level" label="水位(m)" width="90" align="right" />
            <el-table-column prop="temperature" label="水温(℃)" width="90" />
            <el-table-column prop="salinity" label="盐度" width="80" />
          </el-table>
          <div style="margin-top:8px; color:#909399;">共 {{ waterRecords.length }} 条</div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="📋 批次追溯" name="batch">
        <el-card>
          <el-table :data="batches" size="small">
            <el-table-column prop="batch_id" label="批次号" width="220" show-overflow-tooltip />
            <el-table-column prop="batch_type" label="类型" width="100" align="center">
              <template #default="{row}">
                <el-tag size="small">{{ row.batch_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="160">
              <template #default="{row}">{{ row.created_at?.slice?.(0, 19).replace('T', ' ') }}</template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="100" />
            <el-table-column prop="total_records" label="总数" width="70" align="right" />
            <el-table-column prop="inserted_count" label="新增" width="70" align="right" />
            <el-table-column prop="updated_count" label="更新" width="70" align="right" />
            <el-table-column prop="skipped_count" label="重复跳过" width="90" align="right" />
            <el-table-column label="补录" width="70" align="center">
              <template #default="{row}">
                <el-tag v-if="row.is_reimport" type="warning" size="small">补录</el-tag>
                <span v-else>正常</span>
              </template>
            </el-table-column>
            <el-table-column prop="superseded_batch_id" label="替代批次号" width="220" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{row}">
                <el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            style="margin-top: 12px; justify-content: flex-end; display: flex;"
            background layout="total, prev, pager, next"
            :current-page="bp" :page-size="bps" :total="bTotal"
            @current-change="p => { bp = p; loadBatches() }"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { importApi } from '@/api'
import dayjs from 'dayjs'

const tab = ref('tide')
const tideRecords = ref([])
const waterRecords = ref([])
const tideOpt = reactive({ operator: '海事安全员', source_file: '', is_reimport: false, superseded_batch_id: '' })
const waterOpt = reactive({ operator: '海事安全员', source_file: '', is_reimport: false, superseded_batch_id: '', include_neg: true })
const batches = ref([])
const bTotal = ref(0)
const bp = ref(1)
const bps = ref(50)

const tide = (h) => 2.8 + 2.2 * Math.sin((Date.now() / 1000 / 44712) + h / 12)
const fillDemoTide = () => {
  const today = dayjs()
  const arr = []
  for (let i = 0; i < 48; i++) {
    const t = today.startOf('day').add(i * 30, 'minute')
    const h = +(tide(i / 2)).toFixed(3)
    arr.push({
      port_code: 'CNQIN', port_name: '青岛港',
      record_date: t.format('YYYY-MM-DD'),
      record_time: t.toISOString(),
      tide_height: h,
      tide_type: h > 4 ? 'HIGH' : (h < 2 ? 'LOW' : 'MID'),
      data_source: '示例导入',
    })
  }
  tideRecords.value = arr
  ElMessage.success('已填充48条示例潮汐（1天，30分钟间隔）')
}
const fillDemoWater = () => {
  const today = dayjs()
  const arr = []
  for (let i = 0; i < 32; i++) {
    const t = today.startOf('day').add(i * 45 + 15, 'minute')
    const base = 2.8 + 2.2 * Math.sin(i / 4.8)
    let d = +(8.5 + base + (Math.random() - 0.5) * 0.2 - 0.1).toFixed(3)
    if (waterOpt.include_neg && (i === 5 || i === 17 || i === 28)) d = +(-Math.random() * 0.8 - 0.05).toFixed(2)
    arr.push({
      port_code: 'CNQIN', station_code: 'ST01',
      record_date: t.format('YYYY-MM-DD'),
      record_time: t.toISOString(),
      water_depth: d,
      water_level: +(base + 8.5).toFixed(3),
      temperature: +(12 + (Math.random() - 0.5) * 2).toFixed(2),
      salinity: +(30 + (Math.random() - 0.5) * 2).toFixed(2),
      turbidity: +(5 + Math.random() * 3).toFixed(2),
    })
  }
  waterRecords.value = arr
  ElMessage.success(`已填充32条示例水质${waterOpt.include_neg ? '（含3条负深度演示用）' : ''}`)
}
const submitTide = async () => {
  if (!tideRecords.value.length) return ElMessage.warning('请先填充或填写数据')
  const { data } = await importApi.importTide(tideRecords.value, { ...tideOpt })
  ElMessage.success(data.message || `完成：新增${data.inserted} 更新${data.updated} 跳过${data.skipped_duplicates}`)
  tideRecords.value = []
  loadBatches()
}
const submitWater = async () => {
  if (!waterRecords.value.length) return ElMessage.warning('请先填充数据')
  const { data } = await importApi.importWater(waterRecords.value, { ...waterOpt })
  ElMessage.success(`完成：新增${data.inserted} 更新${data.updated} 跳过${data.skipped_duplicates}`)
  waterRecords.value = []
  loadBatches()
}
const loadBatches = async () => {
  const { data } = await importApi.batches({ page: bp.value, page_size: bps.value })
  batches.value = data.items || []
  bTotal.value = data.total || 0
}
onMounted(loadBatches)
</script>
