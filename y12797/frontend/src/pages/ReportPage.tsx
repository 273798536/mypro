import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Select, Button, Space, Alert, Descriptions, Tag, Tabs, Input,
  Empty, Spin, message, Tooltip, Divider, Typography, Table, Modal,
} from 'antd';
import {
  FilePdfOutlined,
  DownloadOutlined,
  CopyOutlined,
  LinkOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { recordsApi, ProcessingRecord, ProcessingRecordDetail, STATUS_LABEL, STATUS_COLOR } from '../api';

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ProcessingRecord[]>([]);
  const [currentId, setCurrentId] = useState<number | undefined>(id ? parseInt(id) : undefined);
  const [detail, setDetail] = useState<ProcessingRecordDetail | null>(null);
  const [plain, setPlain] = useState<string>('');
  const [audit, setAudit] = useState<any[]>([]);
  const [anomalyKey, setAnomalyKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [operator, setOperator] = useState('质检主管-导出人');
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => {
    if (records.length && !currentId) {
      const candidate = records.find(r => r.status !== 'imported') || records[0];
      setCurrentId(candidate.id);
    }
  }, [records]);
  useEffect(() => { if (currentId) loadAll(currentId); }, [currentId]);

  const loadRecords = async () => {
    try {
      const res = await recordsApi.list({ limit: 200 });
      setRecords(res.items);
    } catch { /* ignore */ }
  };

  const loadAll = async (rid: number) => {
    setLoading(true);
    try {
      const [d, p, a] = await Promise.all([
        recordsApi.get(rid),
        recordsApi.plainExplain(rid),
        recordsApi.auditChain(rid, anomalyKey || undefined),
      ]);
      setDetail(d);
      setPlain(p.plain_explain || '');
      setAudit(a.chain || []);
    } finally { setLoading(false); }
  };

  const exportReport = async () => {
    if (!currentId) return;
    try {
      const res = await recordsApi.exportReport(currentId, operator);
      if (res.success && res.download_url) {
        message.success('报告已生成，正在弹出下载...');
        const anchor = document.createElement('a');
        anchor.href = res.download_url;
        anchor.target = '_blank';
        anchor.download = res.file_name!;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        loadAll(currentId);
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '生成失败');
    }
  };

  const anomalyOptions = useMemo(() => {
    if (!detail) return [];
    const opts: { label: string; value: string }[] = [{ label: '完整链路（不从异常点出发）', value: '' }];
    detail.substrate_conversions.forEach(s => {
      if (s.is_weighing_insufficient) {
        opts.push({ label: `称量异常：${s.substrate_name} (${s.weighing_precision})`, value: s.substrate_name! });
      }
    });
    detail.spectrum_data.forEach(sp => {
      if (sp.is_overlap) {
        opts.push({ label: `重叠异常：${sp.peak_name} (RT=${sp.retention_time}min)`, value: sp.peak_name! });
      }
    });
    detail.reaction_conditions.forEach(c => {
      if (c.is_unit_missing || c.is_unit_mismatch) {
        opts.push({ label: `单位异常：${c.condition_name}`, value: c.condition_name! });
      }
    });
    return opts;
  }, [detail]);

  const issueTags = useMemo(() => {
    if (!detail) return [];
    const tags: JSX.Element[] = [];
    if (detail.has_temp_unit_mix) tags.push(<Tag color="orange">温度混用</Tag>);
    if (detail.has_peak_overlap) tags.push(<Tag color="red">峰重叠</Tag>);
    if (detail.has_weighing_issue) tags.push(<Tag color="purple">称量不足</Tag>);
    if (detail.missing_unit_fields?.length) tags.push(<Tag color="gold">漏填单位</Tag>);
    return tags;
  }, [detail]);

  const substrateColumns = [
    { title: '底物名称', dataIndex: 'substrate_name' },
    { title: '称样量/单位', render: (r: any) => `${r.initial_mass ?? '-'} ${r.initial_mass_unit || ''}` },
    { title: '体积/单位', render: (r: any) => `${r.volume ?? '-'} ${r.volume_unit || ''}` },
    { title: '分子量', dataIndex: 'molecular_weight' },
    { title: '终浓度', render: (r: any) => <Tag color="blue">{r.final_concentration?.toFixed(4)} {r.final_concentration_unit}</Tag> },
    { title: '称量精度', render: (r: any) => (
      <Space>
        <Tag color={r.is_weighing_insufficient ? 'red' : 'green'}>{r.weighing_precision || '常规'}</Tag>
      </Space>
    )},
  ];

  const spectrumColumns = [
    { title: '峰名', dataIndex: 'peak_name' },
    { title: 'RT(min)', dataIndex: 'retention_time' },
    { title: '峰面积', dataIndex: 'peak_area' },
    { title: '是否重叠', render: (r: any) => r.is_overlap ? <Tag color="red">是（{r.overlap_severity}）</Tag> : <Tag color="green">否</Tag> },
    { title: '重叠对象', dataIndex: 'overlap_with' },
    { title: '判读结论', dataIndex: 'interpretation' },
  ];

  return (
    <Spin spinning={loading}>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="选择已复核的处理记录"
              value={currentId}
              onChange={(v) => { setCurrentId(v); navigate(`/report/${v}`); }}
              optionFilterProp="label"
              options={records.map(r => ({
                value: r.id,
                label: `[${STATUS_LABEL[r.status]}] ${r.batch_no} / ${r.material_name}`,
              }))}
            />
          </Col>
          <Col span={8}>
            <Space>
              <span>异常点：</span>
              <Select
                style={{ width: 340 }}
                placeholder="选一个异常点，追溯链从这里往回查"
                value={anomalyKey}
                onChange={(v) => setAnomalyKey(v)}
                options={anomalyOptions}
                allowClear
              />
              <Button type="link" icon={<HistoryOutlined />} onClick={() => loadAll(currentId!)}>重新生成链</Button>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Input value={operator} onChange={e => setOperator(e.target.value)} prefix="导出人:" style={{ width: 200 }} />
              <Button type="primary" size="large" icon={<FilePdfOutlined />} onClick={exportReport} disabled={!currentId}>
                生成PDF并下载
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {!detail && <Empty description="请先选择一条处理记录" />}

      {detail && (
        <>
          {/* 报告头 */}
          <Card className="section-card" title="酶促反应底物换算复核报告（预览）"
            extra={<Tag color={STATUS_COLOR[detail.status] as any}>{STATUS_LABEL[detail.status]}</Tag>}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="记录号"><Text copyable>{detail.record_no}</Text></Descriptions.Item>
              <Descriptions.Item label="批次号">{detail.batch_no}</Descriptions.Item>
              <Descriptions.Item label="物料名称">{detail.material_name}</Descriptions.Item>
              <Descriptions.Item label="源文件">{detail.source_file_name || '（手动创建）'}</Descriptions.Item>
              <Descriptions.Item label="复核人">{detail.reviewer || '—'}</Descriptions.Item>
              <Descriptions.Item label="复核时间">{detail.reviewed_at || '—'}</Descriptions.Item>
              <Descriptions.Item label="异常标签" span={2}>
                {issueTags.length ? <Space size={4} wrap>{issueTags}</Space> : <Tag color="green">无异常</Tag>}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            items={[
              {
                key: 'plain',
                label: <span>📣 普通话解释（可直接转发同事）</span>,
                children: (
                  <Card
                    className="section-card"
                    title="本节可直接复制粘贴给同事，不用重新翻译"
                    extra={
                      <Button
                        type="primary"
                        ghost
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(plain);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                          message.success('已复制到剪贴板');
                        }}
                      >
                        {copied ? '已复制' : '一键复制'}
                      </Button>
                    }
                  >
                    {detail.status === 'imported' && (
                      <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                        message="当前为「已导入」状态，建议完成复核并填写处理意见后再复制转发" />
                    )}
                    <div className="plain-explain-box">
                      {plain || '（暂无内容，请先完成复核）'}
                    </div>
                  </Card>
                ),
              },
              {
                key: 'summary',
                label: '📊 异常 & 复核摘要',
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card className="section-card" size="small" title="温度单位复核">
                        {!detail.has_temp_unit_mix
                          ? <Tag color="green">✅ 未检测到混用/漏填</Tag>
                          : (
                            <>
                              <Alert type="warning" showIcon style={{ marginBottom: 10 }}
                                message={detail.temp_unit_issue_detail?.summary || ''} />
                              <ul>
                                {detail.temp_unit_issue_detail?.conditions?.map((c: any, i: number) => (
                                  <li key={i}>
                                    <Space>
                                      <Text strong>{c.condition_name}</Text>
                                      <span>{c.value} {c.unit}</span>
                                      <Arrow />
                                      <Tag color="green">{c.normalized_value?.toFixed(2)} {c.normalized_unit}</Tag>
                                      {c.is_missing && <Tag color="gold">漏填单位</Tag>}
                                      {c.is_mismatch && <Tag color="orange">非℃制</Tag>}
                                      {c.issue && <span style={{ color: '#999' }}>（{c.issue}）</span>}
                                    </Space>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                      </Card>
                      <Card className="section-card" size="small" title="称量精度复核（普通话解释）">
                        {!detail.has_weighing_issue
                          ? <Tag color="green">✅ 所有底物称量精度满足要求</Tag>
                          : (
                            <ul>
                              {detail.weighing_issue_detail?.items?.map((it: any, i: number) => (
                                <li key={i} style={{ marginBottom: 10 }}>
                                  <div><Tag color="red">{it.substrate}</Tag> <Tag>{it.precision}</Tag></div>
                                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{it.explain}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card className="section-card" size="small" title="谱峰重叠复核">
                        {!detail.has_peak_overlap
                          ? <Tag color="green">✅ 未检测到显著峰重叠</Tag>
                          : (
                            <ul>
                              {detail.peak_overlap_detail?.overlaps?.map((o: any, i: number) => (
                                <li key={i} style={{ marginBottom: 10 }}>
                                  <Space>
                                    <Tag color={
                                      o.severity === 'severe' ? 'red'
                                        : o.severity === 'moderate' ? 'orange' : 'gold'
                                    }>{o.severity_cn}</Tag>
                                    <Text strong>{o.peak_a}</Text> <span>↔</span> <Text strong>{o.peak_b}</Text>
                                    <span style={{ color: '#666' }}>ΔRT={o.delta_rt}min</span>
                                  </Space>
                                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{o.note}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                      </Card>
                      <Card className="section-card" size="small" title="漏填单位字段">
                        {!detail.missing_unit_fields?.length
                          ? <Tag color="green">✅ 所有字段已规范填写单位</Tag>
                          : (
                            <ul>
                              {detail.missing_unit_fields.map((m: any, i: number) => (
                                <li key={i}>
                                  <Tag color="gold">{m.type}</Tag> <Text strong>{m.name}</Text>
                                  <span style={{ color: '#666' }}>：{m.issue}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'substrate',
                label: '🧪 底物浓度换算表',
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.substrate_conversions}
                    columns={substrateColumns}
                    pagination={false}
                    expandable={{
                      expandedRowRender: (r) => (
                        <Descriptions column={2} size="small">
                          <Descriptions.Item label="换算公式">{r.conversion_formula}</Descriptions.Item>
                          <Descriptions.Item label="换算说明">{r.conversion_note || '—'}</Descriptions.Item>
                          <Descriptions.Item label="称量精度（普通话）" span={2}>
                            {r.weighing_issue_explain || '称量精度满足要求'}
                          </Descriptions.Item>
                        </Descriptions>
                      ),
                    }}
                  />
                ),
              },
              {
                key: 'spectrum',
                label: '📈 谱图判读表',
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.spectrum_data}
                    columns={spectrumColumns}
                    pagination={false}
                    expandable={{
                      expandedRowRender: (r) => (
                        <Descriptions column={2} size="small">
                          <Descriptions.Item label="重叠说明">{r.overlap_note || '—'}</Descriptions.Item>
                          <Descriptions.Item label="谱图类型 / 波长">
                            {r.spectrum_type || 'HPLC'} @ {r.detection_wavelength || '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="色谱柱">{r.column_info || '—'}</Descriptions.Item>
                          <Descriptions.Item label="与浓度换算绑定">
                            {r.interpretation_linked
                              ? <Tag color="green"><CheckCircleOutlined /> 是（共用record_id={detail!.id}）</Tag>
                              : <Tag color="default">否</Tag>}
                          </Descriptions.Item>
                        </Descriptions>
                      ),
                    }}
                  />
                ),
              },
              {
                key: 'audit',
                label: <span>🔗 异常追溯链（验收沿链回查）</span>,
                children: (
                  <Card
                    className="section-card"
                    size="small"
                    title={
                      <Space>
                        <ExclamationCircleOutlined style={{ color: '#cf1322' }} />
                        <span>
                          从异常点出发，往上依次查：处理意见 → 反应条件 → 浓度换算 → 谱图判读 → 导入痕迹
                          （{anomalyKey ? `当前锚定异常：${anomalyKey}` : '完整链路'}）
                        </span>
                      </Space>
                    }
                  >
                    {audit.map((node, i) => (
                      <div key={i} className={`audit-node audit-node-level-${node.level % 6}`}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          <Tag color="blue">节点{i + 1}</Tag>
                          <span style={{ marginLeft: 6 }}>{node.node}</span>
                          {node.suggestion && (
                            <Tooltip title={node.suggestion}>
                              <Tag color="gold" style={{ marginLeft: 6 }}>建议</Tag>
                            </Tooltip>
                          )}
                        </div>
                        <div style={{ paddingLeft: 12 }}>
                          {typeof node.evidence === 'object' && node.evidence !== null ? (
                            Object.entries(node.evidence).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 13, lineHeight: 1.8 }}>
                                <Text type="secondary">▸ {k}：</Text>
                                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                              </div>
                            ))
                          ) : (
                            <div>{String(node.evidence ?? '')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </Card>
                ),
              },
            ]}
          />

          <Card className="section-card" title="处理意见 & 安全备注 & 补录说明（全部进报告）">
            <Row gutter={16}>
              <Col span={8}>
                <Title level={5} style={{ marginTop: 0 }}>安全备注</Title>
                <div className="plain-explain-box" style={{ background: '#fff2e8', borderColor: '#ffd591' }}>
                  {detail.safety_note || '—'}
                </div>
              </Col>
              <Col span={8}>
                <Title level={5} style={{ marginTop: 0 }}>补录说明</Title>
                <div className="plain-explain-box" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
                  {detail.supplementary_note || '—'}
                </div>
              </Col>
              <Col span={8}>
                <Title level={5} style={{ marginTop: 0 }}>处理意见</Title>
                <div className="plain-explain-box" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                  {detail.processing_opinion || '—'}
                </div>
              </Col>
            </Row>
          </Card>

          <Divider />
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/review/${currentId}`)}>返回复核页面</Button>
              <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={exportReport}>
                生成 & 下载 PDF 报告
              </Button>
            </Space>
          </div>
        </>
      )}
    </Spin>
  );
}

function Arrow() { return <span style={{ margin: '0 6px', color: '#1677ff' }}>→</span>; }
