<template>
  <div>
    <h2 class="page-title">计算工具</h2>

    <el-row :gutter="16">
      <el-col :span="12">
        <div class="formula-card" v-for="formula in formulas" :key="formula.name">
          <div class="formula-title">{{ formula.name }}</div>
          <div class="formula-content">{{ formula.formula }}</div>
          <div class="formula-meta">
            <span><strong>单位:</strong> {{ formula.unit }}</span>
            <span><strong>阈值:</strong> {{ formula.threshold }}</span>
          </div>
          <div style="margin-top: 8px; font-size: 13px;">
            <strong>适用范围:</strong> {{ formula.scope }}
          </div>
          <div style="margin-top: 8px;">
            <strong>可能失败原因:</strong>
            <ul style="margin: 4px 0 0 20px; padding: 0;">
              <li v-for="(reason, idx) in formula.failure_reasons" :key="idx" style="font-size: 13px;">
                {{ reason }}
              </li>
            </ul>
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="page-container">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="轨迹漂移计算" name="drift">
              <el-form :model="driftForm" label-width="120px">
                <el-form-item label="起始点纬度">
                  <el-input-number v-model="driftForm.point1_lat" :precision="6" :step="0.0001" />
                </el-form-item>
                <el-form-item label="起始点经度">
                  <el-input-number v-model="driftForm.point1_lng" :precision="6" :step="0.0001" />
                </el-form-item>
                <el-form-item label="目标点纬度">
                  <el-input-number v-model="driftForm.point2_lat" :precision="6" :step="0.0001" />
                </el-form-item>
                <el-form-item label="目标点经度">
                  <el-input-number v-model="driftForm.point2_lng" :precision="6" :step="0.0001" />
                </el-form-item>
                <el-form-item label="安全半径(米)">
                  <el-input-number v-model="driftForm.safe_radius" :min="0" :step="10" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="calculateDrift">计算</el-button>
                </el-form-item>
              </el-form>

              <div v-if="driftResult" class="calc-result">
                <h4>计算结果</h4>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="漂移距离">
                    {{ driftResult.drift_distance }} {{ driftResult.unit }}
                  </el-descriptions-item>
                  <el-descriptions-item label="是否异常">
                    <el-tag :type="driftResult.is_abnormal ? 'danger' : 'success'">
                      {{ driftResult.is_abnormal ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="安全阈值">
                    {{ driftResult.threshold }} 米
                  </el-descriptions-item>
                  <el-descriptions-item label="计算公式">
                    {{ driftResult.formula }}
                  </el-descriptions-item>
                  <el-descriptions-item label="计算说明">
                    {{ driftResult.calculation_note }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="driftResult.failure_reason" label="失败原因">
                    <span style="color: #f56c6c;">{{ driftResult.failure_reason }}</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-tab-pane>

            <el-tab-pane label="水质指数计算" name="water">
              <el-form :model="waterForm" label-width="120px">
                <el-form-item label="水温(℃)">
                  <el-input-number v-model="waterForm.water_temperature" :precision="1" :step="0.5" />
                </el-form-item>
                <el-form-item label="pH值">
                  <el-input-number v-model="waterForm.ph_value" :precision="2" :step="0.1" />
                </el-form-item>
                <el-form-item label="溶解氧(mg/L)">
                  <el-input-number v-model="waterForm.dissolved_oxygen" :precision="2" :step="0.1" />
                </el-form-item>
                <el-form-item label="浊度(NTU)">
                  <el-input-number v-model="waterForm.turbidity" :precision="1" :step="1" />
                </el-form-item>
                <el-form-item label="盐度(psu)">
                  <el-input-number v-model="waterForm.salinity" :precision="1" :step="0.5" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="calculateWater">计算</el-button>
                </el-form-item>
              </el-form>

              <div v-if="waterResult" class="calc-result">
                <h4>计算结果</h4>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="水质等级">
                    <el-tag :type="waterResult.is_abnormal ? 'danger' : 'success'">
                      {{ waterResult.quality_level }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="综合评分">
                    {{ waterResult.quality_score }} 分
                  </el-descriptions-item>
                  <el-descriptions-item label="是否异常">
                    <el-tag :type="waterResult.is_abnormal ? 'danger' : 'success'">
                      {{ waterResult.is_abnormal ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="各指标详情">
                    <div v-for="(val, key) in waterResult.indicators" :key="key" style="margin-bottom: 4px;">
                      {{ key }}: {{ val.value || '-' }} → 指数 {{ val.index || '-' }}
                      <el-tag size="small" :type="val.status === '异常' ? 'danger' : val.status === '缺失' ? 'info' : 'success'">
                        {{ val.status }}
                      </el-tag>
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item label="计算说明">
                    {{ waterResult.calculation_note }}
                  </el-descriptions-item>
                  <el-descriptions-item v-if="waterResult.failure_reason" label="失败原因">
                    <span style="color: #f56c6c;">{{ waterResult.failure_reason }}</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getCalculationFormulas,
  calculateTrajectoryDrift,
  calculateWaterQuality
} from '@/api'

const activeTab = ref('drift')
const formulas = ref([])

const driftForm = reactive({
  point1_lat: 36.0671,
  point1_lng: 120.3826,
  point2_lat: 36.0700,
  point2_lng: 120.3850,
  safe_radius: 500.0
})

const waterForm = reactive({
  water_temperature: 22.5,
  ph_value: 8.1,
  dissolved_oxygen: 7.2,
  turbidity: 5.0,
  salinity: 30.5
})

const driftResult = ref(null)
const waterResult = ref(null)

const loadFormulas = async () => {
  try {
    formulas.value = await getCalculationFormulas()
  } catch (error) {
    ElMessage.error('加载公式失败')
  }
}

const calculateDrift = async () => {
  try {
    driftResult.value = await calculateTrajectoryDrift(driftForm)
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '计算失败')
  }
}

const calculateWater = async () => {
  try {
    waterResult.value = await calculateWaterQuality(waterForm)
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '计算失败')
  }
}

onMounted(() => {
  loadFormulas()
})
</script>

<style lang="scss" scoped>
.calc-result {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;

  h4 {
    margin-bottom: 16px;
    font-weight: 600;
  }
}
</style>
