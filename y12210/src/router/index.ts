import { createRouter, createWebHistory } from 'vue-router';
import Layout from '@/components/layout/Layout.vue';

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/Dashboard.vue'),
        meta: { title: '数据看板' },
      },
      {
        path: 'datasource/channel',
        name: 'datasource-channel',
        component: () => import('@/pages/datasource/ChannelBills.vue'),
        meta: { title: '渠道账单' },
      },
      {
        path: 'datasource/orders',
        name: 'datasource-orders',
        component: () => import('@/pages/datasource/GameOrders.vue'),
        meta: { title: '游戏订单' },
      },
      {
        path: 'datasource/refunds',
        name: 'datasource-refunds',
        component: () => import('@/pages/datasource/RefundRecords.vue'),
        meta: { title: '退款记录' },
      },
      {
        path: 'collection',
        name: 'collection',
        component: () => import('@/pages/Collection.vue'),
        meta: { title: '订单归集' },
      },
      {
        path: 'revenue',
        name: 'revenue',
        component: () => import('@/pages/Revenue.vue'),
        meta: { title: '分成计算' },
      },
      {
        path: 'anomaly',
        name: 'anomaly',
        component: () => import('@/pages/Anomaly.vue'),
        meta: { title: '异常检测' },
      },
      {
        path: 'audit/trace',
        name: 'audit-trace',
        component: () => import('@/pages/audit/Trace.vue'),
        meta: { title: '链路追溯' },
      },
      {
        path: 'audit/logs',
        name: 'audit-logs',
        component: () => import('@/pages/audit/AuditLogs.vue'),
        meta: { title: '操作日志' },
      },
      {
        path: 'export',
        name: 'export',
        component: () => import('@/pages/Export.vue'),
        meta: { title: '报表导出' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '游戏渠道分成对账系统'}`;
  next();
});

export default router;
