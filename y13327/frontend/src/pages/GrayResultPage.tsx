import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Typography, Tag, Table,
  Divider, Space, Tabs, Descriptions, Button, Empty, message, Select, Form, Modal, Input, InputNumber
} from 'antd';
import {
  LineChartOutlined, ArrowUpOutlined, ArrowDownOutlined,
  PlusOutlined, TeamOutlined, FilterOutlined, EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GrayResult } from '../types';
import { getGrayResults, createGrayResult } from '../api';

const { Title, Paragraph, Text } = Typography;

export function GrayResultPage() {
  const [list, setList] = useState<GrayResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GrayResult | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchList = () => {
    setLoading(true);
    getGrayResults()
      .then(res => {
        setList(res || []);
        if ((res || []).length > 0 && !selected) setSelected(res[0]);
      })
      .catch(e => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, []);

  const handleCreate = async () => {
    try {
      const v = await form.validateFields();
      setLoading(true);
      await createGrayResult(v);
      message.success('灰度批次已创建，已分项计算样本/阈值/人工改判');
      setCreateOpen(false);
      form.resetFields();
      fetchList();
    } catch (e: any) { message.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 20, width: '100%' }}>
        <div>
          <Title level={3} style={{ margin: 0, marginBottom: 4 }}>灰度结果报告</Title>
          <Paragraph style={{ margin: 0, color: '#6b7280' }}>
            报告中可拆开查看样本变化、阈值变化、人工改判三项的分项影响。
          </Paragraph>
        </div>
        <Space style={{ marginLeft: 'auto' }}>
          <Select
            style={{ width: 260 }}
            placeholder="选择灰度批次查看"
            value={selected?.id}
            onChange={(id) => setSelected(list.find(g => g.id === id) || null)}
            options={list.map(g => ({
              value: g.id,
              label: `${g.gray_batch} · ${g.report_date}`
            }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.setFieldsValue({
                gray_batch: `GRAY-${dayjs().format('YYYY-Www')}`,
                report_date: dayjs().format('YYYY-MM-DD')
              });
              setCreateOpen(true);
            }}
          >
            登记新灰度批次
          </Button>
        </Space>
      </Space>

      {!selected ? (
        <Empty description="暂无灰度报告，请先登记灰度批次" />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card bordered={false} style={{ borderRadius: 8, borderTop: '4px solid #1677ff' }}>
                <Space align="start">
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: '#e6f4ff', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#1677ff'
                  }}>
                    <LineChartOutlined style={{ fontSize: 22 }} />
                  </div>
                  <div>
                    <div style={{ color: '#999', fontSize: 12 }}>灰度批次</div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{selected.gray_batch}</div>
                    <Tag color="blue">报告日期：{selected.report_date}</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} style={{ borderRadius: 8, borderTop: '4px solid #52c41a' }}>
                <Statistic
                  title="人工改判变化率"
                  value={selected.manual_review.change_rate}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: 26 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  共审阅 {selected.manual_review.total_reviewed} 条，改判 {selected.manual_review.total_changed} 条
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} style={{ borderRadius: 8, borderTop: '4px solid #faad14' }}>
                <Statistic
                  title="样本变化"
                  value={selected.sample_change.difference}
                  prefix={selected.sample_change.difference >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  suffix={`(${selected.sample_change.difference_rate})`}
                  valueStyle={{
                    color: selected.sample_change.difference >= 0 ? '#1677ff' : '#ff4d4f',
                    fontSize: 26
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selected.sample_change.before_count} → {selected.sample_change.after_count}
                </Text>
              </Card>
            </Col>
          </Row>

          <Tabs
            defaultActiveKey="breakdown"
            style={{ background: '#fff', padding: 16, borderRadius: 8 }}
            items={[
              {
                key: 'breakdown',
                label: <span><FilterOutlined />分项拆解：样本/阈值/人工</span>,
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card
                        bordered
                        title={
                          <Space>
                            <Tag color="blue">样本变化</Tag>
                            总数 {selected.sample_change.before_count} → {selected.sample_change.after_count}
                          </Space>
                        }
                        extra={<Text type="secondary">变化率 {selected.sample_change.difference_rate}</Text>}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="新增样本">
                            <Text strong style={{ color: '#52c41a' }}>+{selected.sample_change.details.added}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="移除样本">
                            <Text strong style={{ color: '#ff4d4f' }}>-{selected.sample_change.details.removed}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="内容变更">
                            <Text strong style={{ color: '#faad14' }}>{selected.sample_change.details.modified}</Text>
                          </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <div>
                          <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>样本构成变化图示</div>
                          <Progress
                            percent={Math.min(100, Math.round(
                              (selected.sample_change.details.added / Math.max(selected.sample_change.after_count, 1)) * 100
                            ))}
                            strokeColor="#52c41a"
                            showInfo={false}
                          />
                          <Progress
                            percent={Math.min(100, Math.round(
                              (selected.sample_change.details.modified / Math.max(selected.sample_change.after_count, 1)) * 100
                            ))}
                            strokeColor="#faad14"
                            showInfo={false}
                          />
                          <Progress
                            percent={Math.min(100, Math.round(
                              ((selected.sample_change.after_count - selected.sample_change.details.added - selected.sample_change.details.modified)
                                / Math.max(selected.sample_change.after_count, 1)) * 100
                            ))}
                            strokeColor="#1677ff"
                            showInfo={false}
                          />
                          <Space style={{ marginTop: 6 }} size={[12, 4]} wrap>
                            <Tag color="green">新增</Tag>
                            <Tag color="orange">变更</Tag>
                            <Tag color="blue">保留</Tag>
                          </Space>
                        </div>
                      </Card>
                    </Col>

                    <Col span={8}>
                      <Card
                        bordered
                        title={
                          <Space>
                            <Tag color="orange">阈值变化</Tag>
                            {selected.threshold_change.before_threshold} → {selected.threshold_change.after_threshold}
                          </Space>
                        }
                        extra={<Text type="secondary">影响 {selected.threshold_change.impact_count} 条</Text>}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="调整前阈值">
                            {selected.threshold_change.before_threshold}
                          </Descriptions.Item>
                          <Descriptions.Item label="调整后阈值">
                            {selected.threshold_change.after_threshold}
                          </Descriptions.Item>
                          <Descriptions.Item label="阈值差值">
                            {selected.threshold_change.after_threshold - selected.threshold_change.before_threshold > 0
                              ? <Text type="success">↑收紧阈值</Text>
                              : <Text type="danger">↓放宽阈值</Text>
                            }
                          </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <div style={{ marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>等级变化分布（共{selected.threshold_change.impact_count}条）</Text>
                        </div>
                        <div style={{
                          display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6
                        }}>
                          <span style={{ width: 70, fontSize: 12 }}>升级</span>
                          <Progress
                            percent={Math.round(
                              (selected.threshold_change.impact_details.upgraded / Math.max(selected.threshold_change.impact_count, 1)) * 100
                            )}
                            strokeColor="#52c41a"
                          />
                          <Tag color="green">{selected.threshold_change.impact_details.upgraded}</Tag>
                        </div>
                        <div style={{
                          display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6
                        }}>
                          <span style={{ width: 70, fontSize: 12 }}>降级</span>
                          <Progress
                            percent={Math.round(
                              (selected.threshold_change.impact_details.downgraded / Math.max(selected.threshold_change.impact_count, 1)) * 100
                            )}
                            strokeColor="#ff4d4f"
                          />
                          <Tag color="red">{selected.threshold_change.impact_details.downgraded}</Tag>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 70, fontSize: 12 }}>不变</span>
                          <Progress
                            percent={Math.round(
                              (selected.threshold_change.impact_details.unchanged / Math.max(selected.threshold_change.impact_count, 1)) * 100
                            )}
                            strokeColor="#bfbfbf"
                          />
                          <Tag>{selected.threshold_change.impact_details.unchanged}</Tag>
                        </div>
                      </Card>
                    </Col>

                    <Col span={8}>
                      <Card
                        bordered
                        title={
                          <Space>
                            <Tag color="purple">人工改判</Tag>
                            变化率 {selected.manual_review.change_rate}
                          </Space>
                        }
                        extra={<Text type="secondary">共改判 {selected.manual_review.total_changed} 条</Text>}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="人工审阅数">
                            <Text strong>{selected.manual_review.total_reviewed}</Text> 条
                          </Descriptions.Item>
                          <Descriptions.Item label="聚类调整">
                            <Tag color="blue">{selected.manual_review.details.cluster_adjusted} 条</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="引用补充">
                            <Tag color="green">{selected.manual_review.details.citation_added} 条</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="备注追加">
                            <Tag color="orange">{selected.manual_review.details.note_appended} 条</Tag>
                          </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '12px 0' }} />
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8
                        }}>
                          <div style={{
                            background: '#e6f4ff', padding: 8, borderRadius: 6,
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 12, color: '#666' }}>聚类调整</div>
                            <div style={{
                              fontSize: 18, fontWeight: 600, color: '#1677ff'
                            }}>
                              {Math.round(
                                (selected.manual_review.details.cluster_adjusted / Math.max(selected.manual_review.total_changed, 1)) * 100
                              )}%
                            </div>
                          </div>
                          <div style={{
                            background: '#f6ffed', padding: 8, borderRadius: 6,
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 12, color: '#666' }}>引用补充</div>
                            <div style={{
                              fontSize: 18, fontWeight: 600, color: '#52c41a'
                            }}>
                              {Math.round(
                                (selected.manual_review.details.citation_added / Math.max(selected.manual_review.total_changed, 1)) * 100
                              )}%
                            </div>
                          </div>
                          <div style={{
                            gridColumn: 'span 2',
                            background: '#fff7e6', padding: 8, borderRadius: 6,
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 12, color: '#666' }}>备注追加</div>
                            <div style={{
                              fontSize: 18, fontWeight: 600, color: '#faad14'
                            }}>
                              {Math.round(
                                (selected.manual_review.details.note_appended / Math.max(selected.manual_review.total_changed, 1)) * 100
                              )}%
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                )
              },
              {
                key: 'summary',
                label: <span><EditOutlined />批次汇总与对比</span>,
                children: (
                  <div>
                    <div className="card-section">
                      <div className="section-title">本批次概览（{selected.gray_batch}）</div>
                      <Table
                        size="small"
                        pagination={false}
                        bordered
                        dataSource={[
                          {
                            dim: '样本变化',
                            before: selected.sample_change.before_count,
                            after: selected.sample_change.after_count,
                            diff: `${selected.sample_change.difference >= 0 ? '+' : ''}${selected.sample_change.difference} (${selected.sample_change.difference_rate})`,
                            note: `新增${selected.sample_change.details.added}、移除${selected.sample_change.details.removed}、变更${selected.sample_change.details.modified}`
                          },
                          {
                            dim: '阈值变化',
                            before: selected.threshold_change.before_threshold,
                            after: selected.threshold_change.after_threshold,
                            diff: `共影响 ${selected.threshold_change.impact_count} 条`,
                            note: `升级${selected.threshold_change.impact_details.upgraded}、降级${selected.threshold_change.impact_details.downgraded}、不变${selected.threshold_change.impact_details.unchanged}`
                          },
                          {
                            dim: '人工改判',
                            before: selected.manual_review.total_reviewed,
                            after: `${selected.manual_review.total_changed} 条改判`,
                            diff: selected.manual_review.change_rate,
                            note: `聚类调整${selected.manual_review.details.cluster_adjusted}、引用补充${selected.manual_review.details.citation_added}、备注追加${selected.manual_review.details.note_appended}`
                          }
                        ]}
                        rowKey="dim"
                        columns={[
                          { title: '维度', dataIndex: 'dim', width: 120, render: v => <Text strong>{v}</Text> },
                          { title: '调整前', dataIndex: 'before', width: 160 },
                          { title: '调整后', dataIndex: 'after', width: 180 },
                          { title: '差异 / 变化率', dataIndex: 'diff', width: 180 },
                          { title: '明细说明', dataIndex: 'note' }
                        ]}
                      />
                    </div>

                    <div className="card-section">
                      <div className="section-title">历史批次对比</div>
                      {list.length < 2 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="至少需要2个批次才能进行对比"
                        />
                      ) : (
                        <Table
                          size="small"
                          pagination={false}
                          bordered
                          dataSource={list}
                          rowKey="id"
                          columns={[
                            {
                              title: '批次', dataIndex: 'gray_batch',
                              render: (v, r: GrayResult) => (
                                <Space>
                                  {v}
                                  {r.id === selected.id && <Tag color="blue">当前</Tag>}
                                </Space>
                              )
                            },
                            { title: '报告日期', dataIndex: 'report_date' },
                            {
                              title: '样本变化',
                              render: (_v, r: GrayResult) => (
                                <Space>
                                  <Text type="secondary">{r.sample_change.before_count}→{r.sample_change.after_count}</Text>
                                  <Tag color={r.sample_change.difference >= 0 ? 'green' : 'red'}>
                                    {r.sample_change.difference_rate}
                                  </Tag>
                                </Space>
                              )
                            },
                            {
                              title: '阈值调整',
                              render: (_v, r: GrayResult) => (
                                <Text>
                                  {r.threshold_change.before_threshold} → {r.threshold_change.after_threshold}
                                  <Text type="secondary"> （影响{r.threshold_change.impact_count}条）</Text>
                                </Text>
                              )
                            },
                            {
                              title: '人工改判率',
                              dataIndex: ['manual_review', 'change_rate'],
                              render: v => <Tag color="purple">{v}</Tag>
                            }
                          ]}
                        />
                      )}
                    </div>
                  </div>
                )
              }
            ]}
          />
        </>
      )}

      <Modal
        title="登记灰度批次"
        open={createOpen}
        width={720}
        onCancel={() => setCreateOpen(false)}
        footer={[
          <Button onClick={() => setCreateOpen(false)}>取消</Button>,
          <Button type="primary" loading={loading} onClick={handleCreate}>创建并分项计算</Button>
        ]}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="系统会自动基于输入数据计算样本变化、阈值影响和人工改判的分项结果"
        />
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="灰度批次号" name="gray_batch" rules={[{ required: true }]}>
                <Input placeholder="如 GRAY-2026-W25" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="报告日期" name="report_date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">样本信息</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="调整前样本数" name="sample_before">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="调整后样本数" name="sample_after">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">阈值信息</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="调整前阈值（0-1）" name="threshold_before">
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="调整后阈值（0-1）" name="threshold_after">
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">人工改判信息</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="人工审阅总数" name="review_total">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="实际改判数" name="review_changed">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
