import React, { useState } from 'react';
import { Card, Table, Tag, Space, Button, Collapse, Typography, Descriptions, Badge } from 'antd';
import { History as HistoryIcon, Download } from 'lucide-react';
import { useAppStore } from '../store';
import type { OperationLog } from '../types';

const { Panel } = Collapse;
const { Text } = Typography;

const History: React.FC = () => {
  const { logs } = useAppStore();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const getActionColor = (action: string) => {
    if (action.includes('更新')) return 'blue';
    if (action.includes('导出')) return 'green';
    if (action.includes('检测')) return 'orange';
    if (action.includes('完成')) return 'green';
    return 'default';
  };

  const getTargetTypeText = (type: string) => {
    const types: Record<string, string> = {
      alert: '预警记录',
      student: '学生档案',
      system: '系统操作',
    };
    return types[type] || type;
  };

  const renderDiff = (before: any, after: any) => {
    if (!before || !after) return null;
    return (
      <Descriptions column={1} size="small" bordered>
        {Object.keys({ ...before, ...after }).map(key => {
          const beforeVal = before[key];
          const afterVal = after[key];
          const changed = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
          return (
            <Descriptions.Item
              key={key}
              label={key}
              contentStyle={{ backgroundColor: changed ? '#fff2e8' : 'transparent' }}
            >
              {changed ? (
                <Space>
                  <Text delete type="danger">{JSON.stringify(beforeVal)}</Text>
                  <Text type="success">→ {JSON.stringify(afterVal)}</Text>
                </Space>
              ) : (
                JSON.stringify(beforeVal)
              )}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    );
  };

  const columns = [
    {
      title: '操作时间',
      dataIndex: 'operateTime',
      key: 'operateTime',
      width: 180,
      render: (time: string) => (
        <span className="text-gray-600 text-sm">{time}</span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag color={getActionColor(action)}>{action}</Tag>
      ),
    },
    {
      title: '目标类型',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 100,
      render: (type: string) => getTargetTypeText(type),
    },
    {
      title: '目标ID',
      dataIndex: 'targetId',
      key: 'targetId',
      width: 100,
      render: (id: string) => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{id}</code>,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      render: (ip: string) => <span className="text-gray-500 text-sm">{ip}</span>,
    },
    {
      title: '数据变更',
      key: 'diff',
      render: (_: unknown, record: OperationLog) => (
        record.beforeData && record.afterData ? (
          <Badge status="processing" text="有变更" />
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
  ];

  const expandedRowRender = (record: any) => {
    if (!record.beforeData && !record.afterData) {
      return <div className="p-4 text-gray-500">无数据变更详情</div>;
    }
    return (
      <div className="p-4">
        <h4 className="font-semibold mb-3">数据变更对比</h4>
        {renderDiff(record.beforeData, record.afterData)}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">历史追踪</h2>
        <p className="text-gray-500">查看所有操作日志和数据变更记录，便于追溯和审计</p>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <HistoryIcon size={18} />
            <span>操作日志</span>
          </div>
        }
        extra={
          <Space>
            <Button icon={<Download size={14} />}>导出日志</Button>
          </Space>
        }
        className="hover:shadow-md transition-shadow"
      >
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          }}
        />
      </Card>

      <Card title="使用说明">
        <Collapse ghost>
          <Panel header="如何查看操作历史？" key="1">
            <p className="text-gray-600">
              在表格中可以看到所有操作的时间、操作人、操作类型等信息。点击行首的展开图标可以查看详细的数据变更对比。
            </p>
          </Panel>
          <Panel header="数据对比如何解读？" key="2">
            <p className="text-gray-600">
              变更前的数据显示为红色删除线，变更后的数据显示为绿色。背景为浅橙色的字段表示发生了变更。
            </p>
          </Panel>
          <Panel header="日志保留多久？" key="3">
            <p className="text-gray-600">
              系统默认保留最近90天的操作日志。如需长期保存，请定期导出日志文件。
            </p>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default History;
