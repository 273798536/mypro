import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  UnorderedListOutlined,
  BookOutlined
} from '@ant-design/icons';
import { Outlet, Link, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/reviews',
      icon: <UnorderedListOutlined />,
      label: <Link to="/reviews">预审列表</Link>
    },
    {
      key: '/guide',
      icon: <BookOutlined />,
      label: <Link to="/guide">接班指南</Link>
    }
  ];

  const getSelectedKeys = () => {
    if (location.pathname.startsWith('/reviews/')) {
      return ['/reviews'];
    }
    return [location.pathname];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{
          height: 64,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 12 : 16,
          fontWeight: 'bold'
        }}>
          {collapsed ? '预审' : '冷通道预审'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)'
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            数据中心冷通道碰撞预审系统
          </h1>
        </Header>
        <Content style={{ margin: '24px' }}>
          <div style={{
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 'calc(100vh - 184px)'
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
