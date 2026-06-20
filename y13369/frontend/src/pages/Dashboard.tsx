import React, { useEffect, useState } from 'react';
import { Row, Col, Card, List, Tag, Button, Statistic, Empty, Spin, Divider } from 'antd';
import { DashboardOutlined, FileTextOutlined, EditOutlined, WarningOutlined, ArrowRightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { dashboardApi } from '../api';
import type { DashboardStats as Stats } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    dashboardApi.getStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="评测批次（版本记录）"
              value={stats.total_runs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              已覆盖模型版本：{stats.model_versions.join('、') || '无'}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="评测记录总条数"
              value={stats.total_records}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              重跑不覆盖，历史永久留存
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="人工改判记录"
              value={stats.total_judgments}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              公式/单位/阈值分层标注
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理异常"
              value={stats.open_anomalies}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              含验证集污染，可追溯原始说法
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={14}>
          <Card
            title={
              <span>
                <ClockCircleOutlined style={{ marginRight: 6 }} />
                最近评测批次（点击进入复核）
              </span>
            }
            extra={
              <Button type="link" onClick={() => navigate('/runs')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
          >
            {stats.recent_runs.length === 0 ? (
              <Empty description="暂无评测批次，请前往『评测批次』导入" />
            ) : (
              <List
                dataSource={stats.recent_runs}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="view"
                        type="primary"
                        size="small"
                        onClick={() => navigate(`/runs/${item.id}`)}
                      >
                        进入复核
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span>
                          <Tag color="blue">{item.model_version}</Tag>
                          <span style={{ marginLeft: 8 }}>{item.original_filename}</span>
                        </span>
                      }
                      description={
                        <div>
                          <span style={{ color: '#666', marginRight: 16 }}>
                            复核人：{item.evaluator}
                          </span>
                          <span style={{ color: '#666', marginRight: 16 }}>
                            记录数：{item.record_count}
                          </span>
                          <span style={{ color: '#999' }}>
                            {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                          </span>
                          {item.notes && (
                            <>
                              <Divider type="vertical" />
                              <span style={{ color: '#fa8c16' }}>备注：{item.notes}</span>
                            </>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col span={10}>
          <Card title="复核人操作指引">
            <div style={{ lineHeight: 2, fontSize: 14 }}>
              <p>
                <strong>📍 材料存放</strong>：左侧『评测批次』中导入 CSV/Excel，字段名不一致会自动归一化并记录来源。
              </p>
              <p>
                <strong>🔍 异常查看</strong>：左侧『异常追踪』集中查看验证集污染、召回异常等问题，可追原始说法。
              </p>
              <p>
                <strong>📊 版本对比</strong>：左侧『版本对比』选择两个批次，查看指标差异和 query 级变化，旧人工判断不被覆盖。
              </p>
              <p>
                <strong>✏️ 人工改判</strong>：进入单条记录详情，标注改判卡在『公式 / 单位 / 阈值』哪一层，理由永久留存。
              </p>
              <p>
                <strong>📤 重新导出</strong>：在批次详情页一键导出带改判、带异常标注的完整 JSON。
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
