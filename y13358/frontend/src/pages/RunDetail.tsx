import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Space, Typography, Tabs, Descriptions, Modal, Form, Input, Select, message, Row, Col, Statistic, Alert, Timeline, List, Tooltip, Divider, Badge, Popover
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  FileSearchOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  runApi, Run, FeatureSnapshot, Judgment, JudgmentHistory,
  SnapshotNote, RunSuggestions, DecisionSuggestion, snapshotApi, judgmentApi, sampleApi, Sample
} from '../api';

const { Title, Text, Paragraph } = Typography;

function decisionColor(d: string) {
  if (d === '通过') return 'green';
  if (d === '不通过') return 'red';
  return 'default';
}

function suggestionTypeMeta(type: DecisionSuggestion['type']) {
  switch (type) {
    case 'SUPPLEMENT': return { label: '需补材料', color: 'orange', icon: <ExclamationCircleOutlined /> };
    case 'RELEASE': return { label: '可放行', color: 'green', icon: <CheckCircleOutlined /> };
    case 'INVESTIGATE': return { label: '待核实', color: 'red', icon: <WarningOutlined /> };
    case 'REPLAY': return { label: '需回放', color: 'purple', icon: <ReloadOutlined /> };
  }
}

function priorityMeta(p: DecisionSuggestion['priority']) {
  switch (p) {
    case 'HIGH': return { label: '高', color: 'red' };
    case 'MEDIUM': return { label: '中', color: 'orange' };
    case 'LOW': return { label: '低', color: 'default' };
  }
}

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [snapshots, setSnapshots] = useState<FeatureSnapshot[]>([]);
  const [suggestions, setSuggestions] = useState<RunSuggestions | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, JudgmentHistory[]>>({});
  const [notesMap, setNotesMap] = useState<Record<string, SnapshotNote[]>>({});
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [currentJudgment, setCurrentJudgment] = useState<Judgment | null>(null);
  const [editForm] = Form.useForm();

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTargetSnapshot, setNoteTargetSnapshot] = useState<FeatureSnapshot | null>(null);
  const [noteForm] = Form.useForm();

  const loadAll = async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const [r, j, s, sg, smp] = await Promise.all([
        runApi.get(runId),
        runApi.judgments(runId),
        runApi.featureSnapshots(runId),
        runApi.suggestions(runId),
        sampleApi.list()
      ]);
      setRun(r);
      setJudgments(j);
      setSnapshots(s);
      setSuggestions(sg);
      setSamples(smp);

      const hMap: Record<string, JudgmentHistory[]> = {};
      for (const judg of j) {
        try {
          const h = await judgmentApi.history(runId, judg.sample_id);
          if (h.length > 0) hMap[judg.sample_id] = h;
        } catch (_) {
        }
      }
      setHistoryMap(hMap);

      const nMap: Record<string, SnapshotNote[]> = {};
      for (const snap of s) {
        try {
          const n = await snapshotApi.notes(snap.snapshot_id);
          if (n.length > 0) nMap[snap.snapshot_id] = n;
        } catch (_) {
        }
      }
      setNotesMap(nMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [runId]);

  const handleOpenEdit = (j: Judgment) => {
    setCurrentJudgment(j);
    editForm.setFieldsValue({
      new_decision: j.final_decision,
      new_reason: j.decision_reason || '',
      changed_by: '评测-小唐',
      change_note: ''
    });
    setEditOpen(true);
  };

  const handleSaveDecision = async (values: any) => {
    if (!runId || !currentJudgment) return;
    try {
      await judgmentApi.updateDecision(runId, currentJudgment.sample_id, values);
      message.success('判定已更新，修改已写入历史');
      setEditOpen(false);
      setCurrentJudgment(null);
      loadAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || '保存失败');
    }
  };

  const handleAddNote = async (values: any) => {
    if (!noteTargetSnapshot) return;
    try {
      await snapshotApi.addNote(noteTargetSnapshot.snapshot_id, {
        snapshot_id: noteTargetSnapshot.snapshot_id,
        note_content: values.note_content,
        created_by: values.created_by,
        changed_judgments_json: values.changed_judgments ? JSON.stringify(values.changed_judgments.split(',').map((s: string) => s.trim())) : null
      });
      message.success('备注已添加');
      setNoteOpen(false);
      setNoteTargetSnapshot(null);
      noteForm.resetFields();
      loadAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || '保存失败');
    }
  };

  const renderJudgmentTable = (data: Judgment[]) => (
    <Table
      rowKey="sample_id"
      dataSource={data}
      size="middle"
      pagination={{ pageSize: 10 }}
      columns={[
        {
          title: '样本ID',
          dataIndex: 'sample_id',
          width: 130,
          render: (sid: string, row) => {
            const sample = samples.find(s => s.sample_id === sid);
            return (
              <Space direction="vertical" size={0}>
                <Text strong>{sid}</Text>
                {sample?.is_replay === 1 && <Tag color="purple" style={{ fontSize: 11 }}>回放样本</Tag>}
              </Space>
            );
          }
        },
        {
          title: '样本内容',
          dataIndex: 'sample_content',
          render: (c: string | undefined, row: any) => {
            const sample = samples.find(s => s.sample_id === row.sample_id);
            return (
              <Space direction="vertical" size={2}>
                <Text>{sample?.content || c || '-'}</Text>
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>标注: {sample?.ground_truth_label || row.ground_truth_label || '-'}</Text>
                  {sample?.note && <Tooltip title={sample.note}><InfoCircleOutlined style={{ color: '#1890ff' }} /></Tooltip>}
                </Space>
              </Space>
            );
          }
        },
        {
          title: '模型输出',
          width: 140,
          render: (_: any, row: Judgment) => (
            <Space direction="vertical" size={0}>
              <Tag color={decisionColor(row.model_label)}>{row.model_label}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>置信度 {(row.confidence * 100).toFixed(1)}%</Text>
            </Space>
          )
        },
        {
          title: '最终判定',
          width: 120,
          render: (_: any, row: Judgment) => (
            <Space>
              <Tag color={decisionColor(row.final_decision)} style={{ fontSize: 14, padding: '4px 10px' }}>
                {row.final_decision}
              </Tag>
              {row.is_modified === 1 && (
                <Tooltip title="判定被人工修改，查看历史">
                  <Badge dot status="warning" />
                </Tooltip>
              )}
            </Space>
          )
        },
        {
          title: '判定人/时间',
          width: 160,
          render: (_: any, row: Judgment) => (
            <Space direction="vertical" size={0}>
              <Tag color="blue">{row.judged_by}</Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(row.judged_at).format('MM-DD HH:mm')}</Text>
            </Space>
          )
        },
        {
          title: '判定理由',
          dataIndex: 'decision_reason',
          render: (r?: string) => r ? <Text>{r.substring(0, 50)}{r.length > 50 ? '...' : ''}</Text> : <Text type="secondary" style={{ color: '#faad14' }}><WarningOutlined /> 未填写</Text>
        },
        {
          title: '操作',
          width: 180,
          render: (_: any, row: Judgment) => (
            <Space>
              <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleOpenEdit(row)}>
                修改判定
              </Button>
              {historyMap[row.sample_id] && (
                <Popover
                  title={
                    <Space>
                      <HistoryOutlined />
                      <Text strong>判定修改历史</Text>
                    </Space>
                  }
                  content={
                    <Timeline
                      style={{ width: 420 }}
                      items={historyMap[row.sample_id].map(h => ({
                        color: h.new_decision === '通过' ? 'green' : 'red',
                        children: (
                          <Space direction="vertical" size={2}>
                            <Space>
                              <Tag color="default">{h.previous_decision}</Tag>
                              <Text type="secondary">→</Text>
                              <Tag color={decisionColor(h.new_decision)}>{h.new_decision}</Tag>
                              <Tag color="blue">{h.changed_by}</Tag>
                              <Text type="secondary">{dayjs(h.changed_at).format('MM-DD HH:mm')}</Text>
                            </Space>
                            {h.change_note && <Text type="secondary" style={{ fontSize: 12 }}>备注: {h.change_note}</Text>}
                            {h.new_reason && <Text style={{ fontSize: 12 }}>理由: {h.new_reason}</Text>}
                          </Space>
                        )
                      }))}
                    />
                  }
                  trigger="click"
                >
                  <Button size="small" icon={<HistoryOutlined />}>历史</Button>
                </Popover>
              )}
            </Space>
          )
        }
      ]}
    />
  );

  if (!run) return <Card loading={loading} />;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
            <Title level={3} style={{ margin: 0 }}>{run.name}</Title>
            <Tag color="blue">{run.run_id}</Tag>
            {run.parent_run_id && (
              <Tag icon={<ArrowLeftOutlined />} color="default">
                父运行: <a onClick={() => navigate(`/run/${run.parent_run_id}`)}>{run.parent_run_id}</a>
              </Tag>
            )}
          </Space>
          <Descriptions size="small" column={4} bordered>
            <Descriptions.Item label="评测工程师"><Tag color="blue">{run.engineer}</Tag></Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(run.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="关联特征快照">{snapshots.length} 个</Descriptions.Item>
            <Descriptions.Item label="样本总数">{judgments.length} 个</Descriptions.Item>
            {run.description && <Descriptions.Item label="描述" span={4}>{run.description}</Descriptions.Item>}
          </Descriptions>
          <Alert
            type="info"
            showIcon
            icon={<ThunderboltOutlined />}
            message="判定修改留痕：评测工程师对任何样本的判定修改都会完整写入历史，交接班时下一班同事可看到完整修改链条。"
          />
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="suggestions"
        size="large"
        items={[
          {
            key: 'suggestions',
            label: (
              <Space>
                <FileSearchOutlined />
                决策建议
                {suggestions && suggestions.summary.total_suggestions > 0 && (
                  <Badge count={suggestions.summary.total_suggestions} />
                )}
              </Space>
            ),
            children: suggestions ? (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  type={suggestions.summary.supplement_count > 0 ? 'warning' : 'success'}
                  showIcon
                  message={
                    suggestions.summary.supplement_count > 0
                      ? `有 ${suggestions.summary.supplement_count} 条材料需补充，${suggestions.summary.release_count} 条可放行`
                      : `全部 ${suggestions.summary.total_suggestions} 条检查完成，材料齐全可放行`
                  }
                  description="以下是针对本次运行的具体建议，按优先级从高到低排列。"
                />
                <Row gutter={16}>
                  <Col span={6}>
                    <Card><Statistic title="需补材料" value={suggestions.summary.supplement_count} valueStyle={{ color: '#faad14' }} prefix={<ExclamationCircleOutlined />} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card><Statistic title="可放行" value={suggestions.summary.release_count} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card><Statistic title="待核实" value={suggestions.summary.investigate_count} valueStyle={{ color: '#ff4d4f' }} prefix={<WarningOutlined />} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card><Statistic title="建议总数" value={suggestions.summary.total_suggestions} prefix={<InfoCircleOutlined />} /></Card>
                  </Col>
                </Row>
                <List
                  size="large"
                  dataSource={suggestions.suggestions}
                  renderItem={sug => {
                    const typeMeta = suggestionTypeMeta(sug.type);
                    const pMeta = priorityMeta(sug.priority);
                    return (
                      <List.Item style={{ padding: '16px 0' }}>
                        <Card style={{ width: '100%' }} size="small">
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Space>
                              <Tag color={typeMeta.color} icon={typeMeta.icon}>{typeMeta.label}</Tag>
                              <Tag color={pMeta.color}>{pMeta.label}优先级</Tag>
                              <Tag>{sug.target}</Tag>
                              <Text strong>{sug.title}</Text>
                            </Space>
                            <Paragraph style={{ margin: 0 }}>{sug.detail}</Paragraph>
                            <Divider style={{ margin: '8px 0' }} />
                            <Text type="secondary" strong>依据：</Text>
                            <List
                              size="small"
                              dataSource={sug.evidence}
                              renderItem={ev => <List.Item style={{ padding: '2px 0' }}><Text type="secondary">• {ev}</Text></List.Item>}
                            />
                          </Space>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              </Space>
            ) : <Card loading />
          },
          {
            key: 'snapshots',
            label: (
              <Space>
                <ThunderboltOutlined />
                特征快照
                {snapshots.some(s => s.metric_mismatch_reason) && <Badge dot status="warning" />}
              </Space>
            ),
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  message="特征快照与离线/线上口径差异全部留存"
                  description="点击特征快照ID可查看详情和备注历史，临时快照彩排进场前必须补备注说明其改变了哪些判断。"
                />
                {snapshots.map(snap => (
                  <Card
                    key={snap.snapshot_id}
                    size="small"
                    title={
                      <Space>
                        <a onClick={() => navigate(`/snapshot/${snap.snapshot_id}`)}>
                          <Text strong>{snap.name}</Text>
                        </a>
                        <Tag color={snap.is_temporary ? 'orange' : 'blue'}>{snap.snapshot_id}</Tag>
                        <Tag>v{snap.version}</Tag>
                        {snap.is_temporary === 1 && <Tag color="red" icon={<WarningOutlined />}>临时快照</Tag>}
                        {snap.metric_mismatch_reason && <Tag color="orange" icon={<WarningOutlined />}>离线/线上口径不一致</Tag>}
                        {notesMap[snap.snapshot_id]?.length > 0 && <Badge count={notesMap[snap.snapshot_id].length} offset={[0, 2]}><Tag color="purple">备注</Tag></Badge>}
                      </Space>
                    }
                    extra={
                      <Button size="small" icon={<PlusOutlined />} onClick={() => { setNoteTargetSnapshot(snap); setNoteOpen(true); }}>
                        加备注
                      </Button>
                    }
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Descriptions size="small" column={2} bordered>
                        <Descriptions.Item label="特征定义" span={2}>
                          <Text code>{snap.feature_definition}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="创建人">{snap.created_by}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">{dayjs(snap.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                        {snap.offline_metric_json && (
                          <Descriptions.Item label="离线指标"><Text code>{snap.offline_metric_json}</Text></Descriptions.Item>
                        )}
                        {snap.online_metric_json && (
                          <Descriptions.Item label="线上指标"><Text code>{snap.online_metric_json}</Text></Descriptions.Item>
                        )}
                        {snap.metric_mismatch_reason && (
                          <Descriptions.Item label="差异原因" span={2}>
                            <Text type="warning">{snap.metric_mismatch_reason}</Text>
                          </Descriptions.Item>
                        )}
                        {snap.original_snapshot_id && (
                          <Descriptions.Item label="原始快照" span={2}>
                            <a onClick={() => navigate(`/snapshot/${snap.original_snapshot_id}`)}>{snap.original_snapshot_id}</a>
                          </Descriptions.Item>
                        )}
                        {snap.remark && (
                          <Descriptions.Item label="本次运行关联备注" span={2}>{snap.remark}</Descriptions.Item>
                        )}
                      </Descriptions>
                      {notesMap[snap.snapshot_id] && (
                        <>
                          <Divider orientation="left" plain style={{ margin: '8px 0' }}>备注历史</Divider>
                          <Timeline
                            items={notesMap[snap.snapshot_id].map(note => ({
                              color: 'blue',
                              children: (
                                <Space direction="vertical" size={2}>
                                  <Space>
                                    <Tag color="blue">{note.created_by}</Tag>
                                    <Text type="secondary">{dayjs(note.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                                    {note.changed_judgments_json && (
                                      <Tooltip title="该备注影响的样本判定">
                                        <Tag color="purple">
                                          影响: {JSON.parse(note.changed_judgments_json).join(', ')}
                                        </Tag>
                                      </Tooltip>
                                    )}
                                  </Space>
                                  <Paragraph style={{ margin: 0 }}>{note.note_content}</Paragraph>
                                </Space>
                              )
                            }))}
                          />
                        </>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            )
          },
          {
            key: 'judgments',
            label: (
              <Space>
                <EyeOutlined />
                样本判定
                {judgments.some(j => j.is_modified === 1) && <Badge dot status="warning" />}
              </Space>
            ),
            children: renderJudgmentTable(judgments)
          },
          {
            key: 'replay',
            label: (
              <Space>
                <ReloadOutlined />
                回放样本
                {judgments.filter(j => samples.find(s => s.sample_id === j.sample_id)?.is_replay === 1).length > 0 &&
                  <Badge count={judgments.filter(j => samples.find(s => s.sample_id === j.sample_id)?.is_replay === 1).length} />
                }
              </Space>
            ),
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  icon={<ReloadOutlined />}
                  message="旧模型误判样本放回看板，可追踪改判原因"
                  description="以下样本均来自旧模型的误判记录，放回本次运行重新判定。对比旧输出与新输出，判断改判是否合理。"
                />
                {renderJudgmentTable(judgments.filter(j => samples.find(s => s.sample_id === j.sample_id)?.is_replay === 1))}
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={
          <Space>
            <EditOutlined />
            <Text strong>修改样本判定</Text>
            <Tag>{currentJudgment?.sample_id}</Tag>
          </Space>
        }
        open={editOpen}
        onCancel={() => { setEditOpen(false); setCurrentJudgment(null); }}
        footer={null}
        width={560}
      >
        {currentJudgment && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="修改会完整写入历史记录"
              description="下一班同事能看到每次判定的完整修改链条，包括修改前判定、修改后判定、修改人、修改时间、修改备注。"
            />
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="样本内容">
                {samples.find(s => s.sample_id === currentJudgment.sample_id)?.content || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="标注真值">
                {samples.find(s => s.sample_id === currentJudgment.sample_id)?.ground_truth_label || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="模型输出">
                <Tag color={decisionColor(currentJudgment.model_label)}>{currentJudgment.model_label}</Tag>
                <Text type="secondary"> 置信度 {(currentJudgment.confidence * 100).toFixed(1)}%</Text>
              </Descriptions.Item>
              <Descriptions.Item label="当前判定">
                <Tag color={decisionColor(currentJudgment.final_decision)}>{currentJudgment.final_decision}</Tag>
                {currentJudgment.decision_reason && <Text type="secondary">（{currentJudgment.decision_reason}）</Text>}
              </Descriptions.Item>
            </Descriptions>
            <Form form={editForm} layout="vertical" onFinish={handleSaveDecision}>
              <Form.Item name="new_decision" label="新判定" rules={[{ required: true }]}>
                <Select options={[{ label: '通过', value: '通过' }, { label: '不通过', value: '不通过' }]} />
              </Form.Item>
              <Form.Item name="new_reason" label="判定理由" rules={[{ required: true, message: '请填写判定理由' }]}>
                <Input.TextArea rows={3} placeholder="说明改判原因..." />
              </Form.Item>
              <Form.Item name="change_note" label="修改备注（交接班说明）">
                <Input.TextArea rows={2} placeholder="告诉下一班为什么要改..." />
              </Form.Item>
              <Form.Item name="changed_by" label="修改人" initialValue="评测-小唐">
                <Input />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">保存（写入历史）</Button>
                  <Button onClick={() => { setEditOpen(false); setCurrentJudgment(null); }}>取消</Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <PlusOutlined />
            给特征快照加备注
            {noteTargetSnapshot && <Tag color={noteTargetSnapshot.is_temporary ? 'orange' : 'blue'}>{noteTargetSnapshot.snapshot_id}</Tag>}
          </Space>
        }
        open={noteOpen}
        onCancel={() => { setNoteOpen(false); setNoteTargetSnapshot(null); }}
        footer={null}
        width={600}
      >
        {noteTargetSnapshot?.is_temporary === 1 && (
          <Alert
            type="warning"
            showIcon
            message="这是临时特征快照！彩排进场前必须说明它改变了哪些判断。"
            description='在下方内容中明确说明该临时快照对哪些样本判定产生了影响，并在"影响的样本ID"字段中列出。'
          />
        )}
        <Form form={noteForm} layout="vertical" onFinish={handleAddNote} style={{ marginTop: 16 }}>
          <Form.Item name="note_content" label="备注内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="说明这个特征快照的作用、引入原因、影响范围..." />
          </Form.Item>
          <Form.Item name="changed_judgments" label="影响的样本ID（逗号分隔，可选）">
            <Input placeholder="如: SAMPLE-0042, SAMPLE-0087" />
          </Form.Item>
          <Form.Item name="created_by" label="创建人" initialValue="评测-小唐">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">添加备注</Button>
              <Button onClick={() => { setNoteOpen(false); setNoteTargetSnapshot(null); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

