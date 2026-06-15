import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  TeamOutlined,
  HistoryOutlined,
  FileProtectOutlined,
  DashboardOutlined
} from '@ant-design/icons';

import DashboardPage from './pages/DashboardPage.jsx';
import RecordListPage from './pages/RecordListPage.jsx';
import RecordDetailPage from './pages/RecordDetailPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import VersionsPage from './pages/VersionsPage.jsx';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">运营看板</Link> },
  { key: '/records', icon: <TeamOutlined />, label: <Link to="/records">分账清单</Link> },
  { key: '/versions', icon: <FileProtectOutlined />, label: <Link to="/versions">版本管理</Link> },
  { key: '/history', icon: <HistoryOutlined />, label: <Link to="/history">操作历史</Link> }
];

function App() {
  const location = useLocation();
  const selectedKey =
    location.pathname.startsWith('/records')
      ? '/records'
      : location.pathname.startsWith('/history')
      ? '/history'
      : location.pathname.startsWith('/versions')
      ? '/versions'
      : '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            marginRight: 48
          }}
        >
          🎵 合唱声部分账对齐
        </div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
          版本可追溯 · 授权不混放 · 脏数据留痕
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: 0 }}>
          <Content>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/records" element={<RecordListPage />} />
              <Route path="/records/:id" element={<RecordDetailPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/versions" element={<VersionsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
