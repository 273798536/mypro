import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Timeline, Tag, Table, Button, Space, message, DatePicker } from 'antd';
import { 
  CheckCircleOutlined, EditOutlined, HistoryOutlined,
  FileTextOutlined, DownloadOutlined
} from '@ant-design/icons';
import { historyApi, exportApi } from '../api';
import type { HistoryChange } from '@shared/types';
import { CHANGE_TYPE_LABELS } from '@shared/constants';
import { formatDate } from '@shared/utils';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const ReviewPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState<{
    totalChanges: number;
    confirmations: number;
    modifications: number;
    records: HistoryChange[];
  } | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [customRecords, setCustomRecords] = useState<HistoryChange[]>([]);

  useEffect(() => {
    loadWeeklyReview();
  }, []);

  const loadWeeklyReview = async () => {
    setLoading(true);
    try {
      const response = await historyApi.getWeeklyReview();
      if (response.data.success && response.data.data) {
        setWeeklyData(response.data.data);
      }
    } catch (error: any) {
      message.error('加载周复盘数据失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomRange = async (dates: [dayjs.Dayjs, dayjs.Dayjs]) => {
    setLoading(true);
    try {
      const response = await historyApi.getByDateRange(
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD')
      );
      if (response.data.success && response.data.data) {
        setCustomRecords(response.data.data);
      }
    } catch (error: any) {
      message.error('加载数据失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
    if (dates && dates.length === 2) {
      loadCustomRange(dates);
    } else {
      setCustomRecords([]);
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'confirm': return 'success';
      case 'reject': return 'error';
      case 'update': return 'processing';
      case 'status_change': return 'warning';
      case 'create': return 'default';
      default: return 'default';
    }
  };

  const recordsToShow = dateRange ? customRecords : (weeklyData?.records || []);

  const columns = [
    {
      title: '时间',
      dataIndex: 'changedAt',
      key: 'changedAt',
      width: 160,
      render: (date: string) => formatDate(date, 'MM-DD HH:mm')
    },
    {
      title: '类型',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 100,
      render: (type: string) => (
        <Tag color={getChangeTypeColor(type)}>
          {CHANGE_TYPE_LABELS[type]}
        </Tag>
      )
    },
    {
      title: '操作内容',
      dataIndex: 'remark',
      key: 'remark',
      render: (text: string, record: HistoryChange) => (
        <div>
          {text || `${record.fieldName} 字段变更`}
          {record.oldValue && record.newValue && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              <span style={{ textDecoration: 'line-through' }}>{record.oldValue}</span>
              {' → '}
              <span style={{ color: '#52c41a' }}>{record.newValue}</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: '操作人',
      dataIndex: 'changedBy',
      key: 'changedBy',
      width: 80
    }
  ];

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <h2 style={{ marginBottom: 24 }}>
        <HistoryOutlined style={{ marginRight: 8 }} />
        周复盘 - 变更历史追溯
      </h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="本周总变更数"
              value={weeklyData?.totalChanges || 0}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="确认通过数"
              value={weeklyData?.confirmations || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title="修改调整数"
              value={weeklyData?.modifications || 0}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <FileTextOutlined />
            自定义时间范围查询
            <RangePicker 
              value={dateRange}
              onChange={handleDateRangeChange}
              size="small"
            />
            {dateRange && (
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => {
                  const start = dateRange[0].format('YYYY-MM-DD');
                  const end = dateRange[1].format('YYYY-MM-DD');
                  exportApi.exportCSV({ startDate: start, endDate: end });
                }}
              >
                导出当前范围
              </Button>
            )}
          </Space>
        }
      >
        {dateRange && (
          <Table
            size="small"
            columns={columns}
            dataSource={customRecords}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
        {!dateRange && (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            请选择时间范围查询历史变更
          </div>
        )}
      </Card>

      <Card 
        title={
          <Space>
            <HistoryOutlined />
            本周变更时间线
            <Button 
              size="small" 
              onClick={loadWeeklyReview}
              style={{ marginLeft: 'auto' }}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>加载中...</div>
        ) : weeklyData?.records.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            本周暂无变更记录
          </div>
        ) : (
          <Timeline items={(weeklyData?.records || []).map((item) => ({
            key: item.id,
            children: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Tag color={getChangeTypeColor(item.changeType)} style={{ marginBottom: 4 }}>
                    {CHANGE_TYPE_LABELS[item.changeType]}
                  </Tag>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {item.remark || `${item.fieldName} 字段变更`}
                  </div>
                  {item.oldValue && item.newValue && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      <span style={{ textDecoration: 'line-through', color: '#999' }}>
                        {item.oldValue}
                      </span>
                      {' → '}
                      <span style={{ color: '#52c41a' }}>{item.newValue}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    操作人：{item.changedBy}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', flexShrink: 0, marginLeft: 16 }}>
                  {formatDate(item.changedAt, 'MM-DD HH:mm')}
                </div>
              </div>
            )
          }))} />
        )}
      </Card>

      <Card 
        style={{ marginTop: 24 }}
        title="交付说明"
        type="inner"
      >
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p><strong>使用说明：</strong></p>
          <ul style={{ marginLeft: 20, color: '#666' }}>
            <li>左侧筛选条件、人工备注和截图说明自动关联，刷新页面后状态保持</li>
            <li>材料版本中标记"口径已改"的记录会在变更历史中留痕，可追溯修改前后内容</li>
            <li>对象重叠记录已单独分类，避免混入正常结果影响判断</li>
            <li>导出PDF时，标注、侧边明细和报告使用同一数据源，确保口径一致</li>
            <li>周复盘页面可追溯一周内所有变更，便于周一早会向负责人解释</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default ReviewPage;
