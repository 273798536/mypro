import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Select, Table, Tag, Space, DatePicker, Statistic, Empty
} from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { reportApi } from '../api';
import { activityLevelLabels, activityLevelColors } from '../types';

const { RangePicker } = DatePicker;

export default function StatisticsPage() {
  const [dateRange, setDateRange] = useState<[any, any]>();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateRange && dateRange[0]) params.start_date = dateRange[0].format('YYYY-MM-DD');
      if (dateRange && dateRange[1]) params.end_date = dateRange[1].format('YYYY-MM-DD');
      const data = await reportApi.statistics(params);
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const getStackedBarOption = () => {
    if (!stats?.by_batch?.length) return {};
    const batches = Array.from(new Set(stats.by_batch.map((d: any) => d.reagent_batch)));
    const levels: any[] = ['high', 'medium', 'low', 'inactive'];

    const series = levels.map(lv => ({
      name: activityLevelLabels[lv as keyof typeof activityLevelLabels],
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      itemStyle: { color: activityLevelColors[lv as keyof typeof activityLevelColors] },
      label: { show: true },
      data: batches.map(b => {
        const total = stats.by_batch
          .filter((d: any) => d.reagent_batch === b && d.activity_level === lv)
          .reduce((s: number, d: any) => s + d.count, 0);
        return total;
      })
    }));

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0 },
      grid: { bottom: 80 },
      xAxis: { type: 'category', data: batches, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '样本数' },
      series
    };
  };

  const getReviewRateOption = () => {
    if (!stats?.review_summary?.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      grid: { bottom: 60 },
      xAxis: {
        type: 'category',
        data: stats.review_summary.map((r: any) => r.reagent_batch),
        axisLabel: { rotate: 30 }
      },
      yAxis: [
        { type: 'value', name: '样本数' },
        { type: 'value', name: '复核率(%)', min: 0, max: 100 }
      ],
      series: [
        { name: '总数', type: 'bar', stack: 'status', data: stats.review_summary.map((r: any) => r.total), itemStyle: { color: '#e0e0e0' } },
        { name: '待复核', type: 'bar', stack: 'status', data: stats.review_summary.map((r: any) => r.pending), itemStyle: { color: '#faad14' } },
        { name: '已复核', type: 'bar', stack: 'status', data: stats.review_summary.map((r: any) => r.reviewed), itemStyle: { color: '#52c41a' } },
        { name: '冲突', type: 'bar', stack: 'status', data: stats.review_summary.map((r: any) => r.conflict), itemStyle: { color: '#ff4d4f' } },
        {
          name: '复核率',
          type: 'line',
          yAxisIndex: 1,
          data: stats.review_summary.map((r: any) => r.review_rate),
          smooth: true,
          itemStyle: { color: '#1677ff' },
          lineStyle: { width: 3 },
          label: { show: true, formatter: '{c}%' }
        }
      ]
    };
  };

  return (
    <div>
      <div className="page-card">
        <div className="page-header">
          <h2 className="page-title">分组统计（月底/课前）</h2>
          <Space>
            <RangePicker
              value={dateRange as any}
              onChange={(v) => setDateRange(v as any)}
              placeholder={['开始日期', '结束日期']}
            />
          </Space>
        </div>

        {stats?.review_summary?.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={6}>
              <Card><Statistic title="试剂批次数" value={stats.review_summary.length} /></Card>
            </Col>
            <Col span={6}>
              <Card><Statistic
                title="样本总数"
                value={stats.review_summary.reduce((s: number, r: any) => s + r.total, 0)}
              /></Card>
            </Col>
            <Col span={6}>
              <Card><Statistic
                title="平均复核率"
                value={Math.round(stats.review_summary.reduce((s: number, r: any) => s + r.review_rate, 0) / stats.review_summary.length)}
                suffix="%"
                valueStyle={{ color: '#52c41a' }}
              /></Card>
            </Col>
            <Col span={6}>
              <Card><Statistic
                title="冲突总数"
                value={stats.review_summary.reduce((s: number, r: any) => s + r.conflict, 0)}
                valueStyle={{ color: '#ff4d4f' }}
              /></Card>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Card title="各批号菌种活性分布（堆积图）" loading={loading}>
              {stats?.by_batch?.length > 0
                ? <ReactECharts option={getStackedBarOption()} style={{ height: 360 }} />
                : <Empty description="暂无数据" />}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="各批号复核进度" loading={loading}>
              {stats?.review_summary?.length > 0
                ? <ReactECharts option={getReviewRateOption()} style={{ height: 360 }} />
                : <Empty description="暂无数据" />}
            </Card>
          </Col>
        </Row>

        <Card title="复核进度明细" style={{ marginTop: 16 }} loading={loading}>
          <Table
            rowKey="reagent_batch"
            dataSource={stats?.review_summary || []}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: '试剂批号', dataIndex: 'reagent_batch', width: 160 },
              { title: '样本总数', dataIndex: 'total', width: 100 },
              { title: '待复核', dataIndex: 'pending', width: 100, render: v => <Tag color="gold">{v}</Tag> },
              { title: '已复核', dataIndex: 'reviewed', width: 100, render: v => <Tag color="green">{v}</Tag> },
              { title: '冲突', dataIndex: 'conflict', width: 100, render: v => v > 0 ? <Tag color="red">{v}</Tag> : v },
              {
                title: '复核率', dataIndex: 'review_rate', width: 260,
                render: (v, r: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${v}%`,
                          background: r.conflict > 0 ? '#ff4d4f' : '#52c41a'
                        }}
                      />
                    </div>
                    <span style={{ minWidth: 48 }}>{v}%</span>
                  </div>
                )
              }
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
