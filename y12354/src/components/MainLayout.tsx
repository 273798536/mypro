import { useState } from 'react';
import {
  Activity,
  Link2,
  GitBranch,
  AlertTriangle,
  Database,
  Menu,
  X
} from 'lucide-react';
import { Layout, Menu as AntMenu, theme } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/diagnosis',
    icon: <Activity size={18} />,
    label: '诊断工作台',
  },
  {
    key: '/clues',
    icon: <Link2 size={18} />,
    label: '线索归集中心',
  },
  {
    key: '/trace',
    icon: <GitBranch size={18} />,
    label: '链路追溯面板',
  },
  {
    key: '/problems',
    icon: <AlertTriangle size={18} />,
    label: '问题追踪系统',
  },
  {
    key: '/samples',
    icon: <Database size={18} />,
    label: '样本回看库',
  },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={64}
        style={{
          background: '#001529',
        }}
      >
        <div className="h-16 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {collapsed ? 'IV' : 'IV诊断系统'}
          </span>
        </div>
        <AntMenu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div className="flex items-center justify-between h-full px-4">
            <button onClick={() => setCollapsed(!collapsed)} className="cursor-pointer">
              {collapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
            <span className="text-gray-600">光伏组件IV曲线诊断系统</span>
          </div>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
