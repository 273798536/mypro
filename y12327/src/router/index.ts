import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue')
    },
    {
      path: '/channels',
      name: 'ChannelData',
      component: () => import('@/views/ChannelData.vue')
    },
    {
      path: '/conversions',
      name: 'ConversionData',
      component: () => import('@/views/ConversionData.vue')
    },
    {
      path: '/allocation',
      name: 'BudgetAllocation',
      component: () => import('@/views/BudgetAllocation.vue')
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('@/views/Reports.vue')
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('@/views/Alerts.vue')
    }
  ]
})

export default router
