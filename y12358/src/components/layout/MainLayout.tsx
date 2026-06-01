import React, { useEffect } from 'react';
import { Layout, Menu, Button, message } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Database,
  ShieldCheck,
  FileText,
  BarChart3,
  Upload,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useAppStore } from '../../store';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { initMockData, clearAllData, checkResults } = useAppStore();

  useEffect(() => {
    if (checkResults.length === 0) {
      initMockData();
      message.success('已加载样例数据');
    }
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <ShieldCheck size={18} />,
      label: <Link to="/">安全校核</Link>,
    },
    {
      key: '/import',
      icon: <Upload size={18} />,
      label: <Link to="/import">数据导入</Link>,
    },
    {
      key: '/analysis',
      icon: <BarChart3 size={18} />,
      label: <Link to="/analysis">复盘分析</Link>,
    },
  ];

  const handleLoadSample = () => {
    initMockData();
    message.success('样例数据已加载');
  };

  const handleClearData = () => {
    clearAllData();
    message.success('所有数据已清空');
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Sider
        width={220}
        theme="light"
        className="border-r border-gray-200"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-md flex items-center justify-center">
              <Database size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800">液压升降</h1>
              <p className="text-xs text-gray-500">安全校核系统</p>
            </div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="border-0 mt-2"
          style={{ height: 'calc(100vh - 200px)' }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <div className="space-y-2">
            <Button
              type="default"
              size="small"
              block
              icon={<RefreshCw size={14} />}
              onClick={handleLoadSample}
            >
              加载样例数据
            </Button>
            <Button
              type="default"
              size="small"
              block
              danger
              onClick={handleClearData}
            >
              清空所有数据
            </Button>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header
          className="bg-white border-b border-gray-200 px-6 flex items-center justify-between"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 56,
            lineHeight: '56px',
            padding: '0 24px',
          }}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-600" />
            <span className="text-sm text-gray-600">
              {location.pathname === '/' && '安全校核 - 日常处理'}
              {location.pathname === '/import' && '数据导入 - 样例管理'}
              {location.pathname.startsWith('/detail') && '明细详情 - 证据链'}
              {location.pathname === '/analysis' && '复盘分析 - 报告导出'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">当前用户：设备安全员</span>
            <Settings size={18} className="text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
        </Header>

        <Content className="p-6">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
