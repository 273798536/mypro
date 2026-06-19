import React, { useState, useEffect } from 'react'
import { Layout, Menu, Tabs, Button, Space, Tag, Tooltip, Badge } from 'antd'
import {
  DashboardOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CloudDownloadOutlined,
  HistoryOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard.jsx'
import BatchList from './pages/BatchList.jsx'
import BatchDetail from './pages/BatchDetail.jsx'
import SlowQueryEntry from './pages/SlowQueryEntry.jsx'
import BackupCheckEntry from './pages/BackupCheckEntry.jsx'
import ImportModal from './components/ImportModal.jsx'
import { getDashboardStats, healthCheck } from './api.js'

const { Header, Content, Sider } = Layout

const ENTRY_POINT_LABELS = {
  slow_query: { label: '慢查询归因', color: 'orange', icon: <ThunderboltOutlined /> },
  backup_check: { label: '备份校验', color: 'blue', icon: <SafetyCertificateOutlined /> },
  manual: { label: '手工导入', color: 'default', icon: <DatabaseOutlined /> },
}

export { ENTRY_POINT_LABELS }

export default function App() {
  const [selectedKey, setSelectedKey] = useState('dashboard')
  const [activeBatchId, setActiveBatchId] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [backendOk, setBackendOk] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    healthCheck().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
    refreshStats()
  }, [])

  const refreshStats = () => {
    getDashboardStats().then(setStats).catch(() => {})
  }

  const renderContent = () => {
    if (selectedKey === 'batch-detail' && activeBatchId) {
      return (
        <BatchDetail
          batchId={activeBatchId}
          onBack={() => { setActiveBatchId(null); setSelectedKey('all-batches') }}
          onImportSuccess={() => { refreshStats() }}
        />
      )
    }
    switch (selectedKey) {
      case 'dashboard':
        return <Dashboard
          onOpenBatch={(id) => { setActiveBatchId(id); setSelectedKey('batch-detail') }}
          onRefresh={refreshStats}
        />
      case 'all-batches':
        return <BatchList
          onOpen={(id) => { setActiveBatchId(id); setSelectedKey('batch-detail') }}
          onRefresh={refreshStats}
        />
      case 'slow-query':
        return <SlowQueryEntry
          onOpenBatch={(id) => { setActiveBatchId(id); setSelectedKey('batch-detail') }}
          onImportSuccess={() => { refreshStats() }}
        />
      case 'backup-check':
        return <BackupCheckEntry
          onOpenBatch={(id) => { setActiveBatchId(id); setSelectedKey('batch-detail') }}
          onImportSuccess={() => { refreshStats() }}
        />
      default:
        return null
    }
  }

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '总览看板',
    },
    {
      key: 'all-batches',
      icon: <FileSearchOutlined />,
      label: stats ? (
        <Badge size="small" count={stats.unreviewed_batches} offset={[6, 2]} title="待复核批次数">
          <span>全部批次</span>
        </Badge>
      ) : '全部批次',
    },
    {
      key: 'slow-query',
      icon: <ThunderboltOutlined />,
      label: '慢查询归因（日常入口）',
    },
    {
      key: 'backup-check',
      icon: <SafetyCertificateOutlined />,
      label: '备份校验（月底/课前）',
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Space>
          <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <h2 style={{ color: 'white', margin: 0, fontSize: 18 }}>租户账套分区复核中心</h2>
          <Tooltip title={backendOk ? '后端服务正常' : '后端服务异常'}>
            <Tag color={backendOk ? 'green' : 'red'} style={{ marginLeft: 16 }}>
              {backendOk ? '● 后端在线' : '● 后端离线'}
            </Tag>
          </Tooltip>
        </Space>
        <Space>
          <Tag color="purple">
            <HistoryOutlined /> 历史版本 & 修正原因可追溯
          </Tag>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setImportOpen(true)}>
            导入表结构快照
          </Button>
          <Button
            icon={<CloudDownloadOutlined />}
            onClick={() => {
              const key = selectedKey === 'all-batches' || selectedKey === 'dashboard' ? undefined : undefined
            }}
            disabled
            style={{ display: 'none' }}
          />
        </Space>
      </Header>
      <Layout>
        <Sider width={240} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={(e) => { setSelectedKey(e.key); setActiveBatchId(null) }}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '16px 24px', background: '#f5f5f5' }}>
          <Content style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: 'calc(100vh - 120px)' }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={(batchId, action) => {
          setImportOpen(false)
          refreshStats()
          if (action === 'created') {
            setActiveBatchId(batchId)
            setSelectedKey('batch-detail')
          } else if (action === 'skipped') {
            setActiveBatchId(batchId)
            setSelectedKey('batch-detail')
          }
        }}
      />
    </Layout>
  )
}
