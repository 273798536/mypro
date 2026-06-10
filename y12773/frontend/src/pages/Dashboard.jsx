import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Alert, Button, Space, Tooltip } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getDashboard, exportData } from '../api.js';

const statusMap = {
  IMPORTED: { label: '已导入', color: 'default', icon: <ClockCircleOutlined /> },
  UNDER_REVIEW: { label: '复核中', color: 'processing', icon: <ClockCircleOutlined /> },
  CONFIRMED: { label: '已确认', color: 'success', icon: <CheckCircleOutlined /> },
  REJECTED: { label: '已驳回', color: 'error', icon: <CloseCircleOutlined /> },
  REPORTED: { label: '已报告', color: 'purple', icon: <SafetyCertificateOutlined /> }
};

function Dashboard({ abnormalCount }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ stats: [], abnormal: [], totalBatches: 0 });
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    getDashboard().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const statMap = {};
  data.stats.forEach(s => { statMap[s.result_status] = s.cnt; });
  const totalTests = data.stats.reduce((a, b) => a + b.cnt, 0);

  const abnormalColumns = [
    { title: '批次号', dataIndex: 'batch_no', width: 140, render: v => <code>{v}</code> },
    { title: '试剂名称', dataIndex: 'reagent_name', width: 120 },
    { title: '检测项目', dataIndex: 'test_item', width: 160 },
    { title: '检测值', dataIndex: 'test_value', width: 100,
      render: (v, r) => v != null ? `${v} ${r.unit || ''}` : '-' },
    { title: '限值', dataIndex: 'limit_value', width: 100,
      render: (v, r) => v != null ? `${v} ${r.unit || ''}` : '-' },
    { title: '结论', dataIndex: 'conclusion', width: 100,
      render: v => <Tag color={v === '通过' ? 'green' : v === '不通过' ? 'red' : 'orange'}>{v}</Tag> },
    { title: '状态', dataIndex: 'result_status', width: 100,
      render: v => {
        const s = statusMap[v] || { label: v, color: 'default' };
        return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
      } },
    { title: '更新时间', dataIndex: 'updated_at', width: 180,
      render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '操作', width: 100,
      render: (_, r) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate('/tests')}>查看</Button>
      ) }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Alert
        type={abnormalCount > 0 ? 'warning' : 'success'}
        showIcon
        message={abnormalCount > 0
          ? `当前有 ${abnormalCount} 项异常或待复核记录，请及时处理`
          : '系统运行正常，暂无异常记录'}
        description={'日常入口：本页为安全提示首页；月底或课前请重点关注「异常留痕」区域记录是否解释清楚。'}
        action={
          <Button size="small" type={abnormalCount > 0 ? 'primary' : 'default'} onClick={() => navigate('/tests')}>
            前往处理
          </Button>
        }
      />

      <Row gutter={16}>
        <Col span={4}>
          <Card className="stat-card"><Statistic title="试剂批次总数" value={data.totalBatches} prefix={<SafetyCertificateOutlined />} /></Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card"><Statistic title="检测记录总数" value={totalTests} /></Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card"><Statistic title="已导入待复核" value={statMap.IMPORTED || 0} valueStyle={{ color: '#8c8c8c' }} /></Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card"><Statistic title="复核中" value={statMap.UNDER_REVIEW || 0} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card"><Statistic title="已确认/已报告" value={(statMap.CONFIRMED || 0) + (statMap.REPORTED || 0)} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card"><Statistic title="异常/已驳回" value={statMap.REJECTED || 0} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>异常留痕（月底/课前复核重点）</span>
            <Tooltip title="刷新数据">
              <Button size="small" icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
            </Tooltip>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<FileTextOutlined />} onClick={() => exportData('csv')}>导出报告</Button>
            <Button type="primary" onClick={() => navigate('/tests')}>农药残留追踪</Button>
          </Space>
        }
      >
        {data.abnormal?.length > 0 ? (
          <Table columns={abnormalColumns} dataSource={data.abnormal} rowKey="id" size="small" pagination={false} />
        ) : (
          <Alert type="success" showIcon message="暂无异常记录" description="所有检测记录状态正常" />
        )}
      </Card>
    </Space>
  );
}

export default Dashboard;
