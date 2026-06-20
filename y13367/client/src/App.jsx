import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Badge } from 'antd';
import {
  PlayCircleOutlined,
  UnorderedListOutlined,
  AlertOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import RunsPage from './pages/RunsPage.jsx';
import RunDetailPage from './pages/RunDetailPage.jsx';
import SamplesPage from './pages/SamplesPage.jsx';
import SampleDetailPage from './pages/SampleDetailPage.jsx';
import AnomalyQueuePage from './pages/AnomalyQueuePage.jsx';
import ImpactAnalysisPage from './pages/ImpactAnalysisPage.jsx';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const location = useLocation();

  const menuItems = [
    {
      key: '/runs',
      icon: <PlayCircleOutlined />,
      label: <Link to="/runs">回放任务</Link>
    },
    {
      key: '/samples',
      icon: <UnorderedListOutlined />,
      label: <Link to="/samples">样本明细</Link>
    },
    {
      key: '/anomaly-queue',
      icon: (
        <Badge dot>
          <AlertOutlined />
        </Badge>
      ),
      label: <Link to="/anomaly-queue">异常队列</Link>
    },
    {
      key: '/impact',
      icon: <LineChartOutlined />,
      label: <Link to="/impact">影响分析</Link>
    }
  ];

  const selectedKey = location.pathname.startsWith('/run')
    ? '/runs'
    : location.pathname.startsWith('/sample')
    ? '/samples'
    : '/' + location.pathname.split('/')[1];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Title level={4} style={{ color: '#fff', margin: 0, marginRight: 48 }}>
          召回漏斗异常回放
        </Title>
      </Header>
      <Layout>
        <Sider width={200} theme="dark">
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout>
          <Content className="page-container">
            <Routes>
              <Route path="/" element={<RunsPage />} />
              <Route path="/runs" element={<RunsPage />} />
              <Route path="/runs/:runId" element={<RunDetailPage />} />
              <Route path="/samples" element={<SamplesPage />} />
              <Route path="/samples/:sampleId" element={<SampleDetailPage />} />
              <Route path="/anomaly-queue" element={<AnomalyQueuePage />} />
              <Route path="/impact" element={<ImpactAnalysisPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
