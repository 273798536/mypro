import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space, Popconfirm, message } from 'antd';
import {
  LayoutDashboard,
  Database,
  AlertTriangle,
  FileSearch,
  FileText,
  User,
  Settings,
  LogOut,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import FilterPanel from './FilterPanel';
import RunSelector from './RunSelector';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    key: '/',
    icon: <LayoutDashboard size={18} />,
    label: '估算看板',
  },
  {
    key: '/data-entry',
    icon: <Database size={18} />,
    label: '数据录入',
  },
  {
    key: '/anomaly-detection',
    icon: <AlertTriangle size={18} />,
    label: '异常检测',
  },
  {
    key: '/audit-trail',
    icon: <FileSearch size={18} />,
    label: '审计追踪',
  },
  {
    key: '/report-export',
    icon: <FileText size={18} />,
    label: '报告导出',
  },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAllData, loading } = useAppStore();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleResetData = async () => {
    try {
      await resetAllData();
      message.success('数据重置成功，系统已重新初始化');
    } catch (error) {
      message.error('数据重置失败: ' + (error as Error).message);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <User size={14} />,
      label: '个人信息',
    },
    {
      key: 'settings',
      icon: <Settings size={14} />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'reset',
      icon: <RotateCcw size={14} />,
      label: (
        <Popconfirm
          title="确认重置所有数据？"
          description="这将清除所有IndexedDB数据并重新初始化样例数据"
          onConfirm={handleResetData}
          okText="确认重置"
          cancelText="取消"
          okButtonProps={{ danger: true, loading }}
        >
          <span>重置样例数据</span>
        </Popconfirm>
      ),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      label: '退出登录',
    },
  ];

  return (
    <AntLayout className="min-h-screen bg-slate-900">
      <Header className="bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#165DFF' }}
            >
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg leading-tight">
                热辐射炉温估算系统
              </h1>
              <p className="text-slate-400 text-xs">Thermal Radiation Temperature Estimation</p>
            </div>
          </div>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          className="bg-transparent border-0 flex-1 justify-center"
          style={{ minWidth: 500 }}
        />

        <div className="flex items-center gap-3">
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space className="cursor-pointer hover:bg-slate-700/50 px-3 py-1.5 rounded-lg transition-colors">
              <Avatar
                size={32}
                className="bg-blue-600"
                icon={<User size={16} />}
              />
              <div className="text-left hidden sm:block">
                <p className="text-white text-sm font-medium leading-tight">工程师</p>
                <p className="text-slate-400 text-xs">admin@factory.com</p>
              </div>
            </Space>
          </Dropdown>
        </div>
      </Header>

      <AntLayout>
        <Sider
          width={320}
          collapsedWidth={0}
          collapsed={sidebarCollapsed}
          trigger={null}
          className="bg-slate-800 border-r border-slate-700"
          collapsible
        >
          <div className="p-4 space-y-4 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
            <RunSelector />
            <FilterPanel />
          </div>
        </Sider>

        <Content className="relative">
          <button
            onClick={toggleSidebar}
            className="absolute left-4 top-4 z-10 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="p-4" style={{ minHeight: 'calc(100vh - 64px)' }}>
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
