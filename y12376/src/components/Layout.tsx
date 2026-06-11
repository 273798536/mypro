import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, theme, Dropdown, Button, message } from 'antd';
import { AlertTriangle, Download, History, Settings } from 'lucide-react';

const { Header, Content, Sider } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <AlertTriangle size={18} />,
      label: <Link to="/">续费预警</Link>,
    },
    {
      key: '/history',
      icon: <History size={18} />,
      label: <Link to="/history">历史追踪</Link>,
    },
    {
      key: '/export',
      icon: <Download size={18} />,
      label: <Link to="/export">导出中心</Link>,
    },
  ];

  const handleClearData = () => {
    try {
      localStorage.removeItem('renewal-app-store');
      message.success('本地数据已清除，即将刷新恢复初始数据');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      message.error('清除本地数据失败');
    }
  };

  const userMenuItems = [
    {
      key: 'clear',
      label: '清除本地持久化数据（恢复初始mock）',
      onClick: handleClearData,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div className="h-16 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <span>续费预警</span>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, borderBottom: '1px solid #f0f0f0' }}>
          <div className="h-full flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800">音乐课程续费预警工作台</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">欢迎，教务管理员</span>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" icon={<Settings size={16} />} />
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content style={{ margin: '24px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 184px)',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
