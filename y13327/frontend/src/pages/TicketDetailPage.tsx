import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Descriptions, Tag, Space, Typography, Input, Select,
  Form, message, Row, Col, Divider, Empty, Table, Timeline, Alert,
  Upload, Modal, Tabs, Radio, Tooltip, Progress, Statistic, List, Badge
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ArrowLeftOutlined, SaveOutlined, HistoryOutlined,
  WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
  UploadOutlined, FileTextOutlined, DownloadOutlined, TagOutlined,
  AuditOutlined, ReloadOutlined, DeleteOutlined
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import type {
  Ticket, ReviewRecord, HistoryVersion, Screenshot,
  MissingCitationRecord
} from '../types';
import {
  getTicket, getTicketReviews, getTicketHistory, updateTicket, createReview,
  getMissingCitation, detectMissingCitation, createMissingCitation,
  confirmMissingCitation, getScreenshots, uploadScreenshots,
  getExportUrl, operatorName
} from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CLUSTER_OPTIONS = [
  '数据安全-个人信息泄露',
  '数据安全-平台漏洞',
  '数据安全-合规问题',
  '消费投诉-退款纠纷',
  '消费投诉-售后服务',
  '消费投诉-商品质量',
  '市场观察-竞品分析',
  '市场观察-产品对比',
  '产品反馈-功能建议',
  '产品反馈-使用体验',
  '产品反馈-Bug报告',
  '运营数据-推广活动',
  '运营数据-用户增长',
  '运营数据-留存转化',
  '其他-待分类'
];

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'pending', label: '待处理', color: 'default' },
  { value: 'processing', label: '处理中', color: 'processing' },
  { value: 'confirmed', label: '已确认', color: 'blue' },
  { value: 'citation_missing', label: '引用缺失待确认', color: 'warning' },
  { value: 'completed', label: '已完成', color: 'success' }
];

