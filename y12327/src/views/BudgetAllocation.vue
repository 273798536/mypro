<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { formatCurrency } from '@/utils/currency'
import { exportAllocationReport } from '@/utils/export'
import type { BudgetAllocationDetail, BudgetPlaybackSnapshot } from '@/types'
import {
  Plus,
  Edit2,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Play,
  History,
  PieChart,
  TrendingUp,
  Clock,
  FileText,
  Info,
  Settings
} from 'lucide-vue-next'
import dayjs from 'dayjs'

const store = useBudgetStore()

const totalBudgetInput = ref(150000)
const showModifyModal = ref(false)
const showPlaybackModal = ref(false)
const modifyingDetail = ref<BudgetAllocationDetail | null>(null)
const newValue = ref(0)
const modifyReason = ref('')
const activeTab = ref<'current' | 'history'>('current')

const hasReport = computed(() => !!store.currentReport)

const playbackHistory = computed(() => {
  if (!store.currentReport) return []
  return store.getPlaybackHistory(store.currentReport.id)
})

const selectedSnapshot = ref<BudgetPlaybackSnapshot | null>(null)

function generateReport() {
  if (store.channels.length === 0) {
    alert('请先添加渠道数据')
    return
  }
  store.generateAllocationReport(totalBudgetInput.value)
}

function openModifyModal(detail: BudgetAllocationDetail) {
  modifyingDetail.value = detail
  newValue.value = detail.marginalRevenue
  modifyReason.value = ''
  showModifyModal.value = true
}

function saveModification() {
  if (!modifyingDetail.value) return
  if (!modifyReason.value.trim()) {
    alert('请填写修改原因')
    return
  }
  store.modifyMarginalRevenue(modifyingDetail.value.id, newValue.value, modifyReason.value)
  showModifyModal.value = false
  modifyingDetail.value = null
}

function exportReport() {
  if (!store.currentReport) return
  exportAllocationReport(store.currentReport, store.channels, store.conversions, {
    includeModificationTraces: true,
    includeSupplementaryMarks: true,
    includeRawData: true
  })
}

function getBudgetPercent(detail: BudgetAllocationDetail): number {
  if (!store.currentReport || store.currentReport.totalBudget === 0) return 0
  return (detail.allocatedBudget / store.currentReport.totalBudget) * 100
}

function getBudgetChangePercent(detail: BudgetAllocationDetail): number {
  if (detail.originalAllocatedBudget === 0) return 0
  return ((detail.allocatedBudget - detail.originalAllocatedBudget) / detail.originalAllocatedBudget) * 100
}

function viewSnapshot(snapshot: BudgetPlaybackSnapshot) {
  selectedSnapshot.value = snapshot
}

function closeSnapshot() {
  selectedSnapshot.value = null
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'AUTO': return '系统自动'
    case 'MANUAL': return '人工调整'
    case 'SUPPLEMENTARY': return '补录数据'
    default: return source
  }
}

