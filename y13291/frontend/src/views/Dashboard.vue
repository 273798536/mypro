<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon :size="22" style="margin-right:8px;vertical-align:middle;color:#3a8ee6">
          <DataAnalysis />
        </el-icon>
        状态看板 · 慢行桥坡道容量复核
      </h2>
      <el-button type="primary" @click="refresh">
        <el-icon><Refresh /></el-icon>
        <span>刷新</span>
      </el-button>
    </div>

    <el-row :gutter="16" v-if="dashboard">
      <el-col :span="4">
        <div class="card-stat" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff">
          <div class="stat-num">{{ dashboard.total }}</div>
          <div class="stat-label" style="color:rgba(255,255,255,0.85)">反馈总数</div>
        </div>
      </el-col>
      <el-col :span="4" @click="goList('pending')" style="cursor:pointer">
        <div class="card-stat" style="background:#fffdf5;border:1px solid #faecd8">
          <div class="stat-num" style="color:#e6a23c">{{ dashboard.pending }}</div>
          <div class="stat-label">待处理 <el-icon><Right /></el-icon></div>
        </div>
      </el-col>
      <el-col :span="4" @click="goList('reviewing')" style="cursor:pointer">
        <div class="card-stat" style="background:#f5faff;border:1px solid #d9ecff">
          <div class="stat-num" style="color:#409eff">{{ dashboard.reviewing }}</div>
          <div class="stat-label">复核中 <el-icon><Right /></el-icon></div>
        </div>
      </el-col>
      <el-col :span="4" @click="goList('need_evidence')" style="cursor:pointer">
        <div class="card-stat" style="background:#fff5f5;border:1px solid #fbc4c4">
          <div class="stat-num" style="color:#f56c6c">{{ dashboard.need_evidence }}</div>
          <div class="stat-label">待补材料 <el-icon><Right /></el-icon></div>
        </div>
      </el-col>
      <el-col :span="4" @click="goList('approved')" style="cursor:pointer">
        <div class="card-stat" style="background:#f0f9eb;border:1px solid #c2e7b0">
          <div class="stat-num" style="color:#67c23a">{{ dashboard.approved }}</div>
          <div class="stat-label">可放行 <el-icon><Right /></el-icon></div>
        </div>
      </el-col>
      <el-col :span="4" @click="goList('merged')" style="cursor:pointer">
        <div class="card-stat" style="background:#fafafa;border:1px solid #e4e7ed">
          <div class="stat-num" style="color:#909399">{{ dashboard.merged }}</div>
          <div class="stat-label">已归并 <el-icon><Right /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <el-divider content-position="left">
      <span style="font-size:14px;font-weight:600;color:#2c5282">各状态处理说明（老曹备忘）</span>
    </el-divider>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span><el-icon style="color:#e6a23c;margin-right:6px"><Clock /></el-icon><b>待处理 → 复核中</b></span>
              <el-tag type="warning" size="small">{{ dashboard?.pending || 0 }} 条</el-tag>
            </div>
          </template>
          <div style="font-size:13px;color:#606266;line-height:1.8">
            <div>• 核对居民反馈的真实性，确认桥名和位置</div>
            <div>• 补充"规范地点"和经纬度（如有）</div>
            <div>• 填写影响范围（涉及坡道长度、日通行量）</div>
            <div>• 原始数据一律保留在左侧，不要覆盖</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span><el-icon style="color:#409eff;margin-right:6px"><Search /></el-icon><b>复核中 → 待补材料 / 可放行</b></span>
              <el-tag type="primary" size="small">{{ dashboard?.reviewing || 0 }} 条</el-tag>
            </div>
          </template>
          <div style="font-size:13px;color:#606266;line-height:1.8">
            <div>• 测量坡度、宽度、排水情况，判断是否符合规范</div>
            <div>• 材料齐全（设计图、照片、签字）→ 可放行</div>
            <div>• 缺材料 → 转"待补材料"，备注缺什么</div>
            <div>• 同一地点不同写法的，去"重复归并中心"处理</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span><el-icon style="color:#f56c6c;margin-right:6px"><DocumentDelete /></el-icon><b>待补材料 → 可放行</b></span>
              <el-tag type="danger" size="small">{{ dashboard?.need_evidence || 0 }} 条</el-tag>
            </div>
          </template>
          <div style="font-size:13px;color:#606266;line-height:1.8">
            <div>• 打开详情查看"证据材料"栏，核对补充情况</div>
            <div>• 证据补全后，状态流转为"可放行"</div>
            <div>• 领导问询内容记录在"领导问询"字段，便于溯源</div>
            <div>• 容量结论填写完成后，可纳入正式报告导出</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-divider content-position="left">
      <span style="font-size:14px;font-weight:600;color:#2c5282">最近需要处理的记录</span>
    </el-divider>

    <el-card shadow="never">
      <el-table :data="urgentList" stripe @row-click="row => $router.push(`/feedbacks/${row.id}`)" style="cursor:pointer">
        <el-table-column prop="feedback_no" label="编号" width="170">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.feedback_no }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :class="`status-${row.status}`" effect="light">
              {{ store.statusLabels[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bridge_name" label="桥名" width="160" />
        <el-table-column prop="original_location" label="地点" show-overflow-tooltip />
        <el-table-column label="反馈内容" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.original_content }}</template>
        </el-table-column>
        <el-table-column prop="original_source" label="来源" width="110" />
        <el-table-column label="处理提示" min-width="200">
          <template #default="{ row }">
            <span style="font-size:12px;color:#8b4513">{{ store.statusHints[row.status] || '' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import { api } from '@/api'

const router = useRouter()
const store = useAppStore()

const dashboard = ref(null)
const urgentList = ref([])

const refresh = async () => {
  await Promise.all([store.loadDashboard(), loadUrgent()])
  dashboard.value = store.dashboard
}

const loadUrgent = async () => {
  const res = await api.list({ limit: 8, status: undefined })
  urgentList.value = res.items.filter(it => ['pending', 'reviewing', 'need_evidence'].includes(it.status))
}

const goList = (status) => {
  router.push({ path: '/feedbacks', query: { status } })
}

onMounted(refresh)
</script>
