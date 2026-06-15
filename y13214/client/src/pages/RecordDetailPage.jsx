import React, { useEffect, useState } from 'react';
import {
  Descriptions,
  Button,
  Space,
  Card,
  Row,
  Col,
  Upload,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Tabs,
  Tag,
  List,
  Alert,
  Modal,
  App as AntdApp,
  Image,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  HistoryOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { royaltyApi } from '../api/index.js';
import { useAppStore } from '../store/index.js';
import { StatusTag, SourceBadge, formatTime, missingFields } from '../utils/components.jsx';

const { TextArea } = Input;
const { Option } = Select;

export default function RecordDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message, modal } = AntdApp.useApp();
  const operator = useAppStore((s) => s.operator);

  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffPair, setDiffPair] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([
        royaltyApi.getRecord(id),
        royaltyApi.getHistory({ recordId: id })
      ]);
      setRecord(r);
      setHistory(h);
      form.setFieldsValue({
        ...r,
        authorizationExpiry: r.authorizationExpiry ? dayjs(r.authorizationExpiry) : null
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!record) return <div style={{ padding: 24 }}>加载中...</div>;

  async function handleSave(values) {
    const payload = {
      ...values,
      authorizationExpiry: values.authorizationExpiry
        ? values.authorizationExpiry.format('YYYY-MM-DD')
        : '',
      operator
    };
    await royaltyApi.updateRecord(record.id, payload);
    message.success('已保存，变化已进入历史记录');
    load();
  }

  async function handleScreenshot(file) {
    try {
      const r = await royaltyApi.uploadScreenshot(file);
      await royaltyApi.updateRecord(record.id, { screenshot: r.path, operator });
      message.success('截图已上传');
      load();
    } catch (e) {
      message.error('上传失败');
    }
    return false;
  }

  function openDiff(h) {
    setDiffPair(h);
    setDiffOpen(true);
  }

  const missing = missingFields(record);

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/records')}>
          返回列表
        </Button>
        <h2 style={{ margin: 0 }}>
          {record.workTitle || '(未命名作品)'}
          <SourceBadge source={record.source} />
        </h2>
        <StatusTag status={record.status} />
      </Space>

      {record.status === 'expired' && (
        <div className="expired-banner">
          ⚠️ 此记录授权已过期（{record.authorizationExpiry}），已被单独拎出，不会混入正常可放行结果。
          {record.authorizationStatus && <span>（授权状态备注：{record.authorizationStatus}）</span>}
        </div>
      )}

      {record.status === 'pending' && missing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="材料待补"
          description={
            <Space wrap>
              {missing.map((m) => (
                <Tag color="orange" key={m}>
                  缺少：{m}
                </Tag>
              ))}
            </Space>
          }
        />
      )}

      <Row gutter={16}>
        <Col span={14}>
          <Card title="📋 基础信息 & 编辑" size="small">
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="workTitle" label="作品名称" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="singerName" label="演唱者" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="part" label="声部">
                    <Select allowClear>
                      <Option value="女高">女高</Option>
                      <Option value="女低">女低</Option>
                      <Option value="男高">男高</Option>
                      <Option value="男低">男低</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="shareRatio" label="分账比例(%)" rules={[{ required: true }]}>
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="authorizationExpiry" label="授权到期日" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="contactInfo" label="联系方式">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="manualStatus" label="人工覆盖状态">
                    <Select allowClear>
                      <Option value="ready">标记可放行</Option>
                      <Option value="pending">标记材料待补</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="authorizationStatus" label="授权状态备注">
                    <Input placeholder="如：续约中/已废弃" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="rehearsalNote" label="排练/授权备注（补一条排练或授权备注再重扫）">
                    <TextArea rows={2} placeholder="排练安排或授权的补充说明，会和历史记录一起保留" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="manualNote" label="人工备注（给接手同事看）">
                    <TextArea rows={2} placeholder="例如：已与XXX确认，比例无误。——小孟" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                保存并记录历史
              </Button>
            </Form>
          </Card>

          <Card title="📷 截图说明（和备注、筛选一起同步保留）" size="small" style={{ marginTop: 16 }}>
            {record.screenshot ? (
              <div>
                <Image src={record.screenshot} style={{ maxWidth: '100%', maxHeight: 400 }} />
                <Divider />
              </div>
            ) : (
              <Alert type="info" message="暂无截图" showIcon style={{ marginBottom: 12 }} />
            )}
            <Upload beforeUpload={handleScreenshot} showUploadList={false} accept="image/*">
              <Button icon={<UploadOutlined />}>上传截图</Button>
            </Upload>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="🔍 原始数据溯源（脏数据留痕，不被修得看不出痕迹）" size="small">
            <div className="raw-diff">
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                导入来源：{record.source} · {formatTime(record.importedAt)}
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(record.raw, null, 2)}
              </pre>
            </div>
            <Divider orientation="left">当前值 vs 原始值对比</Divider>
            <RawCompare raw={record.raw} current={record} />
          </Card>

          <Card
            title={
              <Space>
                <HistoryOutlined />
                <span>操作历史（人工确认前后的变化都在这里，能解释给接手同事）</span>
              </Space>
            }
            size="small"
            style={{ marginTop: 16 }}
          >
            {history.length === 0 ? (
              <div style={{ color: '#8c8c8c' }}>暂无历史</div>
            ) : (
              <List
                dataSource={history}
                renderItem={(h) => (
                  <div className="history-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space>
                        <Tag color="blue">{h.action}</Tag>
                        <span style={{ fontWeight: 500 }}>{h.operator}</span>
                      </Space>
                      <span style={{ color: '#8c8c8c', fontSize: 12 }}>{formatTime(h.timestamp)}</span>
                    </div>
                    {h.before && h.after && (
                      <div style={{ marginTop: 8 }}>
                        <Button size="small" type="link" onClick={() => openDiff(h)}>
                          查看变化对比
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="历史变化对比"
        open={diffOpen}
        onCancel={() => setDiffOpen(false)}
        footer={null}
        width={720}
      >
        {diffPair && (
          <Tabs
            items={[
              {
                key: 'before',
                label: '变化前',
                children: (
                  <div className="raw-diff">
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(diffPair.before, null, 2)}
                    </pre>
                  </div>
                )
              },
              {
                key: 'after',
                label: '变化后',
                children: (
                  <div className="raw-diff">
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(diffPair.after, null, 2)}
                    </pre>
                  </div>
                )
              }
            ]}
          />
        )}
      </Modal>
    </div>
  );
}

function RawCompare({ raw, current }) {
  const keys = ['workTitle', 'singerName', 'part', 'shareRatio', 'authorizationExpiry'];
  const label = {
    workTitle: '作品名称',
    singerName: '演唱者',
    part: '声部',
    shareRatio: '分账比例',
    authorizationExpiry: '授权到期日'
  };
  return (
    <div>
      {keys.map((k) => {
        const r = raw?.[k] ?? raw?.[label[k]] ?? '';
        const c = current?.[k] ?? '';
        const diff = String(r) !== String(c);
        return (
          <div key={k} style={{ padding: '4px 0', borderBottom: '1px dashed #f0f0f0' }}>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{label[k]}</div>
            {diff ? (
              <div>
                <span className="diff-old">{String(r) || '(空)'}</span>
                {' → '}
                <span className="diff-new">{String(c) || '(空)'}</span>
              </div>
            ) : (
              <div>{String(c) || '(空)'}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
