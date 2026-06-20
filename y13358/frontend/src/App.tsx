import { Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Space, Tag, Tooltip } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  HistoryOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import RunDetail from './pages/RunDetail';
import RunCompare from './pages/RunCompare';
import SnapshotDetail from './pages/SnapshotDetail';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/compare')) return 'compare';
    if (location.pathname.startsWith('/run')) return 'runs';
    return 'dashboard';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} style={{ background: '#001529' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Space align="center">
            <ThunderboltOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4} style={{ color: '#fff', margin: 0 }}>特征血缘成本看板</Title>
          </Space>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          style={{ borderRight: 0, marginTop: 8 }}
          onClick={({ key }) => {
            if (key === 'dashboard') navigate('/');
            if (key === 'runs') navigate('/');
            if (key === 'compare') navigate('/compare');
          }}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            运行看板
          </Menu.Item>
          <Menu.Item key="compare" icon={<BarChartOutlined />}>
            运行对比
          </Menu.Item>
        </Menu>
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
          评测工程师工作台
          <br />
          记录每一次判断的来龙去脉
        </div>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Space size="large">
            <Space>
              <HistoryOutlined style={{ color: '#1890ff' }} />
              <span style={{ color: '#666' }}>特征快照 + 离线/线上口径追踪</span>
            </Space>
          </Space>
          <Space size="middle">
            <Tag color="blue">评测-小唐</Tag>
            <Tooltip title="交接班请检查：临时判断已写入历史">
              <Tag color="green">判断历史留存中</Tag>
            </Tooltip>
          </Space>
        </Header>
        <Content style={{ margin: 0, background: '#f5f7fa', padding: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/run/:runId" element={<RunDetail />} />
            <Route path="/compare" element={<RunCompare />} />
            <Route path="/snapshot/:snapshotId" element={<SnapshotDetail />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
