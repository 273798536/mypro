import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Badge } from 'antd';
import { 
  DashboardOutlined, 
  ImportOutlined, 
  CalendarOutlined, 
  CalculatorOutlined, 
  WarningOutlined, 
  FileTextOutlined, 
  HistoryOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { exceptions } = useAppStore();
  
  const pendingExceptions = exceptions.filter(e => e.status === 'pending').length;
  
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '首页概览',
    },
    {
      key: '/import',
      icon: <ImportOutlined />,
      label: '数据导入',
    },
    {
      key: '/tax-periods',
      icon: <CalendarOutlined />,
      label: '税期管理',
    },
    {
      key: '/calculation',
      icon: <CalculatorOutlined />,
      label: '工资计算',
    },
    {
      key: '/exceptions',
      icon: (
        <Badge count={pendingExceptions} size="small" offset={[5, -5]}>
          <WarningOutlined />
        </Badge>
      ),
      label: '异常中心',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: '报告中心',
    },
    {
      key: '/audit-logs',
      icon: <HistoryOutlined />,
      label: '操作日志',
    },
  ];
  
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];
  
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark"
        style={{
          background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 600,
          letterSpacing: 1,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? '个税' : '个税管理系统'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ 
            background: 'transparent',
            borderRight: 'none',
            marginTop: 16
          }}
        />
      </Sider>
      
      <AntLayout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          height: 64
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span 
              style={{ 
                fontSize: 16, 
                fontWeight: 500,
                color: '#1f2937'
              }}
            >
              {menuItems.find(m => m.key === location.pathname)?.label as string || '首页概览'}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Badge count={pendingExceptions} size="small">
              <BellOutlined 
                style={{ fontSize: 18, color: '#6b7280', cursor: 'pointer' }}
                onClick={() => navigate('/exceptions')}
              />
            </Badge>
            
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
                transition: 'background 0.2s'
              }}>
                <Avatar size={32} style={{ backgroundColor: '#1e40af' }} icon={<UserOutlined />} />
                <span style={{ color: '#374151', fontSize: 14 }}>薪酬专员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ 
          margin: '24px',
          padding: '24px',
          background: '#f9fafb',
          minHeight: 'calc(100vh - 112px)',
          borderRadius: 8
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
