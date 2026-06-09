import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Tag, Button, Space, Progress, Descriptions, App as AntdApp } from 'antd';
import {
  UploadOutlined, AuditOutlined, BarChartOutlined, HistoryOutlined, ExportOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import type { BatchDetailResponse } from '../types';

const BatchDashboard: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [detail, setDetail] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/batches/${batchId}/detail`);
      setDetail(res.data);
    } catch (e) {
      message.error('加载批次详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [batchId]);

  const statusColor: Record<string, string> = {
    待导入: 'default',
    已导入: 'blue',
    冲突检测中: 'processing',
    待复核: 'orange',
    复核中: 'gold',
    已完成: 'green'
  };

  if (!detail) {
    return (
      <div className="page-container">
        <Card loading={loading}>
          <div style={{ height: 300 }} />
        </Card>
      </div>
    );
  }

  const { batch } = detail;
  const reviewProgress =
    detail.questions_count > 0
      ? Math.round((detail.reviews_count / detail.questions_count) * 100)
      : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">批次详情 — {batch.batch_name}</h2>
        <div className="page-subtitle">
          状态：
          <Tag color={statusColor[batch.status as string]} style={{ marginLeft: 6 }}>
            {batch.status}
          </Tag>
          <span style={{ marginLeft: 16 }}>
            创建：{dayjs(batch.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </span>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic title="题目数量" value={detail.questions_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic title="参数记录" value={detail.param_records_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="冲突总数"
              value={detail.conflicts_count}
              valueStyle={{ color: detail.conflicts_count > 0 ? '#cf1322' : undefined }}
              suffix={
                detail.conflicts_unresolved_count > 0 ? (
                  <span style={{ fontSize: 13, color: '#d46b08', marginLeft: 4 }}>
                    未解决 {detail.conflicts_unresolved_count}
                  </span>
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="误差过大"
              value={detail.excessive_errors_count}
              valueStyle={{ color: detail.excessive_errors_count > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="复核进度">
            <Progress
              percent={reviewProgress}
              status={reviewProgress === 100 ? 'success' : 'active'}
            />
            <div style={{ marginTop: 12, color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
              已完成 {detail.reviews_count} / {detail.questions_count} 条复核记录
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="批次信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="批次ID">{batch.id}</Descriptions.Item>
              <Descriptions.Item label="批次名称">{batch.batch_name}</Descriptions.Item>
              <Descriptions.Item label="操作员">{batch.operator || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{batch.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(batch.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最近更新">
                {dayjs(batch.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="快捷入口" style={{ marginTop: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(`/batches/${batchId}/import`)}
              actions={[
                <Button type="link" icon={<ArrowRightOutlined />}>
                  进入导入
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<UploadOutlined style={{ fontSize: 28, color: '#1677ff' }} />}
                title="① 数据导入"
                description="导入题目清单与参数表，保留原始行号、图片名、来源备注"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(`/batches/${batchId}/review`)}
              actions={[
                <Button type="link" icon={<ArrowRightOutlined />}>
                  进入复核
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<AuditOutlined style={{ fontSize: 28, color: '#d46b08' }} />}
                title="② 排课老师复核"
                description="按异常分类（补材料/改口径）标记，按可用/暂缓/重新采集分级"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(`/batches/${batchId}/error-analysis`)}
              actions={[
                <Button type="link" icon={<ArrowRightOutlined />}>
                  进入分析
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<BarChartOutlined style={{ fontSize: 28, color: '#cf1322' }} />}
                title="③ 误差分析与反例"
                description="KKT 四项误差评估，反例生成回溯源材料，学生视角可用性区分"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(`/batches/${batchId}/history`)}
              actions={[
                <Button type="link" icon={<ArrowRightOutlined />}>
                  查看历史
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<HistoryOutlined style={{ fontSize: 28, color: '#722ed1' }} />}
                title="④ 历史对比"
                description="快照记录、跨轮次对比，保留处理痕迹便于追溯"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(`/batches/${batchId}/export`)}
              actions={[
                <Button type="link" icon={<ArrowRightOutlined />}>
                  进入导出
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<ExportOutlined style={{ fontSize: 28, color: '#389e0d' }} />}
                title="⑤ 报告导出"
                description="教师复核报告、学生使用报告、冲突记录、JSON完整快照"
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BatchDashboard;
