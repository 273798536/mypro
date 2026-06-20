import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Row,
  Col,
  Button,
  Space,
  Tag,
  List,
  Empty,
  Modal,
  Form,
  Select,
  Input,
  message,
  Divider,
  Timeline,
  Statistic,
  Spin,
  Tooltip,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, HistoryOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { recordsApi, judgmentsApi } from '../api';
import type { EvaluationRecord } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const JUDGE_TYPES = [
  { value: 'formula', label: '公式问题（计算公式错误）', color: 'red' },
  { value: 'unit', label: '单位问题（单位/量纲不一致）', color: 'orange' },
  { value: 'threshold', label: '阈值问题（阈值设置不合理）', color: 'blue' },
  { value: 'field_mapping', label: '字段映射（字段名归一化偏差）', color: 'purple' },
  { value: 'other', label: '其他', color: 'default' },
];

const getJudgeTypeInfo = (v: string) => JUDGE_TYPES.find((j) => j.value === v) || { label: v, color: 'default' };

const RecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recId = Number(id);

  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [judgeModalOpen, setJudgeModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recId) {
      loadData();
    }
  }, [recId]);

  const loadData = async () => {
    setLoading(true);
    const [r, h] = await Promise.all([recordsApi.get(recId), recordsApi.history(recId)]);
    setRecord(r);
    setHistory(h);
    setLoading(false);
  };

  const handleAddJudgment = async () => {
    try {
      const values = await form.validateFields();
      await judgmentsApi.create({
        record_id: recId,
        judge_type: values.judge_type,
        before_value: record?.metrics || {},
        after_value: values.after_value ? JSON.parse(values.after_value) : {},
        reason: values.reason,
        judge_name: values.judge_name,
      });
      message.success('改判记录已保存（历史版本不可覆盖）');
      setJudgeModalOpen(false);
      form.resetFields();
      loadData();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };

  if (loading || !record) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/runs/${record.run_id}`)}
        style={{ marginBottom: 16 }}
      >
        返回批次
      </Button>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card
            title={
              <Space>
                <EditOutlined />
                评测记录详情
                <Tag color="blue">Query ID: {record.query_id}</Tag>
                {record.anomaly_flag && (
                  <Tag color={record.anomaly_flag.includes('pollution') ? 'red' : 'gold'}>
                    {record.anomaly_flag.includes('pollution') ? '验证集污染' : '异常'}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setJudgeModalOpen(true)}>
                添加人工改判
              </Button>
            }
          >
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="查询文本" span={2}>
                {record.query_text || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="正例文档 (expected)">
                <Space wrap>
                  {(record.expected_docs || []).map((d, i) => (
                    <Tag key={i} color="green">{String(d)}</Tag>
                  ))}
                  {(record.expected_docs || []).length === 0 && <span style={{ color: '#999' }}>无</span>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="召回文档 (recalled)">
                <Space wrap>
                  {(record.recalled_docs || []).map((d, i) => {
                    const isHit = (record.expected_docs || []).includes(d);
                    return (
                      <Tag key={i} color={isHit ? 'green' : 'default'}>
                        {String(d)} {isHit ? '✓' : ''}
                      </Tag>
                    );
                  })}
                  {(record.recalled_docs || []).length === 0 && <span style={{ color: '#999' }}>无</span>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="指标 (metrics)" span={2}>
                <Row gutter={12}>
                  {Object.entries(record.metrics || {}).map(([k, v]) => (
                    <Col key={k}>
                      <Statistic
                        title={k}
                        value={typeof v === 'number' ? (v < 1 ? (v * 100).toFixed(1) + '%' : v) : String(v)}
                        style={{ display: 'inline-block', marginRight: 20 }}
                      />
                    </Col>
                  ))}
                  {Object.keys(record.metrics || {}).length === 0 && <span style={{ color: '#999' }}>无</span>}
                </Row>
              </Descriptions.Item>
            </Descriptions>

            {record.anomaly_desc && (
              <div style={{ marginTop: 16 }}>
                <Divider orientation="left">异常 / 验证集污染原始描述（溯源）</Divider>
                <div
                  style={{
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    padding: 12,
                    borderRadius: 6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <ThunderboltOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                  {record.anomaly_desc}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Divider orientation="left">原始字段（保留所有来源字段名，未归一化）</Divider>
              <Descriptions column={1} bordered size="small">
                {Object.entries(record.original_fields || {}).map(([k, v]) => (
                  <Descriptions.Item key={k} label={k}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </Descriptions.Item>
                ))}
                {Object.keys(record.original_fields || {}).length === 0 && (
                  <Descriptions.Item label="(无)">-</Descriptions.Item>
                )}
              </Descriptions>
            </div>

            <div style={{ marginTop: 16 }}>
              <Divider orientation="left">人工改判时间线（不可覆盖）</Divider>
              {(record.judgments?.length || 0) === 0 ? (
                <Empty description="暂无人工改判，点击右上角『添加人工改判』" />
              ) : (
                <Timeline
                  mode="left"
                  items={record.judgments
                    .slice()
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((j) => {
                      const info = getJudgeTypeInfo(j.judge_type);
                      return {
                        color: info.color === 'red' ? 'red' : info.color === 'orange' ? 'orange' : info.color === 'blue' ? 'blue' : 'gray',
                        label: dayjs(j.created_at).format('YYYY-MM-DD HH:mm'),
                        children: (
                          <Card size="small" title={
                            <Space>
                              <Tag color={info.color}>{info.label}</Tag>
                              <span>改判人：{j.judge_name}</span>
                            </Space>
                          }>
                            {Object.keys(j.before_value || {}).length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <strong>改判前：</strong>
                                {JSON.stringify(j.before_value)}
                              </div>
                            )}
                            {Object.keys(j.after_value || {}).length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <strong>改判后：</strong>
                                {JSON.stringify(j.after_value)}
                              </div>
                            )}
                            <div style={{ color: '#333' }}>
                              <strong>理由：</strong>{j.reason}
                            </div>
                          </Card>
                        ),
                      };
                    })}
                />
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <Divider orientation="left">异常处理记录</Divider>
              {(record.anomalies?.length || 0) === 0 ? (
                <Empty description="无异常记录" />
              ) : (
                <List
                  dataSource={record.anomalies}
                  renderItem={(a) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={a.status === 'resolved' ? 'green' : a.status === 'processing' ? 'orange' : 'red'}>
                              {a.status === 'resolved' ? '已处理' : a.status === 'processing' ? '处理中' : '待处理'}
                            </Tag>
                            <Tag color="gold">{a.anomaly_type}</Tag>
                            <span style={{ color: '#999', fontSize: 12 }}>
                              {a.handler ? `处理人：${a.handler}` : '未分配处理人'}
                            </span>
                            <span style={{ color: '#999', fontSize: 12 }}>
                              {dayjs(a.created_at).format('YYYY-MM-DD HH:mm')}
                            </span>
                          </Space>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <strong>原始描述：</strong>{a.original_description}
                            </div>
                            {a.notes && (
                              <div>
                                <strong>处理备注：</strong>{a.notes}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title={
              <Space>
                <HistoryOutlined />
                历史版本（同 Query ID）
              </Space>
            }
            size="small"
            extra={<span style={{ color: '#999', fontSize: 12 }}>模型版本换了也不覆盖</span>}
          >
            {history.length <= 1 ? (
              <Empty description="仅有当前版本" />
            ) : (
              <List
                size="small"
                dataSource={history}
                renderItem={(h) => (
                  <List.Item
                    style={h.id === record.id ? { background: '#e6f7ff', borderRadius: 4 } : {}}
                    actions={[
                      h.id !== record.id && (
                        <Button
                          key="go"
                          type="link"
                          size="small"
                          onClick={() => navigate(`/records/${h.id}`)}
                        >
                          查看
                        </Button>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color="blue">v{/* placeholder */}</Tag>
                          <Tooltip title={`Run #${h.run_id}`}>
                            <span>Run #{h.run_id}</span>
                          </Tooltip>
                          {h.id === record.id && <Tag color="cyan">当前</Tag>}
                          {h.anomaly_flag && <Tag color="red">异常</Tag>}
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {dayjs(h.created_at).format('YYYY-MM-DD HH:mm')}
                          </div>
                          <div style={{ fontSize: 12 }}>
                            召回率：
                            {h.metrics && typeof h.metrics.recall_rate === 'number'
                              ? (h.metrics.recall_rate * 100).toFixed(1) + '%'
                              : '-'}
                          </div>
                          {(h.judgments?.length || 0) > 0 && (
                            <Tag color="orange" style={{ marginTop: 4 }}>
                              {h.judgments.length} 条改判
                            </Tag>
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
      </Row>

      <Modal
        title="添加人工改判（明确卡在公式 / 单位 / 阈值哪一层）"
        open={judgeModalOpen}
        onCancel={() => setJudgeModalOpen(false)}
        onOk={handleAddJudgment}
        okText="保存改判"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="改判类型（必须明确卡在哪一层）"
            name="judge_type"
            rules={[{ required: true, message: '请选择改判类型' }]}
          >
            <Select placeholder="选择问题层级">
              {JUDGE_TYPES.map((j) => (
                <Option key={j.value} value={j.value}>
                  {j.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="改判人" name="judge_name" rules={[{ required: true }]}>
            <Input placeholder="如：小林" />
          </Form.Item>
          <Form.Item label="改判后的值（JSON 格式）" name="after_value">
            <TextArea rows={3} placeholder='如：{"recall_rate": 0.95, "f1": 0.92}' />
          </Form.Item>
          <Form.Item
            label="改判理由（必须写清楚）"
            name="reason"
            rules={[{ required: true, message: '请填写改判理由' }]}
          >
            <TextArea rows={4} placeholder="详细说明为什么改判，引用原始说法或数据..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RecordDetail;
