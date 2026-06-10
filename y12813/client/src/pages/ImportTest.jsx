import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Table, Button, Space, Alert, Tag, message, Modal, Descriptions,
  Row, Col, Form, Input, Select, Radio, Divider, List
} from 'antd'
import { CloudUploadOutlined, CopyOutlined, ThunderboltOutlined, ExperimentOutlined } from '@ant-design/icons'
import { importApi, recordsApi, batchesApi, locationsApi } from '../api'
import { StatusTag } from '../utils.jsx'
const { Option } = Select

export default function ImportTest() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [logDetail, setLogDetail] = useState(null)
  const [showTest, setShowTest] = useState(false)
  const [batches, setBatches] = useState([])
  const [locations, setLocations] = useState([])
  const [testRecords, setTestRecords] = useState([])
  const [importing, setImporting] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => { loadLogs() }, [])
  useEffect(() => {
    batchesApi.list().then(r => setBatches(r.data))
    locationsApi.list().then(r => setLocations(r.data))
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await importApi.logs()
      setLogs(res.data)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally { setLoading(false) }
  }

  const viewLog = async (id) => {
    setSelectedLog(id)
    const res = await importApi.logDetail(id)
    setLogDetail(res.data)
  }

  const startTest = () => {
    setTestRecords([
      { batch_id: batches[0]?.id, location_id: locations[0]?.id, trap_start_time: '08:00', trap_end_time: '16:00', insect_count: 0, sample_status: 'pending' },
      { batch_id: batches[0]?.id, location_id: locations[1]?.id, trap_start_time: '08:00', trap_end_time: '16:00', insect_count: 1, insect_types: '蛾蠓', sample_status: 'boundary' },
    ])
    setLastResult(null)
    setShowTest(true)
  }

  const runImport = async (mode) => {
    if (testRecords.length === 0) return message.warning('请先添加测试记录')
    setImporting(true)
    try {
      const res = await importApi.batch({
        records: testRecords, imported_by: '测试员', file_name: 'test_import_' + Date.now() + '.xlsx',
        remark: '测试场景：重复导入验证', import_mode: mode
      })
      setLastResult(res.data)
      message.success(`导入完成：成功 ${res.data.success}，重复 ${res.data.duplicate}，错误 ${res.data.error}`)
      loadLogs()
    } catch (e) {
      message.error('导入失败: ' + (e.error || e.message))
    } finally { setImporting(false) }
  }

  const addDupToTest = async () => {
    const recordsRes = await recordsApi.list({ pageSize: 5 })
    if (recordsRes.data && recordsRes.data.length > 0) {
      const rec = recordsRes.data[0]
      setTestRecords([...testRecords, {
        record_no: rec.record_no, batch_id: rec.batch_id, location_id: rec.location_id,
        trap_start_time: rec.trap_start_time, trap_end_time: rec.trap_end_time,
        insect_count: rec.insect_count, insect_types: rec.insect_types, sample_status: rec.sample_status,
        _note: '⚠️ 故意重复：与现有记录同编号/批次/地点'
      }])
      message.success('已添加一条故意重复的记录，编号 ' + rec.record_no)
    }
  }

  const logColumns = [
    { title: '导入批次号', dataIndex: 'import_batch_no', width: 200,
      render: t => <Tag color="purple">{t}</Tag> },
    { title: '来源文件', dataIndex: 'file_name' },
    { title: '总数', dataIndex: 'total_count', width: 70 },
    { title: '成功', dataIndex: 'success_count', width: 70, render: t => <Tag color="green">{t}</Tag> },
    { title: '重复', dataIndex: 'duplicate_count', width: 70, render: t => t > 0 ? <Tag color="orange">{t}</Tag> : t },
    { title: '错误', dataIndex: 'error_count', width: 70, render: t => t > 0 ? <Tag color="red">{t}</Tag> : t },
    { title: '导入人', dataIndex: 'imported_by', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 170 },
    { title: '操作', key: 'act', width: 100, render: (_, r) => <Button type="link" size="small" onClick={() => viewLog(r.id)}>查看详情</Button> },
  ]

  return (
    <div>
      <Alert style={{ marginBottom: 16 }} type="warning" showIcon
        message={<Space><ExperimentOutlined /><b>验收测试路径：重复导入场景</b></Space>}
        description="避免工具看上去能跑、实际越跑越乱。下面先模拟导入一批包含重复数据的记录，看系统是否正确识别并标记，不会出现两份结论。" />

      <Card title={<span><CloudUploadOutlined /> 导入日志</span>}
        extra={<Space>
          <Button type="primary" icon={<ExperimentOutlined />} onClick={startTest}>🧪 开始重复导入测试</Button>
          <Button onClick={loadLogs} loading={loading}>刷新</Button>
        </Space>}
      >
        <Table size="middle" rowKey="id" loading={loading} columns={logColumns} dataSource={logs}
          onRow={r => ({ onClick: () => viewLog(r.id) })} />
      </Card>

      <Modal title="导入批次详情" open={!!logDetail} onCancel={() => setLogDetail(null)} width={900} footer={<Button onClick={() => setLogDetail(null)}>关闭</Button>}>
        {logDetail ? (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="导入批次号">{logDetail.import_batch_no}</Descriptions.Item>
              <Descriptions.Item label="来源文件">{logDetail.file_name}</Descriptions.Item>
              <Descriptions.Item label="导入人">{logDetail.imported_by}</Descriptions.Item>
              <Descriptions.Item label="导入时间">{logDetail.created_at}</Descriptions.Item>
              <Descriptions.Item label="统计">共 {logDetail.total_count}：成功 {logDetail.success_count} / 重复 {logDetail.duplicate_count} / 错误 {logDetail.error_count}</Descriptions.Item>
              {logDetail.remark ? <Descriptions.Item label="备注">{logDetail.remark}</Descriptions.Item> : null}
            </Descriptions>
            <Divider>导入的记录</Divider>
            <List
              size="small" bordered
              dataSource={logDetail.records || []}
              renderItem={r => <List.Item>
                <Space style={{ width: '100%' }}>
                  <a onClick={() => navigate(`/records/${r.id}`)}>{r.record_no}</a>
                  <StatusTag status={r.sample_status} />
                  {r.is_duplicate ? (
                    <Tag color="purple"><CopyOutlined /> 重复，来源 {r.duplicate_of_id ? <a onClick={() => navigate(`/records/${r.duplicate_of_id}`)}>#{r.duplicate_of_id}</a> : '?'}</Tag>
                  ) : <Tag color="green">新增</Tag>}
                  <span>{r.batch_no}</span>
                  <span>{r.location_code} {r.location_name}</span>
                  <span style={{ marginLeft: 'auto' }}>虫数 {r.insect_count}</span>
                </Space>
              </List.Item>}
            />
          </div>
        ) : null}
      </Modal>

      <Modal title="🧪 重复导入测试模拟" open={showTest} onCancel={() => setShowTest(false)} width={900} footer={null} destroyOnClose>
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message="测试步骤：1) 先点击「添加一条故意重复的记录」；2) 选择「标记但保留（smart）」模式导入；3) 检查结果中重复记录是否被正确识别，不会覆盖原始结论。" />

        <Row gutter={12}>
          <Col span={16}>
            <Divider orientation="left">待导入测试数据</Divider>
            <List
              size="small" bordered
              dataSource={testRecords}
              renderItem={(r, i) => <List.Item>
                <Space style={{ width: '100%' }} wrap>
                  <Tag>#{i + 1}</Tag>
                  {r.record_no ? <Tag color="magenta">{r.record_no}</Tag> : <Tag color="default">无编号</Tag>}
                  <span>批次: {batches.find(b => b.id === r.batch_id)?.batch_no || '-'}</span>
                  <span>地点: {locations.find(l => l.id === r.location_id)?.code || '-'}</span>
                  <span>虫数: {r.insect_count || 0}</span>
                  <StatusTag status={r.sample_status} />
                  {r._note ? <Tag color="red">{r._note}</Tag> : null}
                  <Button type="link" size="small" danger onClick={() => setTestRecords(testRecords.filter((_, idx) => idx !== i))}>删除</Button>
                </Space>
              </List.Item>}
              locale={{ emptyText: '暂无数据，已自动填充 2 条新记录' }}
            />
          </Col>
          <Col span={8}>
            <Divider orientation="left">操作</Divider>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<CopyOutlined />} onClick={addDupToTest}>添加一条故意重复的记录</Button>
              <Button block danger onClick={() => setTestRecords(testRecords.slice(0, -1))}>删掉最后一条</Button>
              <Divider style={{ margin: '8px 0' }} />
              <Button type="primary" block loading={importing} onClick={() => runImport('smart')}>
                模式A：标记但保留（smart）
              </Button>
              <Button block loading={importing} onClick={() => runImport('skip')}>
                模式B：直接跳过重复（skip）
              </Button>
            </Space>
          </Col>
        </Row>

        {lastResult ? (
          <div style={{ marginTop: 16 }}>
            <Divider orientation="left">导入结果</Divider>
            <Alert
              type={lastResult.error > 0 ? 'error' : lastResult.duplicate > 0 ? 'warning' : 'success'}
              showIcon
              message={`导入批次 ${lastResult.import_batch_no}：共 ${lastResult.total} 条，成功 ${lastResult.success}，重复 ${lastResult.duplicate}，错误 ${lastResult.error}`}
            />
            <List size="small" bordered style={{ marginTop: 8 }}
              dataSource={lastResult.results}
              renderItem={r => <List.Item>
                <Space>
                  <b>{r.record_no}</b>
                  {r.status === 'success' ? <Tag color="green">✅ 成功</Tag> :
                   r.status === 'duplicate_marked' ? <Tag color="purple">⚠️ 标记为重复，ID={r.id}</Tag> :
                   r.status === 'duplicate' ? <Tag color="orange">⏭️ 跳过重复</Tag> :
                   <Tag color="red">❌ 错误</Tag>}
                  {r.duplicate_of_no ? <span>与 {r.duplicate_of_no} 重复</span> : null}
                  {r.message ? <span style={{ color: '#cf1322' }}>{r.message}</span> : null}
                </Space>
              </List.Item>} />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setShowTest(false)}>关闭</Button>
                <Button type="primary" onClick={() => { setShowTest(false); message.info('已关闭，请到导入日志或记录列表查看标记结果') }}>完成，去看板验证</Button>
              </Space>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
