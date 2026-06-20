import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  List,
  Tooltip,
  message,
  Empty,
  Progress,
  Divider,
  Timeline
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  WarningOutlined,
  FileTextOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getSample, correctSample } from '../utils/api.js';

const { Option } = Select;
const { TextArea } = Input;

const anomalyTypeMap = {
  recall_rate_drop: { color: 'red', text: '召回率下降' },
  zero_hit: { color: 'volcano', text: '零命中' },
  truncate_bug: { color: 'magenta', text: '截断异常' }
};

const reviewStatusMap = {
  pending: { color: 'default', text: '待处理' },
  in_progress: { color: 'warning', text: '处理中' },
  corrected: { color: 'blue', text: '已改判' },
  confirmed_normal: { color: 'success', text: '已确认正常' },
  corrected_anomaly: { color: 'purple', text: '已改判异常' }
};

export default function SampleDetailPage() {
  const { sampleId } = useParams();
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSample(sampleId);
      setSample(data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sampleId]);

  const handleCorrect = async (values) => {
    try {
      await correctSample(sampleId, {
        corrected_label: values.corrected_label,
        corrected_by: 'xiaoxu',
        correction_note: values.correction_note,
        evidence_attachments: values.evidence_attachments?.split(',').map(s => s.trim()).filter(Boolean) || []
      });
      message.success('改判已保存');
      setIsModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('保存失败');
    }
  };

  if (!sample) return <Empty />;

  const rateDiff = sample.baseline_hit_rate - sample.recall_hit_rate;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/samples">
          <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
        </Link>
        <Button icon={<EditOutlined />} type="primary" onClick={() => {
          if (sample.manual_correction) {
            form.setFieldsValue({
              corrected_label: sample.manual_correction.corrected_label,
              correction_note: sample.manual_correction.correction_note,
              evidence_attachments: sample.manual_correction.evidence_attachments?.join(', ')
            });
          }
          setIsModalOpen(true);
        }}>
          人工改判
        </Button>
      </Space>

      <Card
        title={
          <Space>
            <span>样本详情：{sample.sample_id}</span>
            {sample.run?.run_id_duplicate && (
              <Tooltip title={sample.run?.duplicate_note || '所属 run_id 存在重复'}>
                <Tag color="orange" icon={<WarningOutlined />}>run_id 重复</Tag>
              </Tooltip>
            )}
            {sample.is_anomaly ? (
              <Tag color="red">异常</Tag>
            ) : (
              <Tag color="green">正常</Tag>
            )}
            {sample.anomaly_type && (
              <Tag color={anomalyTypeMap[sample.anomaly_type]?.color || 'default'}>
                {anomalyTypeMap[sample.anomaly_type]?.text || sample.anomaly_type}
              </Tag>
            )}
            {(() => {
              const cfg = reviewStatusMap[sample.review_status];
              return <Tag color={cfg?.color}>{cfg?.text || sample.review_status}</Tag>;
            })()}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Descriptions title="基本信息" column={1} size="small" bordered>
              <Descriptions.Item label="样本ID">{sample.sample_id}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{sample.user_id}</Descriptions.Item>
              <Descriptions.Item label="请求ID">
                <code style={{ background: '#f5f5f5', padding: '2px 6px' }}>{sample.request_id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="场景">{sample.scene}</Descriptions.Item>
              <Descriptions.Item label="召回通道">{sample.channel}</Descriptions.Item>
              <Descriptions.Item label="时间">{dayjs(sample.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="备注">{sample.note || '-'}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions title="关联任务" column={1} size="small" bordered>
              <Descriptions.Item label="运行ID">
                <Space>
                  <Link to={`/runs/${sample.run_id}`}><LinkOutlined />{sample.run_id}</Link>
                  {sample.run?.run_id_duplicate && (
                    <Tooltip title={sample.run?.duplicate_note}>
                      <Tag color="orange" icon={<WarningOutlined />} style={{ margin: 0 }}>ID重复</Tag>
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="灰度配置">
                {sample.config ? `${sample.config.name}（${sample.config.bucket}）` : sample.config_id}
              </Descriptions.Item>
              <Descriptions.Item label="触发方式">
                {sample.run?.triggered_by === 'manual_rerun' ? '人工重跑' : '定时调度'}
              </Descriptions.Item>
              {sample.rerun_from_sample && (
                <Descriptions.Item label="重跑来源样本">
                  <Link to={`/samples/${sample.rerun_from_sample}`}>{sample.rerun_from_sample}</Link>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="证据路径">
                <code style={{ background: '#f5f5f5', padding: '2px 6px', fontSize: 12 }}>
                  {sample.run?.evidence_path}
                </code>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Divider />

        <Row gutter={24}>
          <Col span={12}>
            <Card title="召回指标" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>召回命中率：</span>
                    <strong style={{ fontSize: 20 }}>{(sample.recall_hit_rate * 100).toFixed(1)}%</strong>
                    <span style={{ color: '#999', marginLeft: 8 }}>
                      （命中 {sample.recall_hit_count} / {sample.ground_truth_items.length}）
                    </span>
                  </div>
                  <Progress
                    percent={sample.recall_hit_rate * 100}
                    strokeColor={sample.recall_hit_rate >= sample.baseline_hit_rate ? '#52c41a' : '#cf1322'}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>基线命中率：</span>
                    <strong style={{ fontSize: 18, color: '#666' }}>
                      {(sample.baseline_hit_rate * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <Progress percent={sample.baseline_hit_rate * 100} strokeColor="#bfbfbf" showInfo={false} />
                </div>
                <div>
                  <span style={{ color: '#666' }}>差值：</span>
                  <Tag color={rateDiff > 0 ? 'red' : 'green'} style={{ fontSize: 16, padding: '2px 12px' }}>
                    {rateDiff >= 0 ? '-' : '+'}{(Math.abs(rateDiff) * 100).toFixed(2)}pp
                  </Tag>
                  {sample.is_anomaly && (
                    <Space style={{ marginLeft: 12 }}>
                      <span style={{ color: '#666' }}>异常分数：</span>
                      <strong style={{ color: '#cf1322' }}>{(sample.anomaly_score * 100).toFixed(0)}</strong>
                    </Space>
                  )}
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="召回明细" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div>
                  <div style={{ color: '#666', marginBottom: 6 }}>
                    期望召回（ground truth，共 {sample.ground_truth_items.length} 个）
                  </div>
                  <Space wrap>
                    {sample.ground_truth_items.map(item => (
                      <Tag
                        key={item}
                        color={sample.recalled_items.includes(item) ? 'green' : 'red'}
                        style={{ fontSize: 13, padding: '4px 10px' }}
                      >
                        {item}
                        {sample.recalled_items.includes(item) ? ' ✓' : ' ✗'}
                      </Tag>
                    ))}
                  </Space>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: 6 }}>
                    实际召回（共 {sample.recalled_items.length} 个）
                  </div>
                  <Space wrap>
                    {sample.recalled_items.map(item => (
                      <Tag
                        key={item}
                        color={sample.ground_truth_items.includes(item) ? 'green' : 'default'}
                        style={{ fontSize: 13, padding: '4px 10px' }}
                      >
                        {item}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <span>人工改判记录</span>
            {sample.manual_correction && <Tag color="blue">已有改判</Tag>}
          </Space>
        }
      >
        {sample.manual_correction ? (
          <Timeline
            items={[
              {
                color: 'blue',
                children: (
                  <div>
                    <Space style={{ marginBottom: 8 }}>
                      <strong>{sample.manual_correction.corrected_by}</strong>
                      <span style={{ color: '#666' }}>
                        改判为 <Tag color={sample.manual_correction.corrected_label === 'normal' ? 'green' : 'purple'}>
                          {sample.manual_correction.corrected_label === 'normal' ? '正常' : '异常'}
                        </Tag>
                      </span>
                      <span style={{ color: '#999' }}>
                        {dayjs(sample.manual_correction.corrected_at).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </Space>
                    <p style={{ margin: '8px 0', color: '#333' }}>
                      {sample.manual_correction.correction_note}
                    </p>
                    {sample.manual_correction.evidence_attachments?.length > 0 && (
                      <div>
                        <div style={{ color: '#666', marginBottom: 4 }}>附件证据：</div>
                        <Space wrap>
                          {sample.manual_correction.evidence_attachments.map(f => (
                            <Tag key={f} icon={<FileTextOutlined />}>{f}</Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>
                )
              }
            ]}
          />
        ) : (
          <Empty description="暂无改判记录，点击上方「人工改判」按钮进行处理" />
        )}
      </Card>

      <Modal
        title={sample.manual_correction ? '修改人工改判' : '提交人工改判'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCorrect}>
          <Form.Item
            name="corrected_label"
            label="改判结论"
            rules={[{ required: true, message: '请选择改判结论' }]}
          >
            <Select placeholder="选择改判后的结论">
              <Option value="normal">正常（非异常）</Option>
              <Option value="anomaly">确认异常</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="correction_note"
            label="改判说明"
            rules={[{ required: true, message: '请填写改判说明' }]}
          >
            <TextArea
              rows={4}
              placeholder="说明改判理由，如：新用户无历史标签属预期行为、参数修复后恢复等"
            />
          </Form.Item>
          <Form.Item name="evidence_attachments" label="附件证据（可选，多个用逗号分隔）">
            <TextArea rows={2} placeholder="如：user_profile.png, query_log.txt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
