<template>
  <div class="page-wrapper">
    <el-card style="margin-bottom: 16px;">
      <template #header>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>🧹 轨迹清洗（日常入口）</strong>
          <el-tag type="info" size="small">
            日常从这里进入 → 清洗完成后再生成潮窗
          </el-tag>
        </div>
      </template>
      <el-alert type="success" :closable="false" show-icon
                title="日常操作流程：1) 导入轨迹 → 2) 勾选异常点标记清洗 → 3) 核验 → 4) 跳转到港口拖轮潮窗计算" />
    </el-card>

    <el-card style="margin-bottom: 16px;">
      <template #header>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>🔍 筛选条件</strong>
          <el-space>
            <el-button type="primary" @click="importDialog = true">
              <el-icon><Upload /></el-icon> 导入轨迹
            </el-button>
          </el-space>
        </div>
      </template>
      <el-form :inline="true" :model="f" label-width="80px">
        <el-form-item label="MMSI"><el-input v-model="f.mmsi" clearable /></el-form-item>
        <el-form-item label="港口"><el-input v-model="f.port_code" clearable /></el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="f.dateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="f.status" placeholder="全部" clearable style="width:140px;">
            <el-option label="原始 raw" value="raw" />
            <el-option label="已清洗 cleaned" value="cleaned" />
            <el-option label="已核验 verified" value="verified" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否清洗">
          <el-select v-model="f.is_cleaned" placeholder="全部" clearable style="width:140px;">
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <template #header>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <el-tag effect="plain">共 {{ total }} 条</el-tag>
            <el-tag type="info" effect="plain" style="margin-left:8px;">已选 {{ selected.length }} 条</el-tag>
          </div>
          <el-space>
            <el-button type="warning" :disabled="!selected.length" @click="markCleaned">
              <el-icon><Edit /></el-icon> 标记为已清洗
            </el-button>
            <el-button type="success" :disabled="!selected.length" @click="markVerified">
              <el-icon><CircleCheck /></el-icon> 批量核验
            </el-button>
            <el-button type="primary" @click="$router.push('/tide-window')">
              → 去计算潮窗
            </el-button>
          </el-space>
        </div>
      </template>
      <el-table :data="list" @selection-change="s => selected = s" @row-click="toggleSel" ref="tableRef" style="cursor:pointer;">
        <el-table-column type="selection" width="44" />
        <el-table-column prop="vessel_name" label="船名" width="120" />
        <el-table-column prop="mmsi" label="MMSI" width="120" />
        <el-table-column prop="port_code" label="港口" width="90" />
        <el-table-column label="时间" width="150">
          <template #default="{row}">{{ fmt(row.record_time) }}</template>
        </el-table-column>
        <el-table-column prop="longitude" label="经度" width="110" />
        <el-table-column prop="latitude" label="纬度" width="110" />
        <el-table-column prop="speed" label="航速(节)" width="90" align="center">
          <template #default="{row}">
            <el-tag v-if="(row.speed || 0) < 0.5" type="info" size="small">停泊</el-tag>
            <span v-else>{{ row.speed }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="heading" label="航向" width="80" align="center" />
        <el-table-column label="状态" width="120" align="center">
          <template #default="{row}">
            <el-tag v-if="row.status === 'verified'" type="success" size="small">已核验</el-tag>
            <el-tag v-else-if="row.status === 'cleaned'" type="warning" size="small">已清洗</el-tag>
            <el-tag v-else type="info" size="small">原始</el-tag>
            <el-tag v-if="row.is_cleaned" size="small" style="margin-left:4px;">🧹</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
      <el-pagination
        v-if="total > 0"
        style="margin-top:16px; display:flex; justify-content:flex-end;"
        background layout="total, sizes, prev, pager, next, jumper"
        :current-page="page" :page-sizes="[50, 100, 200]"
        :page-size="pageSize" :total="total"
        @current-change="p => { page = p; load() }"
        @size-change="s => { pageSize = s; page = 1; load() }"
      />
    </el-card>

    <el-dialog v-model="importDialog" title="导入轨迹" width="520px">
      <el-alert type="warning" :closable="false" show-icon
                title="说明：下方提供示例数据快速填充按钮，正式使用请换成实际数据。" />
      <el-form :model="imp" label-width="90px" style="margin-top: 12px;">
        <el-form-item label="操作人"><el-input v-model="imp.operator" /></el-form-item>
        <el-form-item>
          <el-button @click="fillDemo">一键填充示例轨迹（5条）</el-button>
        </el-form-item>
        <el-form-item label="轨迹条数">{{ impRecords.length }} 条</el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!impRecords.length" @click="doImport">提交导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { trajApi } from '@/api'
import dayjs from 'dayjs'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(100)
const selected = ref([])
const f = reactive({ mmsi: '', port_code: '', dateRange: [], status: '', is_cleaned: '' })
const importDialog = ref(false)
const imp = reactive({ operator: '海事安全员' })
const impRecords = ref([])
const tableRef = ref()
const fmt = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'

const load = async () => {
  const params = { page: page.value, page_size: pageSize.value }
  if (f.mmsi) params.mmsi = f.mmsi
  if (f.port_code) params.port_code = f.port_code
  if (f.status) params.status = f.status
  if (f.is_cleaned !== '') params.is_cleaned = f.is_cleaned
  if (f.dateRange && f.dateRange.length === 2) {
    params.date_from = f.dateRange[0]
    params.date_to = f.dateRange[1]
  }
  const { data } = await trajApi.list(params)
  list.value = data.items || []
  total.value = data.total || 0
}
const reset = () => { Object.assign(f, { mmsi: '', port_code: '', dateRange: [], status: '', is_cleaned: '' }); page.value = 1; load() }
const toggleSel = (row) => tableRef.value?.toggleRowSelection(row)

const markCleaned = async () => {
  const { value: remark } = await ElMessageBox.prompt('请输入清洗备注（例如：剔除AIS漂移点）', '清洗说明', { confirmButtonText: '确认' })
  const ids = selected.value.map(r => r.id)
  await trajApi.clean(ids, { operator: imp.operator, remark })
  ElMessage.success(`已标记清洗 ${ids.length} 条`)
  load()
}
const markVerified = async () => {
  const { value: remark } = await ElMessageBox.prompt('请输入核验说明', '核验', { confirmButtonText: '确认' })
  const ids = selected.value.map(r => r.id)
  await trajApi.verify(ids, { operator: imp.operator, remark })
  ElMessage.success(`已核验 ${ids.length} 条`)
  load()
}

const fillDemo = () => {
  const now = dayjs()
  const mmsi = '413987000'
  const samples = []
  for (let i = 0; i < 5; i++) {
    samples.push({
      mmsi, vessel_name: '演示船舶', port_code: 'CNQIN',
      record_time: now.add(i * 10, 'minute').toISOString(),
      longitude: +(120.3 + i * 0.005).toFixed(6),
      latitude: +(36.05 + Math.sin(i * 0.5) * 0.01).toFixed(6),
      speed: +(8 - i * 0.8).toFixed(1),
      heading: 45 + i * 10,
    })
  }
  impRecords.value = samples
  ElMessage.success('已填充示例数据，可直接提交导入')
}

const doImport = async () => {
  const { data } = await trajApi.import(impRecords.value, { operator: imp.operator })
  ElMessage.success(`导入完成：新增${data.inserted} 更新${data.updated} 跳过${data.skipped_duplicates}`)
  importDialog.value = false
  impRecords.value = []
  load()
}

onMounted(load)
</script>