const CITATION_STATUS_OPTIONS = [
  { value: 'complete', label: '引用完整', color: 'green' },
  { value: 'partial', label: '部分引用', color: 'orange' },
  { value: 'missing', label: '引用缺失', color: 'red' }
];

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ticketId = id ? parseInt(id) : 0;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [history, setHistory] = useState<HistoryVersion[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [missingCitation, setMissingCitation] = useState<MissingCitationRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [missingForm] = Form.useForm();

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [isLegacyScreenshots, setIsLegacyScreenshots] = useState(false);
  const [legacyModal, setLegacyModal] = useState(false);

  const exportRef = useRef<HTMLAnchorElement>(null);
  const [missingReasonOpen, setMissingReasonOpen] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      getTicket(ticketId),
      getTicketReviews(ticketId),
      getTicketHistory(ticketId),
      getScreenshots(ticketId),
      getMissingCitation(ticketId)
    ]).then(([t, r, h, s, m]) => {
      setTicket(t);
      setReviews(r || []);
      setHistory(h || []);
      setScreenshots(s || []);
      setMissingCitation(m || null);
      form.setFieldsValue({
        title: t.title,
        final_cluster: t.final_cluster,
        status: t.status,
        citation_status: t.citation_status,
        citation_urls: (t.citation_urls || []).join('\n'),
        content: t.content,
        change_note: ''
      });
    }).catch(e => message.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [ticketId]);

  const handleSaveBasic = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const citationUrls = (values.citation_urls || '')
        .split(/[\n,，]/)
        .map((u: string) => u.trim())
        .filter(Boolean);
      const updated = await updateTicket(ticketId, {
        ...values,
        citation_urls: citationUrls
      });
      setTicket(updated);
      message.success('基础信息已保存，变更已记入历史版本');
      fetchAll();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      if (values.before_cluster === values.after_cluster && !values.review_note) {
        message.warning('聚类未变更时，请至少填写改判备注');
        return;
      }
      setSaving(true);
      await createReview(ticketId, {
        ...values,
        reviewer: operatorName
      });
      message.success('人工改判已提交，处理记录与截图说明已保留');
      reviewForm.resetFields();
      fetchAll();
    } catch (e: any) {
      message.error(e.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDetectMissing = async () => {
    try {
      setSaving(true);
      const res = await detectMissingCitation(ticketId, ['投诉内容', '事件时间', '涉及主体', '数据来源']);
      if (res.has_gap) {
        missingForm.setFieldsValue({
          missing_items: res.missing_items,
          reason: 'reference_unverified',
          reason_detail: '',
          auto_confirm_impact: true
        });
        setMissingReasonOpen(true);
        message.warning(`检测到 ${res.missing_items.length} 项引用/字段缺失，请确认原因与影响范围`);
      } else {
        message.success('未检测到明显引用缺失');
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMissingRecord = async () => {
    try {
      const values = await missingForm.validateFields();
      setSaving(true);
      const record = await createMissingCitation(ticketId, values);
      setMissingCitation(record);
      setMissingReasonOpen(false);
      message.success('已创建引用缺失待确认记录，请联系排班同事跟进');
      fetchAll();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMissing = async (recordId: number) => {
    Modal.confirm({
      title: '确认引用缺失处理',
      content: '确认后，工单状态将恢复为「待处理」，可继续补充引用后再次检测。',
      onOk: async () => {
        try {
          setSaving(true);
          await confirmMissingCitation(recordId);
          message.success('已确认引用缺失记录，工单回到待处理状态');
          fetchAll();
        } catch (e: any) { message.error(e.message); }
        finally { setSaving(false); }
      }
    });
  };

  const beforeUpload = (file: RcFile, FileList: RcFile[]) => {
    setFileList(FileList.map(f => ({ uid: f.uid, name: f.name, size: f.size, type: f.type, originFileObj: f })));
    return false;
  };

  const handleUploadScreenshots = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择截图文件');
      return;
    }
    try {
      setSaving(true);
      const files = fileList
        .filter(f => f.originFileObj)
        .map(f => f.originFileObj as File);
      const descriptions = files.map(f =>
        fileDescriptions[f.uid] || f.name.replace(/\.[^.]+$/, '')
      );
      await uploadScreenshots(ticketId, files, descriptions, isLegacyScreenshots);
      message.success(`已上传 ${files.length} 张截图${isLegacyScreenshots ? '（标记为历史版本）' : ''}`);
      setFileList([]);
      setFileDescriptions({});
      setLegacyModal(false);
      fetchAll();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!ticket) return;
    const link = document.createElement('a');
    link.href = getExportUrl(ticketId);
    link.download = `交付说明_${ticket.ticket_no}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('已生成交付说明导出文件，内容与页面显示保持一致');
  };

  if (!ticket) {
    return (
      <div className="page-container">
        <Empty description="加载中或工单不存在" />
      </div>
    );
  }

  return (
    <div className="page-container" id="export-root">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回列表</Button>
        <Title level={3} style={{ margin: 0 }}>
          工单详情：{ticket.ticket_no}
        </Title>
        <Tag color={STATUS_OPTIONS.find(s => s.value === ticket.status)?.color}>
          {STATUS_OPTIONS.find(s => s.value === ticket.status)?.label}
        </Tag>
        <Space style={{ marginLeft: 'auto' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>刷新</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出交付说明
          </Button>
        </Space>
      </Space>

      <Tabs
        defaultActiveKey="basic"
        size="large"
        style={{ background: '#fff', padding: 16, borderRadius: 8 }}
        items={[
          {
            key: 'basic',
            label: <span><AuditOutlined />基础信息与人工改判</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="card-section">
                    <div className="section-title">工单基础信息（修改后保留历史版本）</div>
                    <Form form={form} layout="vertical">
                      <Form.Item
                        label="工单标题"
                        name="title"
                        rules={[{ required: true, message: '请输入标题' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            label="原始聚类（系统判定）"
                            name="original_cluster"
                          >
                            <Input disabled value={ticket.original_cluster} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="最终聚类（人工改判）" name="final_cluster">
                            <Select allowClear showSearch placeholder="选择人工改判后的聚类">
                              {CLUSTER_OPTIONS.map(c => (
                                <Option key={c} value={c}>{c}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="处理状态" name="status">
                            <Select>
                              {STATUS_OPTIONS.map(s => (
                                <Option key={s.value} value={s.value}>{s.label}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="引用完整性" name="citation_status">
                            <Select>
                              {CITATION_STATUS_OPTIONS.map(s => (
                                <Option key={s.value} value={s.value}>
                                  {s.label}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item label="引用链接（每行或逗号分隔1条）" name="citation_urls">
                        <TextArea rows={4} placeholder={'https://example.com/1\nhttps://example.com/2'} />
                      </Form.Item>
                      <Form.Item label="工单内容描述" name="content">
                        <TextArea rows={4} />
                      </Form.Item>
                      <Form.Item label="本次变更说明（记入历史）" name="change_note">
                        <Input placeholder="请说明为何要做本次变更" />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving}
                          onClick={handleSaveBasic}
                        >
                          保存基础信息
                        </Button>
                        <Text type="secondary" style={{ marginLeft: 12 }}>
                          所有变更都会保留在「历史版本」中，旧版本截图也不会被覆盖
                        </Text>
                      </Form.Item>
                    </Form>
                  </div>
                </Col>

                <Col span={12}>
                  <div className="card-section">
                    <div className="section-title">人工改判提交</div>
                    <Paragraph type="secondary" style={{ marginTop: -8 }}>
                      提交后会生成处理记录，排班同事可随时查看前一次处理状态和截图说明。
                    </Paragraph>
                    <Form form={reviewForm} layout="vertical">
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            label="改判前聚类"
                            name="before_cluster"
                            initialValue={ticket.final_cluster || ticket.original_cluster}
                            rules={[{ required: true }]}
                          >
                            <Select>
                              {CLUSTER_OPTIONS.map(c => (
                                <Option key={c} value={c}>{c}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="改判后聚类"
                            name="after_cluster"
                            initialValue={ticket.final_cluster || ticket.original_cluster}
                            rules={[{ required: true }]}
                          >
                            <Select>
                              {CLUSTER_OPTIONS.map(c => (
                                <Option key={c} value={c}>{c}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        label="改判备注（给后续处理人看）"
                        name="review_note"
                      >
                        <TextArea rows={3} placeholder="为什么要这样改判？依据是什么？" />
                      </Form.Item>
                      <Form.Item
                        label="截图说明（与上传的截图一一对应）"
                        name="screenshot_descriptions"
                      >
                        <TextArea
                          rows={3}
                          placeholder={
                            '图1：接口漏洞技术分析截图\n图2：数据流向示意图\n图3：客服对话记录'
                          }
                        />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          icon={<AuditOutlined />}
                          loading={saving}
                          onClick={handleSubmitReview}
                        >
                          提交人工改判
                        </Button>
                      </Form.Item>
                    </Form>

                    <Divider>引用缺失检测</Divider>
                    {missingCitation && !missingCitation.confirmed ? (
                      <Alert
                        type="warning"
                        showIcon
                        icon={<ExclamationCircleOutlined />}
                        message="存在未确认的引用缺失记录"
                        description={
                          <div>
                            <div>原因类型：<Tag color="orange">{missingCitation.reason}</Tag></div>
                            <div>缺失项：{missingCitation.missing_items.length} 项</div>
                            <div style={{ marginTop: 8 }}>
                              <Button type="primary" size="small" onClick={() => handleConfirmMissing(missingCitation.id)}>
                                我已补充引用/确认缺失
                              </Button>
                            </div>
                          </div>
                        }
                      />
                    ) : (
                      <Alert
                        type="info"
                        showIcon
                        message={missingCitation?.confirmed ? '此前的引用缺失已处理确认' : '引用检测'}
                        description={
                          <Space>
                            <Button icon={<WarningOutlined />} onClick={handleDetectMissing} loading={saving}>
                              检测引用缺失
                            </Button>
                            <Button type="dashed" onClick={() => {
                              missingForm.resetFields();
                              setMissingReasonOpen(true);
                            }}>
                              手动登记缺失原因
                            </Button>
                          </Space>
                        }
                      />
                    )}

                    <Divider>处理记录预览（最新3条）</Divider>
                    {reviews.length === 0 ? (
                      <Empty description="暂无人工改判记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <List
                        size="small"
                        dataSource={reviews.slice(0, 3)}
                        renderItem={r => (
                          <List.Item>
                            <List.Item.Meta
                              title={
                                <Space>
                                  <Text strong>{r.reviewer}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(r.created_at).format('MM-DD HH:mm')}
                                  </Text>
                                </Space>
                              }
                              description={
                                <div>
                                  <Text type="secondary">{r.before_cluster}</Text>
                                  <span style={{ margin: '0 6px' }}>→</span>
                                  <Text strong style={{ color: '#1677ff' }}>{r.after_cluster}</Text>
                                  {r.review_note && <div style={{ marginTop: 4 }}>备注：{r.review_note}</div>}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                </Col>
              </Row>
            )
          },
          {
            key: 'history',
            label: <span><HistoryOutlined />历史版本与处理记录</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="card-section">
                    <div className="section-title">
                      处理记录（{reviews.length}）
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>可追溯</Tag>
                    </div>
                    {reviews.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <Timeline
                        className="history-timeline"
                        mode="left"
                        items={reviews.map(r => ({
                          color: 'blue',
                          label: dayjs(r.created_at).format('HH:mm:ss'),
                          children: (
                            <Card size="small" title={
                              <Space>
                                <TagOutlined />{r.reviewer}
                              </Space>
                            }>
                              <Descriptions size="small" column={1}>
                                <Descriptions.Item label="改判方向">
                                  {r.before_cluster} → <Text strong style={{ color: '#1677ff' }}>{r.after_cluster}</Text>
                                </Descriptions.Item>
                                {r.review_note && (
                                  <Descriptions.Item label="改判备注">{r.review_note}</Descriptions.Item>
                                )}
                                {r.screenshot_descriptions && (
                                  <Descriptions.Item label="截图说明">
                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                      {r.screenshot_descriptions}
                                    </pre>
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          )
                        }))}
                      />
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <div className="card-section">
                    <div className="section-title">
                      字段历史变更（{history.length}）
                      <Tag color="green" style={{ marginLeft: 'auto' }}>保留旧值</Tag>
                    </div>
                    {history.length === 0 ? (
                      <Empty description="暂无字段变更记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <Timeline
                        className="history-timeline"
                        items={history.map(h => ({
                          color: h.field_name.includes('聚类') ? '#1677ff' : '#52c41a',
                          children: (
                            <Card
                              size="small"
                              title={
                                <Space>
                                  <Tag color="blue">v{h.version}</Tag>
                                  <Text strong>{h.field_name}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {h.changed_by} · {dayjs(h.changed_at).format('MM-DD HH:mm')}
                                  </Text>
                                </Space>
                              }
                            >
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <div>
                                  <Text type="secondary">旧值：</Text>
                                  <Text delete style={{ color: '#999' }}>{h.old_value || '(空)'}</Text>
                                </div>
                                <div>
                                  <Text type="secondary">新值：</Text>
                                  <Text strong style={{ color: '#1677ff' }}>{h.new_value || '(空)'}</Text>
                                </div>
                                {h.change_note && (
                                  <div>
                                    <Text type="secondary">说明：</Text>
                                    <Text>{h.change_note}</Text>
                                  </div>
                                )}
                                {h.old_screenshot_refs && h.old_screenshot_refs.length > 0 && (
                                  <div>
                                    <Text type="secondary">关联旧截图：</Text>
                                    <Space wrap>
                                      {h.old_screenshot_refs.map(ref => (
                                        <Tag key={ref} color="purple">{ref}</Tag>
                                      ))}
                                    </Space>
                                  </div>
                                )}
                              </Space>
                            </Card>
                          )
                        }))}
                      />
                    )}
                  </div>
                </Col>
              </Row>
            )
          },
          {
            key: 'screenshots',
            label: <span><UploadOutlined />截图说明（含历史版本）</span>,
            children: (
              <div>
                <div className="card-section">
                  <div className="section-title">上传新截图 / 补录历史截图</div>
                  <Row gutter={[16, 16]}>
                    <Col span={14}>
                      <Upload.Dragger
                        multiple
                        listType="picture"
                        fileList={fileList}
                        beforeUpload={beforeUpload}
                        onRemove={f => setFileList(prev => prev.filter(p => p.uid !== f.uid))}
                      >
                        <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 32 }} /></p>
                        <p>点击或拖拽截图文件到此区域上传</p>
                        <p className="ant-upload-hint">支持 PNG/JPG/GIF，单文件 ≤10MB</p>
                      </Upload.Dragger>
                    </Col>
                    <Col span={10}>
                      <div className="section-title" style={{ fontSize: 14 }}>为每张图填写说明</div>
                      <Space direction="vertical" style={{ width: '100%', maxHeight: 360, overflow: 'auto' }}>
                        {fileList.length === 0 && (
                          <Text type="secondary">先选择文件，再在这里给每张图补说明</Text>
                        )}
                        {fileList.map(f => (
                          <div key={f.uid} style={{
                            border: '1px solid #f0f0f0',
                            padding: '8px 10px', borderRadius: 6,
                            background: '#fafafa'
                          }}>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                              {f.name}
                            </div>
                            <Input
                              size="small"
                              placeholder="输入这张图的说明，例如「图1：原始聚类结果」"
                              value={fileDescriptions[f.uid] || ''}
                              onChange={e => setFileDescriptions(prev => ({
                                ...prev, [f.uid]: e.target.value
                              }))}
                            />
                          </div>
                        ))}
                      </Space>
                      <Space style={{ marginTop: 12 }}>
                        <Radio
                          checked={!isLegacyScreenshots}
                          onChange={() => setIsLegacyScreenshots(false)}
                        >当前版本截图</Radio>
                        <Radio
                          checked={isLegacyScreenshots}
                          onChange={() => setIsLegacyScreenshots(true)}
                        >旧版本/历史截图</Radio>
                      </Space>
                      <div style={{ marginTop: 12 }}>
                        <Button
                          type="primary"
                          icon={<UploadOutlined />}
                          onClick={handleUploadScreenshots}
                          loading={saving}
                          disabled={fileList.length === 0}
                        >
                          上传{fileList.length}张截图
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </div>

                <div className="card-section">
                  <div className="section-title">
                    已上传截图（{screenshots.length}）
                    <Badge
                      style={{ marginLeft: 12 }}
                      count={screenshots.filter(s => s.is_legacy).length}
                      showZero
                      offset={[6, 0]}
                    >
                      <Tag color="purple">历史版本</Tag>
                    </Badge>
                  </div>
                  {screenshots.length === 0 ? (
                    <Empty description="暂无截图" />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {screenshots.map(s => (
                        <Col span={8} key={s.id}>
                          <Card
                            hoverable
                            size="small"
                            cover={
                              <div style={{
                                height: 180, background: s.is_legacy ? '#f6f0ff' : '#f0f7ff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', color: '#666', gap: 8
                              }}>
                                <FileTextOutlined style={{ fontSize: 48 }} />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {s.filename}
                                </Text>
                              </div>
                            }
                          >
                            <Card.Meta
                              title={
                                <Space>
                                  {s.description}
                                  {s.is_legacy && <Tag color="purple">历史</Tag>}
                                </Space>
                              }
                              description={
                                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {s.uploaded_by} · {dayjs(s.uploaded_at).format('MM-DD HH:mm')}
                                  </Text>
                                  <Space>
                                    <a
                                      href={`/api/screenshots/${s.id}/file`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >下载</a>
                                  </Space>
                                </Space>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'missing',
            label: (
              <span>
                <ExclamationCircleOutlined />引用缺失待确认
                {missingCitation && !missingCitation.confirmed && (
                  <Badge dot color="#faad14" style={{ marginLeft: 4 }} />
                )}
              </span>
            ),
            children: <MissingCitationPanel
              record={missingCitation}
              ticket={ticket}
              onConfirm={handleConfirmMissing}
              onOpenCreate={() => { missingForm.resetFields(); setMissingReasonOpen(true); }}
              onDetect={handleDetectMissing}
            />
          },
          {
            key: 'export',
            label: <span><DownloadOutlined />交付说明与导出</span>,
            children: (
              <ExportPanel
                ticket={ticket}
                reviews={reviews}
                history={history}
                screenshots={screenshots}
                missingCitation={missingCitation}
                onExport={handleExport}
              />
            )
          }
        ]}
      />

      <Modal
        title="登记引用缺失：原因与影响范围"
        open={missingReasonOpen}
        width={720}
        onCancel={() => setMissingReasonOpen(false)}
        footer={[
          <Button onClick={() => setMissingReasonOpen(false)}>取消</Button>,
          <Button type="primary" loading={saving} onClick={handleCreateMissingRecord}>
            创建待确认记录
          </Button>
        ]}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="先给出待确认原因和影响范围，不要急着算完"
          description="确认引用缺失后，工单会标记为「引用缺失待确认」，不会生成最终聚类报告，直到相关同事补充引用或确认缺失。"
        />
        <Form
          form={missingForm}
          layout="vertical"
          initialValues={{
            reason: 'reference_unverified',
            reason_detail: '',
            impact_scope: { severity: 'medium' }
          }}
        >
          <Form.Item label="缺失项（可手动增删）" name="missing_items">
            <MissingItemsEditor />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="原因类型" name="reason" rules={[{ required: true }]}>
                <Select>
                  <Option value="source_url_dead">引用链接失效</Option>
                  <Option value="content_not_found">内容未找到</Option>
                  <Option value="reference_unverified">引用未验证</Option>
                  <Option value="data_conflict">数据与其他来源冲突</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="严重程度" name={['impact_scope', 'severity']}>
                <Select>
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="原因详细说明" name="reason_detail">
            <TextArea rows={2} />
          </Form.Item>
          <Divider orientation="left">影响范围评估</Divider>
          <Form.Item label="影响的报告编号（逗号或换行分隔）" name={['impact_scope', 'affected_reports']}>
            <TextArea rows={2} placeholder="OC-2026-0618-REPORT\nOC-2026-0618-ANALYSIS" />
          </Form.Item>
          <Form.Item label="影响的聚类目录（逗号或换行分隔）" name={['impact_scope', 'affected_clusters']}>
            <TextArea rows={2} placeholder="消费投诉-退款纠纷\n消费投诉-售后服务" />
          </Form.Item>
          <Form.Item label="估算影响工单数量" name={['impact_scope', 'estimated_count']}>
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function MissingItemsEditor({ value, onChange }: any) {
  const items = Array.isArray(value) ? value : [];
  const add = () => {
    onChange([...items, { field: '', expected: '', actual: '' }]);
  };
  const update = (idx: number, key: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };
  const remove = (idx: number) => {
    onChange(items.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div>
      {items.length === 0 && <Button type="dashed" block onClick={add}>+ 添加缺失项</Button>}
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((it: any, idx: number) => (
          <div key={idx} style={{ border: '1px solid #f0f0f0', padding: 10, borderRadius: 6 }}>
            <Row gutter={8}>
              <Col span={7}>
                <Input
                  size="small" placeholder="字段名（如：引用链接）"
                  value={it.field}
                  onChange={e => update(idx, 'field', e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Input
                  size="small" placeholder="期望内容"
                  value={it.expected}
                  onChange={e => update(idx, 'expected', e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Input
                  size="small" placeholder="实际内容（留空代表缺失）"
                  value={it.actual || ''}
                  onChange={e => update(idx, 'actual', e.target.value)}
                />
              </Col>
              <Col span={1}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(idx)} />
              </Col>
            </Row>
          </div>
        ))}
        {items.length > 0 && (
          <Button type="dashed" onClick={add}>+ 再添加一项</Button>
        )}
      </Space>
    </div>
  );
}

function MissingCitationPanel({
  record, ticket, onConfirm, onOpenCreate, onDetect
}: any) {
  return (
    <div>
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message="引用缺失处理原则"
        description={
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>如果线上工单里出现引用缺失，不要急着生成最终报告，先给出待确认原因和影响范围</li>
            <li>引用缺失记录要和工单一起保留在历史里，供后续对账使用</li>
            <li>由排班同事补充引用或确认无法补充后，再恢复工单处理</li>
          </ul>
        }
      />

      {record ? (
        <div className="card-section">
          <div className="section-title">
            当前引用缺失记录
            <Space style={{ marginLeft: 'auto' }}>
              {record.confirmed ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>已确认处理</Tag>
              ) : (
                <Tag color="orange" icon={<ExclamationCircleOutlined />}>待确认</Tag>
              )}
              <Tag color="blue">工单：{ticket?.ticket_no}</Tag>
            </Space>
          </div>

          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="原因类型">
              <Tag color="orange">{record.reason}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="严重程度">
              <Tag color={
                record.impact_scope.severity === 'high' ? 'red' :
                  record.impact_scope.severity === 'medium' ? 'orange' : 'green'
              }>
                {record.impact_scope.severity === 'high' ? '高' :
                  record.impact_scope.severity === 'medium' ? '中' : '低'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="原因说明" span={2}>
              {record.reason_detail || '(无)'}
            </Descriptions.Item>
            <Descriptions.Item label="登记时间">
              {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            {record.confirmed && (
              <Descriptions.Item label="确认信息">
                {record.confirmed_by} · {dayjs(record.confirmed_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider orientation="left">缺失项明细</Divider>
          <List
            bordered
            dataSource={record.missing_items}
            renderItem={(item: any) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div className="missing-highlight">
                    <Space>
                      <Text strong>字段：{item.field}</Text>
                      <Tag color="red">缺失</Tag>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">期望：</Text>{item.expected}
                    </div>
                    <div>
                      <Text type="secondary">实际：</Text>
                      {item.actual ? (
                        <Text type="danger">{item.actual}</Text>
                      ) : (
                        <Text type="danger" delete>完全缺失</Text>
                      )}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />

          <Divider orientation="left">影响范围</Divider>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small" title="影响报告">
                {record.impact_scope.affected_reports?.length ? (
                  <Space direction="vertical">
                    {record.impact_scope.affected_reports.map((r: string) => (
                      <Tag key={r}>{r}</Tag>
                    ))}
                  </Space>
                ) : <Text type="secondary">未登记</Text>}
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="影响聚类">
                {record.impact_scope.affected_clusters?.length ? (
                  <Space wrap>
                    {record.impact_scope.affected_clusters.map((c: string) => (
                      <Tag key={c} color="purple">{c}</Tag>
                    ))}
                  </Space>
                ) : <Text type="secondary">未登记</Text>}
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="影响数量">
                <Statistic
                  value={record.impact_scope.estimated_count || 0}
                  suffix="条工单"
                  valueStyle={{
                    color: record.impact_scope.severity === 'high' ? '#ff4d4f' :
                      record.impact_scope.severity === 'medium' ? '#faad14' : '#52c41a'
                  }}
                />
              </Card>
            </Col>
          </Row>

          {!record.confirmed && (
            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={() => onConfirm(record.id)}>
                我已补充引用 / 确认无法补充
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-section">
          <Empty description="暂无引用缺失记录" />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Space>
              <Button icon={<ExclamationCircleOutlined />} onClick={onDetect}>自动检测</Button>
              <Button type="primary" onClick={onOpenCreate}>手动登记缺失</Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportPanel({
  ticket, reviews, history, screenshots, missingCitation, onExport
}: any) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <Alert
        type="success"
        showIcon
        icon={<FileTextOutlined />}
        message="交付说明导出"
        description={
          <div>
            交付说明不用铺太开，只要让评测同事小孟能把
            <Text strong style={{ margin: '0 4px' }}>线上工单</Text>、
            <Text strong style={{ margin: '0 4px' }}>处理记录</Text>、
            <Text strong style={{ margin: '0 4px' }}>截图说明</Text>
            对给别人看就行。
            <br />
            <Text type="secondary">
              导出文件中的状态、聚类、备注、截图说明、缺失原因与影响范围，均与本页显示保持一致。
            </Text>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <div className="card-section export-panel" ref={contentRef}>
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              舆情聚类人工改判 · 交付说明
            </div>
            <div style={{ textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 16 }}>
              导出时间：{dayjs().format('YYYY-MM-DD HH:mm:ss')} · 操作人：{operatorName}
            </div>

            <div className="section-title">一、线上工单信息</div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="工单编号">{ticket.ticket_no}</Descriptions.Item>
              <Descriptions.Item label="工单标题">{ticket.title}</Descriptions.Item>
              <Descriptions.Item label="原始聚类">{ticket.original_cluster}</Descriptions.Item>
              <Descriptions.Item label="最终聚类">
                {ticket.final_cluster ? (
                  <Text strong style={{ color: '#1677ff' }}>{ticket.final_cluster}</Text>
                ) : <Text type="secondary">（尚未确定）</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="处理状态">
                <Tag color={STATUS_OPTIONS.find((s: any) => s.value === ticket.status)?.color}>
                  {STATUS_OPTIONS.find((s: any) => s.value === ticket.status)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="引用状态">
                <Tag color={
                  ticket.citation_status === 'complete' ? 'green' :
                    ticket.citation_status === 'partial' ? 'orange' : 'red'
                }>
                  {ticket.citation_status === 'complete' ? '完整' :
                    ticket.citation_status === 'partial' ? '部分' : '缺失'}
                </Tag>
                &nbsp;共 {ticket.citation_urls?.length || 0} 条
              </Descriptions.Item>
            </Descriptions>
            {(ticket.citation_urls?.length > 0) && (
              <div style={{ marginTop: 8 }}>
                {ticket.citation_urls.map((u: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#666' }}>
                    [引用{i + 1}] <a href={u} target="_blank" rel="noreferrer">{u}</a>
                  </div>
                ))}
              </div>
            )}

            <Divider />
            <div className="section-title">二、人工改判处理记录（共{reviews.length}条）</div>
            {reviews.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无处理记录" />
            ) : (
              <List
                size="small"
                bordered
                dataSource={reviews}
                renderItem={(r: ReviewRecord) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <Space style={{ marginBottom: 4 }}>
                        <Tag color="blue">{r.reviewer}</Tag>
                        <Text type="secondary">{dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                      </Space>
                      <div>
                        {r.before_cluster}
                        <span style={{ margin: '0 6px', color: '#1677ff' }}>→</span>
                        <Text strong style={{ color: '#1677ff' }}>{r.after_cluster}</Text>
                      </div>
                      {r.review_note && <div style={{ marginTop: 4 }}>备注：{r.review_note}</div>}
                      {r.screenshot_descriptions && (
                        <div style={{ marginTop: 4, padding: '4px 8px', background: '#f6f8fa', borderRadius: 4 }}>
                          <Text type="secondary">截图说明：</Text>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12 }}>
                            {r.screenshot_descriptions}
                          </pre>
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            )}

            <Divider />
            <div className="section-title">三、历史版本变更（共{history.length}条）</div>
            {history.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无变更" />
            ) : (
              <Table
                size="small"
                pagination={false}
                bordered
                dataSource={history}
                rowKey="id"
                columns={[
                  { title: '版本', dataIndex: 'version', width: 70, render: v => `v${v}` },
                  { title: '字段', dataIndex: 'field_name', width: 120 },
                  { title: '旧值', dataIndex: 'old_value', render: v => <Text delete>{v || '(空)'}</Text> },
                  { title: '新值', dataIndex: 'new_value', render: v => <Text strong>{v || '(空)'}</Text> },
                  { title: '变更人', dataIndex: 'changed_by', width: 100 },
                  { title: '变更时间', dataIndex: 'changed_at', width: 150, render: v => dayjs(v).format('MM-DD HH:mm') },
                  { title: '说明', dataIndex: 'change_note' }
                ]}
              />
            )}

            <Divider />
            <div className="section-title">四、截图说明（共{screenshots.length}张）</div>
            {screenshots.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无截图" />
            ) : (
              <List
                size="small"
                bordered
                dataSource={screenshots}
                renderItem={(s: Screenshot, idx: number) => (
                  <List.Item>
                    <Space>
                      <Text strong>图{idx + 1}：</Text>
                      <a href={`/api/screenshots/${s.id}/file`} target="_blank" rel="noreferrer">
                        {s.filename}
                      </a>
                      <Tag color={s.is_legacy ? 'purple' : 'green'}>
                        {s.is_legacy ? '历史版本截图' : '当前版本截图'}
                      </Tag>
                      <Text type="secondary">
                        {s.uploaded_by} · {dayjs(s.uploaded_at).format('MM-DD HH:mm')}
                      </Text>
                    </Space>
                    <div style={{ marginTop: 4, paddingLeft: 20, color: '#555' }}>
                      说明：{s.description || '(无)'}
                    </div>
                  </List.Item>
                )}
              />
            )}

            {missingCitation && (
              <>
                <Divider />
                <div className="section-title">五、引用缺失待确认记录</div>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="状态">
                    {missingCitation.confirmed
                      ? <Tag color="green">已确认</Tag>
                      : <Tag color="orange">待确认</Tag>}
                    ，原因类型：<Tag>{missingCitation.reason}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="原因说明">
                    {missingCitation.reason_detail || '(无)'}
                  </Descriptions.Item>
                  <Descriptions.Item label="影响范围">
                    严重程度：{missingCitation.impact_scope.severity} ·
                    影响 {missingCitation.impact_scope.estimated_count || 0} 条 ·
                    涉及聚类：{(missingCitation.impact_scope.affected_clusters || []).join('、') || '(无)'}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <div style={{
              marginTop: 16, padding: '8px 12px', background: '#f6ffed',
              border: '1px dashed #b7eb8f', borderRadius: 6, textAlign: 'center',
              color: '#389e0d', fontSize: 12
            }}>
              * 以上内容与页面显示状态保持一致
            </div>
          </div>
        </Col>

        <Col span={8}>
          <div className="card-section">
            <div className="section-title">导出操作</div>
            <Paragraph type="secondary">
              点击下方按钮，将生成结构化的 .txt 交付说明文件，可直接发送给相关同事查看。
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              block
              onClick={onExport}
              style={{ marginBottom: 12 }}
            >
              导出为 .txt 交付说明
            </Button>
            <Divider />
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><Text strong>包含内容：</Text></div>
              <Progress percent={100} showInfo={false} style={{ marginBottom: 12 }} />
              <div>✓ 线上工单编号、标题、聚类、状态</div>
              <div>✓ 所有人工改判处理记录</div>
              <div>✓ 字段变更的历史版本</div>
              <div>✓ 截图文件清单与说明</div>
              <div>✓ 引用缺失原因与影响范围（如有）</div>
            </div>
            <Divider />
            <Alert
              type="info"
              showIcon
              message="对账说明"
              description={
                <div style={{ fontSize: 12 }}>
                  评测同事小孟可用此文件将<b>线上工单</b>、<b>处理记录</b>、<b>截图说明</b>对给别人看；
                  所有历史版本均不会被覆盖，旧版本截图标记为「历史版本截图」。
                </div>
              }
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
