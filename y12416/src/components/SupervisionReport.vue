<template>
  <div class="supervision-report">
    <el-alert
      v-if="store.hasActiveCollection"
      title="当前有进行中的资金归集，报告将包含此归集记录"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    />

    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>监管报告预览</span>
          <div>
            <el-button type="primary" :icon="DocumentAdd" @click="generateReport">生成报告</el-button>
            <el-button type="success" :icon="Download" @click="exportExcel">导出 Excel</el-button>
            <el-button type="warning" :icon="Picture" @click="exportPDF">导出 PDF</el-button>
          </div>
        </div>
      </template>

      <div ref="reportRef" class="report-content">
        <div class="report-header">
          <h1>预付卡存管对账监管报告</h1>
          <div class="report-meta">
            <span>报告编号：{{ reportNo }}</span>
            <span>生成时间：{{ reportTime }}</span>
            <span v-if="store.hasActiveCollection">
              <el-tag type="danger">含资金归集</el-tag>
            </span>
          </div>
        </div>

        <div class="report-section">
          <h2>一、账户资金概览</h2>
          <el-row :gutter="16">
            <el-col :span="6">
              <div class="stat-block">
                <div class="stat-label">账户余额</div>
                <div class="stat-value primary">{{ formatMoney(store.accountBalance) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-block">
                <div class="stat-label">充值总额</div>
                <div class="stat-value success">{{ formatMoney(store.totalRechargeAmount) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-block">
                <div class="stat-label">消费总额</div>
                <div class="stat-value warning">{{ formatMoney(store.totalConsumptionAmount) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-block">
                <div class="stat-label">退款总额</div>
                <div class="stat-value danger">{{ formatMoney(store.totalRefundAmount) }}</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="report-section">
          <h2>二、对账平衡验证</h2>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="账户实际余额">{{ formatMoney(store.accountBalance) }}</el-descriptions-item>
            <el-descriptions-item label="理论计算余额">{{ formatMoney(store.theoreticalBalance) }}</el-descriptions-item>
            <el-descriptions-item label="对账差额">
              <span :style="{ color: store.currentDifference === 0 ? '#67C23A' : '#F56C6C', fontWeight: 700 }">
                {{ formatMoney(store.currentDifference) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="对账状态">
              <el-tag :type="store.currentDifference === 0 ? 'success' : 'warning'" size="small">
                {{ store.currentDifference === 0 ? '平衡' : '存在差额' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <div class="formula-note">
            计算公式：理论余额 = 充值总额 - 消费总额 - 退款总额；对账差额 = 实际余额 - 理论余额
          </div>
        </div>

        <div v-if="store.hasActiveCollection || relatedCollection" class="report-section collection-section">
          <h2>三、资金归集情况 <el-tag type="danger" size="small">监管重点</el-tag></h2>
          <template v-if="activeCollection">
            <el-alert type="warning" :closable="false" title="进行中的资金归集" />
            <el-descriptions :column="2" border style="margin-top: 12px">
              <el-descriptions-item label="归集ID">{{ activeCollection.id }}</el-descriptions-item>
              <el-descriptions-item label="归集金额">{{ formatMoney(activeCollection.amount) }}</el-descriptions-item>
              <el-descriptions-item label="操作人">{{ activeCollection.operator }}</el-descriptions-item>
              <el-descriptions-item label="触发时间">{{ activeCollection.triggerTime }}</el-descriptions-item>
              <el-descriptions-item label="归集备注" :span="2">{{ activeCollection.remark }}</el-descriptions-item>
            </el-descriptions>

            <h4>归集前后对比</h4>
            <el-table :data="collectionComparison" border size="small">
              <el-table-column prop="item" label="项目" />
              <el-table-column prop="before" label="归集前金额">
                <template #default="{ row }">{{ formatMoney(row.before) }}</template>
              </el-table-column>
              <el-table-column prop="current" label="当前金额">
                <template #default="{ row }">{{ formatMoney(row.current) }}</template>
              </el-table-column>
              <el-table-column prop="change" label="变动">
                <template #default="{ row }">
                  <span :style="{ color: row.change >= 0 ? '#67C23A' : '#F56C6C' }">
                    {{ row.change >= 0 ? '+' : '' }}{{ formatMoney(row.change) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>

            <h4>归集期间差额解释（{{ collectionExplanations.length }} 条）</h4>
            <el-table v-if="collectionExplanations.length > 0" :data="collectionExplanations" border size="small">
              <el-table-column prop="createTime" label="时间" width="180" />
              <el-table-column prop="difference" label="差额" width="120">
                <template #default="{ row }">{{ formatMoney(row.difference) }}</template>
              </el-table-column>
              <el-table-column prop="operator" label="操作人" width="100" />
              <el-table-column prop="explanation" label="解释说明" />
            </el-table>
            <el-empty v-else description="归集期间暂无差额解释" :image-size="40" />
          </template>
        </div>

        <div class="report-section">
          <h2>四、差额解释汇总</h2>
          <p class="section-intro">共 {{ store.differenceExplanations.length }} 条差额解释记录</p>
          <el-table :data="store.differenceExplanations.slice(-10).reverse()" border size="small">
            <el-table-column prop="createTime" label="记录时间" width="180" />
            <el-table-column prop="difference" label="差额金额" width="130">
              <template #default="{ row }">{{ formatMoney(row.difference) }}</template>
            </el-table-column>
            <el-table-column label="归集关联" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.hasCollection" type="danger" size="small">已关联</el-tag>
                <el-tag v-else type="info" size="small">独立</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="100" />
            <el-table-column prop="explanation" label="解释说明" />
          </el-table>
        </div>

        <div class="report-section">
          <h2>五、卡号合并记录</h2>
          <p class="section-intro">共 {{ store.cardMergeHistory.length }} 条合并记录</p>
          <el-table v-if="store.cardMergeHistory.length > 0" :data="store.cardMergeHistory.slice(-5).reverse()" border size="small">
            <el-table-column prop="mergeTime" label="合并时间" width="180" />
            <el-table-column prop="targetCardNo" label="目标卡号" width="160" />
            <el-table-column label="被合并卡号">
              <template #default="{ row }">
                <el-tag v-for="no in row.sourceCardNos" :key="no" size="small" style="margin-right:4px">{{ no }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="合并原因" />
          </el-table>
          <el-empty v-else description="暂无卡号合并记录" :image-size="40" />
        </div>

        <div class="report-section">
          <h2>六、数据来源版本</h2>
          <el-table :data="store.dataSources" border size="small">
            <el-table-column prop="version" label="版本" width="80">
              <template #default="{ row }">v{{ row.version }}</template>
            </el-table-column>
            <el-table-column prop="type" label="数据类型" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ getTypeName(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="fileName" label="文件名" />
            <el-table-column prop="recordCount" label="记录数" width="100" />
            <el-table-column prop="importTime" label="导入时间" width="180" />
          </el-table>
        </div>

        <div class="report-footer">
          <div class="footer-line">报告生成系统：预付卡存管对账系统</div>
          <div class="footer-line">数据版本：v{{ store.currentDataSourceVersion }}</div>
          <div class="footer-line">本报告为监管专用，所有数据均可追溯</div>
        </div>
      </div>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header><span>报告历史 ({{ store.reportHistory.length }} 份)</span></template>
      <el-table :data="store.reportHistory.slice().reverse()" border>
        <el-table-column prop="id" label="报告编号" width="200" />
        <el-table-column label="资金归集" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.hasCollection" type="danger" size="small">包含</el-tag>
            <el-tag v-else type="info" size="small">无</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountBalance" label="账户余额" width="140">
          <template #default="{ row }">{{ formatMoney(row.accountBalance) }}</template>
        </el-table-column>
        <el-table-column prop="difference" label="对账差额" width="140">
          <template #default="{ row }">
            <span :style="{ color: row.difference === 0 ? '#67C23A' : '#F56C6C' }">
              {{ formatMoney(row.difference) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="dataVersion" label="数据版本" width="100">
          <template #default="{ row }">v{{ row.dataVersion }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="生成时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewHistoryReport(row)">查看</el-button>
            <el-button type="success" link size="small" @click="exportHistory(row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentAdd, Download, Picture } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import dayjs from 'dayjs'
import { useReconciliationStore } from '@/stores/reconciliation'

const store = useReconciliationStore()
const reportRef = ref(null)

const reportNo = computed(() => 'REP_' + dayjs().format('YYYYMMDDHHmmss'))
const reportTime = computed(() => dayjs().format('YYYY-MM-DD HH:mm:ss'))
const activeCollection = computed(() => store.activeCollection)
const relatedCollection = computed(() => store.fundCollectionRecords.slice(-1)[0])

const collectionComparison = computed(() => {
  if (!activeCollection.value) return []
  return [
    {
      item: '账户余额',
      before: activeCollection.value.balanceBefore,
      current: store.accountBalance,
      change: store.accountBalance - activeCollection.value.balanceBefore
    },
    {
      item: '充值总额',
      before: activeCollection.value.rechargeBefore,
      current: store.totalRechargeAmount,
      change: store.totalRechargeAmount - activeCollection.value.rechargeBefore
    },
    {
      item: '消费总额',
      before: activeCollection.value.consumptionBefore,
      current: store.totalConsumptionAmount,
      change: store.totalConsumptionAmount - activeCollection.value.consumptionBefore
    },
    {
      item: '退款总额',
      before: activeCollection.value.refundBefore,
      current: store.totalRefundAmount,
      change: store.totalRefundAmount - activeCollection.value.refundBefore
    }
  ]
})

const collectionExplanations = computed(() => {
  if (!activeCollection.value) return []
  return store.differenceExplanations.filter(e => e.collectionId === activeCollection.value.id)
})

function formatMoney(val) {
  if (val === undefined || val === null) return '¥0.00'
  return '¥' + Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTypeName(type) {
  const map = {
    card_account: '卡账户',
    recharge: '充值流水',
    consumption: '消费记录',
    refund: '退款记录'
  }
  return map[type] || type
}

function generateReport() {
  const report = {
    reportNo: reportNo.value,
    accountBalance: store.accountBalance,
    totalRecharge: store.totalRechargeAmount,
    totalConsumption: store.totalConsumptionAmount,
    totalRefund: store.totalRefundAmount,
    theoreticalBalance: store.theoreticalBalance,
    difference: store.currentDifference,
    dataVersion: store.currentDataSourceVersion,
    explanationCount: store.differenceExplanations.length,
    mergeCount: store.cardMergeHistory.length,
    dataSourceCount: store.dataSources.length
  }
  store.saveReport(report)
  ElMessage.success('报告已生成并保存至历史记录')
}

function exportExcel() {
  const wb = XLSX.utils.book_new()

  const summary = [{
    '报告编号': reportNo.value,
    '生成时间': reportTime.value,
    '账户余额': store.accountBalance,
    '充值总额': store.totalRechargeAmount,
    '消费总额': store.totalConsumptionAmount,
    '退款总额': store.totalRefundAmount,
    '理论余额': store.theoreticalBalance,
    '对账差额': store.currentDifference,
    '数据版本': `v${store.currentDataSourceVersion}`,
    '是否含归集': store.hasActiveCollection ? '是' : '否'
  }]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), '报告摘要')

  if (activeCollection.value) {
    const coll = [{
      '归集ID': activeCollection.value.id,
      '归集金额': activeCollection.value.amount,
      '操作人': activeCollection.value.operator,
      '触发时间': activeCollection.value.triggerTime,
      '备注': activeCollection.value.remark,
      '归集前余额': activeCollection.value.balanceBefore,
      '归集前充值': activeCollection.value.rechargeBefore,
      '归集前消费': activeCollection.value.consumptionBefore,
      '归集前退款': activeCollection.value.refundBefore
    }]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coll), '资金归集')

    const exps = collectionExplanations.value.map(e => ({
      '时间': e.createTime,
      '差额': e.difference,
      '操作人': e.operator,
      '解释': e.explanation
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exps), '归集期间差额')
  }

  const allExps = store.differenceExplanations.map(e => ({
    '时间': e.createTime,
    '差额': e.difference,
    '操作人': e.operator,
    '解释': e.explanation,
    '关联归集': e.hasCollection ? '是' : '否'
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allExps), '全部差额解释')

  const merges = store.cardMergeHistory.map(m => ({
    '时间': m.mergeTime,
    '目标卡号': m.targetCardNo,
    '被合并卡号': m.sourceCardNos.join(','),
    '原因': m.reason,
    '版本': `v${m.version}`
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(merges), '卡号合并')

  const sources = store.dataSources.map(d => ({
    '版本': `v${d.version}`,
    '类型': getTypeName(d.type),
    '文件名': d.fileName,
    '记录数': d.recordCount,
    '导入时间': d.importTime
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sources), '数据来源')

  XLSX.writeFile(wb, `监管报告_${reportNo.value}.xlsx`)
  ElMessage.success('Excel 导出成功')
}

function exportPDF() {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const margin = 20
    let y = 30

    doc.setFontSize(18)
    doc.text('预付卡存管对账监管报告', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFontSize(10)
    doc.text(`报告编号: ${reportNo.value}`, margin, y)
    doc.text(`生成时间: ${reportTime.value}`, margin, y + 7)
    doc.text(`数据版本: v${store.currentDataSourceVersion}`, margin, y + 14)
    y += 25

    doc.setFontSize(14)
    doc.text('一、账户资金概览', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`账户余额: ${formatMoney(store.accountBalance)}`, margin, y)
    doc.text(`充值总额: ${formatMoney(store.totalRechargeAmount)}`, margin + 70, y)
    doc.text(`消费总额: ${formatMoney(store.totalConsumptionAmount)}`, margin + 140, y)
    y += 6
    doc.text(`退款总额: ${formatMoney(store.totalRefundAmount)}`, margin, y)
    y += 12

    doc.setFontSize(14)
    doc.text('二、对账平衡验证', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.text(`账户实际余额: ${formatMoney(store.accountBalance)}`, margin, y)
    doc.text(`理论计算余额: ${formatMoney(store.theoreticalBalance)}`, margin + 70, y)
    y += 6
    doc.text(`对账差额: ${formatMoney(store.currentDifference)}`, margin, y)
    doc.text(`对账状态: ${store.currentDifference === 0 ? '平衡' : '存在差额'}`, margin + 70, y)
    y += 15

    if (activeCollection.value) {
      doc.setFontSize(14)
      doc.text('三、资金归集情况', margin, y)
      y += 8
      doc.setFontSize(10)
      doc.text(`归集ID: ${activeCollection.value.id}`, margin, y)
      doc.text(`归集金额: ${formatMoney(activeCollection.value.amount)}`, margin + 70, y)
      y += 6
      doc.text(`操作人: ${activeCollection.value.operator}`, margin, y)
      doc.text(`触发时间: ${activeCollection.value.triggerTime}`, margin + 70, y)
      y += 6
      doc.text(`备注: ${activeCollection.value.remark}`, margin, y)
      y += 15
    }

    doc.save(`监管报告_${reportNo.value}.pdf`)
    ElMessage.success('PDF 导出成功')
  } catch (err) {
    console.error(err)
    ElMessage.warning('PDF 导出功能需额外配置，建议使用 Excel 导出')
  }
}

function viewHistoryReport(row) {
  ElMessage.info(`查看历史报告: ${row.id}`)
}

function exportHistory(row) {
  ElMessage.info(`导出历史报告: ${row.id}`)
}
</script>

<style scoped>
.report-content { background: #fff; padding: 30px; }
.report-header { text-align: center; border-bottom: 2px solid #303133; padding-bottom: 15px; margin-bottom: 20px; }
.report-header h1 { font-size: 24px; color: #303133; margin: 0 0 10px 0; }
.report-meta { display: flex; justify-content: center; gap: 30px; font-size: 13px; color: #909399; }
.report-section { margin-bottom: 24px; }
.report-section h2 { font-size: 16px; color: #303133; border-left: 4px solid #409EFF; padding-left: 10px; margin-bottom: 12px; }
.report-section h4 { font-size: 14px; color: #606266; margin: 16px 0 8px 0; }
.section-intro { font-size: 13px; color: #909399; margin-bottom: 8px; }
.stat-block { text-align: center; padding: 16px; background: #f5f7fa; border-radius: 6px; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 6px; }
.stat-value { font-size: 20px; font-weight: 700; }
.stat-value.primary { color: #409EFF; }
.stat-value.success { color: #67C23A; }
.stat-value.warning { color: #E6A23C; }
.stat-value.danger { color: #F56C6C; }
.formula-note { margin-top: 8px; font-size: 12px; color: #909399; text-align: center; }
.collection-section { border: 1px solid #F56C6C; border-radius: 8px; padding: 16px; }
.report-footer { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #dcdfe6; text-align: center; }
.footer-line { font-size: 12px; color: #909399; margin-bottom: 4px; }
</style>
