import React from 'react';
import { Layout, Menu, Avatar, Space, Dropdown, Tag } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  WarningOutlined,
  UserOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '概览看板' },
  { key: '/detail-table', icon: <UnorderedListOutlined />, label: '明细表' },
  { key: '/exception-queue', icon: <WarningOutlined />, label: '异常队列' },
];

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stats = useStore(s => s.getStats());

  const selectedKey = menuItems.find(m => location.pathname.startsWith(m.key))?.key || '/dashboard';

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-header-title">
          <span style={{ fontSize: 24 }}>📊</span>
          <span>商品属性指标看板</span>
          <span className="app-header-subtitle">v2.3 · 单一数据源 · 全链路可追溯</span>
        </div>
        <Space size={20}>
          <Space size={4}>
            <Tag color="green">通过 {stats.passCount}</Tag>
            <Tag color="orange">预警 {stats.warningCount}</Tag>
            <Tag color="red">异常 {stats.failCount}</Tag>
          </Space>
          <Dropdown
            menu={{
              items: [
                { key: '1', label: '切换到小孟' },
                { key: '2', label: '切换到李评测' },
                { type: 'divider' },
                { key: '3', label: '设置' },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <BellOutlined style={{ fontSize: 16, color: 'rgba(0,0,0,0.65)' }} />
              <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span style={{ fontSize: 13 }}>小孟（评测）</span>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider
          width={200}
          style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
          theme="light"
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ height: '100%', borderRight: 0, paddingTop: 12 }}
            onClick={({ key }) => navigate(key as string)}
            items={menuItems}
          />
          <div style={{ padding: 16, fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 1.7, borderTop: '1px solid #f5f5f5' }}>
            <div>📌 所有页面共用同一份</div>
            <div>&nbsp;&nbsp;&nbsp;filteredRecords 数据源</div>
            <div>📌 筛选条件跨页面联动</div>
            <div>📌 点击指标可下钻到样本</div>
          </div>
        </Sider>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
