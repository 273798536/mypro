import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, message, App as AntdApp } from 'antd';
import {
  DatabaseOutlined,
  UploadOutlined,
  AuditOutlined,
  BarChartOutlined,
  HistoryOutlined,
  ExportOutlined,
  HomeOutlined
} from '@ant-design/icons';
import BatchList from './pages/BatchList';
import ImportPage from './pages/ImportPage';
import ReviewPage from './pages/ReviewPage';
import ErrorAnalysisPage from './pages/ErrorAnalysisPage';
import HistoryPage from './pages/HistoryPage';
import ExportPage from './pages/ExportPage';
import BatchDashboard from './pages/BatchDashboard';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">批次总览</Link> }
];

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { message: msgApi } = AntdApp.useApp();
  const [selectedKey, setSelectedKey] = useState<string>('/');
  const [collapsed, setCollapsed] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/batches/') && path.includes('/import')) {
      setSelectedKey('/import');
    } else if (path.startsWith('/batches/') && path.includes('/review')) {
      setSelectedKey('/review');
    } else if (path.startsWith('/batches/') && path.includes('/error-analysis')) {
      setSelectedKey('/error');
    } else if (path.startsWith('/batches/') && path.includes('/history')) {
      setSelectedKey('/history');
    } else if (path.startsWith('/batches/') && path.includes('/export')) {
      setSelectedKey('/export');
    } else if (path.startsWith('/batches/')) {
      setSelectedKey('/batches');
    } else {
      setSelectedKey('/');
    }

    const m = path.match(/\/batches\/(\d+)/);
    if (m) setCurrentBatchId(parseInt(m[1], 10));
    else setCurrentBatchId(null);
  }, [location.pathname]);

  const sideMenu = [
    ...(currentBatchId
      ? [
          {
            key: `/batches/${currentBatchId}`,
            icon: <DatabaseOutlined />,
            label: <Link to={`/batches/${currentBatchId}`}>批次详情</Link>
          },
          {
            key: `/batches/${currentBatchId}/import`,
            icon: <UploadOutlined />,
            label: <Link to={`/batches/${currentBatchId}/import`}>数据导入</Link>
          },
          {
            key: `/batches/${currentBatchId}/review`,
            icon: <AuditOutlined />,
            label: <Link to={`/batches/${currentBatchId}/review`}>排课老师复核</Link>
          },
          {
            key: `/batches/${currentBatchId}/error-analysis`,
            icon: <BarChartOutlined />,
            label: <Link to={`/batches/${currentBatchId}/error-analysis`}>误差分析</Link>
          },
          {
            key: `/batches/${currentBatchId}/history`,
            icon: <HistoryOutlined />,
            label: <Link to={`/batches/${currentBatchId}/history`}>历史对比</Link>
          },
          {
            key: `/batches/${currentBatchId}/export`,
            icon: <ExportOutlined />,
            label: <Link to={`/batches/${currentBatchId}/export`}>报告导出</Link>
          }
        ]
      : [])
  ];

  const breadcrumb = (() => {
    const items: { title: React.ReactNode }[] = [{ title: <Link to="/">KKT 条件练习台</Link> }];
    const path = location.pathname;
    if (path === '/') {
      items.push({ title: <span>批次总览</span> });
    } else if (path.startsWith('/batches/')) {
      const m = path.match(/\/batches\/(\d+)(.*)/);
      if (m) {
        items.push({ title: <Link to={`/batches/${m[1]}`}>批次 #{m[1]}</Link> });
        const sub = m[2];
        if (sub === '/import') items.push({ title: <span>数据导入</span> });
        else if (sub === '/review') items.push({ title: <span>排课老师复核</span> });
        else if (sub === '/error-analysis') items.push({ title: <span>误差分析</span> });
        else if (sub === '/history') items.push({ title: <span>历史对比</span> });
        else if (sub === '/export') items.push({ title: <span>报告导出</span> });
        else items.push({ title: <span>批次详情</span> });
      }
    }
    return items;
  })();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(v) => setCollapsed(v)}
        theme="dark"
        width={220}
      >
        <div
          style={{
            color: '#fff',
            textAlign: 'center',
            padding: '16px 12px',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 600,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            letterSpacing: 1
          }}
        >
          {collapsed ? 'KKT' : 'KKT 条件练习台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: '/',
              icon: <HomeOutlined />,
              label: <Link to="/">批次总览</Link>
            },
            ...sideMenu
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Breadcrumb style={{ lineHeight: '64px' }} items={breadcrumb} />
        </Header>
        <Content style={{ padding: 0 }}>
          <Routes>
            <Route path="/" element={<BatchList />} />
            <Route path="/batches/:batchId" element={<BatchDashboard />} />
            <Route path="/batches/:batchId/import" element={<ImportPage />} />
            <Route path="/batches/:batchId/review" element={<ReviewPage />} />
            <Route path="/batches/:batchId/error-analysis" element={<ErrorAnalysisPage />} />
            <Route path="/batches/:batchId/history" element={<HistoryPage />} />
            <Route path="/batches/:batchId/export" element={<ExportPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
