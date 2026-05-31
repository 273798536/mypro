import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '@/components/Dashboard.vue'
import DataImport from '@/components/DataImport.vue'
import CardMerge from '@/components/CardMerge.vue'
import FundCollection from '@/components/FundCollection.vue'
import DifferenceExplanation from '@/components/DifferenceExplanation.vue'
import SupervisionReport from '@/components/SupervisionReport.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, meta: { title: '数据概览' } },
  { path: '/import', component: DataImport, meta: { title: '数据导入' } },
  { path: '/merge', component: CardMerge, meta: { title: '卡号合并' } },
  { path: '/collection', component: FundCollection, meta: { title: '资金归集' } },
  { path: '/difference', component: DifferenceExplanation, meta: { title: '差额解释' } },
  { path: '/report', component: SupervisionReport, meta: { title: '监管报告' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 预付卡存管对账系统` : '预付卡存管对账系统'
  next()
})

export default router
