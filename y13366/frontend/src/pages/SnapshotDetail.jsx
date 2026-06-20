import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Table, Upload, Modal, Form,
  Input, InputNumber, Select, Switch, message, Tabs, Timeline, Divider,
  Tooltip, Popover, Drawer, Badge, Row, Col, Alert, Statistic, Empty,
} from 'antd'
import {
  ArrowLeftOutlined,
  UploadOutlined,
  LockOutlined,
  UnlockOutlined,
  EditOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  EyeOutlined,
  DiffOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { snapshotApi } from '../api.js'

const { TextArea } = Input
const { Option } = Select

const CHANGE_TYPE_MAP = {
  snapshot_fork: { icon: <HistoryOutlined />, color: 'blue', label: '版本派生' },
  training_log_attached: { icon: <FileTextOutlined />, color: 'cyan', label: '训练日志' },
  threshold_update: { icon: <AuditOutlined />, color: 'orange', label: '阈值更新' },
  human_judgment_update: { icon: <EditOutlined />, color: 'purple', label: '人工判断' },
  feature_material_attached: { icon: <SafetyCertificateOutlined />, color: 'geekblue', label: '材料归档' },
  late_feature_material: { icon: <ThunderboltOutlined />, color: 'red', label: '迟到材料' },
}

function SnapshotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const snapshotId = parseInt(id)

  const [snapshot, setSnapshot] = useState(null)
  const [trainingLogs, setTrainingLogs] = useState([])
  const [judgments, setJudgments] = useState([])
  const [featureMaterials, setFeatureMaterials] = useState([])
  const [changes, setChanges] = useState([])
  const [allJudgmentHistories, setAllJudgmentHistories] = useState([])

  const [logModal, setLogModal] = useState(false)
  const [logForm] = Form.useForm()
  const [logFile, setLogFile] = useState()

  const [thresholdModal, setThresholdModal] = useState(false)
  const [thresholdForm] = Form.useForm()

  const [judgmentModal, setJudgmentModal] = useState(false)
  const [judgmentForm] = Form.useForm()
  const [editingJudgment, setEditingJudgment] = useState(null)

  const [historyDrawer, setHistoryDrawer] = useState(false)
  const [historySample, setHistorySample] = useState(null)
  const [sampleHistories, setSampleHistories] = useState([])

  const [materialModal, setMaterialModal] = useState(false)
  const [materialForm] = Form.useForm()
  const [materialFile, setMaterialFile] = useState()

  const [explainModal, setExplainModal] = useState(false)
  const [explainForm] = Form.useForm()
  const [explainResult, setExplainResult] = useState(null)

  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, logs, js, mats, chs, jhs] = await Promise.all([
        snapshotApi.get(snapshotId),
        snapshotApi.listTrainingLogs(snapshotId),
        snapshotApi.listJudgments(snapshotId),
        snapshotApi.listFeatureMaterials(snapshotId),
        snapshotApi.getChanges(snapshotId),
        snapshotApi.getAllJudgmentHistories(snapshotId),
      ])
      setSnapshot(s)
      setTrainingLogs(logs)
      setJudgments(js)
      setFeatureMaterials(mats)
      setChanges(chs)
      setAllJudgmentHistories(jhs)
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [snapshotId])

  const handleUploadLog = async (values) => {
    try {
      const formData = new FormData()
      Object.keys(values).forEach(k => formData.append(k, values[k]))
      if (logFile) {
        formData.append('log_file', logFile)
      }
      await snapshotApi.attachTrainingLog(snapshotId, formData)
      message.success('训练日志上传成功')
      setLogModal(false)
      logForm.resetFields()
      setLogFile(null)
      loadAll()
    } catch (e) {
      message.error('上传失败')
    }
  }

  const handleUpdateThreshold = async (values) => {
    try {
      await snapshotApi.updateThreshold(snapshotId, {
        threshold_config: {
          recall_threshold: values.recall_threshold,
          precision_threshold: values.precision_threshold,
          score_threshold: values.score_threshold,
        },
        updated_by: values.updated_by,
        update_reason: values.update_reason,
      })
      message.success('阈值更新完成，人工锁定判断已自动保护')
      setThresholdModal(false)
      thresholdForm.resetFields()
      loadAll()
    } catch (e) {
      message.error('阈值更新失败')
    }
  }

  const openJudgmentEdit = (j) => {
    setEditingJudgment(j)
    judgmentForm.setFieldsValue({
      sample_id: j.sample_id,
      human_judgment: j.human_judgment || j.model_prediction,
      judged_by: '',
      judgment_note: j.judgment_note || '',
      is_manual_locked: j.is_manual_locked,
      lock_reason: j.lock_reason || '',
      change_reason: '',
      is_temporary: false,
      editor_role: 'evaluator',
    })
    setJudgmentModal(true)
  }

  const handleUpdateJudgment = async (values) => {
    try {
      await snapshotApi.updateJudgment(
        snapshotId,
        {
          sample_id: values.sample_id,
          human_judgment: values.human_judgment,
          judged_by: values.judged_by,
          judgment_note: values.judgment_note,
          is_manual_locked: values.is_manual_locked,
          lock_reason: values.lock_reason,
          change_reason: values.change_reason,
        },
        values.is_temporary,
        values.editor_role
      )
      message.success(values.is_temporary ? '临时修改已记录，下一班可见' : '判断已更新')
      setJudgmentModal(false)
      judgmentForm.resetFields()
      setEditingJudgment(null)
      loadAll()
    } catch (e) {
      message.error('更新失败')
    }
  }

  const openSampleHistory = async (sampleId) => {
    setHistorySample(sampleId)
    try {
      const data = await snapshotApi.getJudgmentHistory(snapshotId, sampleId)
      setSampleHistories(data)
    } catch (e) {
      setSampleHistories([])
    }
    setHistoryDrawer(true)
  }

  const handleUploadMaterial = async (values) => {
    try {
      const formData = new FormData()
      Object.keys(values).forEach(k => formData.append(k, values[k]))
      if (materialFile) {
        formData.append('material_file', materialFile)
      }
      await snapshotApi.attachFeatureMaterial(snapshotId, formData)
      message.success(values.is_late_arrival ? '迟到材料已记录，含下一步处理指引' : '材料已归档')
      setMaterialModal(false)
      materialForm.resetFields()
      setMaterialFile(null)
      loadAll()
    } catch (e) {
      message.error('上传失败')
    }
  }

  const handleExplain = async (values) => {
    try {
      const data = await snapshotApi.explainChange({
        sample_id: values.sample_id,
        old_snapshot_id: values.old_snapshot_id,
        new_snapshot_id: snapshotId,
      })
      setExplainResult(data)
    } catch (e) {
      message.error('生成解释失败')
    }
  }

  const thresholdCfg = snapshot?.threshold_config || {}

  const logColumns = [
    { title: '批次', dataIndex: 'batch_number', width: 70, render: v => <Tag color="blue">第{v}批</Tag> },
    { title: '日志名称', dataIndex: 'log_name' },
    { title: '内容摘要', dataIndex: 'log_content_summary', render: v => <span style={{color:'#666'}}>{v}</span> },
    { title: '上传人', dataIndex: 'uploaded_by', width: 80 },
    { title: '上传时间', dataIndex: 'uploaded_at', width: 170, render: v => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '状态', dataIndex: 'is_complete', width: 90, render: v => v
        ? <Tag icon={<CheckCircleOutlined />} color="success">已凑齐</Tag>
        : <Tag icon={<ClockCircleOutlined />} color="warning">待补充</Tag>
    },
    { title: '备注', dataIndex: 'completeness_note', render: v => v || '-' },
  ]

  const judgmentColumns = [
    { title: '样本ID', dataIndex: 'sample_id', width: 100,
      render: (v, r) => <a onClick={() => openSampleHistory(v)}><b>{v}</b></a> },
    { title: '模型预测', dataIndex: 'model_prediction', width: 100,
      render: v => <Tag color={v==='positive'?'green':v==='negative'?'red':'orange'}>{v}</Tag> },
    { title: '模型分数', dataIndex: 'model_score', width: 90,
      render: v => v != null ? v.toFixed(3) : '-' },
    { title: '人工判断', dataIndex: 'human_judgment', width: 100,
      render: (v, r) => v
        ? <Space>
            <Tag color={v==='positive'?'green':v==='negative'?'red':'orange'}>{v}</Tag>
            {r.is_manual_locked && <Tag className="tag-locked" icon={<LockOutlined />}>锁定</Tag>}
          </Space>
        : <Tag color="default">未人工</Tag>
    },
    { title: '判断人', dataIndex: 'judged_by', width: 80 },
    { title: '判断时间', dataIndex: 'judged_at', width: 160, render: v => v?dayjs(v).format('YYYY-MM-DD HH:mm'):'-' },
    { title: '备注', dataIndex: 'judgment_note', render: v => v || '-' },
    { title: '操作', width: 120, render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openJudgmentEdit(r)}>编辑</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => openSampleHistory(r.sample_id)}>历史</Button>
        </Space>
      )
    },
  ]

  const materialColumns = [
    { title: '材料名称', dataIndex: 'material_name',
      render: (v, r) => <Space>
        {r.is_late_arrival ? <Tag className="tag-late">迟到</Tag> : null}
        {v}
      </Space>
    },
    { title: '类型', dataIndex: 'material_type', width: 110, render: v => <Tag>{v}</Tag> },
    { title: '上传人', dataIndex: 'uploaded_by', width: 80 },
    { title: '上传时间', dataIndex: 'uploaded_at', width: 160, render: v => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '影响样本', dataIndex: 'affected_samples_count', width: 90, render: v => v ? `约${v}条` : '-' },
    { title: '影响说明', dataIndex: 'impact_description', render: v => v || '-' },
  ]

  const renderNextStepsBox = (steps) => {
    if (!steps) return null
    return (
      <div className="next-steps-box">
        <div className="title">📋 人可照着执行的下一步操作：</div>
        <div dangerouslySetInnerHTML={{
          __html: steps.split('\n').filter(l=>l.trim()).map(l => `<div style="padding:2px 0">${l}</div>`).join('')
        }} />
      </div>
    )
  }

  if (loading) return <Card loading={loading} />
  if (!snapshot) return <Empty description="快照不存在" />

  const tempEditCount = allJudgmentHistories.filter(h => h.is_temporary_edit).length

  return (
    <div>
      <div className="page-header">
        <Space style={{marginBottom: 12}}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回列表</Button>
          {snapshot.parent_snapshot_id && (
            <Link to={`/snapshots/${snapshot.parent_snapshot_id}`}>
              <Button icon={<HistoryOutlined />}>查看父快照 #{snapshot.parent_snapshot_id}</Button>
            </Link>
          )}
        </Space>
        <div className="page-title">
          {snapshot.snapshot_name}
          <Tag style={{marginLeft: 12}} color="blue">#{snapshot.id}</Tag>
          {snapshot.status === 'sealed' && <Tag color="green" icon={<SafetyCertificateOutlined />}>已封账</Tag>}
          {snapshot.seal_month && <Tag color="purple">{snapshot.seal_month}封账</Tag>}
        </div>
        <div className="page-desc">
          版本号 <code>{snapshot.snapshot_version}</code> · 模型 {snapshot.model_version} · 创建人 {snapshot.created_by} · {dayjs(snapshot.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>

      {tempEditCount > 0 && (
        <Alert
          style={{marginBottom: 20}}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={
            <Space>
              <Badge count={tempEditCount} size="small" offset={[0, -2]}>
                <Tag className="tag-temp">临时修改待复核</Tag>
              </Badge>
              <span>有 {tempEditCount} 条评测工程师的临时判断修改，请下一班人员重新确认后正式定稿</span>
            </Space>
          }
          action={
            <Button size="small" type="primary" onClick={() => setHistoryDrawer(true)}>
              查看待复核列表
            </Button>
          }
        />
      )}

      <Tabs
        defaultActiveKey="overview"
        size="large"
        items={[
          {
            key: 'overview',
            label: <Space><SafetyCertificateOutlined />快照概览</Space>,
            children: (
              <Space direction="vertical" size="large" style={{width:'100%'}}>
                <Card title="基本信息与阈值配置" extra={
                  <Button icon={<EditOutlined />} onClick={() => {
                    thresholdForm.setFieldsValue({
                      recall_threshold: thresholdCfg.recall_threshold,
                      precision_threshold: thresholdCfg.precision_threshold,
                      score_threshold: thresholdCfg.score_threshold,
                      updated_by: '',
                      update_reason: '',
                    })
                    setThresholdModal(true)
                  }}>更新阈值</Button>
                }>
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="快照ID">#{snapshot.id}</Descriptions.Item>
                    <Descriptions.Item label="版本号">{snapshot.snapshot_version}</Descriptions.Item>
                    <Descriptions.Item label="模型版本">{snapshot.model_version}</Descriptions.Item>
                    <Descriptions.Item label="创建人 / 时间">{snapshot.created_by} / {dayjs(snapshot.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="父快照">{snapshot.parent_snapshot_id ? `#${snapshot.parent_snapshot_id}` : '无'}</Descriptions.Item>
                    <Descriptions.Item label="封账月份">{snapshot.seal_month || '—'}</Descriptions.Item>
                    <Descriptions.Item label="描述" span={2}>{snapshot.description || '—'}</Descriptions.Item>
                  </Descriptions>
                  <Divider orientation="left">当前阈值配置</Divider>
                  <Row gutter={24}>
                    <Col span={8}>
                      <Statistic title="召回阈值 (recall_threshold)" value={thresholdCfg.recall_threshold ?? 0} precision={3} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="分数阈值 (score_threshold)" value={thresholdCfg.score_threshold ?? 0} precision={3} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="精确率阈值 (precision_threshold)" value={thresholdCfg.precision_threshold ?? 0} precision={3} />
                    </Col>
                  </Row>
                  <Alert style={{marginTop: 16}} type="info" showIcon
                    message="阈值保护机制"
                    description="更新阈值时，已人工锁定的判断不会被覆盖。请务必在阈值更新后人工复核受影响的样本。"
                  />
                </Card>

                <Card title={
                  <Space>
                    <FileTextOutlined />训练日志
                    <Tag color="cyan">{trainingLogs.length}份</Tag>
                    {trainingLogs.some(l=>!l.is_complete) && <Tag color="warning" icon={<ClockCircleOutlined />}>待凑齐</Tag>}
                  </Space>
                } extra={
                  <Button type="primary" icon={<UploadOutlined />} onClick={() => setLogModal(true)}>上传训练日志</Button>
                }>
                  <Table rowKey="id" size="small" columns={logColumns} dataSource={trainingLogs} pagination={false} />
                </Card>

                <Card title={
                  <Space>
                    <SafetyCertificateOutlined />特征材料
                    <Tag>{featureMaterials.length}份</Tag>
                    {featureMaterials.some(m=>m.is_late_arrival) && <Tag className="tag-late">含迟到</Tag>}
                  </Space>
                } extra={
                  <Button type="primary" icon={<UploadOutlined />} onClick={() => setMaterialModal(true)}>上传材料</Button>
                }>
                  <Table rowKey="id" size="small" columns={materialColumns} dataSource={featureMaterials} pagination={false}
                    expandable={{
                      expandedRowRender: (record) => (
                        <div>
                          {record.impact_description && (
                            <div style={{marginBottom: 12}}>
                              <b>影响说明：</b>{record.impact_description}
                            </div>
                          )}
                          {renderNextStepsBox(record.next_action)}
                        </div>
                      )
                    }}
                  />
                </Card>
              </Space>
            )
          },
          {
            key: 'judgments',
            label: <Space><AuditOutlined />样本判断
              <Badge count={judgments.filter(j=>j.is_manual_locked).length} offset={[0, -2]} showZero>
                <Tag icon={<LockOutlined />} color="success">已锁 {judgments.filter(j=>j.is_manual_locked).length}</Tag>
              </Badge>
            </Space>,
            children: (
              <Space direction="vertical" size="large" style={{width:'100%'}}>
                <Alert type="info" showIcon
                  message="人工判断受保护机制"
                  description={
                    <div>
                      勾选「人工锁定」后，后续任何阈值更新或重跑操作<strong>都不会覆盖</strong>该判断。
                      <br/>如需标记为「临时修改，待下一班复核」，请在编辑时勾选「临时修改」。
                    </div>
                  }
                />
                <Card extra={
                  <Space>
                    <Button icon={<DiffOutlined />} onClick={() => setExplainModal(true)}>解释样本改判</Button>
                  </Space>
                }>
                  <Table rowKey="id" size="small" columns={judgmentColumns} dataSource={judgments}
                    pagination={{pageSize: 10}} />
                </Card>
              </Space>
            )
          },
          {
            key: 'changes',
            label: <Space><HistoryOutlined />完整变更历史<Tag>{changes.length}条</Tag></Space>,
            children: (
              <Card>
                <Timeline
                  mode="left"
                  items={changes.map(c => {
                    const cfg = CHANGE_TYPE_MAP[c.change_type] || {icon: <FileTextOutlined />, color:'default', label: c.change_type}
                    return {
                      color: cfg.color,
                      dot: cfg.icon,
                      children: (
                        <Card size="small" style={{marginBottom: 12}}>
                          <Space size="middle" wrap>
                            <Tag color={cfg.color}>{cfg.label}</Tag>
                            <span style={{color:'#666', fontSize:12}}>
                              {dayjs(c.changed_at).format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                            <span style={{color:'#888'}}>操作人: <b>{c.changed_by}</b></span>
                          </Space>
                          <div style={{marginTop: 8, fontWeight: 500}}>
                            {c.change_reason}
                          </div>
                          {c.field_name && (
                            <div style={{marginTop: 4, fontSize: 13, color:'#666'}}>
                              字段 <code>{c.field_name}</code>
                              {c.old_value && ` 从 "${String(c.old_value).slice(0,50)}"`}
                              {` 变更为 "${String(c.new_value).slice(0,50)}"`}
                            </div>
                          )}
                          {c.affected_samples && c.affected_samples.length > 0 && (
                            <div style={{marginTop: 6, fontSize:13}}>
                              <b>影响样本 ({c.affected_samples.length}条)：</b>
                              {c.affected_samples.slice(0,10).join(', ')}
                              {c.affected_samples.length>10 ? '...' : ''}
                            </div>
                          )}
                          {c.next_step_hint && renderNextStepsBox(c.next_step_hint)}
                        </Card>
                      )
                    }
                  })}
                />
              </Card>
            )
          },
        ]}
      />

      <Modal title="上传训练日志" open={logModal} onCancel={()=>setLogModal(false)} footer={null} destroyOnHidden width={600}>
        <Form form={logForm} layout="vertical" onFinish={handleUploadLog}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="batch_number" label="批次号" initialValue={trainingLogs.length+1} rules={[{required:true}]}>
                <InputNumber min={1} style={{width:'100%'}} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_complete" label="是否凑齐" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="凑齐" unCheckedChildren="待补充" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="log_name" label="日志名称" rules={[{required:true}]}>
            <Input placeholder="如：训练日志-5月下半月" />
          </Form.Item>
          <Form.Item name="log_content_summary" label="内容摘要" rules={[{required:true}]}>
            <TextArea rows={2} placeholder="简要描述日志内容" />
          </Form.Item>
          <Form.Item label="日志文件" rules={[{required:true}]}>
            <Upload beforeUpload={(f)=>{setLogFile(f); return false}} maxCount={1}>
              <Button icon={<UploadOutlined />}>{logFile?logFile.name:'选择日志文件'}</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="uploaded_by" label="上传人" rules={[{required:true}]}>
            <Input placeholder="如：小唐" />
          </Form.Item>
          <Form.Item name="completeness_note" label="补充说明">
            <Input placeholder="如：还缺5月下半月日志，或日志已凑齐" />
          </Form.Item>
          <Form.Item style={{textAlign:'right', marginBottom:0}}>
            <Space>
              <Button onClick={()=>setLogModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">上传并关联</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="更新阈值（自动保护人工锁定判断）" open={thresholdModal} onCancel={()=>setThresholdModal(false)} footer={null} destroyOnHidden width={550}>
        <Alert type="warning" showIcon style={{marginBottom:20}}
          message="保护机制已启用"
          description="已勾选「人工锁定」的样本判断不会被本次阈值更新覆盖，更新后请逐条复核受影响样本。"
        />
        <Form form={thresholdForm} layout="vertical" onFinish={handleUpdateThreshold}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="recall_threshold" label="召回阈值" rules={[{required:true}]}>
                <InputNumber min={0} max={1} step={0.01} style={{width:'100%'}} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="score_threshold" label="分数阈值" rules={[{required:true}]}>
                <InputNumber min={0} max={1} step={0.01} style={{width:'100%'}} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="precision_threshold" label="精确率阈值">
                <InputNumber min={0} max={1} step={0.01} style={{width:'100%'}} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="updated_by" label="操作人" rules={[{required:true}]}>
            <Input placeholder="如：小唐" />
          </Form.Item>
          <Form.Item name="update_reason" label="更新原因" rules={[{required:true}]}>
            <TextArea rows={2} placeholder="说明阈值调整的原因，如：新模型性能提升..." />
          </Form.Item>
          <Form.Item style={{textAlign:'right', marginBottom:0}}>
            <Space>
              <Button onClick={()=>setThresholdModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认更新（保护人工判断）</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingJudgment ? `编辑样本判断：${editingJudgment.sample_id}` : '编辑判断'}
        open={judgmentModal} onCancel={()=>{setJudgmentModal(false);setEditingJudgment(null)}}
        footer={null} destroyOnHidden width={600}
      >
        <Form form={judgmentForm} layout="vertical" onFinish={handleUpdateJudgment}>
          <Form.Item name="sample_id" label="样本ID">
            <Input disabled />
          </Form.Item>
          {editingJudgment && (
            <Alert style={{marginBottom:16}} type="info" showIcon
              message="当前模型预测"
              description={
                <Space>
                  <Tag color={editingJudgment.model_prediction==='positive'?'green':editingJudgment.model_prediction==='negative'?'red':'orange'}>
                    {editingJudgment.model_prediction}
                  </Tag>
                  <span>分数: {editingJudgment.model_score?.toFixed(3) || '-'}</span>
                  {editingJudgment.previous_judgment && <span>历史: {editingJudgment.previous_judgment}</span>}
                </Space>
              }
            />
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="human_judgment" label="人工判断" rules={[{required:true}]}>
                <Select placeholder="选择判断结果">
                  <Option value="positive">Positive（应召回）</Option>
                  <Option value="negative">Negative（不召回）</Option>
                  <Option value="borderline">Borderline（边界样本）</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="judged_by" label="判断人" rules={[{required:true}]}>
                <Input placeholder="如：小唐" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_manual_locked" label="锁定判断" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren={<LockOutlined />} unCheckedChildren={<UnlockOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="editor_role" label="角色" initialValue="evaluator">
                <Select>
                  <Option value="evaluator">评测工程师</Option>
                  <Option value="evaluator_小唐">评测工程师-小唐</Option>
                  <Option value="lead">评测组长</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="lock_reason" label="锁定原因（锁定时必填）">
            <Input placeholder="如：误判样本，人工复核后锁定" />
          </Form.Item>
          <Form.Item name="judgment_note" label="判断备注">
            <TextArea rows={2} placeholder="详细说明判断依据" />
          </Form.Item>
          <Form.Item name="change_reason" label="变更原因">
            <Input placeholder="说明本次变更的原因" />
          </Form.Item>
          <Alert style={{marginBottom:16}} type={judgmentForm.getFieldValue('is_temporary')?'warning':'info'} showIcon
            message="交接班提示"
            description={
              <Form.Item name="is_temporary" valuePropName="checked" style={{marginBottom:0}}>
                <Switch
                  checkedChildren="临时修改"
                  unCheckedChildren="正式定稿"
                  checked={judgmentForm.getFieldValue('is_temporary')}
                  onChange={(v)=>judgmentForm.setFieldsValue({is_temporary: v})}
                />
                <span style={{marginLeft: 12, fontSize:12, color: '#666'}}>
                  勾选后，下一班人员会看到此为临时修改，需重新确认
                </span>
              </Form.Item>
            }
          />
          <Form.Item style={{textAlign:'right', marginBottom:0}}>
            <Space>
              <Button onClick={()=>{setJudgmentModal(false);setEditingJudgment(null)}}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={historySample ? `样本 ${historySample} 判断历史` : '所有判断历史（交接班）'}
        placement="right" width={620}
        onClose={()=>{setHistoryDrawer(false);setHistorySample(null)}}
        open={historyDrawer}
      >
        {(historySample ? sampleHistories : allJudgmentHistories).length === 0 ? (
          <Empty description="暂无历史记录" />
        ) : (
          <Timeline
            mode="left"
            items={(historySample ? sampleHistories : allJudgmentHistories).map(h => ({
              color: h.is_temporary_edit ? 'orange' : 'blue',
              dot: h.is_temporary_edit ? <WarningOutlined /> : <CheckCircleOutlined />,
              children: (
                <Card size="small" style={{marginBottom:12}}>
                  <Space wrap>
                    {!historySample && <Tag color="blue">样本: {h.sample_id || '-'}</Tag>}
                    <Tag className={h.is_temporary_edit ? 'tag-temp' : ''}>
                      {h.is_temporary_edit ? '临时修改' : '正式修改'}
                    </Tag>
                    {h.editor_role && <Tag color="geekblue">{h.editor_role}</Tag>}
                    <span style={{color:'#666', fontSize:12}}>
                      {dayjs(h.changed_at).format('YYYY-MM-DD HH:mm:ss')}
                    </span>
                  </Space>
                  <div style={{marginTop: 8}}>
                    判断：<Tag color="red" style={{textDecoration:'line-through'}}>{h.old_judgment || '（无）'}</Tag>
                    {' → '}
                    <Tag color="green">{h.new_judgment}</Tag>
                  </div>
                  <div style={{marginTop: 4, fontSize:13}}>操作人：<b>{h.changed_by}</b></div>
                  <div style={{marginTop: 4, fontSize:13}}><b>原因：</b>{h.change_reason}</div>
                </Card>
              )
            }))}
          />
        )}
      </Drawer>

      <Modal title="上传特征材料" open={materialModal} onCancel={()=>setMaterialModal(false)} footer={null} destroyOnHidden width={600}>
        <Form form={materialForm} layout="vertical" onFinish={handleUploadMaterial}
          initialValues={{is_late_arrival: false, material_type: 'documentation'}}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="material_name" label="材料名称" rules={[{required:true}]}>
                <Input placeholder="如：特征工程说明文档" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="material_type" label="材料类型" rules={[{required:true}]}>
                <Select>
                  <Option value="documentation">说明文档</Option>
                  <Option value="feature_data">特征数据</Option>
                  <Option value="feedback_data">用户反馈</Option>
                  <Option value="attachment">附件</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="材料文件" rules={[{required:true}]}>
            <Upload beforeUpload={(f)=>{setMaterialFile(f); return false}} maxCount={1}>
              <Button icon={<UploadOutlined />}>{materialFile?materialFile.name:'选择文件'}</Button>
            </Upload>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="uploaded_by" label="上传人" rules={[{required:true}]}>
                <Input placeholder="如：小唐" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_late_arrival" label="是否迟到" valuePropName="checked">
                <Switch checkedChildren="迟到" unCheckedChildren="正常" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="impact_description" label={
            <Space>影响说明
              <Tooltip title="迟到材料必填，系统会据此生成下一步处理指引">
                <ExclamationCircleOutlined style={{color: '#fa8c16'}} />
              </Tooltip>
            </Space>
          }>
            <TextArea rows={2} placeholder="说明对判断结果的影响" />
          </Form.Item>
          <Alert type={materialForm.getFieldValue('is_late_arrival')?'warning':'info'} showIcon
            message={materialForm.getFieldValue('is_late_arrival') ? '迟到材料提示' : '正常归档提示'}
            description={materialForm.getFieldValue('is_late_arrival')
              ? '标记为迟到后，系统会生成人可照着执行的下一步操作指引，并记录变更历史。'
              : '此材料将归档到快照中，不影响现有判断。'
            }
          />
          <Form.Item style={{textAlign:'right', marginBottom:0, marginTop:16}}>
            <Space>
              <Button onClick={()=>setMaterialModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">上传</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="解释样本改判原因" open={explainModal} onCancel={()=>{setExplainModal(false);setExplainResult(null)}} footer={null} destroyOnHidden width={700}>
        <Form form={explainForm} layout="vertical" onFinish={handleExplain}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="sample_id" label="样本ID" rules={[{required:true}]}>
                <Input placeholder="如：S002" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="old_snapshot_id" label="旧快照ID" rules={[{required:true}]}>
                <InputNumber min={1} style={{width:'100%'}} placeholder="如：1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="新快照ID">
                <Input value={`#${snapshotId} (当前)`} disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{textAlign:'right', marginBottom:0}}>
            <Space>
              <Button onClick={()=>{setExplainModal(false);setExplainResult(null)}}>取消</Button>
              <Button type="primary" htmlType="submit">生成改判解释</Button>
            </Space>
          </Form.Item>
        </Form>
        {explainResult && (
          <div style={{marginTop: 24}}>
            <Divider orientation="left">改判解释结果</Divider>
            <div className="explanation-box">
              <div style={{fontWeight:600, marginBottom:12}}>
                样本 {explainResult.sample_id}：
                <Tag color="red" style={{marginLeft:8}}>{explainResult.old_judgment}</Tag>
                <span style={{margin:'0 8px'}}>→</span>
                <Tag color="green">{explainResult.new_judgment}</Tag>
              </div>
              <div style={{marginBottom:12}}>
                {explainResult.key_factors?.map((f,i) => (
                  <Tag key={i} color="purple" className="factor-tag">{f}</Tag>
                ))}
              </div>
              {Object.keys(explainResult.threshold_differences||{}).length > 0 && (
                <div style={{marginBottom:12, fontSize:13}}>
                  <b>阈值差异：</b>
                  <ul style={{margin:0, paddingLeft:20}}>
                    {Object.entries(explainResult.threshold_differences).map(([k,v]) => (
                      <li key={k}>{k}: {v.old} → <b style={{color:'green'}}>{v.new}</b></li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{whiteSpace:'pre-wrap', lineHeight:1.8}}>
                {explainResult.explanation_text}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SnapshotDetail