function getSourceClass(source: string): string {
  switch (source) {
    case 'AUTO': return 'badge-secondary'
    case 'MANUAL': return 'badge-warning'
    case 'SUPPLEMENTARY': return 'badge-info'
    default: return 'badge-secondary'
  }
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="!hasReport" class="card">
      <div class="card-body py-12 text-center">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
          <PieChart class="w-10 h-10" />
        </div>
        <h3 class="text-xl font-semibold text-slate-900 mb-2">生成预算分配报告</h3>
        <p class="text-slate-500 mb-8 max-w-md mx-auto">
          基于渠道表现数据（转化率、CPC等）智能计算边际收益，
          自动分配预算。支持手动调整边际收益，所有修改都会被记录。
        </p>

        <div class="max-w-sm mx-auto space-y-4">
          <div>
            <label class="label text-left">本次分配总预算</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
              <input
                v-model.number="totalBudgetInput"
                type="number"
                min="0"
                step="1000"
                class="input-field pl-8"
                placeholder="请输入总预算"
              />
            </div>
          </div>

          <button class="btn-primary w-full" @click="generateReport">
            <Plus class="w-4 h-4 mr-2" />
            生成分配报告
          </button>
        </div>

        <div class="mt-8 p-4 bg-slate-50 rounded-lg max-w-md mx-auto text-left">
          <div class="flex items-start gap-3">
            <Info class="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-slate-600">
              <p class="font-medium text-slate-900 mb-1">分配算法说明</p>
              <p>系统根据各渠道的转化率/CPC比值计算权重，按权重分配预算。
              边际收益 = 转化单价 / CPC，值越高表示投入产出比越好。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex bg-slate-100 rounded-lg p-1">
            <button
              :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors', activeTab === 'current' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900']"
              @click="activeTab = 'current'"
            >
              当前分配
            </button>
            <button
              :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors', activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900']"
              @click="activeTab = 'history'"
            >
              <History class="w-4 h-4 inline mr-1" />
              回放历史
            </button>
          </div>

          <div v-if="store.currentReport?.hasManualModifications" class="flex items-center gap-2">
            <span class="badge-warning flex items-center gap-1">
              <Edit2 class="w-3 h-3" />
              已手动修改
            </span>
          </div>

          <div v-if="store.currentReport?.hasSupplementaryRecords" class="flex items-center gap-2">
            <span class="badge-info flex items-center gap-1">
              <RefreshCw class="w-3 h-3" />
              含补录数据
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button class="btn-secondary" @click="generateReport">
            <RefreshCw class="w-4 h-4 mr-2" />
            重新生成
          </button>
          <button class="btn-primary" @click="exportReport">
            <Download class="w-4 h-4 mr-2" />
            导出报告
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'current'" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="stat-label">总预算</div>
          <div class="stat-value">
            {{ formatCurrency(store.currentReport?.totalBudget || 0, store.defaultCurrency) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已分配</div>
          <div class="stat-value text-success-600">
            {{ formatCurrency(store.currentReport?.allocatedBudget || 0, store.defaultCurrency) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">剩余未分配</div>
          <div class="stat-value text-slate-500">
            {{ formatCurrency(store.currentReport?.remainingBudget || 0, store.defaultCurrency) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">修改次数</div>
          <div class="stat-value text-warning-600">
            {{ store.currentReport?.modificationTraces.length || 0 }}
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'current'" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-900">预算分配明细</h3>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>渠道名称</th>
                  <th>分配预算</th>
                  <th>占比</th>
                  <th>边际收益</th>
                  <th>ROI</th>
                  <th>预期转化</th>
                  <th>实际转化</th>
                  <th>数据来源</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr
                  v-for="detail in store.currentReport?.details"
                  :key="detail.id"
                  :class="{
                    'bg-warning-50/50': detail.isMarginalRevenueModified
                  }"
                >
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-slate-900">{{ detail.channelName }}</span>
                      <span
                        v-if="detail.isMarginalRevenueModified"
                        class="badge-warning flex items-center gap-1"
                        data-tip="边际收益已手动修改"
                      >
                        <Edit2 class="w-3 h-3" />
                        已调整
                      </span>
                    </div>
                    <div v-if="detail.isMarginalRevenueModified" class="text-xs text-slate-500 mt-1">
                      修改原因: {{ detail.modificationReason }}
                    </div>
                  </td>
                  <td>
                    <div class="font-medium text-slate-900">
                      {{ formatCurrency(detail.allocatedBudget, store.defaultCurrency) }}
                    </div>
                    <div
                      v-if="detail.isMarginalRevenueModified"
                      class="text-xs flex items-center gap-1"
                      :class="getBudgetChangePercent(detail) >= 0 ? 'text-success-600' : 'text-danger-600'"
                    >
                      <TrendingUp v-if="getBudgetChangePercent(detail) >= 0" class="w-3 h-3" />
                      <TrendingUp v-else class="w-3 h-3 rotate-180" />
                      较原始 {{ getBudgetChangePercent(detail) >= 0 ? '+' : '' }}{{ getBudgetChangePercent(detail).toFixed(2) }}%
                    </div>
                  </td>
                  <td>
                    <div class="space-y-1">
                      <div class="text-sm text-slate-900">{{ getBudgetPercent(detail).toFixed(1) }}%</div>
                      <div class="progress-bar w-24">
                        <div
                          class="progress-fill"
                          :style="{ width: `${getBudgetPercent(detail)}%` }"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="font-medium text-slate-900">
                      {{ detail.marginalRevenue.toFixed(4) }}
                    </div>
                    <div v-if="detail.isMarginalRevenueModified" class="text-xs text-slate-500">
                      原始: {{ detail.originalMarginalRevenue.toFixed(4) }}
                    </div>
                  </td>
                  <td>
                    <span
                      :class="[
                        'font-medium',
                        detail.roi >= 0 ? 'text-success-600' : 'text-danger-600'
                      ]"
                    >
                      {{ (detail.roi * 100).toFixed(2) }}%
                    </span>
                  </td>
                  <td class="text-slate-900">
                    {{ detail.expectedConversions.toFixed(0) }}
                  </td>
                  <td class="text-slate-900">
                    {{ detail.actualConversions }}
                  </td>
                  <td>
                    <span :class="['badge', getSourceClass(detail.source)]">
                      {{ getSourceLabel(detail.source) }}
                    </span>
                  </td>
                  <td>
                    <button
                      class="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      @click="openModifyModal(detail)"
                    >
                      <Edit2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'current' && store.currentReport?.modificationTraces.length" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-900">修改痕迹记录</h3>
        </div>
        <div class="card-body">
          <div class="space-y-3">
            <div
              v-for="trace in store.currentReport?.modificationTraces"
              :key="trace.id"
              class="p-4 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-warning-100 text-warning-600 flex items-center justify-center">
                    <Edit2 class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="font-medium text-slate-900">
                      修改「{{ trace.fieldName === 'marginalRevenue' ? '边际收益' : trace.fieldName }}」
                    </div>
                    <div class="text-sm text-slate-500">
                      {{ trace.modifiedBy }} 于 {{ dayjs(trace.modifiedAt).format('YYYY-MM-DD HH:mm:ss') }} 修改
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm text-slate-900">
                    <span class="text-slate-500">{{ trace.oldValue.toFixed(4) }}</span>
                    <span class="mx-2">→</span>
                    <span class="font-medium text-primary-600">{{ trace.newValue.toFixed(4) }}</span>
                  </div>
                  <div class="text-xs text-slate-500">
                    变动 {{ (((trace.newValue - trace.oldValue) / Math.abs(trace.oldValue)) * 100).toFixed(2) }}%
                  </div>
                </div>
              </div>
              <div class="mt-3 pt-3 border-t border-slate-200">
                <div class="text-sm text-slate-600">
                  <span class="font-medium">修改原因：</span>{{ trace.reason }}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                  影响 {{ trace.affectedDetailIds.length }} 条分配明细
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'current' && store.supplementaryBiddingRecords.length > 0" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-900">补录出价记录影响范围</h3>
        </div>
        <div class="card-body">
          <div class="space-y-4">
            <div
              v-for="record in store.supplementaryBiddingRecords"
              :key="record.id"
              class="p-4 bg-primary-50 rounded-lg border border-primary-200"
            >
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <RefreshCw class="w-5 h-5" />
                </div>
                <div>
                  <div class="font-medium text-slate-900">
                    补录出价记录 #{{ record.id.slice(0, 8) }}
                  </div>
                  <div class="text-sm text-slate-500">
                    补录时间：{{ record.supplementaryAt ? dayjs(record.supplementaryAt).format('YYYY-MM-DD HH:mm:ss') : '-' }}
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-lg p-4">
                <div class="text-sm font-medium text-slate-900 mb-2">影响的预算分配明细：</div>
                <div class="space-y-2">
                  <div
                    v-for="affected in store.getAffectedDetailsForSupplementaryRecord(record.id)"
                    :key="affected.detailId"
                    class="flex items-center justify-between p-2 bg-slate-50 rounded"
                  >
                    <div>
                      <span class="text-sm text-slate-900">{{ affected.channelName }}</span>
                      <span class="text-xs text-slate-500 ml-2">报告日期：{{ affected.reportDate }}</span>
                    </div>
                    <span class="badge-info">已标记</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'history'" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-900">预算回放历史</h3>
        </div>
        <div class="card-body">
          <div v-if="playbackHistory.length === 0" class="text-center py-8 text-slate-500">
            暂无回放历史记录
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="snapshot in playbackHistory"
              :key="snapshot.id"
              class="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary-300 cursor-pointer transition-colors"
              @click="viewSnapshot(snapshot)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                    <History class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="font-medium text-slate-900">{{ snapshot.description }}</div>
                    <div class="text-sm text-slate-500">
                      {{ dayjs(snapshot.snapshotTime).format('YYYY-MM-DD HH:mm:ss') }}
                    </div>
                  </div>
                </div>
                <button class="btn-secondary text-sm">
                  <Play class="w-4 h-4 mr-1" />
                  查看快照
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModifyModal" class="modal-overlay" @click.self="showModifyModal = false">
      <div class="modal max-w-lg">
        <div class="modal-header">
          <h3 class="text-lg font-semibold text-slate-900">
            修改边际收益
          </h3>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="showModifyModal = false"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="modifyingDetail" class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-lg">
              <div class="text-sm text-slate-500 mb-1">渠道名称</div>
              <div class="font-medium text-slate-900">{{ modifyingDetail.channelName }}</div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="text-sm text-slate-500 mb-1">当前边际收益</div>
                <div class="font-medium text-slate-900">{{ modifyingDetail.marginalRevenue.toFixed(4) }}</div>
              </div>
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="text-sm text-slate-500 mb-1">原始边际收益</div>
                <div class="font-medium text-slate-500">{{ modifyingDetail.originalMarginalRevenue.toFixed(4) }}</div>
              </div>
            </div>

            <div>
              <label class="label">新的边际收益值</label>
              <input
                v-model.number="newValue"
                type="number"
                min="0"
                step="0.0001"
                class="input-field"
                placeholder="请输入新的边际收益值"
              />
              <p class="text-xs text-slate-500 mt-1">
                修改后系统会重新计算该渠道的预算分配，并自动调整其他渠道的分配比例。
              </p>
            </div>

            <div>
              <label class="label">修改原因 <span class="text-danger-500">*</span></label>
              <textarea
                v-model="modifyReason"
                class="input-field"
                rows="3"
                placeholder="请填写修改原因，以便后续追溯"
              ></textarea>
            </div>

            <div class="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <div class="flex items-start gap-2">
                <AlertTriangle class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div class="text-sm text-warning-800">
                  <p class="font-medium mb-1">重要提示</p>
                  <p>修改边际收益会影响所有渠道的预算分配结果。</p>
                  <p>此操作将被记录，并在导出报表和回放历史中体现。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showModifyModal = false">
            取消
          </button>
          <button class="btn-primary" @click="saveModification">
            <Save class="w-4 h-4 mr-2" />
            确认修改
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedSnapshot" class="modal-overlay" @click.self="closeSnapshot">
      <div class="modal max-w-4xl">
        <div class="modal-header">
          <h3 class="text-lg font-semibold text-slate-900">
            {{ selectedSnapshot.description }}
          </h3>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="closeSnapshot"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body">
          <div class="text-sm text-slate-500 mb-4">
            快照时间：{{ dayjs(selectedSnapshot.snapshotTime).format('YYYY-MM-DD HH:mm:ss') }}
          </div>

          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-4 bg-slate-50 rounded-lg text-center">
              <div class="text-sm text-slate-500">总预算</div>
              <div class="text-xl font-bold text-slate-900">
                {{ formatCurrency(selectedSnapshot.state.totalBudget, store.defaultCurrency) }}
              </div>
            </div>
            <div class="p-4 bg-slate-50 rounded-lg text-center">
              <div class="text-sm text-slate-500">已分配</div>
              <div class="text-xl font-bold text-success-600">
                {{ formatCurrency(selectedSnapshot.state.allocatedBudget, store.defaultCurrency) }}
              </div>
            </div>
            <div class="p-4 bg-slate-50 rounded-lg text-center">
              <div class="text-sm text-slate-500">修改次数</div>
              <div class="text-xl font-bold text-warning-600">
                {{ selectedSnapshot.state.modificationTraces.length }}
              </div>
            </div>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>渠道名称</th>
                  <th>分配预算</th>
                  <th>边际收益</th>
                  <th>ROI</th>
                  <th>数据来源</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr
                  v-for="detail in selectedSnapshot.state.details"
                  :key="detail.id"
                  :class="{
                    'bg-warning-50/50': detail.isMarginalRevenueModified
                  }"
                >
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-slate-900">{{ detail.channelName }}</span>
                      <span
                        v-if="detail.isMarginalRevenueModified"
                        class="badge-warning"
                      >
                        已调整
                      </span>
                    </div>
                  </td>
                  <td class="font-medium text-slate-900">
                    {{ formatCurrency(detail.allocatedBudget, store.defaultCurrency) }}
                  </td>
                  <td class="text-slate-900">
                    {{ detail.marginalRevenue.toFixed(4) }}
                  </td>
                  <td :class="detail.roi >= 0 ? 'text-success-600' : 'text-danger-600'">
                    {{ (detail.roi * 100).toFixed(2) }}%
                  </td>
                  <td>
                    <span :class="['badge', getSourceClass(detail.source)]">
                      {{ getSourceLabel(detail.source) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeSnapshot">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
