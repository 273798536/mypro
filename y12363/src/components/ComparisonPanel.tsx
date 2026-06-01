import React, { useState } from 'react';
import { Card, Table, Tag, Statistic, Row, Col } from 'antd';
import type { TableProps } from 'antd';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react';
import { ComparisonSummary, ComparisonResult } from '../types';
import { COLORS } from '../constants';

interface ComparisonPanelProps {
  summary: ComparisonSummary | null;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ summary }) => {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  if (!summary) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400">请选择基准运行以查看对比分析</p>
      </div>
    );
  }

  const columns: TableProps<ComparisonResult>['columns'] = [
    {
      title: '批次',
      dataIndex: 'batchNo',
      key: 'batchNo',
      sorter: (a, b) => a.batchNo.localeCompare(b.batchNo),
      render: (text: string) => <span className="text-slate-200">{text}</span>,
      width: 120,
    },
    {
      title: '基准温度',
      dataIndex: 'oldTemp',
      key: 'oldTemp',
      sorter: (a, b) => a.oldTemp - b.oldTemp,
      render: (text: number) => (
        <span className="text-slate-200">{text.toFixed(2)}°C</span>
      ),
      width: 120,
    },
    {
      title: '当前温度',
      dataIndex: 'newTemp',
      key: 'newTemp',
      sorter: (a, b) => a.newTemp - b.newTemp,
      render: (text: number) => (
        <span className="text-blue-400 font-semibold">{text.toFixed(2)}°C</span>
      ),
      width: 120,
    },
    {
      title: '差异值',
      dataIndex: 'diff',
      key: 'diff',
      sorter: (a, b) => Math.abs(a.diff) - Math.abs(b.diff),
      render: (text: number) => {
        const isPositive = text > 0;
        const isZero = text === 0;
        const colorClass = isZero
          ? 'text-slate-400'
          : isPositive
          ? 'text-red-400'
          : 'text-green-400';
        const Icon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
        return (
          <div className={`flex items-center gap-1 ${colorClass} font-semibold`}>
            <Icon size={14} />
            <span>{isPositive ? '+' : ''}{text.toFixed(2)}°C</span>
          </div>
        );
      },
      width: 120,
    },
    {
      title: '显著性',
      dataIndex: 'isSignificant',
      key: 'isSignificant',
      sorter: (a, b) => (a.isSignificant ? 1 : 0) - (b.isSignificant ? 1 : 0),
      render: (significant: boolean) =>
        significant ? (
          <Tag color="red" icon={<AlertTriangle size={12} />}>
            显著
          </Tag>
        ) : (
          <Tag color="green">正常</Tag>
        ),
      width: 100,
    },
  ];

  const rowClassName = (record: ComparisonResult) => {
    if (record.isSignificant) {
      return 'bg-red-900/20 hover:bg-red-900/30';
    }
    return 'hover:bg-slate-700/30';
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-slate-100 font-semibold text-lg mb-4">对比分析汇总</h3>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card className="bg-slate-700/50 border-slate-600">
              <Statistic
                title={<span className="text-slate-400">总记录数</span>}
                value={summary.totalRecords}
                valueStyle={{ color: COLORS.text }}
                suffix="条"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="bg-slate-700/50 border-slate-600">
              <Statistic
                title={<span className="text-slate-400">差异记录数</span>}
                value={summary.diffRecords}
                valueStyle={{ color: '#FF7D00' }}
                suffix="条"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="bg-slate-700/50 border-slate-600">
              <Statistic
                title={<span className="text-slate-400">最大差异</span>}
                value={summary.maxDiff}
                precision={2}
                valueStyle={{ color: '#F53F3F' }}
                suffix="°C"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="bg-slate-700/50 border-slate-600">
              <Statistic
                title={<span className="text-slate-400">平均差异</span>}
                value={summary.avgDiff}
                precision={2}
                valueStyle={{ color: '#165DFF' }}
                suffix="°C"
              />
            </Card>
          </Col>
        </Row>
        {summary.affectedBatches.length > 0 && (
          <div className="mt-4">
            <span className="text-slate-400 mr-2">受影响批次：</span>
            {summary.affectedBatches.map((batch) => (
              <Tag key={batch} color="blue">
                {batch}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-slate-100 font-semibold text-lg">差异明细</h3>
          <p className="text-slate-400 text-sm mt-1">
            差异超过 5°C 的记录已高亮显示
          </p>
        </div>
        <Table<ComparisonResult>
          columns={columns}
          dataSource={summary.details}
          rowKey="readingId"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (current, pageSize) => setPagination({ current, pageSize }),
          }}
          rowClassName={rowClassName}
          scroll={{ y: 400 }}
          size="middle"
          style={{
            '--ant-table-bg': 'transparent',
            '--ant-table-row-hover-bg': 'rgba(51, 65, 85, 0.3)',
            '--ant-table-thead-bg': 'rgba(30, 41, 59, 0.5)',
            '--ant-table-header-bg': 'rgba(30, 41, 59, 0.5)',
            '--ant-table-border-color': COLORS.border,
            '--ant-table-cell-color': COLORS.text,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

export default ComparisonPanel;
