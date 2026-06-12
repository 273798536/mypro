<template>
  <el-container style="height: 100vh;">
    <el-aside width="220px" style="background: #001529; color: #fff;">
      <div style="padding: 20px 16px; font-size: 16px; font-weight: 700; border-bottom: 1px solid #1f2d3d;">
        <el-icon style="vertical-align: middle; margin-right: 6px;"><Promotion /></el-icon>
        港口拖轮潮窗
      </div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#001529"
        text-color="#c0c4cc"
        active-text-color="#ffd04b"
        style="border: none;"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon><span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/tide-window">
          <el-icon><Aim /></el-icon><span>港口拖轮潮窗</span>
        </el-menu-item>
        <el-menu-item index="/trajectory">
          <el-icon><Location /></el-icon><span>轨迹清洗（日常入口）</span>
        </el-menu-item>
        <el-menu-item index="/formulas">
          <el-icon><Document /></el-icon><span>计算公式库</span>
        </el-menu-item>
        <el-menu-item index="/import">
          <el-icon><Upload /></el-icon><span>导入/补录</span>
        </el-menu-item>
        <el-menu-item index="/example">
          <el-icon><MagicStick /></el-icon><span>示例数据</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #ebeef5; display: flex; align-items: center; justify-content: space-between;">
        <div style="font-size: 16px; font-weight: 600;">
          海事安全员工作台 · {{ currentTitle }}
        </div>
        <div>
          <el-tag type="info" size="small" effect="plain">
            <el-icon style="vertical-align: middle;"><User /></el-icon> 海事安全员
          </el-tag>
        </div>
      </el-header>
      <el-main style="padding: 0; background: #f5f7fa;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const currentTitle = computed(() => route.meta?.title || '')
</script>
