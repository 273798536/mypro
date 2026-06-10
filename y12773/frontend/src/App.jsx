import React, { useState, useEffect } from 'react';
import { Layout, Menu, Badge, Button, Alert } from 'antd';
import {
  DashboardOutlined,
  SafetyOutlined,
  ExperimentOutlined,
  UploadOutlined,
  FileTextOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import BatchList from './pages/BatchList.jsx';
import TestList from './pages/TestList.jsx';
import ImportPage from './pages/ImportPage.jsx';
import { getDashboard } from './api.js';

const { Header, Sider, Content } = Layout;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [abnormalCount, setAbnormalCount] = useState(0);

  useEffect(() => {
    getDashboard().then(data => {
      setAbnormalCount(data.abnormal?.length || 0);
    }).catch(() => {});
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '安全提示',
    },
    {
      key: '/batches',
      icon: <ExperimentOutlined />,
      label: '试剂批次',
    },
    {
      key: '/tests',
      icon: (
        <Badge count={abnormalCount} size="small" offset={[6, 2]}>
          <SafetyOutlined />
        </Badge>
      ),
      label: '农药残留追踪',
    },
    {
      key: '/import',
      icon: <UploadOutlined />,
      label: '台账导入',
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}
             theme="dark" width={220}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: collapsed ? 14 : 18, fontWeight: 600,
                      borderBottom: '1px solid #1f1f1f' }}>
          {collapsed ? '农残' : '农药残留追踪'}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]}
              items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0',
                         display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>农药残留批次追踪系统</div>
          <div style={{ color: '#666', fontSize: 13 }}>
            <HistoryOutlined /> 所有操作均留痕可追溯
          </div>
        </Header>
        <Content style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Dashboard abnormalCount={abnormalCount} />} />
              <Route path="/batches" element={<BatchList />} />
              <Route path="/tests" element={<TestList />} />
              <Route path="/import" element={<ImportPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
