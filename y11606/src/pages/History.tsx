import { useState } from 'react';
import { Card, Table, Tag, Button, Collapse, Typography } from 'antd';
import { History as HistoryIcon, FileText, Calculator, Edit2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store';
import type { HistoryRecord } from '@/types';

const { Text } = Typography;
const { Panel } = Collapse;

export default function History() {
  const { historyRecords, prepaymentResults, removePrepaymentResult } = useAppStore();
  const [activeTab, setActiveTab] = useState<'records' | 'results'>('records');

  const actionIconMap: Record<HistoryRecord['action'], React.ReactNode> = {
    create: <FileText size={16} className="text-blue-500" />,
    update: <Edit2 size={16} className="text-amber-500" />,
    calculate: <Calculator size={16} className="text-emerald-500" />,
    correct: <CheckCircle size={16} className="text-purple-500" />,
  };

  const actionLabelMap: Record<HistoryRecord['action'], { label: string; color: string }> = {
    create: { label: '创建', color: 'blue' },
    update: { label: '更新', color: 'amber' },
    calculate: { label: '计算', color: 'green' },
    correct: { label: '修正', color: 'purple' },
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    if (typeof value === 'number') {
      if (value > 1000) return `¥${value.toLocaleString()}`;
      return String(value);
    }
    return String(value);
  };

  const columns: ColumnsType<HistoryRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      width: 170,
      render: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm:ss'),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 80,
      render: (v) => (
        <Tag color={actionLabelMap[v].color}>
          {actionLabelMap[v].label}
        </Tag>
      ),
    },
    {
      title: '字段',
      dataIndex: 'fieldName',
      width: 200,
      render: (v) => v || '-',
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '变更详情',
      key: 'details',
      render: (_, record) => {
        if (record.oldValue !== undefined || record.newValue !== undefined) {
          return (
            <Collapse ghost size="small">
              <Panel
                header={
                  <span className="text-sm">
                    {record.operatorNote || '点击查看详情'}
                  </span>
                }
                key="1"
              >
                <div className="space-y-2 text-xs">
                  {record.oldValue !== undefined && (
                    <div>
                      <Text type="secondary">原值：</Text>
                      <pre className="bg-slate-50 p-2 rounded mt-1 max-h-32 overflow-auto">
                        {formatValue(record.oldValue)}
                      </pre>
                    </div>
                  )}
                  {record.newValue !== undefined && (
                    <div>
                      <Text type="secondary">新值：</Text>
                      <pre className="bg-slate-50 p-2 rounded mt-1 max-h-32 overflow-auto">
                        {formatValue(record.newValue)}
                      </pre>
                    </div>
                  )}
                </div>
              </Panel>
            </Collapse>
          );
        }
        return record.operatorNote || '-';
      },
    },
  ];

  const resultColumns = [
    {
      title: '方案名称',
      dataIndex: 'name',
      width: 200,
      render: (v) => v || '未命名方案',
    },
    {
      title: '提前还款日',
      dataIndex: ['params', 'prepaymentDate'],
      width: 120,
    },
    {
      title: '还款金额',
      dataIndex: ['params', 'prepaymentAmount'],
      width: 120,
      render: (v) => `¥${v.toLocaleString()}`,
    },
    {
      title: '节省利息',
      dataIndex: 'interestSaved',
      width: 120,
      render: (v) => <span className="text-emerald-600">¥{v.toLocaleString()}</span>,
    },
    {
      title: '违约金',
      dataIndex: 'penaltyAmount',
      width: 100,
      render: (v) => v > 0 ? <span className="text-red-500">¥{v.toLocaleString()}</span> : '-',
    },
    {
      title: '净收益',
      dataIndex: 'netBenefit',
      width: 120,
      render: (v) => (
        <span className={`font-semibold ${v >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          ¥{v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => removePrepaymentResult(record.id)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">历史记录</h1>
        <p className="text-slate-500 text-sm mt-1">查看所有操作痕迹和试算历史，保留完整数据追溯</p>
      </div>

      <Card
        tabList={[
          { key: 'records', tab: '操作痕迹' },
          { key: 'results', tab: '试算结果' },
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as 'records' | 'results')}
      >
        {activeTab === 'records' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  {actionIconMap.create} 创建
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  {actionIconMap.update} 更新
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  {actionIconMap.calculate} 计算
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  {actionIconMap.correct} 修正
                </span>
              </div>
              <span className="text-sm text-slate-500">
                共 {historyRecords.length} 条记录
              </span>
            </div>
            {historyRecords.length === 0 ? (
              <div className="text-center py-16">
                <HistoryIcon size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">暂无操作记录</p>
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={historyRecords}
                rowKey="id"
                scroll={{ x: 900, y: 600 }}
                size="small"
                pagination={{ pageSize: 20 }}
              />
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            {prepaymentResults.length === 0 ? (
              <div className="text-center py-16">
                <HistoryIcon size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">暂无试算结果</p>
              </div>
            ) : (
              <Table
                columns={resultColumns}
                dataSource={prepaymentResults}
                rowKey="id"
                scroll={{ x: 1000 }}
                size="small"
                pagination={{ pageSize: 10 }}
              />
            )}
          </div>
        )}
      </Card>

      <Card className="mt-6" title="数据说明">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">数据来源标记</h4>
            <ul className="space-y-1 text-slate-600">
              <li>• <Tag color="blue">系统生成</Tag>：系统根据公式自动计算的数据</li>
              <li>• <Tag color="green">贷款合同录入</Tag>：从贷款合同中提取的原始数据</li>
              <li>• <Tag color="orange">人工修正</Tag>：客户经理手动修改的数据</li>
              <li>• <Tag color="purple">提前还款重算</Tag>：提前还款后重新计算的还款计划</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">数据保留范围</h4>
            <ul className="space-y-1 text-slate-600">
              <li>• 贷款基础信息：永久保留，修改记录完整可追溯</li>
              <li>• 还款计划：保留原始值和修正后的值</li>
              <li>• 利率调整：完整记录每次调整历史</li>
              <li>• 试算结果：保留最近500条，超出自动清理最早记录</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
