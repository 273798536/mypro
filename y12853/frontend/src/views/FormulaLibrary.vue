<template>
  <div class="page-wrapper">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>📐 潮窗计算公式库（公式 · 单位 · 适用范围 · 失败原因）</strong>
          <el-tag type="info" size="small">海事安全员月底/课前可对照复核</el-tag>
        </div>
      </template>
      <el-alert
        type="info" :closable="false" show-icon
        title="说明：本页列出所有使用的计算公式及其约束，确保潮窗结论可追溯、可解释。"
        style="margin-bottom: 16px;"
      />
      <el-collapse v-model="active">
        <el-collapse-item v-for="f in list" :key="f.key" :name="f.key">
          <template #title>
            <span style="font-weight: 600;">{{ f.name }}</span>
            <el-tag size="small" style="margin-left: 12px; background:#e6f4ff; color:#1f6feb;">
              单位：{{ f.unit }}
            </el-tag>
          </template>

          <div class="formula-card">
            <div class="title">📊 公式表达式</div>
            <div class="expr">{{ f.formula }}</div>
          </div>

          <div class="formula-card" style="background: #f0f9eb; border-color:#a0cfff;">
            <div class="title" style="color:#529b2e;">🌊 适用范围</div>
            <div style="line-height: 1.8; color: #303133;">{{ f.scope }}</div>
          </div>

          <div class="formula-card" style="background: #fef0f0; border-color:#fbc4c4;">
            <div class="title" style="color:#f56c6c;">❌ 失败原因（出现以下情况计算结果不可直接使用）</div>
            <ol style="padding-left: 20px; margin: 8px 0; line-height: 2; color: #303133;">
              <li v-for="(m, i) in f.failure_modes" :key="i">{{ m }}</li>
            </ol>
          </div>

          <div class="formula-card" style="background: #fdf6ec; border-color:#faecd8;">
            <div class="title" style="color:#b88230;">📝 说明</div>
            <div style="line-height: 1.8;">{{ f.description }}</div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { tideApi } from '@/api'
const list = ref([])
const active = ref([])
onMounted(async () => {
  const { data } = await tideApi.formulas()
  list.value = data
  if (data[0]) active.value = [data[0].key]
})
</script>
