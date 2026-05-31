import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '首页仪表盘', icon: 'DataAnalysis' }
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: () => import('../views/Contracts.vue'),
    meta: { title: '影片合同', icon: 'Document' }
  },
  {
    path: '/boxoffice',
    name: 'BoxOffice',
    component: () => import('../views/BoxOffice.vue'),
    meta: { title: '票房流水', icon: 'TrendCharts' }
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: () => import('../views/Expenses.vue'),
    meta: { title: '宣发费用', icon: 'Money' }
  },
  {
    path: '/settlements',
    name: 'Settlements',
    component: () => import('../views/Settlements.vue'),
    meta: { title: '回款分账', icon: 'Calculator' }
  },
  {
    path: '/raw-materials',
    name: 'RawMaterials',
    component: () => import('../views/RawMaterials.vue'),
    meta: { title: '原始材料', icon: 'FolderOpened' }
  },
  {
    path: '/logs',
    name: 'OperationLogs',
    component: () => import('../views/OperationLogs.vue'),
    meta: { title: '操作日志', icon: 'List' }
  },
  {
    path: '/exception-trace',
    name: 'ExceptionTrace',
    component: () => import('../views/ExceptionTrace.vue'),
    meta: { title: '异常追踪', icon: 'Warning' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '电影保底发行回款'} - 影视发行财务系统`
  next()
})

export default router
