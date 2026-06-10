import { useState, useEffect } from 'react';
import { Layout, Menu, Modal } from 'antd';
import { 
  DashboardOutlined, 
  HistoryOutlined, 
  ReloadOutlined,
  BookOutlined 
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import AuditLogs from './pages/AuditLogs';
import { checkInitialized, resetData } from './api';

const { Header, Content, Sider } = Layout;

export default function App() {
  const [activeKey, setActiveKey] = useState('dashboard');
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFirstTime();
  }, []);

  async function checkFirstTime() {
    try {
      const res = await checkInitialized();
      if (res.data.data.initialized) {
        setShowWelcome(true);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleResetData() {
    Modal.confirm({
      title: '重置示例数据',
      content: '确定要重置所有数据吗？这将清除所有现有记录并重新加载示例数据。',
      okText: '确定重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          await resetData();
          Modal.success({ title: '重置成功', content: '示例数据已重新加载' });
          setActiveKey('dashboard');
          setTimeout(() => window.location.reload(), 1000);
        } catch (e: any) {
          Modal.error({ title: '重置失败', content: e.message });
        } finally {
          setLoading(false);
        }
      },
    });
  }

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '细菌耐药谱看板' },
    { key: 'audit-logs', icon: <HistoryOutlined />, label: '操作审计日志' },
    { 
      key: 'reset', 
      icon: <ReloadOutlined />, 
      label: '重置示例数据',
      onClick: handleResetData,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#001529', 
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <BookOutlined style={{ color: '#fff', fontSize: 24, marginRight: 12 }} />
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
          细菌耐药谱看板系统
        </span>
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginLeft: 12 }}>
          | 微生物耐药性监测分析平台
        </span>
      </Header>
      
      <Layout>
        <Sider width={220} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            items={menuItems}
            onClick={({ key }) => key !== 'reset' && setActiveKey(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        
        <Content style={{ background: '#f5f5f5' }}>
          {activeKey === 'dashboard' && <Dashboard />}
          {activeKey === 'audit-logs' && <AuditLogs />}
        </Content>
      </Layout>

      <Modal
        open={showWelcome}
        onCancel={() => setShowWelcome(false)}
        footer={null}
        width={600}
        className="welcome-modal"
      >
        <div className="welcome-content">
          <div className="welcome-title">👋 欢迎使用细菌耐药谱看板</div>
          
          <p style={{ color: '#595959', marginBottom: 20 }}>
            系统已为您准备了示例数据，您可以直接体验以下功能：
          </p>

          <div className="welcome-feature">
            <div className="welcome-feature-title">📊 数据导入与质量检查</div>
            <div className="welcome-feature-desc">支持CSV/Excel批量导入，自动检测条码重复、时间点缺失等问题</div>
          </div>

          <div className="welcome-feature">
            <div className="welcome-feature-title">🔍 差异分析与异常复核</div>
            <div className="welcome-feature-desc">共用同一批处理记录，确保界面与报告数据一致性</div>
          </div>

          <div className="welcome-feature">
            <div className="welcome-feature-title">📝 完整审计追踪</div>
            <div className="welcome-feature-desc">记录谁、什么时候、为什么修改，支持完整追溯链条</div>
          </div>

          <div className="welcome-feature">
            <div className="welcome-feature-title">📄 智能报告导出</div>
            <div className="welcome-feature-desc">自动生成普通话解释，条码重复等问题可直接复制使用</div>
          </div>

          <div style={{ marginTop: 20, padding: 12, background: '#e6f7ff', borderRadius: 6 }}>
            <span style={{ color: '#1890ff', fontSize: 13 }}>
              💡 提示：点击左侧菜单开始使用。示例数据包含条码重复、时间点缺失等典型教学场景。
            </span>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
