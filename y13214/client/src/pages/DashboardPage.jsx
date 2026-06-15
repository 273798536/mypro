import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Alert, List, Tag, Button, Space } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationOutlined,
  WarningOutlined,
  TeamOutlined,
  FileExcelOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { royaltyApi } from '../api/index.js';
import { StatusTag, SourceBadge, formatTime } from '../utils/components.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [expiredList, setExpiredList] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);

  async function load() {
    const [s, expired, pending, history] = await Promise.all([
      royaltyApi.getSummary(),
      royaltyApi.getRecords({ status: 'expired' }),
      royaltyApi.getRecords({ status: 'pending' }),
      royaltyApi.getHistory({ limit: 5 })
    ]);
    setSummary(s);
    setExpiredList(expired);
    setPendingList(pending.slice(0, 5));
    setRecentHistory(history);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="记录总数" value={summary?.total || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="可放行"
              value={summary?.ready || 0}
              valueStyle={{ color: '#389e0d' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="材料待补"
              value={summary?.pending || 0}
              valueStyle={{ color: '#d46b08' }}
              prefix={<ExclamationOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="授权过期"
              value={summary?.expired || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>⚠️ 授权过期（单独拎出，不混入正常结果）</span>
                <Button type="link" size="small" onClick={() => navigate('/records?status=expired')}>
                  查看全部 <ArrowRightOutlined />
                </Button>
              </div>
            }
          >
            {expiredList.length === 0 ? (
              <Alert type="success" message="暂无过期记录" showIcon />
            ) : (
              <List
                dataSource={expiredList}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button size="small" type="link" onClick={() => navigate(`/records/${item.id}`)}>
                        查看
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.workTitle || '(未命名作品)'}</span>
                          <StatusTag status={item.status} />
                          <SourceBadge source={item.source} />
                        </Space>
                      }
                      description={
                        <div>
                          <div>演唱者：{item.singerName || '-'}</div>
                          <div>授权到期日：{item.authorizationExpiry || '-'}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📋 材料待补清单（告诉小孟哪条该补）</span>
                <Button type="link" size="small" onClick={() => navigate('/records?status=pending')}>
                  查看全部 <ArrowRightOutlined />
                </Button>
              </div>
            }
          >
            {pendingList.length === 0 ? (
              <Alert type="success" message="所有材料齐全，可放行 🎉" showIcon />
            ) : (
              <List
                dataSource={pendingList}
                renderItem={(item) => {
                  const missing = [];
                  if (!item.workTitle) missing.push('作品名称');
                  if (!item.singerName) missing.push('演唱者');
                  if (!item.shareRatio && item.shareRatio !== 0) missing.push('分账比例');
                  if (!item.authorizationExpiry) missing.push('授权到期日');
                  return (
                    <List.Item
                      actions={[
                        <Button size="small" type="link" onClick={() => navigate(`/records/${item.id}`)}>
                          补材料
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <span>{item.workTitle || '(未命名作品)'}</span>
                            <StatusTag status={item.status} />
                          </Space>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 4 }}>演唱者：{item.singerName || '-'}</div>
                            <Space wrap>
                              <span style={{ color: '#8c8c8c' }}>缺少：</span>
                              {missing.map((m) => (
                                <Tag color="orange" key={m}>
                                  {m}
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📝 最近操作（历史可追溯，能解释给接手同事）</span>
                <Space>
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={() => royaltyApi.exportExcel()}
                  >
                    导出分账清单
                  </Button>
                  <Button type="link" size="small" onClick={() => navigate('/history')}>
                    完整历史 <ArrowRightOutlined />
                  </Button>
                </Space>
              </div>
            }
          >
            <List
              dataSource={recentHistory}
              renderItem={(h) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="blue">{h.action}</Tag>
                        <span>{h.operator}</span>
                        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                          {formatTime(h.timestamp)}
                        </span>
                      </Space>
                    }
                    description={
                      h.source
                        ? `导入 ${h.source}，共 ${h.count} 条`
                        : h.recordId
                        ? `记录 ID: ${h.recordId.slice(0, 8)}...`
                        : h.snapshotId
                        ? `版本快照 ID: ${h.snapshotId.slice(0, 8)}...`
                        : null
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
