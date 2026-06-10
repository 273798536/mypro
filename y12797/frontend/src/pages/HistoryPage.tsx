import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Space, Input, Select, DatePicker, Row, Col, Alert,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, FilePdfOutlined, AuditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { recordsApi, ProcessingRecord, STATUS_LABEL, STATUS_COLOR } from '../api';

const { RangePicker } = DatePicker;

export default function HistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProcessingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<any>();

  const load = async () => {
    setLoading(true);
    try {
      const res = await recordsApi.list({
        status,
        keyword: keyword || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      // 前端再按日期过滤（若有）
      let items = res.items;
      if (range?.length === 2) {
        const start = range[0].startOf('day');
        const end = range[1].endOf('day');
        items = items.filter(it => {
          const t = dayjs(it.created_at);
          return t.isAfter(start.subtract(1, 'ms')) && t.isBefore(end.add(1, 'ms'));
        });
      }
      setData(items);
      setTotal(res.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, pageSize, status]);

  const columns: ColumnsType<ProcessingRecord> = [
    {
      title: '记录号', dataIndex: 'record_no', width: 230, fixed: 'left',
      render: (v, r) => <a onClick={() => navigate(`/record/${r.id}`)}>{v}</a>,
    },
    { title: '批次号', dataIndex: 'batch_no', width: 160 },
    { title: '物料名称', dataIndex: 'material_name' },
    {
      title: '源文件', dataIndex: 'source_file_name', width: 220,
      render: (v) => v ? <Tag icon={<FilePdfOutlined />}>{v}</Tag> : <Tag color="default">手动/样例</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (v) => <Tag color={STATUS_COLOR[v] as any}>{STATUS_LABEL[v] || v}</Tag>,
      filters: Object.entries(STATUS_LABEL).map(([k, v]) => ({ text: v, value: k })),
      onFilter: (v, rec) => rec.status === v,
    },
    {
      title: '复核人/导出人', width: 180,
      render: (_: any, r) => (
        <Space direction="vertical" size={2}>
          {r.reviewer && <span>复核：{r.reviewer}</span>}
          {r.exporter && <span>导出：{r.exporter}</span>}
          {!r.reviewer && !r.exporter && <Tag color="default">—</Tag>}
        </Space>
      ),
    },
    {
      title: '异常标记', width: 280,
      render: (_: any, r) => (
        <Space size={4} wrap>
          {r.has_temp_unit_mix && <Tag color="orange">温度混用</Tag>}
          {r.has_peak_overlap && <Tag color="red">峰重叠</Tag>}
          {r.has_weighing_issue && <Tag color="purple">称量不足</Tag>}
          {r.missing_unit_fields?.length ? <Tag color="gold">漏填单位×{r.missing_unit_fields.length}</Tag> : null}
          {!r.has_temp_unit_mix && !r.has_peak_overlap && !r.has_weighing_issue && !r.missing_unit_fields?.length
            ? <Tag color="green">无异常</Tag> : null}
        </Space>
      ),
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => +dayjs(a.created_at) - +dayjs(b.created_at),
    },
    {
      title: '操作', fixed: 'right', width: 220,
      render: (_: any, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/record/${r.id}`)}>详情</Button>
          <Button size="small" type={r.status === 'exported' ? 'default' : 'primary'} ghost
            icon={<AuditOutlined />} onClick={() => navigate(`/review/${r.id}`)}>复核</Button>
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => navigate(`/report/${r.id}`)}>报告</Button>
        </Space>
      ),
    },
  ];

  const stats = useMemo(() => {
    const s = { total, imported: 0, reviewing: 0, reviewed: 0, pending: 0, exported: 0, anomaly: 0 };
    data.forEach(r => {
      (s as any)[r.status] = ((s as any)[r.status] || 0) + 1;
      if (r.has_temp_unit_mix || r.has_peak_overlap || r.has_weighing_issue || r.missing_unit_fields?.length) {
        s.anomaly += 1;
      }
    });
    return s;
  }, [data, total]);

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索记录号/批次号/物料名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={load}
              />
              <Button type="primary" onClick={load}>搜索</Button>
            </Space.Compact>
          </Col>
          <Col span={5}>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="按状态筛选"
              value={status}
              onChange={setStatus}
              options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Col>
          <Col span={6}>
            <RangePicker style={{ width: '100%' }} value={range} onChange={setRange} />
          </Col>
          <Col span={5} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { label: '总记录数', value: total, color: '#1677ff' },
          { label: '已导入(待复核)', value: stats.imported, color: '#8c8c8c' },
          { label: '复核中', value: stats.reviewing, color: '#1677ff' },
          { label: '复核通过', value: stats.reviewed, color: '#52c41a' },
          { label: '待导出', value: stats.pending, color: '#fa8c16' },
          { label: '已导出(闭环)', value: stats.exported, color: '#722ed1' },
          { label: '含异常记录', value: stats.anomaly, color: '#cf1322' },
        ].map((it, i) => (
          <Col span={3} key={i}>
            <Card size="small">
              <div style={{ color: '#666', fontSize: 12 }}>{it.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: it.color, marginTop: 4 }}>{it.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Alert
        style={{ marginBottom: 16 }}
        type="success"
        showIcon
        message="数据持久化验证"
        description="所有记录存放在 SQLite 数据库(backend/data/enzyme_conversion.db)，重启后端服务也不会丢失。可沿任一记录的详情页查看状态变更日志与审计追踪。"
      />

      <Card className="section-card">
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={data}
          columns={columns}
          scroll={{ x: 1600 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </Card>
    </>
  );
}
