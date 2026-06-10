import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Space, Select, Input, Alert, Divider,
  Modal, message, Tooltip, Badge, Form, Statistic, Steps, Tabs,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  WarningOutlined, ArrowRightOutlined, ArrowLeftOutlined,
  SafetyCertificateOutlined, FileProtectOutlined, ThunderboltOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import {
  recordsApi,
  ProcessingRecordDetail,
  ProcessingRecord,
  ReviewSubmit,
  STATUS_LABEL,
  STATUS_COLOR,
  ReactionCondition,
  SubstrateConversion,
  SpectrumData,
} from '../api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts';

const { TextArea } = Input;
const { Option } = Select;

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ProcessingRecord[]>([]);
  const [currentId, setCurrentId] = useState<number | undefined>(id ? parseInt(id) : undefined);
  const [detail, setDetail] = useState<ProcessingRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [reviewer, setReviewer] = useState('配方主管-王工');
  const [opinion, setOpinion] = useState('');
  const [safety, setSafety] = useState('');
  const [suppl, setSuppl] = useState('');
  const [condReviews, setCondReviews] = useState<Record<number, string>>({});
  const [specInterps, setSpecInterps] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadList(); }, []);
  useEffect(() => {
    if (records.length && !currentId) setCurrentId(records[0].id);
  }, [records]);
  useEffect(() => { if (currentId) loadDetail(currentId); }, [currentId]);

  const loadList = async () => {
    try {
      const res = await recordsApi.list({ limit: 100 });
      setRecords(res.items.filter(r => r.status !== 'exported'));
    } catch (e) { /* ignore */ }
  };

  const loadDetail = async (rid: number) => {
    setLoading(true);
    try {
      const d = await recordsApi.get(rid);
      setDetail(d);
      // 回填表单
      setOpinion(d.processing_opinion || '');
      setSafety(d.safety_note || '');
      setSuppl(d.supplementary_note || '');
      const cr: Record<number, string> = {};
      d.reaction_conditions.forEach(c => { if (c.review_note) cr[c.id!] = c.review_note; });
      setCondReviews(cr);
      const si: Record<number, string> = {};
      d.spectrum_data.forEach(s => { if (s.interpretation) si[s.id!] = s.interpretation; });
      setSpecInterps(si);
    } finally { setLoading(false); }
  };

  const transition = async (dir: 'next' | 'back') => {
    if (!currentId || !detail) return;
    try {
      const fn = dir === 'next' ? recordsApi.statusNext : recordsApi.statusBack;
      await fn(currentId, { operator: reviewer, operation_note: '复核页面手动推进' });
      message.success('状态已更新');
      loadDetail(currentId);
      loadList();
    } catch (e: any) { message.error(e.response?.data?.detail || '状态更新失败'); }
  };

  const submitReview = async (pass: boolean) => {
    if (!currentId) return;
    setSubmitting(true);
    try {
      const payload: ReviewSubmit = {
        reviewer,
        processing_opinion: opinion,
        safety_note: safety,
        supplementary_note: suppl,
        reaction_condition_reviews: condReviews,
        spectrum_interpretations: specInterps,
        pass_review: pass,
      };
      const updated = await recordsApi.review(currentId, payload);
      message.success(pass ? '复核通过，状态已推进到「复核通过」' : '复核意见已保存，未通过待补正');
      setDetail(updated);
      loadList();
    } catch (e: any) { message.error(e.response?.data?.detail || '提交失败'); }
    finally { setSubmitting(false); }
  };

  const statusStep = useMemo(() => {
    if (!detail) return 0;
    const order = ['imported', 'reviewing', 'reviewed', 'pending_export', 'exported'];
    return order.indexOf(detail.status);
  }, [detail]);

  /* ---- 温度条件表 ---- */
  const tempColumns = [
    { title: '#', dataIndex: 'row_order', width: 50 },
    { title: '条件名称', dataIndex: 'condition_name', width: 200 },
    {
      title: '原始值', dataIndex: 'condition_value', width: 130,
      onCell: (r: ReactionCondition) => ({
        className: (r.is_unit_missing || r.is_unit_mismatch) && /温度|temp/i.test(r.condition_name || '')
          ? 'temp-mix-highlight' : '',
      }),
    },
    {
      title: '单位', dataIndex: 'unit', width: 80,
      render: (v: string, r: ReactionCondition) => (
        <Space>
          {v || <Tag color="gold">漏填</Tag>}
          {r.is_unit_mismatch && <Tag color="orange">非标准</Tag>}
          {r.is_unit_missing && <Tag color="gold">默认按℃</Tag>}
        </Space>
      ),
    },
    { title: '归一化值', dataIndex: 'normalized_value', width: 100,
      render: (v: any) => typeof v === 'number' ? v.toFixed(2) : '-' },
    { title: '归一化单位', dataIndex: 'normalized_unit', width: 90,
      render: (v: string) => v ? <Tag color="green">{v}</Tag> : '-' },
    {
      title: '问题说明', dataIndex: 'issue_description',
      render: (v: string, r: ReactionCondition) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {v && <Tag color="red">{v}</Tag>}
          <TextArea
            rows={2}
            placeholder="复核备注（温度是否正确、与工艺一致性等）"
            value={condReviews[r.id!] || ''}
            onChange={(e) => setCondReviews({ ...condReviews, [r.id!]: e.target.value })}
          />
        </Space>
      ),
    },
  ];

  /* ---- 底物换算表 ---- */
  const subColumns = [
    { title: '#', dataIndex: 'row_order', width: 50 },
    { title: '底物名称', dataIndex: 'substrate_name', width: 220 },
    { title: 'CAS号', dataIndex: 'cas_no', width: 110 },
    { title: '称样量', width: 110,
      render: (_: any, r: SubstrateConversion) => `${r.initial_mass ?? '-'} ${r.initial_mass_unit || ''}` },
    { title: '定容体积', width: 110,
      render: (_: any, r: SubstrateConversion) => `${r.volume ?? '-'} ${r.volume_unit || ''}` },
    { title: '分子量', dataIndex: 'molecular_weight', width: 90 },
    { title: '纯度', width: 80, render: (_: any, r: SubstrateConversion) => `${r.purity ?? 100}%` },
    { title: '换算终浓度', width: 140,
      render: (_: any, r: SubstrateConversion) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{r.final_concentration?.toFixed(4)} {r.final_concentration_unit}</Tag>
          <Tooltip title={r.conversion_formula}>
            <span style={{ color: '#999', fontSize: 12 }}>换算公式 🔍</span>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '称量精度（普通话解释）',
      dataIndex: 'weighing_issue_explain',
      onCell: (r: SubstrateConversion) => ({ className: r.is_weighing_insufficient ? 'unit-error-highlight' : '' }),
      render: (v: string, r: SubstrateConversion) => (
        <Space direction="vertical" size={4} style={{ width: 320 }}>
          <Space>
            <Tag color={r.is_weighing_insufficient ? 'red' : 'green'}>
              {r.weighing_precision || '常规'}
            </Tag>
            {r.is_weighing_insufficient
              ? <Badge status="error" text="精度不足" />
              : <Badge status="success" text="精度满足" />}
          </Space>
          <span style={{ fontSize: 12, lineHeight: 1.6 }}>{v || '称量精度满足要求'}</span>
        </Space>
      ),
    },
  ];

  /* ---- 谱图数据 ---- */
  const specColumns = [
    { title: '#', dataIndex: 'row_order', width: 50 },
    { title: '峰名', dataIndex: 'peak_name', width: 180 },
    { title: 'RT(min)', dataIndex: 'retention_time', width: 90 },
    { title: '峰面积', dataIndex: 'peak_area', width: 110 },
    { title: '峰高', dataIndex: 'peak_height', width: 100 },
    {
      title: '重叠情况', width: 180,
      render: (_: any, r: SpectrumData) => (
        <Space direction="vertical" size={2}>
          {r.is_overlap ? (
            <>
              <Tag color="red">
                {r.overlap_severity === 'severe' ? '严重重叠' : r.overlap_severity === 'moderate' ? '中度重叠' : '轻度重叠'}
              </Tag>
              <span style={{ fontSize: 12 }}>与 {r.overlap_with} 重叠</span>
              {r.overlap_note && <Tooltip title={r.overlap_note}><span style={{ color: '#999', fontSize: 12 }}>详细说明 🔍</span></Tooltip>}
            </>
          ) : <Tag color="green">正常</Tag>}
        </Space>
      ),
    },
    {
      title: '谱图判读（与换算记录绑定）',
      width: 360,
      render: (_: any, r: SpectrumData) => (
        <TextArea
          rows={2}
          value={specInterps[r.id!] || ''}
          placeholder="输入该峰的判读结论"
          onChange={(e) => setSpecInterps({ ...specInterps, [r.id!]: e.target.value })}
        />
      ),
    },
  ];

  const chartData = useMemo(() => {
    if (!detail) return [];
    const merged: any = {};
    detail.spectrum_data.forEach(sp => {
      const pts = (sp.raw_data_json as any)?.points || [];
      pts.forEach((p: any) => {
        const key = p.retention_time.toFixed(2);
        if (!merged[key]) merged[key] = { retention_time: p.retention_time };
        merged[key][sp.peak_name || `峰${sp.row_order}`] = p.intensity;
      });
    });
    return Object.values(merged).sort((a: any, b: any) => a.retention_time - b.retention_time);
  }, [detail]);
  const lineColors = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1'];

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              showSearch
              placeholder="选择处理记录进行复核"
              optionFilterProp="label"
              value={currentId}
              onChange={(v) => { setCurrentId(v); navigate(`/review/${v}`); }}
              options={records.map(r => ({
                value: r.id,
                label: `${r.batch_no} / ${r.material_name} (${r.record_no})`,
              }))}
            />
          </Col>
          <Col span={12}>
            <Steps
              current={statusStep}
              size="small"
              items={[
                { title: '已导入' },
                { title: '复核中' },
                { title: '复核通过' },
                { title: '待导出' },
                { title: '已导出' },
              ]}
            />
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Space>
              <Input value={reviewer} onChange={e => setReviewer(e.target.value)} prefix="复核人:" style={{ width: 200 }} />
              <Button icon={<ArrowLeftOutlined />} onClick={() => transition('back')}
                disabled={!detail || detail.status === 'imported'}>回退</Button>
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => transition('next')}
                disabled={!detail || detail.status === 'exported'}>推进</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {!detail && <Alert type="info" message="请先选择或创建一条处理记录" />}

      {detail && (
        <>
          {/* 异常总览 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={<span><WarningOutlined style={{ color: '#fa8c16' }} /> 温度单位混用</span>}
                  value={detail.has_temp_unit_mix ? '检测到' : '无'}
                  valueStyle={{ color: detail.has_temp_unit_mix ? '#cf1322' : '#389e0d' }}
                  suffix={detail.temp_unit_issue_detail?.units_used?.length ? `${detail.temp_unit_issue_detail.units_used.length}种单位` : ''}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={<span><SafetyCertificateOutlined style={{ color: '#eb2f96' }} /> 谱峰重叠</span>}
                  value={detail.has_peak_overlap ? '检测到' : '无'}
                  valueStyle={{ color: detail.has_peak_overlap ? '#cf1322' : '#389e0d' }}
                  suffix={detail.peak_overlap_detail?.count ? `${detail.peak_overlap_detail.count}处` : ''}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={<span><AuditOutlined style={{ color: '#722ed1' }} /> 称量精度不足</span>}
                  value={detail.has_weighing_issue ? '检测到' : '无'}
                  valueStyle={{ color: detail.has_weighing_issue ? '#cf1322' : '#389e0d' }}
                  suffix={detail.weighing_issue_detail?.count ? `${detail.weighing_issue_detail.count}项` : ''}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={<span><FileProtectOutlined style={{ color: '#d4b106' }} /> 漏填单位</span>}
                  value={detail.missing_unit_fields?.length || 0}
                  valueStyle={{ color: detail.missing_unit_fields?.length ? '#cf1322' : '#389e0d' }}
                  suffix="项字段"
                />
              </Card>
            </Col>
          </Row>

          {/* 基本信息 */}
          <Card className="section-card" size="small" title="基础信息 & 备注（安全备注/补录说明会进同一轮报告）">
            <Row gutter={16}>
              <Col span={8}>
                <Form layout="vertical" size="small">
                  <Form.Item label="批次号"><Input value={detail.batch_no} disabled /></Form.Item>
                </Form>
              </Col>
              <Col span={8}>
                <Form layout="vertical" size="small">
                  <Form.Item label="物料名称"><Input value={detail.material_name} disabled /></Form.Item>
                </Form>
              </Col>
              <Col span={8}>
                <Form layout="vertical" size="small">
                  <Form.Item label="记录号"><Input value={detail.record_no} disabled /></Form.Item>
                </Form>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label={<span><SafetyCertificateOutlined /> 安全备注（会写入报告）</span>}>
                  <TextArea rows={3} value={safety} onChange={e => setSafety(e.target.value)}
                    placeholder="如：本批含β-巯基乙醇，必须通风橱操作；ONPG染色性..." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="补录说明（换班交接/旧表补录）">
                  <TextArea rows={3} value={suppl} onChange={e => setSuppl(e.target.value)}
                    placeholder="如：1) 310.15K来自上一班李工；2) ONPG称样量由W-20260608-037回算..." />
                </Form.Item>
              </Col>
            </Row>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={
                <Space>
                  <ThunderboltOutlined />
                  <span>
                    本页所有改动共用一条处理记录（浓度换算、谱图判读、反应条件三者 record_id 相同），
                    不会出现界面和报告各算各的。
                  </span>
                </Space>
              }
            />
          </Card>

          <Tabs
            items={[
              {
                key: 'temp',
                label: (
                  <span>
                    🌡 反应条件 / 温度单位复核
                    {detail.has_temp_unit_mix && <Badge count="!" color="#fa8c16" style={{ marginLeft: 6 }} />}
                    {detail.missing_unit_fields?.length && <Badge count={detail.missing_unit_fields.length} color="#d4b106" style={{ marginLeft: 6 }} />}
                  </span>
                ),
                children: (
                  <>
                    {detail.temp_unit_issue_detail?.summary && (
                      <Alert style={{ marginBottom: 12 }} type="warning" showIcon
                        message={detail.temp_unit_issue_detail.summary}
                        description="所有温度已按标准单位℃归一化，漏填者自动补℃并高亮。" />
                    )}
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={detail.reaction_conditions}
                      columns={tempColumns}
                      pagination={false}
                      rowClassName={(r) =>
                        (r.is_unit_missing ? 'missing-highlight ' : '') +
                        (/温度|temp/i.test(r.condition_name || '') && r.is_unit_mismatch ? 'temp-mix-highlight' : '')
                      }
                    />
                  </>
                ),
              },
              {
                key: 'sub',
                label: (
                  <span>
                    🧪 底物浓度换算 / 称量精度
                    {detail.has_weighing_issue && <Badge count={detail.weighing_issue_detail?.count} color="#cf1322" style={{ marginLeft: 6 }} />}
                  </span>
                ),
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.substrate_conversions}
                    columns={subColumns}
                    pagination={false}
                    rowClassName={(r) => r.is_weighing_insufficient ? 'unit-error-highlight' : ''}
                    scroll={{ x: 1400 }}
                  />
                ),
              },
              {
                key: 'spec',
                label: (
                  <span>
                    📈 谱图判读 / 峰重叠
                    {detail.has_peak_overlap && <Badge count={detail.peak_overlap_detail?.count} color="#eb2f96" style={{ marginLeft: 6 }} />}
                  </span>
                ),
                children: (
                  <>
                    <div className="spec-chart-wrap" style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 6, fontWeight: 600 }}>模拟谱图（与下方峰记录绑定）</div>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="retention_time" label={{ value: '保留时间(min)', position: 'insideBottom', offset: -4 }} />
                          <YAxis label={{ value: '响应', angle: -90, position: 'insideLeft' }} />
                          <RTooltip />
                          <Legend />
                          {detail.spectrum_data.map((sp, i) => (
                            <Line
                              key={sp.id}
                              type="monotone"
                              dataKey={sp.peak_name || `峰${sp.row_order}`}
                              stroke={sp.is_overlap ? '#cf1322' : lineColors[i % lineColors.length]}
                              strokeWidth={sp.is_overlap ? 2.5 : 1.8}
                              strokeDasharray={sp.is_overlap ? '6 3' : undefined}
                              dot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                        说明：重叠峰用红色虚线加粗表示。各峰判读结论与上方底物换算记录通过record_id绑定，避免界面和报告各算各的。
                      </div>
                    </div>
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={detail.spectrum_data}
                      columns={specColumns}
                      pagination={false}
                      rowClassName={(r) => r.is_overlap ? 'unit-error-highlight' : ''}
                      scroll={{ x: 1200 }}
                    />
                  </>
                ),
              },
              {
                key: 'opinion',
                label: <span>📝 处理意见 / 放行结论</span>,
                children: (
                  <div>
                    <Alert
                      style={{ marginBottom: 12 }}
                      type="info"
                      showIcon
                      message="处理意见会原样写入 PDF 报告的「可直接转发的普通话说明」部分，配方工程师可以直接复制粘贴给同事。"
                    />
                    <TextArea
                      rows={8}
                      value={opinion}
                      onChange={(e) => setOpinion(e.target.value)}
                      placeholder={
                        "示例：同意本批次放行：1) 温度已统一按℃复核，310.15K=37℃与工艺一致；" +
                        "2) ONPG 0.3mg已用十万分之一天平(W330)复核，后续尽量增大到1mg；" +
                        "3) 产物峰与杂质X中度重叠，按背景扣除法RSD<3%可接受..."
                      }
                    />
                  </div>
                ),
              },
            ]}
          />

          <Divider />
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<EyeOutlined />} onClick={() => navigate(`/record/${currentId}`)}>
                查看完整详情/审计日志
              </Button>
              <Button icon={<CloseCircleOutlined />} onClick={() => submitReview(false)} loading={submitting}>
                仅保存复核意见（不通过）
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={() => submitReview(true)}
                loading={submitting}
                disabled={detail.status === 'exported'}
              >
                复核通过 → 推进到「复核通过」
              </Button>
            </Space>
          </div>
        </>
      )}
    </>
  );
}
