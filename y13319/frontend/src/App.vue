<template>
  <el-container style="height: 100vh;">
    <el-aside width="220px" style="background: #304156; color: #fff;">
      <div style="padding: 16px; border-bottom: 1px solid #1f2d3d;">
        <h2 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">
          <el-icon style="margin-right: 6px; color: #409EFF;"><Monitor /></el-icon>
          工业视觉指标看板
        </h2>
        <div style="font-size: 11px; color: #aeb9c5; margin-top: 4px;">Industrial Vision Dashboard</div>
      </div>
      <el-menu
        :default-active="$route.path"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        style="border-right: none;"
      >
        <el-menu-item path="/dashboard">
          <el-icon><DataAnalysis /></el-icon><span>总览看板</span>
        </el-menu-item>
        <el-menu-item path="/corrections">
          <el-icon><EditPen /></el-icon><span>人工修正</span>
        </el-menu-item>
        <el-menu-item path="/anomalies">
          <el-icon><Warning /></el-icon><span>异常队列</span>
        </el-menu-item>
        <el-menu-item path="/sample-track">
          <el-icon><Search /></el-icon><span>样本追踪</span>
        </el-menu-item>
        <el-menu-item path="/version-compare">
          <el-icon><CopyDocument /></el-icon><span>版本对比</span>
        </el-menu-item>
        <el-menu-item path="/review">
          <el-icon><ZoomIn /></el-icon><span>评审溯源</span>
        </el-menu-item>
        <el-menu-item path="/history">
          <el-icon><Clock /></el-icon><span>历史变更</span>
        </el-menu-item>
        <el-menu-item path="/field-mapping">
          <el-icon><SetUp /></el-icon><span>字段映射</span>
        </el-menu-item>
      </el-menu>
      <div style="position: absolute; bottom: 10px; left: 0; right: 0; padding: 10px 16px; font-size: 11px; color: #8492a6;">
        数据目录: backend/data/vision.db
      </div>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #e6e8eb; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 16px;">{{ $route.meta.title }}</h3>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <el-select v-model="currentVersionId" placeholder="选择版本" @change="onVersionChange" style="width: 220px;">
            <el-option v-for="v in versions" :key="v.id" :label="`${v.version_name} (${v.actual_count || v.sample_count}条)`" :value="v.id" />
          </el-select>
          <el-button size="small" type="primary" :icon="Refresh" @click="loadVersions">刷新</el-button>
          <div style="font-size: 12px; color: #909399;">
            <el-icon><User /></el-icon> {{ user }}
          </div>
        </div>
      </el-header>
      <el-main style="background: #f5f7fa;">
        <router-view :version-id="currentVersionId" :versions="versions" @refresh="loadVersions" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, User } from '@element-plus/icons-vue'
import api from './api'

const versions = ref([])
const currentVersionId = ref(null)
const user = ref('AI产品-阿宁')

async function loadVersions() {
  try {
    const { data } = await api.getVersions()
    versions.value = data
    if (!currentVersionId.value && data.length > 0) {
      currentVersionId.value = data[0].id
    }
  } catch (e) {
    ElMessage.error('加载版本列表失败')
  }
}

function onVersionChange() {
  provide('currentVersionId', currentVersionId.value)
}

onMounted(loadVersions)
provide('currentVersionId', currentVersionId)
provide('versions', versions)
provide('reloadVersions', loadVersions)
</script>
