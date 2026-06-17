import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Tabs, List, Tag, Typography, Empty, Spin } from 'antd';
import {
  MusicOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store';
import { tourApi, trackApi } from '@/api';
import { Tour, Track, TourStats } from '@/types';
import { getStatusColor, getStatusText, formatDateShort } from '@/utils';

const { Title, Text } = Typography;

interface TodoItem {
  id: string;
  trackId: string;
  trackNo: number;
  title: string;
  artist: string;
  status: string;
  type: 'operation' | 'teacher';
  description: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedTour,
    tourStats,
    tracks,
    loading,
    setSelectedTour,
    setTourStats,
    setTracks,
    setLoading,
  } = useAppStore();

  const [activeTodoTab, setActiveTodoTab] = useState<string>('operation');
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const toursResponse = await tourApi.findAll({ limit: 1 });
        if (toursResponse.data.length > 0) {
          const tour = toursResponse.data[0];
          setSelectedTour(tour);

          const stats = await tourApi.getStats(tour.id);
          setTourStats(stats);

          const tracksResponse = await trackApi.findAll({ limit: 100 });
          setTracks(tracksResponse.data);

          generateMockTodos(tracksResponse.data, tour);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setSelectedTour, setTourStats, setTracks, setLoading]);

  const generateMockTodos = (tracks: Track[], tour: Tour) => {
    const mockTodos: TodoItem[] = [];

    tracks.slice(0, 10).forEach((track, index) => {
      const types: Array<'operation' | 'teacher'> = ['operation', 'teacher'];
      const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
      const descriptions = [
        '需要上传音频材料',
        '时间码偏差超过阈值，需要复核',
        '匹配结果需要确认',
        '备注需要更新',
        '等待老师审核',
      ];

      mockTodos.push({
        id: `todo-${track.id}`,
        trackId: track.id,
        trackNo: track.trackNo,
        title: track.title,
        artist: track.artist,
        status: track.status,
        type: types[index % 2],
        description: descriptions[index % descriptions.length],
        priority: priorities[index % 3],
        createdAt: new Date(Date.now() - index * 3600000).toISOString(),
      });
    });

    setTodos(mockTodos);
  };

  const statusDistributionOption = useMemo(() => {
    if (!tracks.length) return {};

    const statusCounts: Record<string, number> = {};
    tracks.forEach((track) => {
      statusCounts[track.status] = (statusCounts[track.status] || 0) + 1;
    });

    const data = Object.entries(statusCounts).map(([status, count]) => ({
      value: count,
      name: getStatusText(status as Track['status']),
    }));

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#2a2a2a',
        borderColor: '#424242',
        textStyle: { color: 'rgba(255,255,255,0.85)' },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: 'rgba(255,255,255,0.65)' },
      },
      series: [
        {
          name: '状态分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#1f1f1f',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: 'rgba(255,255,255,0.85)',
            },
          },
          labelLine: {
            show: false,
          },
          data,
          color: ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'],
        },
      ],
    };
  }, [tracks]);

  const timecodeDeviationOption = useMemo(() => {
    if (!tracks.length) return {};

    const tracksWithDeviation = tracks
      .filter((t) => t.timecodeDeviation !== undefined)
      .slice(0, 15);

    const categories = tracksWithDeviation.map((t) => `#${t.trackNo} ${t.title.slice(0, 10)}`);
    const deviations = tracksWithDeviation.map((t) => (t.timecodeDeviation || 0) * 1000);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#2a2a2a',
        borderColor: '#424242',
        textStyle: { color: 'rgba(255,255,255,0.85)' },
        formatter: (params: unknown) => {
          const p = params as Array<{ axisValue: string; value: number }>;
          return `${p[0].axisValue}<br/>偏差: ${p[0].value.toFixed(0)} ms`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: 'rgba(255,255,255,0.65)',
          rotate: 45,
          fontSize: 11,
        },
        axisLine: { lineStyle: { color: '#424242' } },
      },
      yAxis: {
        type: 'value',
        name: '偏差 (ms)',
        nameTextStyle: { color: 'rgba(255,255,255,0.65)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        axisLine: { lineStyle: { color: '#424242' } },
        splitLine: { lineStyle: { color: '#303030' } },
      },
      series: [
        {
          name: '时间码偏差',
          type: 'bar',
          data: deviations.map((d) => ({
            value: d,
            itemStyle: {
              color: Math.abs(d) > 500 ? '#ff4d4f' : Math.abs(d) > 300 ? '#faad14' : '#52c41a',
            },
          })),
          barWidth: '60%',
        },
        {
          name: '+500ms阈值',
          type: 'line',
          data: new Array(categories.length).fill(500),
          lineStyle: {
            color: '#ff4d4f',
            type: 'dashed',
            width: 2,
          },
          symbol: 'none',
          label: {
            show: true,
            position: 'top',
            formatter: '+500ms',
            color: '#ff4d4f',
            fontSize: 10,
          },
        },
        {
          name: '-500ms阈值',
          type: 'line',
          data: new Array(categories.length).fill(-500),
          lineStyle: {
            color: '#ff4d4f',
            type: 'dashed',
            width: 2,
          },
          symbol: 'none',
          label: {
            show: true,
            position: 'bottom',
            formatter: '-500ms',
            color: '#ff4d4f',
            fontSize: 10,
          },
        },
      ],
    };
  }, [tracks]);

  const filteredTodos = useMemo(() => {
    if (activeTodoTab === 'all') return todos;
    return todos.filter((todo) => todo.type === activeTodoTab);
  }, [todos, activeTodoTab]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高优';
      case 'medium':
        return '中优';
      case 'low':
        return '低优';
      default:
        return priority;
    }
  };

  const handleTodoClick = (trackId: string) => {
    navigate(`/tracks/${trackId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <Title level={2} style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>
          {selectedTour?.name || '巡演管理系统'}
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
          {selectedTour
            ? `${formatDateShort(selectedTour.startDate)} - ${formatDateShort(selectedTour.endDate)} · ${selectedTour.shows?.length || 0} 场演出`
            : '暂无巡演数据'}
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">总曲目数</span>}
              value={tourStats?.totalTracks || 0}
              prefix={<MusicOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: 'rgba(255,255,255,0.85)', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">待处理</span>}
              value={tourStats?.pendingTracks || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">复核中</span>}
              value={tourStats?.processingTracks || 0}
              prefix={<EyeOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">已通过</span>}
              value={tourStats?.completedTracks || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExclamationCircleOutlined style={{ color: '#1677ff' }} />
                状态分布
              </span>
            }
            className="card"
          >
            {tracks.length > 0 ? (
              <ReactECharts
                option={statusDistributionOption}
                style={{ height: '350px', width: '100%' }}
                theme="dark"
              />
            ) : (
              <Empty description="暂无数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WarningOutlined style={{ color: '#faad14' }} />
                时间码偏差
              </span>
            }
            className="card"
          >
            {tracks.filter((t) => t.timecodeDeviation !== undefined).length > 0 ? (
              <ReactECharts
                option={timecodeDeviationOption}
                style={{ height: '350px', width: '100%' }}
                theme="dark"
              />
            ) : (
              <Empty description="暂无时间码数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        className="card"
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockCircleOutlined style={{ color: '#1677ff' }} />
            待办事项
          </span>
        }
      >
        <Tabs
          activeKey={activeTodoTab}
          onChange={setActiveTodoTab}
          items={[
            { key: 'operation', label: `运营待办 (${todos.filter((t) => t.type === 'operation').length})` },
            { key: 'teacher', label: `老师待办 (${todos.filter((t) => t.type === 'teacher').length})` },
            { key: 'all', label: `全部待办 (${todos.length})` },
          ]}
        />
        {filteredTodos.length > 0 ? (
          <List
            dataSource={filteredTodos}
            renderItem={(item) => (
              <List.Item
                onClick={() => handleTodoClick(item.trackId)}
                style={{
                  cursor: 'pointer',
                  padding: '16px',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Text strong style={{ color: 'rgba(255,255,255,0.85)' }}>
                        #{item.trackNo} {item.title}
                      </Text>
                      <Tag color={getStatusColor(item.status as Track['status'])}>
                        {getStatusText(item.status as Track['status'])}
                      </Tag>
                      <Tag color={getPriorityColor(item.priority)}>{getPriorityText(item.priority)}</Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                        {item.artist}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '13px' }}>
                        {item.description}
                      </Text>
                    </div>
                  }
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatDateShort(item.createdAt)}
                </Text>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无待办事项" style={{ padding: '40px 0' }} />
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
