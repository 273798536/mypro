import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Spin,
  message,
  Table
} from 'antd';
import {
  WarningOutlined,
  StopOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

interface HrbpData {
  focusFields: string[];
  data: {
    byCategoryAndStatus: Array<{
      retryCategory: string;
      status: string;
      count: number;
    }>;
    statusBreakdown: Array<{
      status: string;
      count: number;
    }>;
    dailyTrend: Array<{
      date: string;
      status: string;
      count: number;
    }>;
    recentDeadLetters: any[];
    recentManualReviews: any[];
  };
}

const categoryLabels: Record<string, string> = {
  network_error: '网络错误',
  data_conflict: '数据冲突',
  validation_error: '验证错误',
  duplicate_record: '重复记录',
  missing_data: '数据缺失',
  system_error: '系统错误',
  unknown: '未知错误'
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  retrying: '重试中',
  success: '成功',
  failed: '失败',
  dead_letter: '死信',
  manual_review: '待人工审核',
  compensated: '已补偿入账',
  closed: '已关闭'
};

function HrbpDashboard() {
  const [data, setData] = useState<HrbpData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/hrbp-dashboard');
      setData(response.data);
    } catch (error) {
      message.error('获取HRBP仪表盘数据失败');
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

  const statusData = data?.data.statusBreakdown || [];
  const pieOption = {
    title: {
      text: '队列状态分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '数量',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: statusData.map(item => ({
          value: item.count,
          name: statusLabels[item.status] || item.status
        }))
      }
    ]
  };

  const categoryData = data?.data.byCategoryAndStatus || [];
  const categories = [...new Set(categoryData.map(d => d.retryCategory))];
  const barOption = {
    title: {
      text: '错误分类分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {},
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: categories.map(c => categoryLabels[c] || c)
    },
    series: [
      {
        name: '待处理',
        type: 'bar',
        stack: 'total',
        data: categories.map(c =>
          categoryData.find(d => d.retryCategory === c && d.status === 'pending')?.count || 0
        )
      },
      {
        name: '重试中',
        type: 'bar',
        stack: 'total',
        data: categories.map(c =>
          categoryData.find(d => d.retryCategory === c && d.status === 'retrying')?.count || 0
        )
      },
      {
        name: '死信',
        type: 'bar',
        stack: 'total',
        data: categories.map(c =>
          categoryData.find(d => d.retryCategory === c && d.status === 'dead_letter')?.count || 0
        )
      },
      {
        name: '待人工审核',
        type: 'bar',
        stack: 'total',
        data: categories.map(c =>
          categoryData.find(d => d.retryCategory === c && d.status === 'manual_review')?.count || 0
        )
      }
    ]
  };

  const dailyData = data?.data.dailyTrend || [];
  const dates = [...new Set(dailyData.map(d => d.date))].sort();
  const lineOption = {
    title: {
      text: '近7日趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {},
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    },
    yAxis: {
      type: 'value'
    },
    series: ['dead_letter', 'manual_review', 'retrying'].map(status => ({
      name: statusLabels[status],
      type: 'line',
      stack: '总量',
      data: dates.map(date =>
        dailyData.find(d => d.date === date && d.status === status)?.count || 0
      )
    }))
  };

  const deadLetterColumns: ColumnsType<any> = [
    {
      title: '队列编号',
      dataIndex: 'queueNo',
      width: 140,
      render: (text) => <code style={{ fontSize: 11 }}>{text}</code>
    },
    {
      title: '员工',
      dataIndex: 'employeeName',
      width: 80
    },
    {
      title: '培训',
      dataIndex: 'trainingName',
      width: 150,
      ellipsis: true
    },
    {
      title: '错误分类',
      dataIndex: 'retryCategory',
      width: 100,
      render: (text) => categoryLabels[text] || text
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      width: 80,
      render: (text, record) => `${text}/${record.maxRetryCount}`
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (text) => dayjs(text).format('MM-DD HH:mm')
    }
  ];

  const reviewColumns: ColumnsType<any> = [
    {
      title: '队列编号',
      dataIndex: 'queueNo',
      width: 140,
      render: (text) => <code style={{ fontSize: 11 }}>{text}</code>
    },
    {
      title: '员工',
      dataIndex: 'employeeName',
      width: 80
    },
    {
      title: '培训',
      dataIndex: 'trainingName',
      width: 150,
      ellipsis: true
    },
    {
      title: '处理人',
      dataIndex: 'handledBy',
      width: 80,
      render: () => '-'
    },
    {
      title: '处理时间',
      dataIndex: 'handledAt',
      width: 150,
      render: (text) => text ? dayjs(text).format('MM-DD HH:mm') : '-'
    }
  ];

  const deadLetterCount = statusData.find(s => s.status === 'dead_letter')?.count || 0;
  const manualReviewCount = statusData.find(s => s.status === 'manual_review')?.count || 0;
  const retryingCount = statusData.find(s => s.status === 'retrying')?.count || 0;
  const pendingCount = statusData.find(s => s.status === 'pending')?.count || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HRBP控制台</h1>
      </div>

      <Card className="hrbp-focus" title="重点关注" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="死信队列（需要人工接管）"
              value={deadLetterCount}
              prefix={<StopOutlined />}
              valueStyle={{ color: 'white' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="待人工审核"
              value={manualReviewCount}
              prefix={<UserOutlined />}
              valueStyle={{ color: 'white' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="重试中"
              value={retryingCount}
              prefix={<SyncOutlined />}
              valueStyle={{ color: 'white' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="待处理"
              value={pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: 'white' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card>
            <ReactECharts option={pieOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card>
            <ReactECharts option={barOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={lineOption} style={{ height: 300 }} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="最近死信队列" extra={<Tag color="red">{deadLetterCount}条</Tag>}>
            {data?.data.recentDeadLetters.length === 0 ? (
              <p style={{ color: '#8c8c8c', textAlign: 'center', padding: 20 }}>暂无死信记录</p>
            ) : (
              <Table
                columns={deadLetterColumns}
                dataSource={data?.data.recentDeadLetters || []}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近待审核" extra={<Tag color="purple">{manualReviewCount}条</Tag>}>
            {data?.data.recentManualReviews.length === 0 ? (
              <p style={{ color: '#8c8c8c', textAlign: 'center', padding: 20 }}>暂无待审核记录</p>
            ) : (
              <Table
                columns={reviewColumns}
                dataSource={data?.data.recentManualReviews || []}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="关注字段说明" style={{ marginTop: 16 }}>
        <List
          size="small"
          dataSource={data?.focusFields || []}
          renderItem={(item: string) => (
            <List.Item>
              <code>{item}</code>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}

export default HrbpDashboard;
