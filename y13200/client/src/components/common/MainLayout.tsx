import { Layout, Menu, Typography, Spin } from 'antd';
import {
  DashboardOutlined,
  MusicOutlined,
  UploadOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const location = useLocation();
  const loading = useAppStore((state) => state.loading);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">仪表盘</Link>,
    },
    {
      key: '/tracks',
      icon: <MusicOutlined />,
      label: <Link to="/tracks">曲目管理</Link>,
    },
    {
      key: '/upload',
      icon: <UploadOutlined />,
      label: <Link to="/upload">文件上传</Link>,
    },
    {
      key: '/export',
      icon: <ExportOutlined />,
      label: <Link to="/export">数据导出</Link>,
    },
  ];

  return (
    <Layout className="app-container" style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #303030',
          background: '#1f1f1f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MusicOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)' }}>
            演出曲目管理系统
          </Title>
        </div>
      </Header>
      <Layout className="app-main">
        <Sider
          width={240}
          style={{
            borderRight: '1px solid #303030',
            background: '#1f1f1f',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{
              height: '100%',
              borderRight: 0,
              paddingTop: '16px',
            }}
            theme="dark"
          />
        </Sider>
        <Content
          className="app-content"
          style={{
            padding: '24px',
            background: '#141414',
            overflow: 'auto',
          }}
        >
          {loading && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <Spin size="large" tip="加载中..." />
            </div>
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
