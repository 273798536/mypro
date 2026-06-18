import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  EditOutlined,
  HistoryOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Samples from './pages/Samples'
import Versions from './pages/Versions'
import Corrections from './pages/Corrections'
import History from './pages/History'
import Conclusions from './pages/Conclusions'
import './App.css'

const { Header, Sider, Content } = Layout

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '概览' },
    { key: '/samples', icon: <AppstoreOutlined />, label: '样本管理' },
    { key: '/versions', icon: <BarChartOutlined />, label: '版本对比' },
    { key: '/corrections', icon: <EditOutlined />, label: '人工修正' },
    { key: '/history', icon: <HistoryOutlined />, label: '复核历史' },
    { key: '/conclusions', icon: <FileTextOutlined />, label: '复核结论' },
  ]

  const getSelectedKey = () => {
    if (location.pathname === '/') return '/'
    const path = '/' + location.pathname.split('/')[1]
    return menuItems.find((item) => item.key === path) ? path : '/'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div className="logo">
          <span className="logo-text">知识库召回证据复核</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>知识库召回证据复核系统</h2>
        </Header>
        <Content style={{ margin: '16px', padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/samples" element={<Samples />} />
            <Route path="/versions" element={<Versions />} />
            <Route path="/corrections" element={<Corrections />} />
            <Route path="/history" element={<History />} />
            <Route path="/conclusions" element={<Conclusions />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
