import React, { useEffect, useState } from 'react';
import { Tabs, Button, Space, message, Spin } from 'antd';
import { ReloadOutlined, DownloadOutlined, DatabaseOutlined, HistoryOutlined } from '@ant-design/icons';
import ImportSection from './components/ImportSection';
import DisputeTable from './components/DisputeTable';
import TimelineView from './components/TimelineView';
import StatsOverview from './components/StatsOverview';
import { getDisputes, getTimeline, exportExcel } from './api';
import type { Dispute, TimelineEvent } from './types';

const App: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([getDisputes(), getTimeline()]);
      setDisputes(d);
      setTimeline(t);
    } catch (err: any) {
      message.error('加载数据失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleExport = () => {
    try {
      exportExcel();
      message.success('正在导出Excel，请稍候...');
    } catch (err: any) {
      message.error('导出失败');
    }
  };

  const tabItems = [
    {
      key: 'list',
      label: (
        <span>
          <DatabaseOutlined /> 对账列表
        </span>
      )
    },
    {
      key: 'timeline',
      label: (
        <span>
          <HistoryOutlined /> 历史时间线（沟通视图）
        </span>
      )
    }
  ];

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>信用卡争议款口径对账</h1>
        <p>审批邮件导入 · 税费汇率关联 · 晚到凭证追踪 · 人工备注保留 · 沟通时间线</p>
      </div>

      <StatsOverview disputes={disputes} />

      <ImportSection onImported={loadAll} />

      <div className="section-card" style={{ padding: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginBottom: 0 }}
          />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              导出 Excel
            </Button>
          </Space>
        </div>

        <div style={{ padding: 20 }}>
          <Spin spinning={loading}>
            {activeTab === 'list' ? (
              <DisputeTable data={disputes} onUpdated={loadAll} />
            ) : (
              <TimelineView events={timeline} />
            )}
          </Spin>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12, padding: '24px 0' }}>
        信用卡争议款口径对账系统 · 审批邮件自动解析 · 重复导入不覆盖 · 晚到凭证留痕
      </div>
    </div>
  );
};

export default App;
