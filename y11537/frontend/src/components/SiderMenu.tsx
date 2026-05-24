import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  FileAddOutlined,
  BarChartOutlined,
  WarningOutlined,
  EyeOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider, Header } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '系统概览',
  },
  {
    key: '/queue',
    icon: <UnorderedListOutlined />,
    label: '补偿队列',
  },
  {
    key: '/data',
    icon: <FileAddOutlined />,
    label: '数据录入',
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '签到报表',
  },
  {
    key: '/failed-records',
    icon: <WarningOutlined />,
    label: '失败记录',
  },
  {
    key: '/hrbp-dashboard',
    icon: <EyeOutlined />,
    label: 'HRBP控制台',
  },
];

function SiderMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const roleLabels: Record<string, string> = {
    data_entry: '录入员',
    reviewer: '复核员',
    supervisor: '主管',
    read_only: '只读'
  };

  return (
    <>
      <Sider width={220} theme="dark">
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          签到补偿系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ height: 'calc(100% - 64px)', borderRight: 0 }}
        />
      </Sider>
      <Header style={{ 
        background: 'white', 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'flex-end',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
      }}>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size="small" icon={<UserOutlined />} />
            <span>{user?.realName}</span>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              ({roleLabels[user?.role || ''] || user?.role})
            </span>
          </Space>
        </Dropdown>
      </Header>
    </>
  );
}

export default SiderMenu;
