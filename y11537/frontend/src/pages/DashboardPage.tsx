import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin, message } from 'antd';
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  WarningOutlined
} from '@ant-design/icons';
import api from '../services/api';

interface QueueStats {
  byStatus: {
    pending: number;
    processing: number;
    retrying: number;
    success: number;
    failed: number;
    deadLetter: number;
    manualReview: number;
    compensated: number;
    closed: number;
  };
  totalAwaiting: number;
}

function DashboardPage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/queue/stats');
      setStats(response.data.data);
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">系统概览</h1>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="待处理"
              value={stats?.byStatus?.pending || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="重试中"
              value={stats?.byStatus?.retrying || 0}
              prefix={<SyncOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="待人工审核"
              value={stats?.byStatus?.manualReview || 0}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="死信队列"
              value={stats?.byStatus?.deadLetter || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="处理成功"
              value={stats?.byStatus?.success || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="已补偿入账"
              value={stats?.byStatus?.compensated || 0}
              prefix={<FileTextOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="已关闭"
              value={stats?.byStatus?.closed || 0}
              prefix={<CheckCircleOutlined style={{ color: '#8c8c8c' }} />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="等待处理总数"
              value={stats?.totalAwaiting || 0}
              prefix={<WarningOutlined style={{ color: '#eb2f96' }} />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="系统说明" className="stat-card">
            <ul style={{ marginBottom: 0 }}>
              <li><strong>报名表、签到二维码、课后作业、手工改价表</strong> - 五大数据源稳定接入，异常数据自动进入补偿队列</li>
              <li><strong>自动重试机制</strong> - 网络错误、数据冲突等可恢复错误自动指数退避重试，最多5次</li>
              <li><strong>人工接管</strong> - 超过重试次数或需要人工判断的问题转人工审核</li>
              <li><strong>完整审计轨迹</strong> - 所有操作记录日志，支持修改前后对比查看</li>
              <li><strong>报表可追溯</strong> - 报表数字可追踪到单条记录，坏数据不进入汇总</li>
              <li><strong>四级权限控制</strong> - 录入、复核、主管、只读，不同角色看到的字段和操作不同</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;
