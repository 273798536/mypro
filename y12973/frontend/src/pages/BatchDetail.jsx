import React, { useState, useEffect, useMemo } from 'react'
import {
  Card, Row, Col, Descriptions, Table, Tag, Button, Space, Modal, Form,
  Input, Select, Empty, Drawer, Timeline, Typography, Divider, Tooltip,
  Tabs, message, Statistic, Alert, List, Badge, Collapse, InputNumber,
} from 'antd'
import {
  ArrowLeftOutlined, DownloadOutlined, PlusOutlined, HistoryOutlined,
  LinkOutlined, FileTextOutlined, ReloadOutlined, GitCompareOutlined,
  EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  WarningOutlined, SyncOutlined, DatabaseOutlined, CodeOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import {
  getBatchDetail, createConclusion, downloadBatch, getConclusionHistory,
  getMigrationScript, compareBatches, listBatches,
} from '../api.js'
import { ENTRY_POINT_LABELS } from '../App.jsx'

const { TextArea } = Input
const { Option } = Select
const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

const CONCLUSION_TYPES = [
  { value: 'partition_ok', label: '分区策略正常', color: 'green', icon: <CheckCircleOutlined /> },
  { value: 'partition_missing_tenant', label: '缺失租户分区', color: 'red', icon: <ExclamationCircleOutlined /> },
  { value: 'partition_missing_account', label: '缺失账套分区', color: 'orange', icon: <WarningOutlined /> },
  { value: 'partition_wrong_key', label: '分区键错误', color: 'red', icon: <ExclamationCircleOutlined /> },
  { value: 'schema_mismatch', label: '表结构不一致', color: 'orange', icon: <WarningOutlined /> },
  { value: 'rowcount_abnormal', label: '行数异常（疑似漏迁）', color: 'red', icon: <ExclamationCircleOutlined /> },
  { value: 'needs_migration', label: '需数据迁移修复', color: 'blue', icon: <SyncOutlined /> },
  { value: 'general_note', label: '一般备注', color: 'default', icon: <FileTextOutlined /> },
]

const getConclusionStyle = (type) => {
  return CONCLUSION_TYPES.find(c => c.value === type) || { label: type, color: 'default', icon: <FileTextOutlined /> }
}

function JSONPretty({ data }) {
  if (!data) return <Text type="secondary">—</Text>
  let obj = data
  if (typeof data === 'string') {
    try { obj = JSON.parse(data) } catch { obj = data }
  }
  if (typeof obj === 'string') return <code>{obj}</code>
  return <pre style={{ margin: 0, padding: 8, background: '#fafafa', borderRadius: 4, maxHeight: 260, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(obj, null, 2)}</pre>
}

export default function BatchDetail({ batchId, onBack, onImportSuccess }) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [conclusionModalOpen, setConclusionModalOpen] = useState(false)
  const [editConclusion, setEditConclusion] = useState(null)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [activeConclusionId, setActiveConclusionId] = useState(null)
  const [historyChain, setHistoryChain] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareBatchId, setCompareBatchId] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [allBatches, setAllBatches] = useState([])
  const [conclusionForm] = Form.useForm()
  const [migrationDrawerOpen, setMigrationDrawerOpen] = useState(false)
  const [migrationData, setMigrationData] = useState(null)
  const [migrationLoading, setMigrationLoading] = useState(false)

  useEffect(() => { load() }, [batchId])

  const load = () => {
    setLoading(true)
    getBatchDetail(batchId).then(d => {
      setDetail(d)
      if (onImportSuccess) onImportSuccess()
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (compareModalOpen) {
      listBatches().then(list => {
        setAllBatches(list.filter(b => b.id !== batchId))
      })
    }
  }, [compareModalOpen])

  const tables = detail?.tables || []
  const conclusions = detail?.conclusions || []

  const tenantAccountStats = useMemo(() => {
    const map = {}
    tables.forEach(t => {
      const k = `${t.tenant_id || '(无)'}/${t.account_set || '(无)'}`
      if (!map[k]) map[k] = { key: k, count: 0, rows: 0, size: 0 }
      map[k].count += 1
      map[k].rows += t.row_count || 0
      map[k].size += t.data_size || 0
    })
    return Object.values(map)
  }, [tables])

  const tableSizeOption = useMemo(() => {
    const top = [...tables].sort((a, b) => (b.row_count || 0) - (a.row_count || 0)).slice(0, 15)
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 120, right: 30, top: 20, bottom: 40 },
      xAxis: { type: 'value', name: '行数' },
      yAxis: {
        type: 'category',
        data: top.map(t => `${t.table_name} (${t.tenant_id || '-'}/${t.account_set || '-'})`).reverse(),
        axisLabel: { fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: top.map(t => t.row_count || 0).reverse(),
        itemStyle: { color: '#1890ff', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: (p) => p.value >= 10000 ? `${(p.value / 10000).toFixed(1)}w` : p.value },
      }],
    }
  }, [tables])

  const partitionDistOption = useMemo(() => {
    const count = {}
    tables.forEach(t => {
      let cat = '未配置'
      try {
        if (t.partition_info) {
          const p = typeof t.partition_info === 'string' ? JSON.parse(t.partition_info) : t.partition_info
          if (p.tenant_column && p.account_set_column) cat = '租户+账套'
          else if (p.tenant_column) cat = '仅租户'
          else if (p.account_set_column) cat = '仅账套'
          else if (p.strategy) cat = p.strategy
        }
      } catch {}
      count[cat] = (count[cat] || 0) + 1
    })
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        label: { formatter: '{b}: {c}' },
        data: Object.entries(count).map(([k, v]) => ({
          name: k, value: v,
          itemStyle: {
            color: {
              '租户+账套': '#52c41a', '仅租户': '#1890ff', '仅账套': '#13c2c2',
              'by_month': '#722ed1', 'by_day': '#fa8c16', '未配置': '#f5222d',
            }[k] || '#999',
          },
        })),
      }],
    }
  }, [tables])

  const handleDownload = (fmt) => {
    downloadBatch(batchId, fmt)
    message.success(`正在导出 ${fmt.toUpperCase()}，图表与明细均来自 batch_id=${batchId} 同一批数据`)
  }

  const openConclusionCreate = (tableSnapshot = null) => {
    setEditConclusion(null)
    conclusionForm.resetFields()
    conclusionForm.setFieldsValue({
      conclusion_type: 'general_note',
      reviewer: 'sre_duty',
      status: 'draft',
      table_snapshot_id: tableSnapshot?.id,
    })
    setConclusionModalOpen(true)
  }

  const openConclusionCorrect = (oldConc) => {
    setEditConclusion(oldConc)
    conclusionForm.resetFields()
    conclusionForm.setFieldsValue({
      conclusion_type: oldConc.conclusion_type,
      conclusion_content: oldConc.conclusion_content,
      reviewer: 'sre_duty',
      status: 'confirmed',
      table_snapshot_id: oldConc.table_snapshot_id,
      parent_id: oldConc.id,
      migration_script_ref: oldConc.migration_script_ref,
      correction_reason: '',
    })
    setConclusionModalOpen(true)
  }

  const submitConclusion = async () => {
    try {
      const values = await conclusionForm.validateFields()
      await createConclusion({
        ...values,
        batch_id: batchId,
        parent_id: editConclusion?.id || values.parent_id || undefined,
      })
      message.success(editConclusion ? '补录/修正成功，旧结论自动标记为非最新' : '复核结论已保存')
      setConclusionModalOpen(false)
      load()
    } catch {}
  }

  const openHistory = async (concId) => {
    setActiveConclusionId(concId)
    setHistoryLoading(true)
    setHistoryDrawerOpen(true)
    try {
      const chain = await getConclusionHistory(concId)
      setHistoryChain(chain)
    } finally {
      setHistoryLoading(false)
    }
  }

  const openMigrationDetail = async (identifier) => {
    setMigrationDrawerOpen(true)
    setMigrationLoading(true)
    setMigrationData(null)
    try {
      const data = await getMigrationScript(identifier)
      setMigrationData(data)
    } finally {
      setMigrationLoading(false)
    }
  }

  const doCompare = async () => {
    if (!compareBatchId) { message.warning('请选择对比批次'); return }
    setCompareLoading(true)
    try {
      const res = await compareBatches({ batch_a: batchId, batch_b: compareBatchId })
      setCompareResult(res)
    } finally {
      setCompareLoading(false)
    }
  }

  const tableColumns = [
    { title: '表名', dataIndex: 'table_name', key: 'table_name', width: 220, fixed: 'left',
      render: v => <Space><DatabaseOutlined /><code>{v}</code></Space> },
    { title: '租户', dataIndex: 'tenant_id', key: 'tenant_id', width: 100 },
    { title: '账套', dataIndex: 'account_set', key: 'account_set', width: 100 },
    {
      title: '分区策略', dataIndex: 'partition_info', key: 'partition_info', width: 160,
      render: (v) => {
        let badge = '未配置', color = 'red'
        try {
          const p = v && typeof v === 'string' ? JSON.parse(v) : v
          if (p) {
            if (p.tenant_column && p.account_set_column) { badge = '租户+账套 ✓'; color = 'green' }
            else if (p.tenant_column) { badge = '仅租户'; color = 'blue' }
            else if (p.strategy) { badge = p.strategy; color = 'purple' }
          }
        } catch {}
        return <Tag color={color}>{badge}</Tag>
      }
    },
    { title: '行数', dataIndex: 'row_count', key: 'row_count', width: 110, align: 'right',
      render: v => v ? Number(v).toLocaleString() : '—' },
    { title: '数据量(B)', dataIndex: 'data_size', key: 'data_size', width: 120, align: 'right',
      render: v => v ? Number(v).toLocaleString() : '—' },
    {
      title: '校验和', dataIndex: 'checksum', key: 'checksum', width: 160, ellipsis: true,
      render: v => <Tooltip title={v}><code style={{ fontSize: 11, color: '#888' }}>{v?.slice(0, 18)}…</code></Tooltip>,
    },
    {
      title: '操作', key: 'op', width: 120, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => openConclusionCreate(r)}>+ 结论</Button>
        </Space>
      ),
    },
  ]

  const expandedRowRender = (record) => (
    <Row gutter={16}>
      <Col span={12}>
        <Title level={5}>schema_json</Title>
        <JSONPretty data={record.schema_json} />
      </Col>
      <Col span={12}>
        <Title level={5}>partition_info</Title>
        <JSONPretty data={record.partition_info} />
      </Col>
    </Row>
  )

  const conclusionColumns = [
    {
      title: '类型', dataIndex: 'conclusion_type', key: 'conclusion_type', width: 170,
      render: (v) => {
        const s = getConclusionStyle(v)
        return <Tag color={s.color}>{s.icon} {s.label}</Tag>
      },
    },
    { title: '内容', dataIndex: 'conclusion_content', key: 'conclusion_content', ellipsis: true },
    { title: '关联表', key: 'tbl', width: 180,
      render: (_, r) => {
        const t = tables.find(x => x.id === r.table_snapshot_id)
        return t ? <code>{t.table_name}</code> : <Text type="secondary">批次级</Text>
      },
    },
    {
      title: '迁移脚本', dataIndex: 'migration_script_ref', key: 'migration', width: 200,
      render: (v) => v ? (
        <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openMigrationDetail(v)}>
          点回迁移脚本
        </Button>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '修正原因', dataIndex: 'correction_reason', key: 'reason', width: 180,
      render: v => v ? <Tooltip title={v}><span style={{ color: '#d48806' }}>有修正</span></Tooltip> : '—',
    },
    { title: '复核人', dataIndex: 'reviewer', key: 'reviewer', width: 100 },
    { title: '时间', dataIndex: 'review_time', key: 'review_time', width: 170 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: v => v === 'confirmed' ? <Tag color="green">已确认</Tag> :
        v === 'draft' ? <Tag color="default">草稿</Tag> : <Tag>{v}</Tag>,
    },
    {
      title: '操作', key: 'op', width: 200, fixed: 'right', align: 'center',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r.id)}>历史</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openConclusionCorrect(r)}>补录/修正</Button>
        </Space>
      ),
    },
  ]

  if (loading && !detail) return <div style={{ textAlign: 'center', padding: 100 }}>加载中...</div>
  if (!detail) return <Empty description="批次不存在" />

  const ep = ENTRY_POINT_LABELS[detail.entry_point] || { label: detail.entry_point, color: 'default', icon: null }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <FileTextOutlined /> {detail.batch_no}
              <Tag color={ep.color} style={{ marginLeft: 12 }}>{ep.icon} {ep.label}</Tag>
            </Title>
            <Text type="secondary">
              图表 / 明细表 / 下载结果均取自本批次 snapshot_batch（id={detail.id}），
              数据哈希：<Tooltip title={detail.data_hash}><code style={{ fontSize: 12 }}>{detail.data_hash.slice(0, 28)}…</code></Tooltip>
            </Text>
          </div>
        </Space>
        <Space>
          <Button icon={<GitCompareOutlined />} onClick={() => setCompareModalOpen(true)}>与其他批次对比</Button>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload('csv')}>下载 CSV</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload('xlsx')}>下载 Excel</Button>
        </Space>
      </div>

      {detail.status !== 'active' && (
        <Alert type="warning" showIcon message={`批次状态：${detail.status}`} />
      )}

      <Card bordered={false}>
        <Descriptions bordered size="small" column={4}>
          <Descriptions.Item label="批次号">{detail.batch_no}</Descriptions.Item>
          <Descriptions.Item label="数据来源">{detail.source || '—'}</Descriptions.Item>
          <Descriptions.Item label="导入时间">{detail.import_time}</Descriptions.Item>
          <Descriptions.Item label="导入人">{detail.import_user || '—'}</Descriptions.Item>
          <Descriptions.Item label="入口" span={1}>
            <Tag color={ep.color}>{ep.icon} {ep.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="表快照数">{tables.length}</Descriptions.Item>
          <Descriptions.Item label="最新结论数">{conclusions.length}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {detail.status === 'active' ? <Tag color="green">活跃</Tag> : <Tag>{detail.status}</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={4}>{detail.remark || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="按租户/账套统计" bordered={false} size="small" extra={<Tag color="blue">同批数据</Tag>}>
            <Table
              size="small"
              pagination={false}
              columns={[
                { title: '租户/账套', dataIndex: 'key' },
                { title: '表数', dataIndex: 'count', align: 'right', width: 80 },
                { title: '总行数', dataIndex: 'rows', align: 'right', render: v => v.toLocaleString() },
                { title: '总大小', dataIndex: 'size', align: 'right', render: v => v.toLocaleString() },
              ]}
              dataSource={tenantAccountStats}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="分区配置分布" bordered={false} size="small">
            <ReactECharts option={partitionDistOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={`表结构快照明细（${tables.length} 张）`}
        bordered={false}
        extra={
          <Space>
            <Alert
              type="info"
              showIcon
              style={{ border: 'none', padding: '2px 8px', margin: 0 }}
              message="同一批表结构快照基于 checksum + data_hash 去重，重复导入不会产生打架的结论"
              icon={<SyncOutlined />}
            />
          </Space>
        }
      >
        <ReactECharts option={tableSizeOption} style={{ height: 360, marginBottom: 12 }} />
        <Divider style={{ margin: '12px 0' }} />
        {tables.length ? (
          <Table
            columns={tableColumns}
            dataSource={tables}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1200 }}
            expandable={{ expandedRowRender, defaultExpandAllRows: false }}
          />
        ) : <Empty description="此批次无表结构快照" />}
      </Card>

      <Card
        title={
          <Space>
            复核结论（最新 {conclusions.length} 条）
            {conclusions.length > 0 && <Tag color="green">is_latest=1</Tag>}
            <Badge count={conclusions.filter(c => c.status !== 'confirmed').length} showZero={false}
              offset={[2, -2]} title="待确认数量" />
          </Space>
        }
        bordered={false}
        extra={
          <Space>
            <Tooltip title="重复导入同一批数据时，原批次结论保持最新状态，不会出现两份相冲突的结论">
              <Text type="secondary">防重复机制已开启</Text>
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openConclusionCreate()}>新增结论</Button>
          </Space>
        }
      >
        {conclusions.length ? (
          <Table
            columns={conclusionColumns}
            dataSource={conclusions}
            rowKey="id"
            size="small"
            scroll={{ x: 1400 }}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty
            description={
              <Space direction="vertical" size="small">
                <Text>暂无结论，请点击右上方"新增结论"开始复核</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openConclusionCreate()}>创建第一条结论</Button>
              </Space>
            }
          />
        )}
      </Card>

      <Modal
        title={editConclusion ? `补录 / 修正结论（原结论 ID=${editConclusion.id}）` : '新增复核结论'}
        open={conclusionModalOpen}
        onCancel={() => setConclusionModalOpen(false)}
        onOk={submitConclusion}
        okText="提交"
        width={680}
      >
        {editConclusion && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <Space>
                <span>补录模式：原结论 <b>#{editConclusion.id}</b> 自动标记为非最新（is_latest=0），新结论作为最新，同时写入修正原因到 review_history</span>
              </Space>
            }
          />
        )}
        <Form form={conclusionForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="conclusion_type" label="结论类型" rules={[{ required: true }]}>
                <Select>
                  {CONCLUSION_TYPES.map(c => (
                    <Option key={c.value} value={c.value}>{c.icon} {c.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="table_snapshot_id" label="关联表（可空=批次级结论）">
                <Select allowClear showSearch optionFilterProp="label" placeholder="不选则为批次级结论">
                  {tables.map(t => (
                    <Option key={t.id} value={t.id} label={t.table_name}>
                      {t.table_name} <Text type="secondary">({t.tenant_id || '-'}/{t.account_set || '-'})</Text>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="conclusion_content" label="结论内容" rules={[{ required: true, min: 5 }]}>
            <TextArea rows={4} placeholder="详细描述问题/结论，如：该表缺少 tenant_id 分区键，2026-06 月慢查询因此命中率下降 30%" />
          </Form.Item>
          <Form.Item name="migration_script_ref" label="关联迁移脚本（script_hash / script_name）">
            <Input
              placeholder="填写后，结论可一键点回迁移脚本查看内容和执行情况"
              prefix={<LinkOutlined />}
            />
          </Form.Item>
          {editConclusion && (
            <Form.Item name="correction_reason" label="修正原因（强制）" rules={[{ required: true, min: 5 }]}>
              <TextArea rows={2} placeholder="例如：数据字典 V2.4 更新后 tenant_id 字段类型变更，原结论不再适用" />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="reviewer" label="复核人" rules={[{ required: true }]}>
                <Input placeholder="SRE 值班" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select>
                  <Option value="draft">草稿</Option>
                  <Option value="confirmed">已确认</Option>
                  <Option value="disputed">有争议</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="parent_id" label="父结论 ID">
                <InputNumber style={{ width: '100%' }} placeholder="自动填入" disabled={!!editConclusion} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={<Space><HistoryOutlined />结论修正历史链（含补录追溯）</Space>}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        width={640}
      >
        {historyLoading ? <div>加载中...</div> : (
          historyChain.length ? (
            <Timeline mode="left">
              {historyChain.map((c, idx) => (
                <Timeline.Item
                  key={c.id}
                  color={idx === 0 ? 'blue' : 'gray'}
                  label={
                    <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
                      <Text strong>{idx === 0 ? '最新' : `历史 #${idx}`}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>ID={c.id}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{c.review_time?.slice(0, 16)}</Text>
                    </Space>
                  }
                >
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        {(() => { const s = getConclusionStyle(c.conclusion_type);
                          return <Tag color={s.color}>{s.icon} {s.label}</Tag> })()}
                        <Tag color={c.is_latest ? 'green' : 'default'}>
                          {c.is_latest ? 'is_latest=1' : 'is_latest=0'}
                        </Tag>
                        <Tag>{c.status}</Tag>
                        {c.reviewer && <Text type="secondary">by {c.reviewer}</Text>}
                      </Space>
                      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.conclusion_content}</Paragraph>
                      {c.correction_reason && (
                        <Alert type="warning" size="small" showIcon message={`修正原因：${c.correction_reason}`} />
                      )}
                      {c.migration_script_ref && (
                        <Button type="link" size="small" icon={<LinkOutlined />}
                          onClick={() => openMigrationDetail(c.migration_script_ref)}>
                          迁移脚本：{c.migration_script_ref.slice(0, 24)}…
                        </Button>
                      )}
                      {c.history_entries?.length > 0 && (
                        <Collapse ghost size="small">
                          <Panel header={`review_history（${c.history_entries.length} 条）`} key="1">
                            <List
                              size="small"
                              dataSource={c.history_entries}
                              renderItem={h => (
                                <List.Item>
                                  <List.Item.Meta
                                    title={
                                      <Space>
                                        <Tag color="blue">{h.action_type}</Tag>
                                        <Text style={{ fontSize: 12 }}>{h.operator}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{h.operate_time?.slice(0, 19)}</Text>
                                      </Space>
                                    }
                                    description={
                                      <Space direction="vertical" size={0}>
                                        {h.reason && <Text type="warning">原因：{h.reason}</Text>}
                                        {h.new_value && <Text>→ {h.new_value.slice(0, 200)}</Text>}
                                      </Space>
                                    }
                                  />
                                </List.Item>
                              )}
                            />
                          </Panel>
                        </Collapse>
                      )}
                    </Space>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : <Empty description="无历史记录" />
        )}
      </Drawer>

      <Drawer
        title={<Space><LinkOutlined />迁移脚本详情 & 关联结论（点回）</Space>}
        open={migrationDrawerOpen}
        onClose={() => setMigrationDrawerOpen(false)}
        width={720}
      >
        {migrationLoading ? <div>加载中...</div> : migrationData ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card size="small">
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="脚本名">{migrationData.script_name}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={migrationData.status === 'success' ? 'green' : 'blue'}>{migrationData.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="脚本路径" span={2}>{migrationData.script_path}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{migrationData.created_at?.slice(0, 19)}</Descriptions.Item>
                <Descriptions.Item label="执行时间">{migrationData.execute_time?.slice(0, 19) || '—'}</Descriptions.Item>
                <Descriptions.Item label="相关表" span={2}>
                  {typeof migrationData.related_tables === 'string'
                    ? <JSONPretty data={migrationData.related_tables} />
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="脚本哈希" span={2}>
                  <code style={{ fontSize: 11 }}>{migrationData.script_hash}</code>
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card size="small" title={<Space><CodeOutlined />脚本内容</Space>}>
              {migrationData.content ? (
                <pre style={{ maxHeight: 320, overflow: 'auto', background: '#001529', color: '#e6f7ff', padding: 12, borderRadius: 4, fontSize: 12 }}>
                  {migrationData.content}
                </pre>
              ) : <Text type="secondary">无脚本内容</Text>}
            </Card>
            <Card size="small" title={<Space><FileTextOutlined />由此脚本引出的复核结论</Space>}>
              {migrationData.linked_conclusions?.length ? (
                <List
                  size="small"
                  dataSource={migrationData.linked_conclusions}
                  renderItem={c => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<span style={{ fontSize: 20 }}>📋</span>}
                        title={
                          <Space>
                            {(() => { const s = getConclusionStyle(c.conclusion_type);
                              return <Tag color={s.color}>{s.icon} {s.label}</Tag> })()}
                            <code>{c.batch_no}</code>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={0}>
                            <Paragraph style={{ margin: 0 }}>{c.conclusion_content}</Paragraph>
                            <Text type="secondary">{c.reviewer} · {c.review_time?.slice(0, 19)}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : <Empty description="暂无关联结论" />}
            </Card>
          </Space>
        ) : <Empty description="未找到迁移脚本" />}
      </Drawer>

      <Modal
        title={<Space><GitCompareOutlined />批次对比（结构 & 分区差异）</Space>}
        open={compareModalOpen}
        onCancel={() => { setCompareModalOpen(false); setCompareResult(null); setCompareBatchId(null) }}
        onOk={doCompare}
        okText="对比"
        width={860}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <span>对比批次：</span>
            <Select
              style={{ width: 360 }}
              placeholder="选择另一个批次"
              value={compareBatchId}
              onChange={setCompareBatchId}
              showSearch optionFilterProp="label"
              options={allBatches.map(b => ({
                value: b.id,
                label: `${b.batch_no} · ${b.import_time?.slice(0, 16)} · ${b.table_count}表`,
              }))}
            />
            {compareLoading && <span>对比中...</span>}
          </Space>
          {compareResult && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={6}><Card size="small"><Statistic title="新增表" value={compareResult.summary.added} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="修改表" value={compareResult.summary.modified} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="删除表" value={compareResult.summary.removed} valueStyle={{ color: '#f5222d' }} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="一致" value={compareResult.summary.same} valueStyle={{ color: '#1890ff' }} /></Card></Col>
              </Row>
              <Table
                size="small"
                rowKey="table_name"
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: '表名', dataIndex: 'table_name', width: 220 },
                  {
                    title: '状态', dataIndex: 'status', width: 100,
                    render: v => ({
                      added: <Tag color="green">新增</Tag>,
                      removed: <Tag color="red">删除</Tag>,
                      modified: <Tag color="orange">修改</Tag>,
                      same: <Tag color="blue">一致</Tag>,
                    }[v]),
                  },
                  {
                    title: '变化字段', dataIndex: 'changes',
                    render: v => v ? (
                      <Space direction="vertical" size={0}>
                        {v.map((ch, i) => (
                          <Text key={i} style={{ fontSize: 12 }}>
                            <code>{ch.field}</code>: {JSON.stringify(ch.from).slice(0, 30)} → {JSON.stringify(ch.to).slice(0, 30)}
                          </Text>
                        ))}
                      </Space>
                    ) : '—',
                  },
                ]}
                dataSource={compareResult.diffs}
              />
            </Space>
          )}
        </Space>
      </Modal>
    </Space>
  )
}
