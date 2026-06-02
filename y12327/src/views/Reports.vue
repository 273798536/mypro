<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { formatCurrency } from '@/utils/currency'
import { exportAllocationReport } from '@/utils/export'
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Edit2,
  RefreshCw,
  Calendar,
  User,
  FileSpreadsheet,
  Info
} from 'lucide-vue-next'
import dayjs from 'dayjs'

const store = useBudgetStore()

const includeModificationTraces = ref(true)
const includeSupplementaryMarks = ref(true)
const includeRawData = ref(true)

const reports = computed(() => store.allocationReports)

function exportReport(reportId: string) {
  const report = store.allocationReports.find(r => r.id === reportId)
  if (!report) return

  exportAllocationReport(report, store.channels, store.conversions, store.biddingRecords, {
    includeModificationTraces: includeModificationTraces.value,
    includeSupplementaryMarks: includeSupplementaryMarks.value,
    includeRawData: includeRawData.value
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold text-slate-900">导出选项</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label class="flex items-start gap-3 p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              v-model="includeModificationTraces"
              class="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500 mt-0.5"
            />
            <div>
              <div class="font-medium text-slate-900 flex items-center gap-2">
                <Edit2 class="w-4 h-4 text-warning-600" />
                包含修改痕迹
              </div>
              <p class="text-sm text-slate-500 mt-1">
                导出人工修改边际收益的记录，包括修改前后的值、修改原因和修改人。
              </p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              v-model="includeSupplementaryMarks"
              class="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500 mt-0.5"
            />
            <div>
              <div class="font-medium text-slate-900 flex items-center gap-2">
                <RefreshCw class="w-4 h-4 text-primary-600" />
                包含补录标记
              </div>
              <p class="text-sm text-slate-500 mt-1">
                导出补录记录及其影响的预算分配明细，标记哪些数据是事后补录的。
              </p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              v-model="includeRawData"
              class="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500 mt-0.5"
            />
            <div>
              <div class="font-medium text-slate-900 flex items-center gap-2">
                <FileSpreadsheet class="w-4 h-4 text-slate-600" />
                包含原始数据
              </div>
              <p class="text-sm text-slate-500 mt-1">
                导出渠道和转化的原始数据，便于核对和审计。
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h3 class="font-semibold text-slate-900">报告列表</h3>
        <span class="text-sm text-slate-500">共 {{ reports.length }} 份报告</span>
      </div>
      <div class="card-body">
        <div v-if="reports.length === 0" class="text-center py-12">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <FileText class="w-8 h-8" />
          </div>
          <h3 class="text-lg font-medium text-slate-900 mb-2">暂无报告</h3>
          <p class="text-slate-500 mb-4">请先在预算分配页面生成分配报告</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="report in reports"
            :key="report.id"
            class="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                    <FileSpreadsheet class="w-6 h-6" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-semibold text-slate-900">
                        预算分配报告 - {{ report.reportDate }}
                      </h4>
                      <span
                        v-if="report.hasManualModifications"
                        class="badge-warning flex items-center gap-1"
                      >
                        <Edit2 class="w-3 h-3" />
                        已修改
                      </span>
                      <span
                        v-if="report.hasSupplementaryRecords"
                        class="badge-info flex items-center gap-1"
                      >
                        <RefreshCw class="w-3 h-3" />
                        含补录
                      </span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-slate-500">
                      <span class="flex items-center gap-1">
                        <Calendar class="w-4 h-4" />
                        {{ dayjs(report.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
                      </span>
                      <span class="flex items-center gap-1">
                        <User class="w-4 h-4" />
                        {{ report.generatedBy }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-4 gap-4 mt-4">
                  <div class="p-3 bg-white rounded-lg">
                    <div class="text-xs text-slate-500">总预算</div>
                    <div class="text-lg font-semibold text-slate-900">
                      {{ formatCurrency(report.totalBudget, store.defaultCurrency) }}
                    </div>
                  </div>
                  <div class="p-3 bg-white rounded-lg">
                    <div class="text-xs text-slate-500">已分配</div>
                    <div class="text-lg font-semibold text-success-600">
                      {{ formatCurrency(report.allocatedBudget, store.defaultCurrency) }}
                    </div>
                  </div>
                  <div class="p-3 bg-white rounded-lg">
                    <div class="text-xs text-slate-500">分配渠道数</div>
                    <div class="text-lg font-semibold text-slate-900">
                      {{ report.details.length }}
                    </div>
                  </div>
                  <div class="p-3 bg-white rounded-lg">
                    <div class="text-xs text-slate-500">修改次数</div>
                    <div class="text-lg font-semibold text-warning-600">
                      {{ report.modificationTraces.length }}
                    </div>
                  </div>
                </div>

                <div v-if="report.modificationTraces.length > 0" class="mt-4 p-3 bg-warning-50 rounded-lg border border-warning-200">
                  <div class="flex items-start gap-2">
                    <Info class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                    <div class="text-sm text-warning-800">
                      <span class="font-medium">报告包含 {{ report.modificationTraces.length }} 处人工修改</span>
                      <p class="text-xs mt-1 text-warning-700">
                        导出的Excel中将包含「人工修改痕迹」工作表，详细记录每次修改的内容和原因。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                class="btn-primary ml-6"
                @click="exportReport(report.id)"
              >
                <Download class="w-4 h-4 mr-2" />
                导出Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold text-slate-900">导出报表说明</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-3">
            <h4 class="font-medium text-slate-900">报表结构</h4>
            <div class="space-y-2">
              <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">1</div>
                <div>
                  <div class="font-medium text-slate-900">预算分配汇总</div>
                  <div class="text-xs text-slate-500">总预算、已分配、修改次数等概览信息</div>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">2</div>
                <div>
                  <div class="font-medium text-slate-900">分配明细</div>
                  <div class="text-xs text-slate-500">各渠道的预算分配、边际收益、ROI等详情</div>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div class="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center text-warning-600 font-bold text-sm">3</div>
                <div>
                  <div class="font-medium text-slate-900">人工修改痕迹</div>
                  <div class="text-xs text-slate-500">边际收益修改的完整历史记录（可选）</div>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">4</div>
                <div>
                  <div class="font-medium text-slate-900">补录记录影响</div>
                  <div class="text-xs text-slate-500">补录数据及其影响的分配明细（可选）</div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <h4 class="font-medium text-slate-900">数据口径说明</h4>
            <div class="p-4 bg-slate-50 rounded-lg space-y-3 text-sm text-slate-600">
              <p>
                <span class="font-medium text-slate-900">不自动修改原则：</span>
                当渠道数据、转化率、分配报告出现口径冲突时，系统不会自动修改任何数据，只会在异常提醒中列出具体差异。
              </p>
              <p>
                <span class="font-medium text-slate-900">修改可追溯原则：</span>
                所有人工修改边际收益的操作都会被完整记录，包括修改前后的值、修改原因、修改时间和修改人。
              </p>
              <p>
                <span class="font-medium text-slate-900">补录标记原则：</span>
                事后补录的出价记录和转化数据都会被标记，并明确标出影响了哪些预算分配明细。
              </p>
              <p>
                <span class="font-medium text-slate-900">单位统一原则：</span>
                导出报表中的货币单位与生成报告时选择的单位一致，原始数据表中保留各渠道的原始货币单位。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
