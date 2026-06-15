import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Alert, Button, Space, Dropdown, App as AntdApp } from 'antd';
import {
  DashboardOutlined, UnorderedListOutlined, FileSearchOutlined,
  AlertOutlined, UserOutlined, ScheduleOutlined, SettingOutlined,
  WarningOutlined, SafetyCertificateOutlined, RedoOutlined
} from '@ant-design/icons';
import { useAuthCheck } from './hooks/useAuthCheck';
import DashboardPage from './pages/DashboardPage';
import TracksPage from './pages/TracksPage';
import SettlementPage from './pages/SettlementPage';
import ExceptionsPage from './pages/ExceptionsPage';
import ProgressPage from './pages/ProgressPage';
import SchedulerPage from './pages/SchedulerPage';
import { forceExpireForDemo, restoreAuthorizationForDemo } from './services/authService';
import { resetAllData } from './services/storage';

const { Header, Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: '总览看板' },
  { key: '/tracks', icon: <UnorderedListOutlined />, label: '曲目表' },
  { key: '/settlement', icon: <FileSearchOutlined />, label: '摊位分账对齐' },
  { key: '/exceptions', icon: <AlertOutlined />, label: '异常队列' },
  { key: '/progress', icon: <UserOutlined />, label: '学生进步报告' },
  { key: '/scheduler', icon: <ScheduleOutlined />, label: '排班同事视图' },
];

export default function App() {
  const location = useLocation();
  const auth = useAuthCheck();
  const { message, modal } = AntdApp.useApp();

  const handleForceExpire = () => {
    modal.confirm({
      title: '演示：模拟授权到期',
      icon: <WarningOutlined />,
      content: '确定要把授权状态模拟成"已过期"吗？这样导出和重新计算等功能会被锁定，方便你体验授权卡控的效果。',
      okText: '模拟到期',
      cancelText: '算了',
      onOk: () => {
        forceExpireForDemo();
        auth.refresh();
        message.warning('授权已模拟为到期状态，部分功能被锁定');
      },
    });
  };

  const handleRestoreAuth = () => {
    restoreAuthorizationForDemo(14);
    auth.refresh();
    message.success('授权已恢复为 14 天后到期');
  };

  const handleResetData = () => {
    modal.confirm({
      title: '重置所有演示数据',
      content: '会把所有数据恢复到初始演示状态（含那一条人工改判）。确定吗？',
      okText: '重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        resetAllData();
        auth.refresh();
        message.success('演示数据已重置，页面即将刷新');
        setTimeout(() => window.location.reload(), 500);
      },
    });
  };

  const devMenu = {
    items: [
      { key: 'expire', icon: <WarningOutlined />, label: '模拟授权到期' },
      { key: 'restore', icon: <SafetyCertificateOutlined />, label: '恢复授权（14天）' },
      { type: 'divider' as const },
      { key: 'reset', icon: <RedoOutlined />, label: '重置所有演示数据', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'expire') handleForceExpire();
      if (key === 'restore') handleRestoreAuth();
      if (key === 'reset') handleResetData();
    },
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 className="app-header-title">🎵 音乐节摊位分账对齐系统</h1>
          <span className="app-header-sub">林姐专属 · 一眼看懂学生哪里进步了</span>
        </div>
        <Space>
          {auth.remainingDays > 0 && !auth.isExpired && (
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              🔐 授权剩余 <b>{auth.remainingDays}</b> 天
            </span>
          )}
          <Dropdown menu={devMenu}>
            <Button size="small" icon={<SettingOutlined />}>演示工具</Button>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider width={200} theme="dark" style={{ background: '#001529' }}>
          <div className="sidebar-logo">星光音乐培训</div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ borderRight: 0 }}
            items={MENU_ITEMS.map(item => ({
              ...item,
              label: <Link to={item.key}>{item.label}</Link>,
            }))}
          />
        </Sider>
        <Layout>
          <Content className="app-content">
            {auth.warningMessage && (
              <Alert
                className="auth-warning-banner"
                type={auth.isExpired ? 'error' : auth.remainingDays <= 7 ? 'warning' : 'info'}
                showIcon
                icon={auth.isExpired ? <WarningOutlined /> : <SafetyCertificateOutlined />}
                message={auth.isExpired ? '授权已到期' : '授权即将到期'}
                description={
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>{auth.warningMessage}</span>
                    {auth.isExpired && (
                      <Button type="primary" size="small" onClick={handleRestoreAuth}>
                        续费/恢复授权
                      </Button>
                    )}
                  </Space>
                }
                action={!auth.isExpired ? null : undefined}
              />
            )}
            <Routes>
              <Route path="/" element={<DashboardPage blockedFeatures={auth.blockedFeatures} authRefresh={auth.refresh} />} />
              <Route path="/tracks" element={<TracksPage />} />
              <Route path="/settlement" element={<SettlementPage blockedFeatures={auth.blockedFeatures} authRefresh={auth.refresh} />} />
              <Route path="/exceptions" element={<ExceptionsPage blockedFeatures={auth.blockedFeatures} />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/scheduler" element={<SchedulerPage blockedFeatures={auth.blockedFeatures} />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
