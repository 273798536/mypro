import { createRouter, createWebHashHistory } from 'vue-router'
import ErrorAnalysis from '../views/ErrorAnalysis.vue'
import ConstraintCheck from '../views/ConstraintCheck.vue'

const routes = [
  { path: '/', redirect: '/error-analysis' },
  { path: '/error-analysis', name: 'ErrorAnalysis', component: ErrorAnalysis, meta: { title: '误差分析（日常）' } },
  { path: '/constraint-check', name: 'ConstraintCheck', component: ConstraintCheck, meta: { title: '约束校验（月底/课前）' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
