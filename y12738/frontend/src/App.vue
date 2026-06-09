<template>
  <el-container style="height: 100%">
    <el-header style="background: #1f2d3d; color: #fff; display: flex; align-items: center; padding: 0 24px;">
      <div style="font-size: 18px; font-weight: 600; margin-right: 40px;">
        <el-icon style="margin-right: 8px; vertical-align: -2px;"><Histogram /></el-icon>
        矩阵特征值可视化
      </div>
      <el-menu mode="horizontal" :default-active="activeMenu" background-color="#1f2d3d" text-color="#c0c4cc"
        active-text-color="#ffffff" router style="border-bottom: none; flex: 1;">
        <el-menu-item index="/error-analysis">
          <el-icon><DataAnalysis /></el-icon>
          <span>误差分析（日常）</span>
        </el-menu-item>
        <el-menu-item index="/constraint-check">
          <el-icon><CircleCheck /></el-icon>
          <span>约束校验（月底/课前）</span>
        </el-menu-item>
      </el-menu>
      <div style="color: #c0c4cc; font-size: 13px;">
        <el-icon style="margin-right: 4px; vertical-align: -2px;"><User /></el-icon>
        排课老师
      </div>
    </el-header>
    <el-main style="padding: 0;">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Histogram, DataAnalysis, CircleCheck, User } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
