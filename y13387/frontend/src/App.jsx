import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Breadcrumb, Table, Tag, Button, Space, Card, Row, Col,
  Tabs, Timeline, Empty, Input, Select, Modal, Form, InputNumber, Radio, App as AntApp,
  Tooltip, Divider, Statistic, Progress, List, Badge, Descriptions, Alert,
  Drawer, message, Typography, Popconfirm
} from 'antd';
import {
  DashboardOutlined, HistoryOutlined, ReloadOutlined, DiffOutlined,
  ExportOutlined, FileTextOutlined, SafetyCertificateOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloudSyncOutlined, ArrowLeftOutlined, LinkOutlined, LineChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API = '/api';

const STATUS_COLOR = {
  pending: 'default', running: 'processing', completed: 'success',
  pending_confirm: 'warning', confirmed: 'success', rejected: 'error'
};
const STATUS_TEXT = {
  pending: '待处理', running: '运行中', completed: '已完成',
  pending_confirm: '待人工确认', confirmed: '已确认', rejected: '已驳回'
};
const STATUS_ICON = {
  pending: '⏳', running: '🔄', completed: '✅',
  pending_confirm: '⚠️', confirmed: '✔️', rejected: '❌'
};

const JUDGMENT_COLOR = { confirmed: 'green', rejected: 'red', adjusted: 'blue' };
const JUDGMENT_TEXT = { confirmed: '确认', rejected: '驳回', adjusted: '调整' };

const fetchJSON = (url, opts) => fetch(url, { headers: { 'Content-Type': 'application/json' }, ...(opts || {}) }).then(r => {
  if (!r.ok) return r.text().then(t => { throw new Error(t || '请求失败'); });
  return r.json();
});
const postJSON = (url, body) => fetchJSON(url, { method: 'POST', body: JSON.stringify(body) });

function StatusTag({ status }) {
  return <Tag color={STATUS_COLOR[status] || 'default'} icon={<span>{STATUS_ICON[status] || ''}</span>}>{STATUS_TEXT[status] || status}</Tag>;
}

function HelpBox({ children }) {
  return <div className="help-box">{children}</div>;
}

function DistChart({ snapshot }) {
  if (!snapshot) return null;
  const { reference_dist, current_dist, was_late, feature_name } = snapshot;
  const data = reference_dist.labels.map((label, i) => ({
    label,
    基线: reference_dist.values[i],
    当前: current_dist.values[i] || 0
  }));
  return (
    <Card size="small" title={<Space><Text strong>{feature_name}</Text>{was_late && <Tag color="orange" icon={<ClockCircleOutlined />}>特征迟到</Tag>}<Tag>{`KS=${snapshot.ks_statistic != null ? snapshot.ks_statistic.toFixed(4) : '未到港'}`}</Tag></Space>} style={{ height: '100%' }}>
      {was_late ? <Alert type="warning" showIcon message="该特征迟到，当前分布为空，等补到港后自动补算。" /> : null}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ReTooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="基线" fill="#1677ff" />
          <Bar dataKey="当前" fill="#ff7a45" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function MaterialList({ materials }) {
  if (!materials || materials.length === 0) return <Empty description="暂无关联材料" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <List dataSource={materials} renderItem={m => (
      <List.Item key={m.id}>
        <List.Item.Meta
          avatar={<LinkOutlined style={{ fontSize: 18, color: '#1677ff' }} />}
          title={
            <Space direction="vertical" size={2}>
              <Space>
                <Text strong>{m.material_name_standard}</Text>
                <Tooltip title={m.material_name_raw}><Tag color="purple">原名不一致 ⓘ</Tag></Tooltip>
                <Text type="secondary" style={{ fontSize: 12 }}>上传人：{m.uploaded_by} · {dayjs(m.created_at).format('MM-DD HH:mm')}</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>原始文件名：{m.material_name_raw}</Text>
            </Space>
          }
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Alert type="info" showIcon message={<span><b>匹配证据：</b>{m.matched_evidence}</span>} />
              <Alert type="success" showIcon message={<span><b>关联结论：</b>{m.linked_conclusion}</span>} />
            </Space>
          }
        />
      </List.Item>
    )} />
  );
}

function JudgmentList({ judgments }) {
  if (!judgments || judgments.length === 0) return <Empty description="暂无人工判词" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <Timeline mode="left" items={judgments.map(j => ({
      color: JUDGMENT_COLOR[j.judgment],
      label: dayjs(j.created_at).format('YYYY-MM-DD HH:mm'),
      children: (
        <div className="page-card" style={{ padding: '10px 14px' }}>
          <Space wrap size={8}>
            <Tag color={JUDGMENT_COLOR[j.judgment]}><SafetyCertificateOutlined /> {JUDGMENT_TEXT[j.judgment]}</Tag>
            <Text strong>{j.judge_name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{j.before_status} → {j.after_status}</Text>
            {j.preserved ? <Tag color="green" icon={<CheckCircleOutlined />}>已锁定·不被覆盖</Tag> : null}
            {j.prev_run_id ? <Tag color="default">回溯链：RUN#{j.prev_run_id}</Tag> : null}
          </Space>
          <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{j.reason}</Paragraph>
        </div>
      )
    }))} />
  );
}

function TimelineView({ events }) {
  const iconMap = {
    run_started: <CloudSyncOutlined />, rerun_triggered: <ReloadOutlined />,
    run_completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    status_changed: <DiffOutlined />,
    material_linked: <LinkOutlined style={{ color: '#722ed1' }} />,
    judgment_added: <SafetyCertificateOutlined style={{ color: '#1677ff' }} />,
    feature_arrived: <ClockCircleOutlined style={{ color: '#faad14' }} />,
    exported: <ExportOutlined style={{ color: '#eb2f96' }} />
  };
  return (
    <Timeline
      mode="left"
      items={events.map(e => ({
        color: ['run_completed', 'judgment_added', 'material_linked', 'exported'].includes(e.event_type) ? 'blue' :
               ['status_changed'].includes(e.event_type) ? 'orange' : 'gray',
        dot: iconMap[e.event_type],
        label: <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(e.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>,
        children: (
          <div>
            <Space>
              <Tag>{e.event_type}</Tag>
              <Text strong>{e.operator}</Text>
            </Space>
            <div style={{ marginTop: 4 }}>{e.description}</div>
            {e.meta && Object.keys(e.meta).length > 0 ? (
              <details style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                <summary>元数据</summary>
                <pre style={{ margin: 0, padding: 6, background: '#fafafa', borderRadius: 4 }}>{JSON.stringify(e.meta, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        )
      }))}
    />
  );
}

function CaseList({ onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJSON(`${API}/cases`).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const columns = [
    { title: '案件编号', dataIndex: 'case_no', render: v => <Text code>{v}</Text> },
    { title: '标题', dataIndex: 'title' },
    { title: '模型', dataIndex: 'model_name', render: v => <Tag>{v}</Tag> },
    { title: '最近状态', dataIndex: 'latest_status', render: s => <StatusTag status={s} /> },
    { title: '最近更新', render: (_, r) => <Space>{r.updated_at ? dayjs(r.updated_at).format('YYYY-MM-DD HH:mm') : '-'}</Space> },
    { title: '操作', render: (_, r) => <Button type="link" onClick={() => onSelect(r)}>进入回放</Button> }
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small">
            <Statistic title="异常案件总数" value={data?.length || 0} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic title="待人工确认" value={data?.filter(c => c.latest_status === 'pending_confirm').length || 0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>
      <HelpBox>
        <b>快速上手三件事：</b><br />
        ① <b>放样例</b>：打开 <Text code>DRIFT-2026-0618-001</Text>（含特征迟到场景）或 <Text code>DRIFT-2026-0620-017</Text>（含模型升级 + 旧判词保留），数据已预置。<br />
        ② <b>重跑</b>：进入案件详情 → 右上【重跑一次】，新版本 v+1，旧版本归档不覆盖，自动写时间线。<br />
        ③ <b>查看历史时间线</b>：案件详情 → 「时间线」页签，所有操作和来源可追溯。
      </HelpBox>
      <Divider />
      <div className="page-card">
        <Table rowKey="id" columns={columns} dataSource={data || []} loading={loading} />
      </div>
    </div>
  );
}

function CaseDetail({ caseObj, onBack }) {
  const { message: antMsg } = AntApp.useApp();

  const [activeRun, setActiveRun] = useState(null);
  const [runList, setRunList] = useState([]);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showJudgmentModal, setShowJudgmentModal] = useState(false);
  const [showComparePicker, setShowComparePicker] = useState(false);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [rerunForm] = Form.useForm();
  const [lateForm] = Form.useForm();
  const [materialForm] = Form.useForm();
  const [judgmentForm] = Form.useForm();
  const [compareRunA, setCompareRunA] = useState(null);
  const [compareRunB, setCompareRunB] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadRuns = () => fetchJSON(`${API}/cases/${caseObj.id}/runs`).then(rs => {
    setRunList(rs);
    if (rs.length > 0) {
      const latest = rs[rs.length - 1];
      setActiveRun(latest.id);
      return fetchJSON(`${API}/runs/${latest.id}`).then(d => setRunDetail(d));
    }
  });
  const loadRunDetail = (rid) => fetchJSON(`${API}/runs/${rid}`).then(d => setRunDetail(d));
  const loadTimeline = () => fetchJSON(`${API}/cases/${caseObj.id}/timeline`).then(t => setTimeline(t));

  useEffect(() => {
    if (caseObj) { loadRuns(); loadTimeline(); }
  }, [caseObj?.id]);

  const onRerun = async () => {
    const vals = await rerunForm.validateFields();
    setLoading(true);
    try {
      const d = await postJSON(`${API}/runs/rerun`, { case_id: caseObj.id, ...vals });
      antMsg.success(`已触发重跑 RUN#v${d.run_version}，旧版本已归档`);
      setRunDetail(d); setActiveRun(d.id);
      setShowRerunModal(false); rerunForm.resetFields();
      await loadRuns(); await loadTimeline();
    } catch (e) { antMsg.error(e.message); }
    setLoading(false);
  };

  const onConfirmLate = async () => {
    const vals = await lateForm.validateFields();
    setLoading(true);
    try {
      const d = await postJSON(`${API}/runs/confirm-late`, { run_id: activeRun, ...vals });
      antMsg.success('已提交确认');
      setRunDetail(d); await loadRuns(); await loadTimeline();
      setShowLateModal(false); lateForm.resetFields();
    } catch (e) { antMsg.error(e.message); }
    setLoading(false);
  };

  const onLinkMaterial = async () => {
    const vals = await materialForm.validateFields();
    setLoading(true);
    try {
      await postJSON(`${API}/runs/${activeRun}/materials`, vals);
      antMsg.success('材料已关联');
      await loadRunDetail(activeRun); await loadTimeline();
      setShowMaterialModal(false); materialForm.resetFields();
    } catch (e) { antMsg.error(e.message); }
    setLoading(false);
  };

  const onAddJudgment = async () => {
    const vals = await judgmentForm.validateFields();
    setLoading(true);
    try {
      await postJSON(`${API}/judgments`, { run_id: activeRun, ...vals });
      antMsg.success('判词已记录');
      await loadRunDetail(activeRun); await loadRuns(); await loadTimeline();
      setShowJudgmentModal(false); judgmentForm.resetFields();
    } catch (e) { antMsg.error(e.message); }
    setLoading(false);
  };

  const onExport = async () => {
    setLoading(true);
    try {
      const data = await postJSON(`${API}/runs/export`, { run_id: activeRun, exported_by: '当前用户' });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drift-case-${caseObj.case_no}-run-v${runDetail?.run_version}.json`;
      a.click();
      URL.revokeObjectURL(url);
      antMsg.success('已导出归档 JSON');
      await loadTimeline();
    } catch (e) { antMsg.error(e.message); }
    setLoading(false);
  };

  const onCompare = async () => {
    if (!compareRunA || !compareRunB) { antMsg.warning('请选择两个 Run 版本'); return; }
    setLoading(true);
    try {
      const d = await fetchJSON(`${API}/cases/${caseObj.id}/compare?run_a=${compareRunA}&run_b=${compareRunB}`);
      setCompareResult(d);
      setShowComparePicker(false);
      setShowCompareDrawer(true);
    } catch (e) { antMsg.error(e.message); }
    setLoading(false);
  };

  if (!caseObj) return null;

  const runs = runList || [];
  const detail = runDetail;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回列表</Button>
        <Title level={4} style={{ margin: 0 }}>{caseObj.title}</Title>
        <Tag color="blue">{caseObj.case_no}</Tag>
        <Tag>{caseObj.model_name}</Tag>
      </Space>

      <div style={{ float: 'right' }}>
        <Space>
          <Select
            style={{ width: 280 }}
            placeholder="选择历史 Run"
            value={activeRun}
            onChange={v => { setActiveRun(v); loadRunDetail(v); }}
            options={runs.map(r => ({
              value: r.id,
              label: `RUN#v${r.run_version} · ${r.model_version} · ${STATUS_TEXT[r.status]}`
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => setShowRerunModal(true)} loading={loading}>重跑一次</Button>
          <Button icon={<DiffOutlined />} onClick={() => setShowComparePicker(true)}>版本对比</Button>
          <Button type="primary" icon={<ExportOutlined />} onClick={onExport} loading={loading}>重新导出</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Row gutter={16}>
            {detail && (
              <>
                <Col span={3}>
                  <Statistic title="Run 版本" value={`v${detail.run_version}`} />
                </Col>
                <Col span={5}>
                  <Statistic title="模型版本" value={detail.model_version} />
                </Col>
                <Col span={4}>
                  <Statistic title="状态" valueRender={() => <StatusTag status={detail.status} />} />
                </Col>
                <Col span={4}>
                  <Statistic title="漂移分" value={detail.drift_score != null ? detail.drift_score : '-'} />
                </Col>
                <Col span={4}>
                  <Statistic title="阈值" value={detail.threshold || 0.15} />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="判定"
                    value={detail.is_drift === true ? '漂移' : detail.is_drift === false ? '无漂移' : '未判定'}
                    valueStyle={{ color: detail.is_drift ? '#cf1322' : '#389e0d' }}
                  />
                </Col>
              </>
            )}
            </Row>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1" style={{ marginTop: 16 }} items={[
        {
          key: '1',
          label: <span><LineChartOutlined /> 特征快照</span>,
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <HelpBox>
                <b>异常查看</b>：每一项特征显示基线 vs 当前分布柱状对比。KS 值越接近 1 漂移越严重。迟到特征标橙色标签，特征到港后自动补算。
              </HelpBox>
              {detail && detail.final_conclusion ? (
                <Alert
                  type={detail.is_drift ? 'error' : 'success'}
                  showIcon
                  message={`最终结论（RUN#v${detail.run_version}）：${detail.final_conclusion}`}
                />
              ) : null}
              {detail?.status === 'pending_confirm' && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  title="特征迟到，需人工确认"
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text><b>原因：</b>{detail.feature_late_reason}</Text>
                      <Text type="warning"><b>下一步建议：</b>{detail.confirm_next_step}</Text>
                      <Button type="primary" onClick={() => setShowLateModal(true)}>去处理</Button>
                    </Space>
                  }
                />
              )}
              <Row gutter={[16, 16]}>
                {(detail?.snapshots || []).map(s => (
                  <Col xs={24} md={12} lg={8} key={s.id}>
                    <DistChart snapshot={s} />
                  </Col>
                ))}
              </Row>
              <Divider />
              <Space>
                <Button icon={<LinkOutlined />} onClick={() => setShowMaterialModal(true)}>关联名称不一致的材料</Button>
                <Button icon={<SafetyCertificateOutlined />} onClick={() => setShowJudgmentModal(true)}>添加 / 修改人工判词</Button>
              </Space>
            </Space>
          )
        },
        {
          key: '2',
          label: <span><FileTextOutlined /> 关联材料（{detail?.materials?.length || 0}）</span>,
          children: (
            <div>
              <HelpBox>
                <b>材料区放这里</b>：名称不一致的材料（如文件名带 vfinal(1)、空格等），在这里与本 Run 的结论做绑定。复核人接手不用再去邮件里翻材料。
              </HelpBox>
              <div className="page-card" style={{ marginTop: 12 }}>
                <MaterialList materials={detail?.materials} />
              </div>
            </div>
          )
        },
        {
          key: '3',
          label: <span><SafetyCertificateOutlined /> 人工判词（{detail?.judgments?.length || 0}）</span>,
          children: (
            <div>
              <HelpBox>
                <b>改判可溯源</b>：每次判词都永久保留（不覆盖旧的），preserved 标签表示该判词已锁定，模型版本升级也不会被盖掉。prev_run_id 形成可追溯的链。
              </HelpBox>
              <div className="page-card" style={{ marginTop: 12 }}>
                <JudgmentList judgments={detail?.judgments} />
              </div>
            </div>
          )
        },
        {
          key: '4',
          label: <span><HistoryOutlined /> 历史时间线</span>,
          children: (
            <div>
              <HelpBox>
                <b>时间线</b>：所有操作（触发重跑、状态变更、材料关联、判词添加、特征到港、导出）全部按时间排序。来源、操作人、变更前后状态一目了然。
              </HelpBox>
              <div className="page-card" style={{ marginTop: 12 }}>
                {timeline ? <TimelineView events={timeline} /> : <Empty />}
              </div>
            </div>
          )
        }
      ]} />

      <Modal title="触发重跑（不会覆盖旧版本）" open={showRerunModal} onCancel={() => setShowRerunModal(false)} onOk={onRerun} confirmLoading={loading} okText="立即重跑">
        <HelpBox>新版本会自动 v+1，旧版本 RUN#v{runs[runs.length - 1]?.run_version || 0} 完整保留在历史中。</HelpBox>
        <Form form={rerunForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="triggered_by" label="触发人" rules={[{ required: true }]} initialValue="当前用户">
            <Input placeholder="你的名字，如 许工（算法）" />
          </Form.Item>
          <Form.Item name="trigger_source" label="触发来源" initialValue="manual">
            <Radio.Group>
              <Radio value="manual">人工触发</Radio>
              <Radio value="scheduled">调度触发</Radio>
              <Radio value="feature_arrived">特征到港触发</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="model_version" label="模型版本（留空沿用当前）">
            <Input placeholder={`当前：${runs[runs.length - 1]?.model_version || ''}`} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="特征迟到 · 人工确认" open={showLateModal} onCancel={() => setShowLateModal(false)} onOk={onConfirmLate} confirmLoading={loading} okText="提交确认" width={600}>
        <Alert type="warning" showIcon message="请选择处理方式，并说明原因与下一步（这些都会写入时间线和判词）" />
        <Form form={lateForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="confirmed" label="处理方式" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={true}>方案 A：等待特征到港后补跑（推荐）</Radio>
              <Radio value={false}>方案 B：跳过迟到特征立即回放</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="judge_name" label="确认人" rules={[{ required: true }]} initialValue="当前用户">
            <Input />
          </Form.Item>
          <Form.Item name="reason" label="确认原因" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="例：已联系上游数据组，预计 30 分钟内到港，先等补跑。" />
          </Form.Item>
          <Form.Item name="next_step" label="下一步说明（可选）">
            <TextArea rows={2} placeholder="例：15:00 前跟进到港情况，超时则走方案 B。" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="关联名称不一致的材料" open={showMaterialModal} onCancel={() => setShowMaterialModal(false)} onOk={onLinkMaterial} confirmLoading={loading} okText="确认关联" width={640}>
        <HelpBox>把「原始文件名」和「标准名称」对应起来，并写清楚匹配证据和怎么关联到本次结论。</HelpBox>
        <Form form={materialForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="material_name_raw" label="原始文件名（不一致的那个）" rules={[{ required: true }]}>
            <Input placeholder="例：【附件】体育类目召回量下滑说明_vfinal(最终版)(1).xlsx" />
          </Form.Item>
          <Form.Item name="material_name_standard" label="标准名称（归档用）" rules={[{ required: true }]}>
            <Input placeholder="例：体育类目召回量下滑说明.xlsx" />
          </Form.Item>
          <Form.Item name="matched_evidence" label="匹配证据（为什么这材料和本 Run 有关）" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="例：材料第 3 页数据时间与漂移发生时间完全吻合。" />
          </Form.Item>
          <Form.Item name="linked_conclusion" label="如何支撑 / 关联到本 Run 的哪条结论" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="例：佐证 sports 分桶漂移结论，纳入复核档案。" />
          </Form.Item>
          <Form.Item name="uploaded_by" label="上传人" rules={[{ required: true }]} initialValue="当前用户">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="添加 / 修改人工判词（改判可溯源）" open={showJudgmentModal} onCancel={() => setShowJudgmentModal(false)} onOk={onAddJudgment} confirmLoading={loading} okText="提交判词">
        <HelpBox>旧判词不会被覆盖，本条作为新记录追加到判词列表和时间线。preserved 自动 = true。</HelpBox>
        <Form form={judgmentForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="judge_name" label="判词出具人" rules={[{ required: true }]} initialValue="当前用户">
            <Input />
          </Form.Item>
          <Form.Item name="judgment" label="判定类型" rules={[{ required: true }]} initialValue="confirmed">
            <Radio.Group>
              <Radio value="confirmed">确认结论</Radio>
              <Radio value="adjusted">调整结论</Radio>
              <Radio value="rejected">驳回结论</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="reason" label="判词理由（会永久记录到时间线）" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="例：与业务侧核对，本周客群结构无变化，结论可信。" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="选择两个 Run 版本对比" open={showComparePicker} onCancel={() => { setShowComparePicker(false); setCompareResult(null); }} onOk={onCompare} okText="开始对比" confirmLoading={loading}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="版本 A（旧）" required>
              <Select value={compareRunA} onChange={setCompareRunA} placeholder="选择较早的 Run"
                options={runs.map(r => ({ value: r.id, label: `RUN#v${r.run_version} · ${r.model_version} · ${STATUS_TEXT[r.status]}` }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="版本 B（新）" required>
              <Select value={compareRunB} onChange={setCompareRunB} placeholder="选择较新的 Run"
                options={runs.map(r => ({ value: r.id, label: `RUN#v${r.run_version} · ${r.model_version} · ${STATUS_TEXT[r.status]}` }))} />
            </Form.Item>
          </Col>
        </Row>
      </Modal>

      <Drawer title="复核人 · 双版本差异对照" open={showCompareDrawer} onClose={() => { setShowCompareDrawer(false); setCompareResult(null); }} width={1100}>
        {compareResult && (
          <div>
            <HelpBox>
              <b>复核说明：</b>旧模型版本的人工判词 preserved=true，<b>不会被新模型版本的判词覆盖</b>。即使模型换了，历史判词仍在对应旧 Run 下可查。
            </HelpBox>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title={<Space>版本 A · RUN#v{compareResult.run_a.run_version} · {compareResult.run_a.model_version}</Space>} style={{ border: '1px solid #bae0ff' }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="状态"><StatusTag status={compareResult.run_a.status} /></Descriptions.Item>
                    <Descriptions.Item label="漂移分">{compareResult.run_a.drift_score}</Descriptions.Item>
                    <Descriptions.Item label="判定">{compareResult.run_a.is_drift ? '漂移' : compareResult.run_a.is_drift === false ? '无漂移' : '-'}</Descriptions.Item>
                    <Descriptions.Item label="结论">{compareResult.run_a.final_conclusion}</Descriptions.Item>
                    <Descriptions.Item label="人工判词"><b>{compareResult.judgment_diff.a_count}</b> 条，其中 <b>{compareResult.judgment_diff.a_preserved}</b> 条锁定保留</Descriptions.Item>
                  </Descriptions>
                  <Divider style={{ margin: '12px 0' }} />
                  <Text strong>判词详情：</Text>
                  <JudgmentList judgments={compareResult.run_a.judgments} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={<Space>版本 B · RUN#v{compareResult.run_b.run_version} · {compareResult.run_b.model_version}</Space>} style={{ border: '1px solid #ffbb96' }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="状态"><StatusTag status={compareResult.run_b.status} /></Descriptions.Item>
                    <Descriptions.Item label="漂移分">{compareResult.run_b.drift_score}</Descriptions.Item>
                    <Descriptions.Item label="判定">{compareResult.run_b.is_drift ? '漂移' : compareResult.run_b.is_drift === false ? '无漂移' : '-'}</Descriptions.Item>
                    <Descriptions.Item label="结论">{compareResult.run_b.final_conclusion}</Descriptions.Item>
                    <Descriptions.Item label="人工判词"><b>{compareResult.judgment_diff.b_count}</b> 条，其中 <b>{compareResult.judgment_diff.b_preserved}</b> 条锁定保留</Descriptions.Item>
                  </Descriptions>
                  <Divider style={{ margin: '12px 0' }} />
                  <Text strong>判词详情：</Text>
                  <JudgmentList judgments={compareResult.run_b.judgments} />
                </Card>
              </Col>
            </Row>
            <Divider />
            <Card title="结构化差异" style={{ marginTop: 16 }} size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="模型版本">
                  {compareResult.status_diff.model_version.changed
                    ? <Tag color="red">变更：{compareResult.status_diff.model_version.a} → {compareResult.status_diff.model_version.b}</Tag>
                    : <Tag>未变更</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="状态变化">
                  {compareResult.status_diff.status.changed
                    ? <Tag color="orange">{compareResult.status_diff.status.a} → {compareResult.status_diff.status.b}</Tag>
                    : <Tag>未变更</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="漂移分差值">
                  {compareResult.status_diff.drift_score.delta != null
                    ? <b>{compareResult.status_diff.drift_score.delta > 0 ? '+' : ''}{compareResult.status_diff.drift_score.delta}</b>
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="判定是否变化">
                  {compareResult.status_diff.is_drift.changed ? <Tag color="red">变了</Tag> : <Tag>没变</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="关联材料">A：{compareResult.status_diff.material_count.a} · B：{compareResult.status_diff.material_count.b}</Descriptions.Item>
                <Descriptions.Item label="判词保护说明">{compareResult.judgment_diff.note}</Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function App() {
  const [selected, setSelected] = useState(null);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark">
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 600, borderBottom: '1px solid #1f1f1f' }}>
          <DashboardOutlined /> <span style={{ marginLeft: 8 }}>漂移监控回放</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={['dashboard']}
          items={[{ key: 'dashboard', icon: <DashboardOutlined />, label: '案件工作台' }]}
        />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <Breadcrumb style={{ color: 'rgba(255,255,255,0.65)' }} items={[
            { title: <span style={{ color: '#fff' }}>漂移监控异常回放</span> },
            { title: selected ? '案件详情' : '工作台' }
          ]} />
          <Space style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.85)' }}>
            <Tag color="green">服务正常</Tag>
            <Text style={{ color: '#fff' }}>{dayjs().format('YYYY-MM-DD HH:mm')}</Text>
          </Space>
        </Header>
        <Content style={{ margin: 20 }}>
          {selected ? (
            <CaseDetail caseObj={selected} onBack={() => setSelected(null)} />
          ) : (
            <CaseList onSelect={c => setSelected(c)} />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
