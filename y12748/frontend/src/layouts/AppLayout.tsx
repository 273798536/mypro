import { Layout, Menu, Switch, Space, Typography } from 'antd'
import {
  DashboardOutlined, DatabaseOutlined, AuditOutlined,
  CalculatorOutlined, FileTextOutlined, HistoryOutlined,
  UserOutlined, TeamOutlined
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/app'
import { useEffect, useState } from 'react'
import { systemApi } from '../services/api'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const assistantMenuItems = [
  { key: '/assistant/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/assistant/batches', icon: <DatabaseOutlined />, label: '数据导入' },
  { key: '/assistant/review', icon: <AuditOutlined />, label: '复核管理' },
  { key: '/assistant/formula', icon: <CalculatorOutlined />, label: '公式计算' },
  { key: '/assistant/reports', icon: <FileTextOutlined />, label: '报告生成' },
  { key: '/assistant/traces', icon: <HistoryOutlined />, label: '处理痕迹' }
]

const studentMenuItems = [
  { key: '/student/dashboard', icon: <DashboardOutlined />, label: '学习首页' }
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { role, setRole } = useAppStore()
  const [isSampleInited, setIsSampleInited] = useState(false)

  useEffect(() => {
    if (location.pathname.startsWith('/student')) {
      setRole('student')
    } else {
      setRole('assistant')
    }
  }, [location.pathname, setRole])

  useEffect(() => {
    systemApi.firstRunCheck().then(res => {
      if (!res.is_first_run) {
        setIsSampleInited(true)
      }
    }).catch(() => {})
  }, [])

  const menuItems = role === 'assistant' ? assistantMenuItems : studentMenuItems

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#001529' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            可靠性寿命曲线
          </Title>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 }}>
            Reliability Curve System
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: 'white', padding: '0 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#1f1f1f' }}>
              {role === 'assistant' ? '投研助理工作台' : '学生学习端'}
            </span>
          </div>
          <Space>
            <Space size={8}>
              {role === 'assistant' ? <UserOutlined /> : <TeamOutlined />}
              <span>{role === 'assistant' ? '投研助理' : '学生'}</span>
            </Space>
            <Switch
              checkedChildren="助理端"
              unCheckedChildren="学生端"
              checked={role === 'assistant'}
              onChange={(checked) => navigate(checked ? '/assistant/dashboard' : '/student/dashboard')}
            />
          </Space>
        </Header>
        <Content style={{ overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
