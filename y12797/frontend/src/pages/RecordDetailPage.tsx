import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Tabs, Table, Button, Space, Alert, Spin, Timeline, Row, Col,
  Result, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, FilePdfOutlined, AuditOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { recordsApi, ProcessingRecordDetail, STATUS_LABEL, STATUS_COLOR } from '../api';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProcessingRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const d = await recordsApi.get(parseInt(id));
        setDetail(d);
      } catch (e: any) {
        if (e.response?.status === 404) setNotFound(true);
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (notFound) {
    return <Result status="404" title="记录不存在" subTitle="请确认记录ID是否正确"
      extra={<Button type="primary" onClick={() => navigate('/history')}>返回历史</Button>} />;
  }

  return (
    <Spin spinning={loading}>
      {detail && (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginRight: 12 }}>返回</Button>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{detail.material_name}</span>
                <Tag color={STATUS_COLOR[detail.status] as any} style={{ marginLeft: 12 }}>{STATUS_LABEL[detail.status]}</Tag>
              </Col>
              <Col>
                <Space>
                  <Button icon={<AuditOutlined />} onClick={() => navigate(`/review/${detail.id}`)}>去复核</Button>
                  <Button type="primary" icon={<FilePdfOutlined />} onClick={() => navigate(`/report/${detail.id}`)}>查看报告</Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message="本条记录包含完整追溯信息：浓度换算与谱图判读共用同一个 record_id，可配合状态日志与审计追踪使用。"
            description={`记录号：${detail.record_no} | 数据库ID：${detail.id}`}
          />

          <Tabs
            items={[
              {
                key: 'basic',
                label: '🧾 基础信息',
                children: (
                  <Card className="section-card" size="small">
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="记录号"><span style={{ fontFamily: 'monospace' }}>{detail.record_no}</span></Descriptions.Item>
                      <Descriptions.Item label="批次号">{detail.batch_no}</Descriptions.Item>
                      <Descriptions.Item label="物料名称">{detail.material_name}</Descriptions.Item>
                      <Descriptions.Item label="状态">{STATUS_LABEL[detail.status]}</Descriptions.Item>
                      <Descriptions.Item label="源文件">{detail.source_file_name || '（样例/手动）'}</Descriptions.Item>
                      <Descriptions.Item label="源格式">{detail.source_format}</Descriptions.Item>
                      <Descriptions.Item label="复核人">{detail.reviewer || '—'}</Descriptions.Item>
                      <Descriptions.Item label="复核时间">{detail.reviewed_at ? dayjs(detail.reviewed_at).format('YYYY-MM-DD HH:mm:ss') : '—'}</Descriptions.Item>
                      <Descriptions.Item label="导出人">{detail.exporter || '—'}</Descriptions.Item>
                      <Descriptions.Item label="导出时间">{detail.exported_at ? dayjs(detail.exported_at).format('YYYY-MM-DD HH:mm:ss') : '—'}</Descriptions.Item>
                      <Descriptions.Item label="创建时间">{dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                      <Descriptions.Item label="更新时间">{dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                      <Descriptions.Item label="异常标签" span={2}>
                        <Space>
                          {detail.has_temp_unit_mix && <Tag color="orange">温度单位混用</Tag>}
                          {detail.has_peak_overlap && <Tag color="red">谱峰重叠</Tag>}
                          {detail.has_weighing_issue && <Tag color="purple">称量精度不足</Tag>}
                          {detail.missing_unit_fields?.length ? <Tag color="gold">漏填单位×{detail.missing_unit_fields.length}</Tag> : null}
                          {!detail.has_temp_unit_mix && !detail.has_peak_overlap && !detail.has_weighing_issue && !detail.missing_unit_fields?.length
                            ? <Tag color="green"><CheckCircleOutlined /> 无异常</Tag> : null}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="综合备注" span={2}>{detail.remark || '—'}</Descriptions.Item>
                      <Descriptions.Item label="补录说明" span={2}>{detail.supplementary_note || '—'}</Descriptions.Item>
                      <Descriptions.Item label="安全备注" span={2}>{detail.safety_note || '—'}</Descriptions.Item>
                      <Descriptions.Item label="处理意见/放行结论" span={2}>{detail.processing_opinion || '—'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                ),
              },
              {
                key: 'conds',
                label: '🌡 反应条件',
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.reaction_conditions}
                    pagination={false}
                    columns={[
                      { title: '#', dataIndex: 'row_order', width: 50 },
                      { title: '条件名称', dataIndex: 'condition_name' },
                      { title: '原始值', dataIndex: 'condition_value' },
                      { title: '原始单位', render: (r: any) => r.unit || <Tag color="gold">漏填</Tag> },
                      { title: '归一化值', render: (r: any) => typeof r.normalized_value === 'number' ? r.normalized_value.toFixed(2) : '-' },
                      { title: '归一化单位', dataIndex: 'normalized_unit' },
                      { title: '问题说明', dataIndex: 'issue_description' },
                      { title: '复核备注', dataIndex: 'review_note' },
                    ]}
                  />
                ),
              },
              {
                key: 'subs',
                label: '🧪 底物浓度换算（共用本条记录ID）',
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.substrate_conversions}
                    pagination={false}
                    columns={[
                      { title: '#', dataIndex: 'row_order', width: 50 },
                      { title: '底物名称', dataIndex: 'substrate_name' },
                      { title: 'CAS', dataIndex: 'cas_no' },
                      { title: '称样量', render: (r: any) => `${r.initial_mass ?? '-'} ${r.initial_mass_unit || ''}` },
                      { title: '定容', render: (r: any) => `${r.volume ?? '-'} ${r.volume_unit || ''}` },
                      { title: '分子量', dataIndex: 'molecular_weight' },
                      { title: '纯度', render: (r: any) => `${r.purity ?? 100}%` },
                      { title: '终浓度', render: (r: any) => <Tag color="blue">{r.final_concentration?.toFixed(4)} {r.final_concentration_unit}</Tag> },
                      { title: '称量精度', render: (r: any) => (
                        <Space>
                          <Tag color={r.is_weighing_insufficient ? 'red' : 'green'}>{r.weighing_precision || '常规'}</Tag>
                        </Space>
                      )},
                      { title: '换算公式', dataIndex: 'conversion_formula', ellipsis: true },
                    ]}
                  />
                ),
              },
              {
                key: 'specs',
                label: '📈 谱图判读（共用本条记录ID）',
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.spectrum_data}
                    pagination={false}
                    columns={[
                      { title: '#', dataIndex: 'row_order', width: 50 },
                      { title: '峰名', dataIndex: 'peak_name' },
                      { title: '类型/波长', render: (r: any) => `${r.spectrum_type || 'HPLC'} @ ${r.detection_wavelength || '—'}` },
                      { title: 'RT(min)', dataIndex: 'retention_time' },
                      { title: '峰面积', dataIndex: 'peak_area' },
                      { title: '峰高', dataIndex: 'peak_height' },
                      { title: '重叠情况', render: (r: any) => r.is_overlap
                          ? <Tag color="red">{r.overlap_severity || '重叠'}：{r.overlap_with}</Tag>
                          : <Tag color="green">无</Tag> },
                      { title: '重叠说明', dataIndex: 'overlap_note', ellipsis: true },
                      { title: '判读结论', dataIndex: 'interpretation', ellipsis: true },
                      { title: '绑定换算', render: (r: any) => r.interpretation_linked
                          ? <Tag color="green"><CheckCircleOutlined /> 共用 record_id={detail.id}</Tag>
                          : <Tag>否</Tag> },
                    ]}
                  />
                ),
              },
              {
                key: 'status',
                label: `⏱ 状态推进日志（${detail.status_logs.length}条）`,
                children: (
                  <Card className="section-card">
                    <Timeline
                      mode="left"
                      items={detail.status_logs.map(l => ({
                        color: l.to_status === 'exported' ? 'purple'
                          : l.to_status === 'reviewed' ? 'green'
                            : l.to_status === 'reviewing' ? 'blue' : 'gray',
                        label: dayjs(l.operated_at).format('YYYY-MM-DD HH:mm:ss'),
                        children: (
                          <div>
                            <Tag>{l.from_status || '∅'}</Tag>
                            <span style={{ margin: '0 6px' }}>→</span>
                            <Tag color={STATUS_COLOR[l.to_status || ''] as any}>{STATUS_LABEL[l.to_status || '']}</Tag>
                            <span style={{ marginLeft: 12, color: '#666' }}>操作人：{l.operator}</span>
                            {l.operation_note && (
                              <div style={{ marginTop: 4, color: '#888' }}>备注：{l.operation_note}</div>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  </Card>
                ),
              },
              {
                key: 'audit',
                label: `🔍 审计追踪（${detail.audit_trails.length}条）`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={detail.audit_trails}
                    pagination={false}
                    columns={[
                      { title: '时间', dataIndex: 'operated_at', width: 170,
                        render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
                      { title: '操作类型', dataIndex: 'action_type', width: 130,
                        render: (v) => <Tag>{v}</Tag> },
                      { title: '字段/对象', dataIndex: 'field_name', width: 200 },
                      { title: '旧值', dataIndex: 'old_value', ellipsis: true },
                      { title: '新值', dataIndex: 'new_value', ellipsis: true },
                      { title: '操作人', dataIndex: 'operator', width: 150 },
                      { title: '追溯说明', dataIndex: 'trace_note', ellipsis: true },
                    ]}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </Spin>
  );
}
