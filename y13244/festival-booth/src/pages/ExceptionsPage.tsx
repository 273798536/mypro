import { useEffect, useState, useMemo } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Select, Upload,
  Progress, Descriptions, List, App as AntdApp
} from 'antd';
import {
  WarningOutlined, UploadOutlined, CheckCircleOutlined,
  HistoryOutlined, FilterOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ExceptionQueueItem, ExceptionType } from '../types';
import { exceptionStore, settlementStore, boothStore, trackStore } from '../services/storage';

const TYPE_LABEL: Record<ExceptionType, { label: string; color: string }> = {
  revenue_mismatch: { label: '营收对不上', color: 'red' },
  missing_evidence: { label: '缺证据材料', color: 'orange' },
  student_count_mismatch: { label: '人数对不上', color: 'blue' },
  fee_calculation_error: { label: '费用算错了', color: 'purple' },
  manual_adjustment: { label: '人工改判记录', color: 'magenta' },
  data_incomplete: { label: '数据不完整', color: 'cyan' },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  open: { label: '待处理', color: 'red' },
  investigating: { label: '处理中', color: 'blue' },
  resolved: { label: '已解决', color: 'green' },
  pending_evidence: { label: '等补证据', color: 'orange' },
};

const SEVERITY_CFG: Record<string, { label: string; color: string }> = {
  low: { label: '轻度', color: 'blue' },
  medium: { label: '中度', color: 'orange' },
  high: { label: '严重', color: 'red' },
};

