import React, { useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Progress,
  Tooltip,
  Divider,
  message,
  App as AntdApp,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  UnorderedListOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { AttributeStatus } from '@/types';

const { RangePicker } = DatePicker;

const STATUS_OPTIONS: { label: string; value: AttributeStatus; color: string }[] = [
  { label: '通过', value: 'pass', color: 'green' },
  { label: '预警', value: 'warning', color: 'orange' },
  { label: '异常', value: 'fail', color: 'red' },
  { label: '待处理', value: 'pending', color: 'default' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { message: msg } = AntdApp.useApp();

  const filter = useStore(s => s.filter);
  const setFilter = useStore(s => s.setFilter);
  const resetFilter = useStore(s => s.resetFilter);
  const allRecords = useStore(s => s.allRecords);
  const getStats = useStore(s => s.getStats);
  const stats = useMemo(() => getStats(), [filter, allRecords, getStats]);

  const categories = useMemo(() => Array.from(new Set(allRecords.map(r => r.category))), [allRecords]);
  const brands = useMemo(() => Array.from(new Set(allRecords.map(r => r.brand))), [allRecords]);
  const evaluators = useMemo(() => Array.from(new Set(allRecords.map(r => r.evaluator))), [allRecords]);

  const trendOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['通过', '预警', '异常'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: stats.trendData.map(d => d.date.slice(5)) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '通过', type: 'bar', stack: 'total', itemStyle: { color: '#52c41a' }, data: stats.trendData.map(d => d.pass) },
      { name: '预警', type: 'bar', stack: 'total', itemStyle: { color: '#faad14' }, data: stats.trendData.map(d => d.warning) },
      { name: '异常', type: 'bar', stack: 'total', itemStyle: { color: '#ff4d4f' }, data: stats.trendData.map(d => d.fail) },
    ],
  }), [stats.trendData]);

  const attrOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['通过', '预警', '异常'], bottom: 0 },
    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: stats.attributeBreakdown.map(a => a.attribute).reverse(),
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        name: '通过', type: 'bar', stack: 't', itemStyle: { color: '#52c41a' },
        data: stats.attributeBreakdown.map(a => a.pass).reverse(),
      },
      {
        name: '预警', type: 'bar', stack: 't', itemStyle: { color: '#faad14' },
        data: stats.attributeBreakdown.map(a => a.warning).reverse(),
      },
      {
        name: '异常', type: 'bar', stack: 't', itemStyle: { color: '#ff4d4f' },
        data: stats.attributeBreakdown.map(a => a.fail).reverse(),
      },
    ],
  }), [stats.attributeBreakdown]);

  const categoryOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}: {d}%' },
      data: stats.categoryBreakdown.map(c => ({ name: c.category, value: c.total })),
    }],
  }), [stats.categoryBreakdown]);

  const drillToAttribute = (attrName: string, status?: AttributeStatus) => {
    setFilter({ attributeName, attributeStatus: status });
    msg.info(`已筛选：${attrName}${status ? ` / ${STATUS_OPTIONS.find(o => o.value === status)?.label}` : ''}，明细表已同步`);
    navigate('/detail-table');
  };

  const drillToRecord = (id: string) => navigate(`/record/${id}`);

  const drillToException = (tab: string) => {
    navigate(`/exception-queue?tab=${tab}`);
  };

  return (
    <div>
      <Card className="filter-bar section-card" size="small" title={<Space><SearchOutlined />筛选条件（与明细表、异常队列联动）</Space>}>
        <Form layout="inline" size="small" style={{ rowGap: 12 }}>
          <Form.Item label="日期">
            <RangePicker
              value={filter.dateRange ? [dayjs(filter.dateRange[0]), dayjs(filter.dateRange[1])] : null}
              onChange={(v) => setFilter({ dateRange: v ? [v[0]!.format('YYYY-MM-DD'), v[1]!.format('YYYY-MM-DD')] : null })}
              allowClear
            />
          </Form.Item>
          <Form.Item label="类目">
            <Select
              mode="multiple"
              placeholder="全选"
              style={{ minWidth: 140 }}
              value={filter.categories}
              onChange={(v) => setFilter({ categories: v })}
              options={categories.map(c => ({ label: c, value: c }))}
              allowClear
              maxTagCount={2}
            />
          </Form.Item>
          <Form.Item label="品牌">
            <Select
              mode="multiple"
              placeholder="全选"
              style={{ minWidth: 140 }}
              value={filter.brands}
              onChange={(v) => setFilter({ brands: v })}
              options={brands.map(b => ({ label: b, value: b }))}
              allowClear
              maxTagCount={2}
            />
          </Form.Item>
          <Form.Item label="状态">
            <Select
              mode="multiple"
              placeholder="全选"
              style={{ minWidth: 160 }}
              value={filter.statuses}
              onChange={(v) => setFilter({ statuses: v })}
              options={STATUS_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
              allowClear
              maxTagCount={3}
            />
          </Form.Item>
          <Form.Item label="评测人">
            <Select
              mode="multiple"
              placeholder="全选"
              style={{ minWidth: 140 }}
              value={filter.evaluators}
              onChange={(v) => setFilter({ evaluators: v })}
              options={evaluators.map(e => ({ label: e, value: e }))}
              allowClear
              maxTagCount={2}
            />
          </Form.Item>
          <Form.Item label="关键词">
            <Input
              placeholder="商品名/ID/记录ID"
              style={{ width: 180 }}
              value={filter.keyword}
              onChange={(e) => setFilter({ keyword: e.target.value })}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={resetFilter}>重置</Button>
              <Button type="primary" icon={<UnorderedListOutlined />} onClick={() => navigate('/detail-table')}>
                查看明细表 ({stats.total})
              </Button>
            </Space>
          </Form.Item>
        </Form>
        {filter.attributeName && (
          <div style={{ marginTop: 8, fontSize: 12 }}>
            <Tag color="blue" closable onClose={() => setFilter({ attributeName: undefined, attributeStatus: undefined })}>
              维度下钻：{filter.attributeName}{filter.attributeStatus ? ` / ${STATUS_OPTIONS.find(o => o.value === filter.attributeStatus)?.label}` : ''}
            </Tag>
            <span style={{ color: 'rgba(0,0,0,0.45)' }}>&nbsp;← 由图表点击下钻产生，明细表已同步该筛选</span>
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic title="总样本量" value={stats.total} suffix="条" />
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
              人工改判 <b style={{ color: '#722ed1' }}>{stats.manualOverrideCount}</b> 条
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="通过率"
              value={stats.passRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress percent={stats.passRate} showInfo={false} strokeColor="#52c41a" size="small" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="平均综合分"
              value={stats.avgScore}
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
              加权分：6项属性 × 各自权重
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="stat-card"
            size="small"
            onClick={() => navigate('/exception-queue')}
            style={{ cursor: 'pointer' }}
            title={
              <Space size={4}>
                <WarningOutlined style={{ color: '#faad14' }} />
                <span style={{ fontSize: 13 }}>异常队列 <span style={{ color: 'rgba(0,0,0,0.45)', fontWeight: 'normal' }}>（点击进入）</span></span>
              </Space>
            }
          >
            <Space wrap>
              <Tag color="success" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); drillToException('handled'); }}>
                已处理 {stats.exceptionCounts.handled}
              </Tag>
              <Tag color="warning" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); drillToException('pending_material'); }}>
                待补材料 {stats.exceptionCounts.pending_material}
              </Tag>
              <Tag color="purple" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); drillToException('manual_overruled'); }}>
                人工改判 {stats.exceptionCounts.manual_overruled}
              </Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={16}>
          <Card className="section-card" title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />每日趋势（点击卡片头查看全量明细表）</Space>} size="small" extra={<Button type="link" size="small" onClick={() => navigate('/detail-table')}>明细→</Button>}>
            <ReactECharts option={trendOption} style={{ height: 260 }} notMerge={false} lazyUpdate />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="section-card" title={<Space><UnorderedListOutlined />类目分布</Space>} size="small">
            <ReactECharts option={categoryOption} style={{ height: 260 }} notMerge={false} lazyUpdate />
          </Card>
        </Col>
      </Row>

      <Card
        className="section-card"
        title={
          <Space>
            <WarningOutlined style={{ color: '#1677ff' }} />
            各属性指标分布
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 'normal' }}>
              （点击"异常/预警"分段可下钻到对应的样本列表）
            </span>
          </Space>
        }
        size="small"
      >
        <ReactECharts
          option={attrOption}
          style={{ height: 280 }}
          notMerge={false}
          lazyUpdate
          onEvents={{
            click: (params: any) => {
              const attrName = params.name;
              const map: Record<string, AttributeStatus> = { '通过': 'pass', '预警': 'warning', '异常': 'fail' };
              drillToAttribute(attrName, map[params.seriesName]);
            },
          }}
        />
      </Card>

      <Divider orientation="left" style={{ marginTop: 8, marginBottom: 12 }}>
        <Space>
          <span style={{ color: '#cf1322' }}>🎯</span>
          <b>对整体结论影响最大的 {stats.influentialRecords.length} 条样本</b>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 'normal' }}>
            —— 评审时被追问"哪几条拉偏结论"，直接看这张表
          </span>
        </Space>
      </Divider>

      <Card className="section-card" size="small">
        <Table
          size="small"
          rowKey="id"
          dataSource={stats.influentialRecords}
          pagination={false}
          onRow={(r) => ({ onClick: () => drillToRecord(r.id), style: { cursor: 'pointer' } })}
          columns={[
            {
              title: '记录ID',
              dataIndex: 'id',
              width: 120,
              render: (v) => <span style={{ fontFamily: 'monospace', color: '#1677ff' }}>{v}</span>,
            },
            { title: '商品名', dataIndex: 'productName', ellipsis: true },
            {
              title: '综合分',
              dataIndex: 'score',
              width: 90,
              render: (v) => {
                const color = v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f';
                return <Tag color={color} style={{ fontSize: 14 }}>{v}</Tag>;
              },
            },
            {
              title: '样本权重',
              dataIndex: 'weight',
              width: 90,
              render: (v) => (
                <Tooltip title="越大表示该样本在整体指标中的杠杆效应越明显（如类目大、异常项多）">
                  {v.toFixed(2)}x
                </Tooltip>
              ),
            },
            {
              title: '对整体的影响',
              dataIndex: 'impactOnOverall',
              width: 140,
              render: (v) => (
                <Space>
                  {v < 0
                    ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                    : <ArrowUpOutlined style={{ color: '#52c41a' }} />}
                  <span style={{ color: v < 0 ? '#cf1322' : '#389e0d', fontWeight: 600 }}>
                    {v > 0 ? '+' : ''}{v.toFixed(2)} 分
                  </span>
                </Space>
              ),
            },
            {
              title: '原因说明',
              dataIndex: 'reason',
              ellipsis: true,
              render: (v: string) => (
                <Tooltip title={v}><span>{v}</span></Tooltip>
              ),
            },
            {
              title: '操作',
              width: 100,
              render: (_, r) => (
                <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); drillToRecord(r.id); }}>
                  查看详情 →
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
