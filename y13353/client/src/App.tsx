import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Space } from 'antd';
import {
  BarChartOutlined,
  FolderOpenOutlined,
  DiffOutlined,
  UserSwitchOutlined,
  AlertOutlined
} from '@ant-design/icons';
import DashboardPage from './pages/DashboardPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ComparisonPage from './pages/ComparisonPage';
import HandoverPage from './pages/HandoverPage';
import DelaysPage from './pages/DelaysPage';
import { useMemo } from 'react';

const { Header, Content } = Layout;

function App() {
  const location = useLocation();
  
  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/tasks/')) return 'tasks';
    if (location.pathname.startsWith('/comparison')) return 'comparison';
    if (location.pathname.startsWith('/handover')) return 'handover';
    if (location.pathname.startsWith('/delays')) return 'delays';
    return 'dashboard';
  }, [location.pathname]);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="app-logo">📊 向量索引成本看板</span>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            style={{ background: 'transparent', borderBottom: 'none', minWidth: 500 }}
            items={[
              { key: 'dashboard', icon: <BarChartOutlined />, label: <Link to="/">看板总览</Link> },
              { key: 'tasks', icon: <FolderOpenOutlined />, label: <Link to="/">评测任务</Link> },
              { key: 'comparison', icon: <DiffOutlined />, label: <Link to="/comparison">历史对比</Link> },
              { key: 'delays', icon: <AlertOutlined />, label: <Link to="/delays">特征迟到</Link> },
              { key: 'handover', icon: <UserSwitchOutlined />, label: <Link to="/handover">接班视图</Link> }
            ]}
          />
        </div>
        <Space>
          <Button type="primary" onClick={() => localStorage.setItem('currentUser', '小许')}>
            当前用户: 小许
          </Button>
        </Space>
      </Header>
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/handover" element={<HandoverPage />} />
          <Route path="/delays" element={<DelaysPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;
