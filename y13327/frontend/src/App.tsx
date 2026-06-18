import { Layout, Menu, theme, Badge, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ClusterOutlined, FileSearchOutlined, LineChartOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MENU_ITEMS = [
  { key: '/', icon: <ClusterOutlined />, label: '舆情聚类人工改判' },
  { key: '/gray-results', icon: <LineChartOutlined />, label: '灰度结果报告' }
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken();

  const selectedKey = location.pathname.startsWith('/tickets')
    ? '/'
    : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#001529',
          padding: '0 24px',
          gap: 16
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: '#1677ff', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 700
        }}>
          舆
        </div>
        <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 500 }}>
          舆情聚类人工改判系统
        </Title>
        <div style={{ marginLeft: 'auto', color: '#bfbfbf', fontSize: 13 }}>
          <Badge status="success" text="服务正常" />
          <span style={{ marginLeft: 16 }}>当前用户：评测-小孟</span>
        </div>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: colorBgContainer }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ height: '100%', borderRight: 0, paddingTop: 12 }}
            onClick={({ key }) => navigate(key as string)}
            items={MENU_ITEMS}
          />
        </Sider>
        <Layout style={{ padding: 0 }}>
          <Content
            style={{
              margin: 0,
              background: '#f5f7fa',
              borderRadius: borderRadiusLG,
              minHeight: 'calc(100vh - 64px)'
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
