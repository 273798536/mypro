import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Space, Row, Col, Modal, Form, Input, Select,
  Radio, Statistic, App as AntdApp, Tabs, Alert, Tooltip, Popconfirm, Divider, message
} from 'antd';
import {
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  SolutionOutlined, EditOutlined, FileProtectOutlined, ReloadOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../api/client';
import type {
  ReviewRecord, ConflictRecord, ReviewSummaryResponse, QuestionItem,
  AnomalyCategory, ResultGrade
} from '../types';

const { TabPane } = Tabs;

const anomalyOptions: { label: string; value: AnomalyCategory }[] = [
  { label: '无异常', value: '无异常' },
  { label: '补材料', value: '补材料' },
  { label: '改口径', value: '改口径' }
];

const gradeOptions: { label: string; value: ResultGrade }[] = [
  { label: '可用', value: '可用' },
  { label: '暂缓', value: '暂缓' },
  { label: '重新采集', value: '重新采集' }
];

const anomalyClass: Record<AnomalyCategory, string> = {
  无异常: '',
  补材料: 'tag-need-material',
  改口径: 'tag-need-standard'
};

const gradeClass: Record<ResultGrade, string> = {
  可用: 'tag-usable',
  暂缓: 'tag-pending',
  重新采集: 'tag-recollect'
};

const nextStepSuggestion: Record<string, string> = {
  '补材料-可用': '材料存在小瑕疵，已标注可用；后续补齐原始材料',
  '补材料-暂缓': '缺失关键原始材料（如题干图片、来源页），先暂缓，补齐后再用',
  '补材料-重新采集': '缺失核心参数或图片，必须重新采集原始材料',
  '改口径-可用': '参数口径差异在允差范围内，统一口径后可直接使用',
  '改口径-暂缓': '参数口径需排课老师统一，先暂缓使用',
  '改口径-重新采集': '参数口径严重不符，需重新采集或重算KKT参数',
  '无异常-可用': '材料完整、参数一致，可直接使用',
  '无异常-暂缓': '需进一步人工复核，暂缓使用',
  '无异常-重新采集': '存在其他问题，需重新采集'
};

const ReviewPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { message: msg, modal } = AntdApp.useApp();
  const [summary, setSummary] = useState<ReviewSummaryResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; record: ReviewRecord | null }>({
    open: false,
    record: null
  });
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<ResultGrade | 'all'>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyCategory | 'all'>('all');

  const loadAll = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [sRes, rRes, cRes, qRes] = await Promise.all([
        api.get(`/batches/${batchId}/reviews/summary`),
        api.get(`/batches/${batchId}/reviews?limit=500`),
        api.get(`/batches/${batchId}/conflicts?limit=500`),
        api.get(`/batches/${batchId}/questions?limit=500`)
      ]);
      setSummary(sRes.data);
      setReviews(rRes.data || []);
      setConflicts(cRes.data || []);
      setQuestions(qRes.data || []);
    } catch (e) {
      msg.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const initReviews = async () => {
    if (!batchId) return;
    try {
      const res = await api.post(`/batches/${batchId}/reviews/init`);
      msg.success(`已初始化 ${res.data.initialized} 条复核记录`);
      loadAll();
    } catch (e) {
      msg.error('初始化失败');
    }
  };

  useEffect(() => {
    loadAll();
  }, [batchId]);

  const openEdit = (r: ReviewRecord) => {
    setEditModal({ open: true, record: r });
    form.setFieldsValue({
      anomaly_category: r.anomaly_category,
      result_grade: r.result_grade,
      next_step: r.next_step,
      review_note: r.review_note,
      reviewer: r.reviewer
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!editModal.record) return;
      setSubmitting(true);
      const key = `${values.anomaly_category}-${values.result_grade}`;
      if (!values.next_step && nextStepSuggestion[key]) {
        values.next_step = nextStepSuggestion[key];
      }
      await api.patch(`/reviews/${editModal.record.id}`, values);
      msg.success('已保存');
      setEditModal({ open: false, record: null });
      form.resetFields();
      loadAll();
    } catch (e: any) {
      if (!e?.fields) msg.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const quickSet = async (r: ReviewRecord, anomaly: AnomalyCategory, grade: ResultGrade) => {
    try {
      const key = `${anomaly}-${grade}`;
      await api.patch(`/reviews/${r.id}`, {
        anomaly_category: anomaly,
        result_grade: grade,
        next_step: nextStepSuggestion[key]
      });
      msg.success('已更新');
      loadAll();
    } catch (e) {
      msg.error('更新失败');
    }
  };

  const batchComplete = () => {
    if (!batchId) return;
    modal.confirm({
      title: '确认标记批次为已完成？',
      content: '完成后仍可修改复核记录，但状态会推进为"已完成"。',
      onOk: async () => {
        await api.post(`/batches/${batchId}/complete`);
        msg.success('已标记为已完成');
        loadAll();
      }
    });
  };

  const resolveConflict = async (c: ConflictRecord) => {
    try {
      await api.patch(`/conflicts/${c.id}`, { is_resolved: true });
      msg.success('已标记为已解决');
      loadAll();
    } catch (e) {
      msg.error('操作失败');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (gradeFilter !== 'all' && r.result_grade !== gradeFilter) return false;
    if (anomalyFilter !== 'all' && r.anomaly_category !== anomalyFilter) return false;
    return true;
  });

  const reviewColumns: ColumnsType<ReviewRecord> = [
    {
      title: '原始行号',
      dataIndex: ['question', 'original_row_no'],
      width: 90,
      render: (_, r) => r.question?.original_row_no ?? '-'
    },
    {
      title: '题目编号',
      dataIndex: ['question', 'question_code'],
      width: 120,
      render: (_, r) => r.question?.question_code ?? '-'
    },
    {
      title: '题目名称',
      dataIndex: ['question', 'question_title'],
      ellipsis: true,
      render: (_, r) => (
        <div>
          <div>{r.question?.question_title || '-'}</div>
          {r.question?.image_name && (
            <div className="source-info">图片：{r.question.image_name}</div>
          )}
          {r.question?.source_remark && (
            <Tooltip title={r.question.source_remark}>
              <div className="source-info">来源：{r.question.source_remark}</div>
            </Tooltip>
          )}
        </div>
      )
    },
    {
      title: '异常分类',
      dataIndex: 'anomaly_category',
      width: 110,
      render: (v: AnomalyCategory) => (
        <Tag className={anomalyClass[v]} color={v === '无异常' ? 'green' : v === '补材料' ? 'blue' : 'magenta'}>
          {v === '无异常' && <CheckCircleOutlined />}
          {v === '补材料' && <FileProtectOutlined />}
          {v === '改口径' && <EditOutlined />}
          {' '}{v}
        </Tag>
      )
    },
    {
      title: '结果分级',
      dataIndex: 'result_grade',
      width: 110,
      render: (v: ResultGrade) => (
        <Tag className={gradeClass[v]} color={v === '可用' ? 'green' : v === '暂缓' ? 'orange' : 'red'}>
          {v === '可用' && <CheckCircleOutlined />}
          {v === '暂缓' && <ExclamationCircleOutlined />}
          {v === '重新采集' && <CloseCircleOutlined />}
          {' '}{v}
        </Tag>
      )
    },
    {
      title: '下一步建议',
      dataIndex: 'next_step',
      ellipsis: true,
      width: 240,
      render: (v) => v || '-'
    },
    {
      title: '复核备注',
      dataIndex: 'review_note',
      ellipsis: true,
      width: 200,
      render: (v) => v || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right',
      className: 'review-action-col',
      render: (_, r) => (
        <Space size="small" wrap>
          <Button size="small" type="primary" ghost onClick={() => openEdit(r)}>
            <EditOutlined /> 详细复核
          </Button>
          <Popconfirm
            title="快速标记：补材料 - 暂缓"
            onConfirm={() => quickSet(r, '补材料', '暂缓')}
          >
            <Button size="small">补材料</Button>
          </Popconfirm>
          <Popconfirm
            title="快速标记：改口径 - 暂缓"
            onConfirm={() => quickSet(r, '改口径', '暂缓')}
          >
            <Button size="small">改口径</Button>
          </Popconfirm>
          <Popconfirm
            title="标记为可用"
            onConfirm={() => quickSet(r, '无异常', '可用')}
          >
            <Button size="small" type="primary">
              <CheckOutlined /> 可用
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const conflictColumns: ColumnsType<ConflictRecord> = [
    { title: '题目编号', dataIndex: 'question_code', width: 120 },
    {
      title: '冲突类型',
      dataIndex: 'conflict_type',
      width: 110,
      render: (v) => <Tag color="red">{v}</Tag>
    },
    { title: '冲突字段', dataIndex: 'conflict_field', width: 120, render: (v) => v || '-' },
    { title: '题目清单值', dataIndex: 'question_value', ellipsis: true, width: 150 },
    { title: '参数表值', dataIndex: 'param_value', ellipsis: true, width: 150 },
    {
      title: '冲突说明 & 建议',
      key: 'desc',
      render: (_, r) => (
        <div>
          <div className="conflict-description">
            <b>说明：</b>
            {r.description}
          </div>
          {r.resolution_suggestion && (
            <div className="conflict-suggestion">
              <b>建议：</b>
              {r.resolution_suggestion}
            </div>
          )}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'is_resolved',
      width: 100,
      render: (v) => (v ? <Tag color="green">已解决</Tag> : <Tag color="red">未解决</Tag>)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, r) =>
        !r.is_resolved ? (
          <Button size="small" type="primary" onClick={() => resolveConflict(r)}>
            标记解决
          </Button>
        ) : null
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="page-title">排课老师复核</h2>
            <div className="page-subtitle">
              每条题目可标记：<b>异常分类</b>（补材料 / 改口径 / 无异常）与
              <b> 结果分级</b>（可用 / 暂缓 / 重新采集），并说明下一步建议。
              每条记录保留原始行号、图片名、来源备注，可追溯。
            </div>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadAll}>
                刷新
              </Button>
              <Button icon={<SolutionOutlined />} onClick={initReviews}>
                初始化复核记录
              </Button>
              <Button type="primary" onClick={batchComplete}>
                标记批次完成
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {summary && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={4}>
            <Card className="stat-card">
              <Statistic title="题目总数" value={summary.total_questions} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card className="stat-card">
              <Statistic title="可用" value={summary.usable_count} valueStyle={{ color: '#389e0d' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card className="stat-card">
              <Statistic title="暂缓" value={summary.pending_count} valueStyle={{ color: '#d46b08' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card className="stat-card">
              <Statistic title="重新采集" value={summary.recollect_count} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card className="stat-card">
              <Statistic title="需补材料" value={summary.need_material_count} valueStyle={{ color: '#0958d9' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card className="stat-card">
              <Statistic title="需改口径" value={summary.need_standard_count} valueStyle={{ color: '#c41d7f' }} />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs defaultActiveKey="reviews">
        <TabPane
          tab={
            <span>
              <SolutionOutlined /> 复核记录（{filteredReviews.length}/{reviews.length}）
            </span>
          }
          key="reviews"
        >
          <Card>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col>
                <span style={{ marginRight: 8 }}>结果分级：</span>
                <Select
                  value={gradeFilter}
                  onChange={(v) => setGradeFilter(v)}
                  style={{ width: 140 }}
                  allowClear
                >
                  <Select.Option value="all">全部</Select.Option>
                  {gradeOptions.map((o) => (
                    <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                  ))}
                </Select>
              </Col>
              <Col>
                <span style={{ marginRight: 8 }}>异常分类：</span>
                <Select
                  value={anomalyFilter}
                  onChange={(v) => setAnomalyFilter(v)}
                  style={{ width: 140 }}
                  allowClear
                >
                  <Select.Option value="all">全部</Select.Option>
                  {anomalyOptions.map((o) => (
                    <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                  ))}
                </Select>
              </Col>
            </Row>

            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="复核说明"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li><b>补材料</b>：原始材料缺失（图片、来源页、参数项等），需要补充后才能使用</li>
                  <li><b>改口径</b>：题目清单与参数表口径不一致，需要统一标准后使用</li>
                  <li><b>可用</b>：材料与参数一致，学生可直接使用</li>
                  <li><b>暂缓</b>：存在待确认问题，暂不发给学生</li>
                  <li><b>重新采集</b>：存在严重问题，必须重新采集原始数据</li>
                </ul>
              }
            />

            <Table
              rowKey="id"
              loading={loading}
              columns={reviewColumns}
              dataSource={filteredReviews}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400 }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <ExclamationCircleOutlined /> 冲突记录（{conflicts.length}）
            </span>
          }
          key="conflicts"
        >
          <Card>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="每条冲突都会附带解决建议，提示排课老师是需要补材料还是改口径。"
            />
            <Table
              rowKey="id"
              loading={loading}
              columns={conflictColumns}
              dataSource={conflicts}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title="详细复核"
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, record: null })}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={640}
        destroyOnClose
      >
        {editModal.record?.question && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message={
              <div>
                <div>
                  <b>题目：</b>{editModal.record.question.question_code} - {editModal.record.question.question_title}
                </div>
                <div className="source-info">
                  原始行号：{editModal.record.question.original_row_no}
                  {editModal.record.question.image_name && ` | 图片：${editModal.record.question.image_name}`}
                </div>
                {editModal.record.question.source_remark && (
                  <div className="source-info">来源：{editModal.record.question.source_remark}</div>
                )}
              </div>
            }
          />
        )}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="异常分类（下一步：补材料还是改口径？）"
                name="anomaly_category"
                rules={[{ required: true, message: '请选择' }]}
              >
                <Radio.Group optionType="button" buttonStyle="solid">
                  {anomalyOptions.map((o) => (
                    <Radio.Button key={o.value} value={o.value}>{o.label}</Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结果分级（数据是否可用？）"
                name="result_grade"
                rules={[{ required: true, message: '请选择' }]}
              >
                <Radio.Group optionType="button" buttonStyle="solid">
                  {gradeOptions.map((o) => (
                    <Radio.Button key={o.value} value={o.value}>{o.label}</Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="下一步建议（自动填充，可修改）" name="next_step">
            <Input placeholder="例如：请补录该题的图片材料" />
          </Form.Item>
          <Form.Item label="复核备注" name="review_note">
            <Input.TextArea rows={3} placeholder="详细说明复核结论和依据" />
          </Form.Item>
          <Form.Item label="复核人" name="reviewer">
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReviewPage;
