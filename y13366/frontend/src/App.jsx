import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Badge } from 'antd'
import {
  DatabaseOutlined,
  HistoryOutlined,
  FileSearchOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import SnapshotList from './pages/SnapshotList.jsx'
import SnapshotDetail from './pages/SnapshotDetail.jsx'
import SealMonth from './pages/SealMonth.jsx'
import './App.css'

const { Header, Content, Sider } = Layout
const { Title } = Typography

function App() {
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <DatabaseOutlined />,
      label: <Link to="/">快照列表</Link>,
    },
    {
      key: '/seal-month',
      icon: <SafetyCertificateOutlined />,
      label: <Link to="/seal-month">月底封账</Link>,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <div className="header-logo">
          <LineChartOutlined style={{ fontSize: 28, color: '#fff', marginRight: 12 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            召回漏斗版本快照系统
          </Title>
        </div>
        <div className="header-tips">
          <Badge status="success" text="训练日志可追溯" />
          <Badge status="success" text="人工判断受保护" />
          <Badge status="success" text="变更历史全覆盖" />
        </div>
      </Header>
      <Layout>
        <Sider width={240} theme="light" className="app-sider">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
          <div className="sider-footer">
            <div className="feature-item">
              <HistoryOutlined /> 训练日志分批留存
            </div>
            <div className="feature-item">
              <ThunderboltOutlined /> 特征迟到提示
            </div>
            <div className="feature-item">
              <FileSearchOutlined /> 改判原因解释
            </div>
          </div>
        </Sider>
        <Layout>
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<SnapshotList />} />
              <Route path="/snapshots/:id" element={<SnapshotDetail />} />
              <Route path="/seal-month" element={<SealMonth />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App
