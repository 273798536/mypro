import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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
    path: '/import',
    name: 'Import',
    component: () => import('@/views/Import.vue')
  },
  {
    path: '/processing',
    name: 'Processing',
    component: () => import('@/views/Processing.vue')
  },
  {
    path: '/anomalies',
    name: 'Anomalies',
    component: () => import('@/views/Anomalies.vue')
  },
  {
    path: '/anomalies/:id',
    name: 'AnomalyDetail',
    component: () => import('@/views/AnomalyDetail.vue')
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/views/Map.vue')
  },
  {
    path: '/calculator',
    name: 'Calculator',
    component: () => import('@/views/Calculator.vue')
  },
  {
    path: '/gaps',
    name: 'Gaps',
    component: () => import('@/views/Gaps.vue')
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('@/views/Review.vue')
  },
  {
    path: '/trace',
    name: 'Trace',
    component: () => import('@/views/Trace.vue')
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('@/views/Help.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
