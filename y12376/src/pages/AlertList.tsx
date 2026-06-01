import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Input, Select, Space, Button, Statistic, Row, Col, Progress, Tag, Tooltip } from 'antd';
import { Search, Eye, Edit, Filter, AlertTriangle, Users, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store';
import RiskTag from '../components/RiskTag';
import type { RiskLevel, RenewalAlert } from '../types';
import { courseTypes } from '../data/mockData';

const { Search: SearchInput } = Input;
const { Option } = Select;

const AlertList: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, filters, setFilters, getFilteredAlerts } = useAppStore();
  const [keyword, setKeyword] = useState('');

  const filteredAlerts = useMemo(() => getFilteredAlerts(), [alerts, filters, getFilteredAlerts]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter(a => a.riskLevel === 'critical').length;
    const high = alerts.filter(a => a.riskLevel === 'high').length;
    const pending = alerts.filter(a => a.processStatus === 'pending').length;
    const withConflict = alerts.filter(a => a.hasConflict).length;
    return { total, critical, high, pending, withConflict };
  }, [alerts]);

  const pieData = useMemo(() => [
    { name: '低风险', value: alerts.filter(a => a.riskLevel === 'low').length, color: '#10B981' },
    { name: '中风险', value: alerts.filter(a => a.riskLevel === 'medium').length, color: '#F59E0B' },
    { name: '高风险', value: alerts.filter(a => a.riskLevel === 'high').length, color: '#F97316' },
    { name: '极高风险', value: alerts.filter(a => a.riskLevel === 'critical').length, color: '#EF4444' },
  ], [alerts]);

  const columns = [
    {
      title: '学生信息',
      key: 'student',
      render: (_: unknown, record: RenewalAlert) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
            {record.student.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-gray-800">{record.student.name}</div>
            <div className="text-sm text-gray-500">{record.student.courseType} · {record.student.teacher}</div>
          </div>
        </div>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: RiskLevel) => <RiskTag level={level} />,
    },
    {
      title: '续费概率',
      dataIndex: 'renewalProbability',
      key: 'renewalProbability',
      render: (prob: number) => (
        <div className="w-32">
          <Progress
            percent={prob}
            size="small"
            strokeColor={prob >= 70 ? '#10B981' : prob >= 50 ? '#F59E0B' : '#EF4444'}
          />
        </div>
      ),
    },
    {
      title: '剩余课时',
      dataIndex: 'remainingHours',
      key: 'remainingHours',
      render: (hours: number) => (
        <span className={hours <= 5 ? 'text-red-500 font-semibold' : ''}>
          {hours} 课时
        </span>
      ),
    },
    {
      title: '下次测评',
      dataIndex: 'nextEvalDate',
      key: 'nextEvalDate',
      render: (date: string | null) => date || '-',
    },
    {
      title: '数据状态',
      key: 'status',
      render: (_: unknown, record: RenewalAlert) => (
        <Space>
          {record.hasConflict && (
            <Tooltip title={record.conflictDetails}>
              <Tag color="red" icon={<AlertTriangle size={12} />}>
                有冲突
              </Tag>
            </Tooltip>
          )}
          <Tag color={record.processStatus === 'completed' ? 'green' : record.processStatus === 'processing' ? 'blue' : 'default'}>
            {record.processStatus === 'completed' ? '已完成' : record.processStatus === 'processing' ? '处理中' : '待处理'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: RenewalAlert) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/student/${record.studentId}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => navigate(`/student/${record.studentId}/edit`)}
          >
            修正
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">续费预警总览</h2>
        <p className="text-gray-500">实时追踪学生续费意向，及时处理异常情况</p>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <Users size={16} /> 学生总数
                </span>
              }
              value={stats.total}
              suffix="人"
              valueStyle={{ color: '#1E3A5F' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={16} /> 极高风险
                </span>
              }
              value={stats.critical}
              suffix="人"
              valueStyle={{ color: '#EF4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} /> 待处理
                </span>
              }
              value={stats.pending}
              suffix="人"
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <AlertTriangle size={16} /> 数据冲突
                </span>
              }
              value={stats.withConflict}
              suffix="条"
              valueStyle={{ color: '#F97316' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="font-semibold">风险分布</span>
          </div>
        }
        className="hover:shadow-md transition-shadow"
      >
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="font-semibold">预警列表</span>
            <Space>
              <SearchInput
                placeholder="搜索学生姓名、课程、老师"
                allowClear
                size="middle"
                style={{ width: 250 }}
                prefix={<Search size={16} />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={(value) => setFilters({ ...filters, keyword: value })}
              />
              <Select
                placeholder="风险等级"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => setFilters({ ...filters, riskLevel: value })}
              >
                <Option value="low">低风险</Option>
                <Option value="medium">中风险</Option>
                <Option value="high">高风险</Option>
                <Option value="critical">极高风险</Option>
              </Select>
              <Select
                placeholder="处理状态"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => setFilters({ ...filters, processStatus: value })}
              >
                <Option value="pending">待处理</Option>
                <Option value="processing">处理中</Option>
                <Option value="completed">已完成</Option>
              </Select>
              <Select
                placeholder="课程类型"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => setFilters({ ...filters, courseType: value })}
              >
                {courseTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
              <Button
                icon={<Filter size={14} />}
                onClick={() => setFilters({ hasConflict: true })}
              >
                仅看冲突
              </Button>
            </Space>
          </div>
        }
        className="hover:shadow-md transition-shadow"
      >
        <Table
          columns={columns}
          dataSource={filteredAlerts}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default AlertList;
