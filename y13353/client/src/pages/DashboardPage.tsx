import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Select, Button, Space, Tag, Row, Col, Progress } from 'antd';
import { EyeOutlined, DownloadOutlined, BarChartOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { tasksApi, handoverApi, exportApi } from '../api';
import { EvalTask } from '../types';
import StatusBadge from '../components/StatusBadge';

const { Option } = Select;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<EvalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [modelFilter, setModelFilter] = useState<string>();

  useEffect(() => {
    loadData();
    loadStats();
  }, [statusFilter, modelFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await tasksApi.getTasks({
        status: statusFilter,
        model_version: modelFilter,
        limit: 50
      });
      setTasks(res.data.tasks);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await handoverApi.getSummary();
      setStats(res.data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: EvalTask) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      )
    },
    {
      title: '模型版本',
      dataIndex: 'model_version',
      key: 'model_version',
      render: (v: string) => <Tag color="blue">{v}</Tag>
    },
    {
      title: '索引类型',
      dataIndex: 'index_type',
      key: 'index_type'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      key: 'created_by'
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: EvalTask) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tasks/${record.id}`)}
          >
            查看详情
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => exportApi.exportTaskCsv(record.id)}
          >
            导出
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">向量索引成本看板</h1>
        <Space>
          <Select
            placeholder="筛选状态"
            style={{ width: 140 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="pending">待处理</Option>
            <Option value="running">运行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="warning">有异常</Option>
            <Option value="error">错误</Option>
          </Select>
          <Select
            placeholder="筛选模型版本"
            style={{ width: 200 }}
            allowClear
            value={modelFilter}
            onChange={setModelFilter}
          >
            {Array.from(new Set(tasks.map(t => t.model_version))).map(v => (
              <Option key={v} value={v}>{v}</Option>
            ))}
          </Select>
          <Button type="primary" onClick={loadData}>
            刷新
          </Button>
        </Space>
      </div>

      {stats && (
        <div className="stats-row">
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#52c41a' }}>{stats.completed_tasks}</div>
            <div className="stat-label">已完成任务</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#1890ff' }}>{stats.running_tasks}</div>
            <div className="stat-label">运行中任务</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#fa8c16' }}>{stats.warning_tasks}</div>
            <div className="stat-label">有异常任务</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#fa8c16' }}>{stats.pending_delays}</div>
            <div className="stat-label">
              <Space>
                <AlertOutlined />
                待确认特征迟到
              </Space>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#722ed1' }}>{stats.temporary_judgments}</div>
            <div className="stat-label">临时人工判断</div>
          </Card>
        </div>
      )}

      <Card
        title={
          <Space>
            <BarChartOutlined />
            评测任务列表
          </Space>
        }
        extra={
          <Tag color="blue">共 {tasks.length} 条任务</Tag>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
