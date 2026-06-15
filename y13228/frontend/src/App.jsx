import React, { useState, useEffect } from 'react';
import { Layout, Menu, Tabs, Button, Dropdown, Avatar, App as AntApp } from 'antd';
import { UserOutlined, ReloadOutlined, FileTextOutlined, PlayCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import TracksPage from './pages/TracksPage.jsx';
import AnomalyPage from './pages/AnomalyPage.jsx';
import ConflictsPage from './pages/ConflictsPage.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import ImportExportPanel from './components/ImportExportPanel.jsx';
import { setOperator, statsAPI, runChecksAPI } from './api.js';

const { Header, Content } = Layout;

const OPERATORS = ['运营主管', '演出统筹阿蓝', '系统', '其他...'];

export default function App() {
  const { message, modal } = AntApp.useApp();
  const [operator, setOp] = useState(localStorage.getItem('operator') || '运营主管');
  const [stats, setStats] = useState({ total: 0, encore: 0, pending: 0, confirmed: 0, openAlerts: 0, conflictCount: 0 });
  const [activeTab, setActiveTab] = useState('tracks');
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshStats = () => statsAPI().then(r => setStats(r)).catch(() => {});
  useEffect(() => { refreshStats(); }, [refreshKey]);

  useEffect(() => { window.__ant_msg = message; }, [message]);

  const onRunChecks = () => {
    modal.confirm({
      title: '确认重跑异常检测？',
      content: '将重新扫描全部曲目，检测文件名不匹配、别名重复、来源缺失、演出顺序缺失等异常。',
      okText: '立即重跑',
      cancelText: '取消',
      onOk: async () => {
        const r = await runChecksAPI();
        message.success(`重跑完成：${r.total} 条异常（文件${r.file_mismatch}、别名${r.alias_conflicts}、顺序${r.program_order}、来源${r.source_missing}）`);
        setRefreshKey(k => k + 1);
      },
    });
  };

  const operatorMenu = {
    items: OPERATORS.map(o => ({
      key: o,
      label: o === '其他...' ? (
        <span onClick={() => {
          modal.confirm({
            title: '输入操作人姓名',
            content: (<input id="op-input" className="ant-input" style={{ marginTop: 8 }} placeholder="请输入姓名" />),
            onOk: () => {
              const val = document.getElementById('op-input').value.trim();
              if (val) { setOp(val); setOperator(val); message.success(`已切换为：${val}`); }
            },
          });
        }}>{o}</span>
      ) : o,
      onClick: () => { if (o !== '其他...') { setOp(o); setOperator(o); message.success(`已切换为：${o}`); } },
    })),
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>🎭 剧场返场曲异常提醒系统</h1>
          <span className="sub">Theater Encore Anomaly Alert</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button icon={<PlayCircleOutlined />} onClick={onRunChecks} danger>重跑异常检测</Button>
          <Dropdown menu={operatorMenu} placement="bottomRight">
            <Button type="text" style={{ color: '#fff' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 6 }} />
              {operator}
            </Button>
          </Dropdown>
        </div>
      </Header>
      <Content className="app-content">
        <StatsPanel stats={stats} />
        <div className="page-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>工作区</div>
            <ImportExportPanel onDone={() => setRefreshKey(k => k + 1)} message={message} modal={modal} />
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'tracks',
                label: <span>📋 曲目清单 ({stats.total})</span>,
                children: <TracksPage refreshKey={refreshKey} stats={stats} onChange={refreshStats} />,
              },
              {
                key: 'anomaly',
                label: <span>⚠️ 异常提醒 ({stats.openAlerts})</span>,
                children: <AnomalyPage refreshKey={refreshKey} onResolve={() => { setRefreshKey(k => k + 1); refreshStats(); }} />,
              },
              {
                key: 'conflicts',
                label: <span>🔴 别名冲突 ({stats.conflictCount})</span>,
                children: <ConflictsPage refreshKey={refreshKey} onResolve={() => { setRefreshKey(k => k + 1); refreshStats(); }} />,
              },
            ]}
          />
        </div>
      </Content>
    </Layout>
  );
}
