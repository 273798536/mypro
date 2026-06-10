import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  DashboardOutlined, UnorderedListOutlined, AppstoreOutlined,
  CloudUploadOutlined, FileSearchOutlined, EnvironmentOutlined
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard.jsx'
import Records from './pages/Records.jsx'
import RecordDetail from './pages/RecordDetail.jsx'
import Batches from './pages/Batches.jsx'
import BatchTrace from './pages/BatchTrace.jsx'
import Locations from './pages/Locations.jsx'
import ImportTest from './pages/ImportTest.jsx'
import Reports from './pages/Reports.jsx'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">看板总览</Link> },
  { key: '/records', icon: <UnorderedListOutlined />, label: <Link to="/records">诱捕记录</Link> },
  { key: '/batches', icon: <AppstoreOutlined />, label: <Link to="/batches">批次管理</Link> },
  { key: '/locations', icon: <EnvironmentOutlined />, label: <Link to="/locations">采样地点</Link> },
  { key: '/import', icon: <CloudUploadOutlined />, label: <Link to="/import">导入测试</Link> },
  { key: '/reports', icon: <FileSearchOutlined />, label: <Link to="/reports">报告导出</Link> },
]

export default function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const selectedKey = location.pathname.startsWith('/records/')
    ? '/records'
    : location.pathname.startsWith('/batches/')
    ? '/batches'
    : location.pathname

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ height: 48, margin: 12, color: '#fff', fontSize: collapsed ? 14 : 18, fontWeight: 600, textAlign: 'center', lineHeight: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}>
          {collapsed ? '🦟' : '🦟 昆虫诱捕看板'}
        </div>
        <Menu theme="dark" selectedKeys={[selectedKey]} mode="inline" items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>动物房昆虫诱捕记录看板</div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>
            日常入口：人工修正 ← 诱捕记录 &nbsp;|&nbsp; 月底/课前：报告导出
          </div>
        </Header>
        <Content style={{ margin: 0, overflow: 'auto' }}>
          <div style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/records" element={<Records />} />
              <Route path="/records/:id" element={<RecordDetail />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/batches/:id/trace" element={<BatchTrace />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/import" element={<ImportTest />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
