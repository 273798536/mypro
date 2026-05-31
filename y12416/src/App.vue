<template>
  <div id="app" class="app-container">
    <el-container style="height: 100vh">
      <el-aside width="220px" class="sidebar">
        <div class="logo">
          <el-icon :size="32" style="margin-right: 8px"><CreditCard /></el-icon>
          <span>预付卡存管对账</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          router
          background-color="#001529"
          text-color="#b8c7ce"
          active-text-color="#fff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据概览</span>
          </el-menu-item>
          <el-menu-item index="/import">
            <el-icon><Upload /></el-icon>
            <span>数据导入</span>
          </el-menu-item>
          <el-menu-item index="/merge">
            <el-icon><Connection /></el-icon>
            <span>卡号合并</span>
          </el-menu-item>
          <el-menu-item index="/collection">
            <el-icon><Coin /></el-icon>
            <span>资金归集</span>
            <el-tag v-if="store.hasActiveCollection" type="danger" size="small" class="menu-tag">进行中</el-tag>
          </el-menu-item>
          <el-menu-item index="/difference">
            <el-icon><Warning /></el-icon>
            <span>差额解释</span>
          </el-menu-item>
          <el-menu-item index="/report">
            <el-icon><Document /></el-icon>
            <span>监管报告</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="header">
          <div class="header-left">
            <span class="page-title">{{ currentTitle }}</span>
          </div>
          <div class="header-right">
            <el-tag v-if="store.hasActiveCollection" type="danger">
              资金归集进行中 - 所有操作自动关联
            </el-tag>
            <el-tag type="info">数据版本: v{{ store.currentDataSourceVersion }}</el-tag>
            <el-dropdown>
              <span class="user-dropdown">
                <el-avatar :size="28" icon="UserFilled" style="background: #409EFF" />
                <span style="margin-left: 8px">运营管理员</span>
              </span>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CreditCard, DataAnalysis, Upload, Connection, Coin, Warning, Document } from '@element-plus/icons-vue'
import { useReconciliationStore } from '@/stores/reconciliation'

const route = useRoute()
const store = useReconciliationStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '')
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

.sidebar {
  background: #001529;
  overflow-x: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #000;
}
.sidebar-menu {
  border-right: none;
}
.el-menu-item { display: flex; align-items: center; }
.menu-tag { margin-left: auto; }

.header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}
.header-left .page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
