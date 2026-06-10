import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, App, Select } from 'antd';
import { HistoryOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { AuditLog, AuditAction } from '../types';
import { getAllAuditLogs, auditActionLabels } from '../api';
import dayjs from 'dayjs';

const { Option } = Select;

export default function AuditLogs() {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>();

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await getAllAuditLogs();
      let data = res.data.data;
      if (actionFilter) {
        data = data.filter(l => l.action === actionFilter);
      }
      setLogs(data);
    } catch (e: any) {
      message.error('加载审计日志失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const allActions = [
    'sample_import', 'sample_update', 'status_change', 'review_submit',
    'timepoint_fix', 'duplicate_handle', 'record_create', 'record_update', 'report_export'
  ];

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      fixed: 'left' as const,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a: AuditLog, b: AuditLog) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color="blue">{auditActionLabels[action] || action}</Tag>
      ),
      filters: allActions.map(a => ({ text: auditActionLabels[a], value: a })),
      onFilter: (value: string, record: AuditLog) => record.action === value,
    },
    {
      title: '样本ID',
      dataIndex: 'sampleId',
      key: 'sampleId',
      width: 80,
      render: (id: number) => <span style={{ fontFamily: 'monospace' }}>#{id}</span>,
    },
    {
      title: '字段',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 150,
      render: (f: string) => f || '-',
    },
    {
      title: '原值',
      dataIndex: 'oldValue',
      key: 'oldValue',
      width: 150,
      ellipsis: true,
      render: (v: string) => v ? (
        <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>{v}</span>
      ) : '-',
    },
    {
      title: '新值',
      dataIndex: 'newValue',
      key: 'newValue',
      width: 150,
      ellipsis: true,
      render: (v: string) => v ? (
        <span style={{ color: '#52c41a' }}>{v}</span>
      ) : '-',
    },
    {
      title: '原因/备注',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (r: string) => r || '-',
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '附加信息',
      dataIndex: 'extraInfo',
      key: 'extraInfo',
      width: 150,
      ellipsis: true,
      render: (e: string) => {
        if (!e) return '-';
        try {
          const parsed = JSON.parse(e);
          return <Tag color="purple">结构化数据</Tag>;
        } catch {
          return e;
        }
      },
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">📋 操作审计日志</div>
        <div className="page-subtitle">
          完整记录所有操作，可追溯谁、什么时候、为什么修改
        </div>
      </div>

      <Card 
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: 16 }}
        title={
          <Space>
            <SearchOutlined />
            <span>筛选</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              placeholder="按操作类型筛选"
              allowClear
              style={{ width: 180 }}
              onChange={setActionFilter}
            >
              {allActions.map(action => (
                <Option key={action} value={action}>
                  {auditActionLabels[action]}
                </Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadLogs}>刷新</Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: 12, 
            background: '#e6f7ff', 
            borderRadius: 6,
            border: '1px solid #91d5ff'
          }}>
            <Space>
              <HistoryOutlined style={{ color: '#1890ff', fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 500 }}>审计追踪说明</div>
                <div style={{ fontSize: 13, color: '#595959' }}>
                  系统记录所有关键操作，包括：样本导入、状态变更、复核提交、异常修正（时间点/条码）、记录创建与更新、报告导出等。
                  每条日志包含操作人、操作时间、修改字段、原值/新值和修改原因，确保数据可追溯。
                </div>
              </div>
            </Space>
          </div>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={logs}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条审计记录`,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>
    </div>
  );
}