export default function ExceptionsPage({ blockedFeatures }: { blockedFeatures: string[] }) {
  const [exceptions, setExceptions] = useState<ExceptionQueueItem[]>([]);
  const [filterType, setFilterType] = useState<ExceptionType | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [onlyManual, setOnlyManual] = useState(false);
  const [detailModal, setDetailModal] = useState<ExceptionQueueItem | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<ExceptionQueueItem | null>(null);
  const [statusModal, setStatusModal] = useState<ExceptionQueueItem | null>(null);
  const [statusForm] = Form.useForm();
  const { message, modal } = AntdApp.useApp();

  const refresh = () => setExceptions(exceptionStore.getAll());
  useEffect(refresh, []);

  const visible = useMemo(() => exceptions.filter(e => {
    if (filterType && e.type !== filterType) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    if (onlyManual && !e.isManualOverride) return false;
    return true;
  }), [exceptions, filterType, filterStatus, onlyManual]);

  const stats = useMemo(() => ({
    total: exceptions.length,
    open: exceptions.filter(e => e.status !== 'resolved').length,
    pendingEvidence: exceptions.filter(e => e.status === 'pending_evidence').length,
    manual: exceptions.filter(e => e.isManualOverride).length,
  }), [exceptions]);

  const updateException = (id: string, patch: Partial<ExceptionQueueItem>) => {
    const updated = exceptionStore.update(id, patch);
    refresh();
    return updated;
  };

  const handleEvidenceUpload = (e: ExceptionQueueItem, fileName: string) => {
    const existing = e.evidenceProvided || [];
    if (existing.includes(fileName)) {
      message.warning('这份材料已经提交过了');
      return;
    }
    const required = e.evidenceRequired || [];
    const nowProvided = [...existing, fileName];
    const allDone = required.every(r => nowProvided.includes(r));
    updateException(e.id, {
      evidenceProvided: nowProvided,
      status: allDone ? 'investigating' : e.status,
    });
    message.success(`材料「${fileName}」已提交${allDone ? '，所有证据齐了，状态自动更新为处理中' : ''}`);
    setEvidenceModal(null);
  };

  const handleStatusSubmit = async () => {
    if (!statusModal) return;
    const values = await statusForm.validateFields();
    const old = exceptions.find(e => e.id === statusModal.id);
    updateException(statusModal.id, {
      status: values.status,
      assignedTo: values.assignedTo || old?.assignedTo,
      resolution: values.resolution || undefined,
      resolvedAt: values.status === 'resolved' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
      resolvedBy: values.status === 'resolved' ? (values.resolvedBy || '当前用户') : undefined,
    });
    message.success('异常记录已更新');
    setStatusModal(null);
  };

  const columns: ColumnsType<ExceptionQueueItem> = [
    {
      title: '异常类型/严重程度', key: 'type', width: 200,
      render: (_, r) => (
        <div>
          <Space style={{ marginBottom: 4 }}>
            <Tag color={TYPE_LABEL[r.type].color} style={{ fontSize: 13 }}>
              {TYPE_LABEL[r.type].label}
            </Tag>
            <Tag color={SEVERITY_CFG[r.severity].color}>
              {SEVERITY_CFG[r.severity].label}
            </Tag>
            {r.isManualOverride && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>人工改判</Tag>
            )}
          </Space>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {r.reportedBy} · {r.reportedAt}
          </div>
        </div>
      ),
      filters: Object.entries(TYPE_LABEL).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (v, r) => r.type === v,
    },
    {
      title: '人话版异常原因（给演出/发行同事直接看）',
      dataIndex: 'humanReason',
      key: 'reason',
      width: 360,
      render: (t: string) => (
        <div className="plain-text-reason" style={{ maxWidth: 360 }}>{t}</div>
      ),
    },
    {
      title: '下一步怎么做',
      dataIndex: 'nextStep',
      key: 'next',
      width: 280,
      render: (t: string) => (
        <div style={{ color: '#722ed1', fontSize: 13, lineHeight: 1.7 }}>{t}</div>
      ),
    },
    {
      title: '证据材料',
      key: 'evidence',
      width: 180,
      render: (_, r) => {
        const required = r.evidenceRequired || [];
        const provided = r.evidenceProvided || [];
        if (required.length === 0) return <span style={{ color: '#8c8c8c' }}>无需材料</span>;
        const pct = Math.round((provided.filter(p => required.includes(p)).length / required.length) * 100);
        return (
          <div>
            <Progress percent={pct} size="small" status={pct === 100 ? 'success' : 'active'} />
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              {provided.filter(p => required.includes(p)).length}/{required.length} 份
            </div>
          </div>
        );
      },
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: s => {
        const cfg = STATUS_CFG[s] || STATUS_CFG.open;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '负责人',
      dataIndex: 'assignedTo',
      key: 'who',
      width: 100,
      render: v => v || <span style={{ color: '#bfbfbf' }}>未分配</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => setDetailModal(r)}>详情</Button>
          {(r.evidenceRequired?.length || 0) > 0 && (
            <Button size="small" type={r.status === 'pending_evidence' ? 'primary' : 'default'} icon={<UploadOutlined />} onClick={() => setEvidenceModal(r)}>
              补材料
            </Button>
          )}
          <Button size="small" icon={<HistoryOutlined />} onClick={() => {
            statusForm.setFieldsValue({
              status: r.status,
              assignedTo: r.assignedTo,
              resolution: r.resolution,
              resolvedBy: r.resolvedBy,
            });
            setStatusModal(r);
          }}>
            更新状态
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="card-shadow" size="small">
        <Space size="large" wrap>
          <div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>异常总数</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.total}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>未解决</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>{stats.open}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>等补证据</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#faad14' }}>{stats.pendingEvidence}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>含人工改判痕迹</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#722ed1' }}>{stats.manual}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <Space wrap>
              <Select
                placeholder="按异常类型筛选"
                style={{ width: 180 }}
                allowClear
                value={filterType}
                onChange={setFilterType}
                options={Object.entries(TYPE_LABEL).map(([k, v]) => ({ value: k as ExceptionType, label: v.label }))}
              />
              <Select
                placeholder="按处理状态筛选"
                style={{ width: 160 }}
                allowClear
                value={filterStatus}
                onChange={setFilterStatus}
                options={Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }))}
              />
              <Button type={onlyManual ? 'primary' : 'default'} onClick={() => setOnlyManual(!onlyManual)}>
                {onlyManual ? '✅ 只看人工改判' : '只看人工改判'}
              </Button>
              <Button icon={<FilterOutlined />} onClick={() => { setFilterType(undefined); setFilterStatus(undefined); setOnlyManual(false); }}>
                清空
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Card
        className="card-shadow"
        size="small"
        title={<span className="section-title">异常队列（{visible.length} 条，筛选口径会保存在每条记录的 filterSnapshot 字段里，导出时一并带出）</span>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={visible.sort((a, b) => {
            const sevOrder = { high: 0, medium: 1, low: 2 };
            return (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9);
          })}
          scroll={{ x: 1400 }}
          pagination={false}
          rowClassName={(r: ExceptionQueueItem) => r.isManualOverride ? 'manual-override-row' : r.status === 'pending_evidence' ? 'highlight-row' : ''}
        />
      </Card>

      <Modal
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        title="异常记录详情"
        width={680}
        footer={[<Button key="close" onClick={() => setDetailModal(null)}>关闭</Button>]}
      >
        {detailModal && (
          <div>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="异常类型">
                <Space>
                  <Tag color={TYPE_LABEL[detailModal.type].color}>{TYPE_LABEL[detailModal.type].label}</Tag>
                  <Tag color={SEVERITY_CFG[detailModal.severity].color}>{SEVERITY_CFG[detailModal.severity].label}</Tag>
                  <Tag color={STATUS_CFG[detailModal.status].color}>{STATUS_CFG[detailModal.status].label}</Tag>
                  {detailModal.isManualOverride && <Tag color="red">人工改判</Tag>}
                  {detailModal.needsManualConfirm && <Tag color="orange">需人工确认</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="关联分账">
                {(() => {
                  const s = settlementStore.getById(detailModal.settlementId);
                  const b = s ? boothStore.getById(s.boothId) : null;
                  const t = s ? trackStore.getById(s.trackId) : null;
                  return (
                    <div>
                      <div><b>{b?.name}</b> · {s?.operatorName}</div>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>{t?.name} · 营收 ¥{s?.actualRevenue.toFixed(2)}</div>
                    </div>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="报告来源">{detailModal.reportedBy} · {detailModal.reportedAt}</Descriptions.Item>
              <Descriptions.Item label="当前负责人">{detailModal.assignedTo || '暂未分配'}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>📝 异常原因（人话版，可直接转发同事）：</div>
              <div className="plain-text-reason" style={{ padding: 12, background: '#f9f0ff', borderRadius: 6 }}>
                {detailModal.humanReason}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>👉 下一步操作：</div>
              <div className="plain-text-reason" style={{ padding: 12, background: '#e6f7ff', borderRadius: 6, color: '#1890ff' }}>
                {detailModal.nextStep}
              </div>
            </div>

            {(detailModal.evidenceRequired?.length || 0) > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📎 证据材料进度：</div>
                <List
                  size="small"
                  bordered
                  dataSource={detailModal.evidenceRequired}
                  renderItem={(item: string) => {
                    const done = (detailModal.evidenceProvided || []).includes(item);
                    return (
                      <List.Item style={{ background: done ? '#f6ffed' : '#fffbe6' }}>
                        <Space>
                          {done ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <WarningOutlined style={{ color: '#faad14' }} />}
                          <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>
                            {item}
                          </span>
                          {done && <Tag color="green">已提交</Tag>}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </div>
            )}

            {Object.keys(detailModal.filterSnapshot).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#8c8c8c' }}>
                  🔍 产生异常时的筛选口径快照（导出时会带出）：
                </div>
                <div style={{ padding: 8, background: '#fafafa', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>
                  {JSON.stringify(detailModal.filterSnapshot, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!evidenceModal}
        onCancel={() => setEvidenceModal(null)}
        title={
          <Space>
            <UploadOutlined />
            <span>补充证据材料：{evidenceModal && TYPE_LABEL[evidenceModal.type].label}</span>
          </Space>
        }
        width={560}
        footer={[<Button key="close" onClick={() => setEvidenceModal(null)}>关闭</Button>]}
      >
        {evidenceModal && (
          <div>
            <p style={{ color: '#8c8c8c' }}>
              需要补齐的材料（共 {evidenceModal.evidenceRequired?.length || 0} 份）：
            </p>
            <List
              size="small"
              dataSource={evidenceModal.evidenceRequired}
              renderItem={item => {
                const done = (evidenceModal.evidenceProvided || []).includes(item);
                return (
                  <List.Item
                    actions={done ? [<Tag color="green" key="t">已提交</Tag>] : [
                      <Button
                        key="u"
                        size="small"
                        type="primary"
                        icon={<UploadOutlined />}
                        onClick={() => handleEvidenceUpload(evidenceModal!, item)}
                      >
                        模拟上传
                      </Button>
                    ]}
                  >
                    {item}
                  </List.Item>
                );
              }}
            />
            <p style={{ marginTop: 16, fontSize: 12, color: '#8c8c8c' }}>
              演示模式：点击「模拟上传」即可模拟提交对应的材料。
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!statusModal}
        onCancel={() => setStatusModal(null)}
        title="更新异常状态 / 分配处理人"
        onOk={handleStatusSubmit}
        okText="保存修改"
        width={520}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item label="处理状态" name="status" rules={[{ required: true }]}>
            <Select options={Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item label="处理人" name="assignedTo">
            <Select
              allowClear
              options={[
                { value: '林姐（音乐老师）', label: '林姐（音乐老师）' },
                { value: '财务-刘姐', label: '财务-刘姐' },
                { value: '排班-小赵', label: '排班-小赵' },
                { value: '演出-小王', label: '演出-小王' },
              ]}
            />
          </Form.Item>
          <Form.Item label="处理说明（选填，会附在导出清单里）" name="resolution">
            <textarea rows={3} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d9d9d9' }} placeholder="比如：已和冠名商李经理微信确认，加800鼓励奖真实有效" />
          </Form.Item>
          <Form.Item label="处理人签字" name="resolvedBy" tooltip="状态改为已解决时必填">
            <Select
              allowClear
              options={[
                { value: '林姐', label: '林姐' },
                { value: '财务-刘姐', label: '财务-刘姐' },
                { value: '排班-小赵', label: '排班-小赵' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
