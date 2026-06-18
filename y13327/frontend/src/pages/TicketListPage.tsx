import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Table, Tag, Button, Input,
  Space, Select, Tooltip, Typography, Empty, message
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined,
  WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileSearchOutlined, ExclamationCircleOutlined, AuditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Ticket, TicketStatus, StatsData } from '../types';
import { getTickets, getStats } from '../api';

const { Title, Paragraph, Text } = Typography;

const STATUS_MAP: Record<TicketStatus, { label: string; color: string; icon: any }> = {
  pending: { label: '待处理', color: 'default', icon: <ClockCircleOutlined /> },
  processing: { label: '处理中', color: 'processing', icon: <AuditOutlined /> },
  confirmed: { label: '已确认', color: 'blue', icon: <CheckCircleOutlined /> },
  citation_missing: { label: '引用缺失待确认', color: 'warning', icon: <WarningOutlined /> },
  completed: { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> }
};

export function TicketListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);

  const fetchList = () => {
    setLoading(true);
    Promise.all([
      getTickets({ status, keyword, page, pageSize }),
      getStats()
    ])
      .then(([res, s]) => {
        setData(res.data || []);
        setTotal(res.total || 0);
        setStats(s);
      })
      .catch(e => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, [page, pageSize]);

  const handleSearch = () => { setPage(1); fetchList(); };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, marginBottom: 4 }}>舆情聚类人工改判</Title>
        <Paragraph style={{ margin: 0, color: '#6b7280' }}>
          捋顺线上工单中导致缺引用时报告还很肯定的记录；保留历史备注与旧版本截图；引用缺失先给出待确认原因与影响范围。
        </Paragraph>
      </div>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic
                title="总工单" value={stats.total_tickets}
                prefix={<FileSearchOutlined style={{ color: '#1677ff' }} />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic
                title="引用缺失待确认" value={stats.unconfirmed_missing || stats.citation_missing}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic
                title="处理中" value={stats.processing}
                prefix={<AuditOutlined style={{ color: '#1677ff' }} />}
                valueStyle={{ color: '#1677ff', fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic
                title="待处理" value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic
                title="已完成" value={stats.completed}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic
                title="累计改判记录" value={stats.total_reviews}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <div className="card-section">
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
          <Col flex="200px">
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="按状态筛选"
              value={status}
              onChange={v => { setStatus(v); setPage(1); }}
              options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Col>
          <Col flex="auto">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索工单编号 / 标题 / 内容关键词"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col flex="220px">
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
              <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          locale={{ emptyText: <Empty description="暂无工单数据，请确认后端服务已启动并导入种子数据" /> }}
          pagination={{
            current: page, pageSize, total, showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showTotal: t => `共 ${t} 条`
          }}
          columns={[
            {
              title: '工单编号', dataIndex: 'ticket_no', width: 170,
              render: v => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text>
            },
            {
              title: '标题', dataIndex: 'title',
              render: (v, r: Ticket) => (
                <div>
                  <div>{v}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    原始聚类：{r.original_cluster}
                    {r.final_cluster && r.final_cluster !== r.original_cluster && (
                      <span style={{ marginLeft: 12, color: '#1677ff' }}>
                        → 人工改判：{r.final_cluster}
                      </span>
                    )}
                  </Text>
                </div>
              )
            },
            {
              title: '状态', dataIndex: 'status', width: 150,
              render: (s: TicketStatus) => {
                const cfg = STATUS_MAP[s];
                return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
              }
            },
            {
              title: '引用', dataIndex: 'citation_status', width: 120,
              render: (s, r: Ticket) => (
                <Space>
                  <Tag color={s === 'complete' ? 'green' : s === 'partial' ? 'orange' : 'red'}>
                    {s === 'complete' ? '完整' : s === 'partial' ? '部分' : '缺失'}
                  </Tag>
                  <Text type="secondary">{(r.citation_urls || []).length}条</Text>
                </Space>
              )
            },
            {
              title: '更新时间', dataIndex: 'updated_at', width: 170,
              render: v => dayjs(v).format('YYYY-MM-DD HH:mm')
            },
            {
              title: '操作', width: 100, fixed: 'right',
              render: (_v, r: Ticket) => (
                <Tooltip title="打开处理详情">
                  <Button
                    type="link" size="small" icon={<EyeOutlined />}
                    onClick={() => navigate(`/tickets/${r.id}`)}
                  >
                    处理
                  </Button>
                </Tooltip>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
