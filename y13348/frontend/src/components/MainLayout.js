import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Tooltip, Alert } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { guideAPI } from '../services/api';

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [guides, setGuides] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      const response = await guideAPI.list();
      setGuides(response.data);
    } catch (error) {
      console.error('加载操作指引失败', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/sessions',
      icon: <DashboardOutlined />,
      label: '审查会话',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: '灰度报告',
    },
    {
      key: '/guides',
      icon: <BookOutlined />,
      label: '操作指引',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.full_name,
      disabled: true,
    },
    {
      key: 'role',
      label: `角色：${user?.role === 'admin' ? '管理员' : user?.role === 'reviewer' ? '评测同事' : '排班同事'}`,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const positionGuides = {
    sidebar_top: guides.filter(g => g.position_hint === 'sidebar_top'),
    main_top: guides.filter(g => g.position_hint === 'main_top'),
    sidebar_bottom: guides.filter(g => g.position_hint === 'sidebar_bottom'),
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={240}
        style={{ background: '#fff' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#001529',
          color: '#fff',
          fontSize: collapsed ? 12 : 16,
          fontWeight: 'bold'
        }}>
          {collapsed ? '审查' : '代码审查回放'}
        </div>
        
        {!collapsed && positionGuides.sidebar_top.length > 0 && (
          <div style={{ padding: 12 }}>
            {positionGuides.sidebar_top.map(guide => (
              <Alert
                key={guide.id}
                message={guide.title}
                description={guide.content}
                type="info"
                showIcon
                style={{ marginBottom: 8, fontSize: 12 }}
              />
            ))}
          </div>
        )}

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
          onClick={({ key }) => navigate(key)}
        />

        {!collapsed && positionGuides.sidebar_bottom.length > 0 && (
          <div style={{ padding: 12, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            {positionGuides.sidebar_bottom.map(guide => (
              <Alert
                key={guide.id}
                message={guide.title}
                description={guide.content}
                type="success"
                showIcon
                style={{ marginBottom: 8, fontSize: 12 }}
              />
            ))}
          </div>
        )}
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <DashboardOutlined /> : <DashboardOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          
          <Space>
            <Tooltip title="查看操作指引">
              <Button 
                type="text" 
                icon={<QuestionCircleOutlined />}
                onClick={() => navigate('/guides')}
              />
            </Tooltip>
            
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.full_name}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          {positionGuides.main_top.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {positionGuides.main_top.map(guide => (
                <Alert
                  key={guide.id}
                  message={guide.title}
                  description={guide.content}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
              ))}
            </div>
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
