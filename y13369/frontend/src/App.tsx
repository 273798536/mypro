import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  WarningOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import RunList from './pages/RunList';
import RunDetail from './pages/RunDetail';
import RecordDetail from './pages/RecordDetail';
import CompareRuns from './pages/CompareRuns';
import AnomaliesPage from './pages/AnomaliesPage';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '复核工作台' },
    { key: '/runs', icon: <UnorderedListOutlined />, label: '评测批次（材料区）' },
    { key: '/compare', icon: <BarChartOutlined />, label: '版本对比' },
    { key: '/anomalies', icon: <WarningOutlined />, label: '异常追踪' },
  ];

  const selectedKey = location.pathname.startsWith('/runs/')
    ? '/runs'
    : location.pathname.startsWith('/compare')
    ? '/compare'
    : location.pathname.startsWith('/anomalies')
    ? '/anomalies'
    : '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={240} style={{ borderRight: '1px solid #e8e8e8' }}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 16,
            color: '#1677ff',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <UploadOutlined style={{ marginRight: 8 }} />
          召回漏斗守门
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>MLOps 评测质量管理 · 复核人工作台</div>
          <div style={{ marginLeft: 'auto', color: '#999', fontSize: 13 }}>
            材料存放 / 异常查看 / 重新导出 — 一站式复核
          </div>
        </Header>
        <Content
          style={{
            margin: 0,
            background: '#f5f7fa',
          }}
        >
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/runs" element={<RunList />} />
              <Route path="/runs/:id" element={<RunDetail />} />
              <Route path="/records/:id" element={<RecordDetail />} />
              <Route path="/compare" element={<CompareRuns />} />
              <Route path="/anomalies" element={<AnomaliesPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
