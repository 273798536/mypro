import React, { useState } from 'react'
import { Layout, Menu, theme } from 'antd'
import {
  FileTextOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  SettingOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import ContractsList from './pages/ContractsList'
import ContractDetail from './pages/ContractDetail'
import DeferralList from './pages/DeferralList'
import ReportsPage from './pages/ReportsPage'
import RulesPage from './pages/RulesPage'
import HistoryPage from './pages/HistoryPage'

const { Header, Content, Sider } = Layout

function App() {
  const [selectedKey, setSelectedKey] = useState('contracts')
  const [selectedContract, setSelectedContract] = useState(null)
  const {
    token: { colorBgContainer }
  } = theme.useToken()

  const menuItems = [
    { key: 'contracts', icon: <FileTextOutlined />, label: '会员合同' },
    { key: 'deferral', icon: <CalculatorOutlined />, label: '递延计算' },
    { key: 'reports', icon: <BarChartOutlined />, label: '报表导出' },
    { key: 'rules', icon: <SettingOutlined />, label: '规则版本' },
    { key: 'history', icon: <HistoryOutlined />, label: '修正历史' }
  ]

  const renderContent = () => {
    if (selectedKey === 'contracts' && selectedContract) {
      return (
        <ContractDetail 
          contractId={selectedContract} 
          onBack={() => setSelectedContract(null)} 
        />
      )
    }

    switch (selectedKey) {
      case 'contracts':
        return <ContractsList onSelectContract={setSelectedContract} />
      case 'deferral':
        return <DeferralList />
      case 'reports':
        return <ReportsPage />
      case 'rules':
        return <RulesPage />
      case 'history':
        return <HistoryPage />
      default:
        return <ContractsList onSelectContract={setSelectedContract} />
    }
  }

  return (
    <Layout>
      <Sider width={200}>
        <div className="logo">会员递延工作台</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            setSelectedKey(key)
            setSelectedContract(null)
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          borderBottom: '1px solid #f0f0f0'
        }}>
          {menuItems.find(m => m.key === selectedKey)?.label}
        </Header>
        <Content style={{ margin: '24px', minHeight: 280 }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
