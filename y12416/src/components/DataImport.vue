<template>
  <div class="data-import">
    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
      <template #title>
        快速体验：点击「导入样例数据」即可自动生成演示数据，包含卡账户、充值、消费、退款各类型记录
      </template>
      <template #default>
        <el-button type="primary" size="small" :icon="MagicStick" @click="loadSampleData">
          导入样例数据
        </el-button>
        <el-button size="small" :icon="Delete" @click="clearAll">清空所有数据</el-button>
      </template>
    </el-alert>

    <el-card class="import-card">
      <template #header>
        <div class="card-header">
          <span>数据导入</span>
          <el-tag type="info">当前版本: v{{ store.currentDataSourceVersion }}</el-tag>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="6">
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop($event, 'card_account')">
            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="false"
              accept=".xlsx,.xls,.csv"
              :on-change="(f) => handleFileChange(f, 'card_account')"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽文件或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">卡账户数据</div>
              </template>
            </el-upload>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop($event, 'recharge')">
            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="false"
              accept=".xlsx,.xls,.csv"
              :on-change="(f) => handleFileChange(f, 'recharge')"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽文件或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">充值流水</div>
              </template>
            </el-upload>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop($event, 'consumption')">
            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="false"
              accept=".xlsx,.xls,.csv"
              :on-change="(f) => handleFileChange(f, 'consumption')"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽文件或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">消费记录</div>
              </template>
            </el-upload>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop($event, 'refund')">
            <el-upload
              drag
              :auto-upload="false"
              :show-file-list="false"
              accept=".xlsx,.xls,.csv"
              :on-change="(f) => handleFileChange(f, 'refund')"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽文件或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">退款记录</div>
              </template>
            </el-upload>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="source-card" style="margin-top: 20px">
      <template #header>
        <span>数据来源追踪 (共 {{ store.dataSources.length }} 个文件)</span>
      </template>
      <el-table :data="store.dataSources" border>
        <el-table-column prop="version" label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column prop="type" label="数据类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeName(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" />
        <el-table-column prop="recordCount" label="记录数" width="100" />
        <el-table-column prop="importTime" label="导入时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetails(row)">
              查看明细
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailVisible" title="数据明细" width="90%">
      <el-table :data="currentDetailData" border max-height="500">
        <el-table-column v-for="col in currentColumns" :key="col" :prop="col" :label="col" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, MagicStick, Delete } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { useReconciliationStore } from '@/stores/reconciliation'

const store = useReconciliationStore()
const detailVisible = ref(false)
const currentDetailData = ref([])
const currentColumns = ref([])

function generateSampleData() {
  const cardNos = [
    '62220001', '62220002', '62220003', '62220004', '62220005',
    '62220006', '62220007', '62220008', '62220009', '62220010'
  ]
  const holders = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '王二']

  const accounts = cardNos.map((no, i) => ({
    cardNo: no,
    cardHolder: holders[i],
    balance: Math.floor(Math.random() * 5000 + 1000) * 1.0,
    status: '正常',
    openDate: dayjs().subtract(Math.floor(Math.random() * 365), 'day').format('YYYY-MM-DD')
  }))

  const recharges = []
  cardNos.forEach(no => {
    const count = Math.floor(Math.random() * 5 + 2)
    for (let i = 0; i < count; i++) {
      recharges.push({
        cardNo: no,
        amount: Math.floor(Math.random() * 1000 + 100) * 1.0,
        date: dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD HH:mm:ss'),
        channel: ['微信', '支付宝', '银行'][Math.floor(Math.random() * 3)],
        status: '成功'
      })
    }
  })

  const consumptions = []
  cardNos.forEach(no => {
    const count = Math.floor(Math.random() * 8 + 3)
    for (let i = 0; i < count; i++) {
      consumptions.push({
        cardNo: no,
        amount: Math.floor(Math.random() * 300 + 20) * 1.0,
        date: dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD HH:mm:ss'),
        merchant: ['商户A', '商户B', '商户C', '商户D'][Math.floor(Math.random() * 4)],
        status: '成功'
      })
    }
  })

  const refunds = []
  cardNos.slice(0, 5).forEach(no => {
    const count = Math.floor(Math.random() * 2 + 1)
    for (let i = 0; i < count; i++) {
      refunds.push({
        cardNo: no,
        amount: Math.floor(Math.random() * 200 + 10) * 1.0,
        date: dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD HH:mm:ss'),
        reason: ['退货退款', '取消订单', '优惠返还'][Math.floor(Math.random() * 3)],
        status: '成功'
      })
    }
  })

  return { accounts, recharges, consumptions, refunds }
}

async function loadSampleData() {
  try {
    await ElMessageBox.confirm(
      '导入样例数据将覆盖当前数据（如果有），是否继续？',
      '导入样例数据',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'info' }
    )
    store.clearAllData()
    const sample = generateSampleData()
    store.addCardAccounts(sample.accounts, '样例数据_卡账户.xlsx')
    store.addRechargeRecords(sample.recharges, '样例数据_充值流水.xlsx')
    store.addConsumptionRecords(sample.consumptions, '样例数据_消费记录.xlsx')
    store.addRefundRecords(sample.refunds, '样例数据_退款记录.xlsx')
    ElMessage.success(`样例数据导入成功：${sample.accounts.length} 张卡、${sample.recharges.length} 条充值、${sample.consumptions.length} 条消费、${sample.refunds.length} 条退款`)
  } catch {
    // cancelled
  }
}

async function clearAll() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有数据吗？此操作不可撤销。',
      '清空数据',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    store.clearAllData()
    ElMessage.success('数据已清空')
  } catch {
    // cancelled
  }
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

function getTypeTag(type) {
  const map = {
    card_account: 'primary',
    recharge: 'success',
    consumption: 'warning',
    refund: 'danger'
  }
  return map[type] || 'info'
}

async function handleFileChange(file, type) {
  try {
    const data = await parseExcel(file.raw)
    importData(type, data, file.name)
  } catch (error) {
    ElMessage.error(`文件解析失败: ${error.message}`)
  }
}

async function handleDrop(event, type) {
  const files = event.dataTransfer.files
  if (files.length > 0) {
    try {
      const data = await parseExcel(files[0])
      importData(type, data, files[0].name)
    } catch (error) {
      ElMessage.error(`文件解析失败: ${error.message}`)
    }
  }
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function importData(type, records, fileName) {
  if (!records || records.length === 0) {
    ElMessage.warning('文件中没有数据')
    return
  }

  let source
  switch (type) {
    case 'card_account':
      source = store.addCardAccounts(records, fileName)
      break
    case 'recharge':
      source = store.addRechargeRecords(records, fileName)
      break
    case 'consumption':
      source = store.addConsumptionRecords(records, fileName)
      break
    case 'refund':
      source = store.addRefundRecords(records, fileName)
      break
  }

  ElMessage.success(`成功导入 ${records.length} 条 ${getTypeName(type)}数据，版本 v${source.version}`)
}

function viewDetails(row) {
  let data = []
  switch (row.type) {
    case 'card_account':
      data = store.cardAccounts.filter(a => a.dataSourceId === row.id)
      break
    case 'recharge':
      data = store.rechargeRecords.filter(r => r.dataSourceId === row.id)
      break
    case 'consumption':
      data = store.consumptionRecords.filter(r => r.dataSourceId === row.id)
      break
    case 'refund':
      data = store.refundRecords.filter(r => r.dataSourceId === row.id)
      break
  }

  if (data.length > 0) {
    currentColumns.value = Object.keys(data[0])
    currentDetailData.value = data
    detailVisible.value = true
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-area {
  min-height: 150px;
}
</style>
