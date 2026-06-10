import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Row, Col, Descriptions, Tag, Space, Button, Table, Timeline,
  Breadcrumb, Alert, Divider, message
} from 'antd'
import {
  ArrowLeftOutlined, ThunderboltOutlined, CopyOutlined,
  CommentOutlined, HistoryOutlined, FileTextOutlined
} from '@ant-design/icons'
import { batchesApi } from '../api'
import { StatusTag, formatDate } from '../utils.jsx'

export default function BatchTrace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trace, setTrace] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await batchesApi.trace(id)
      setTrace(res.data)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally { setLoading(false) }
  }

  if (!trace) return null
  const { batch, records, changelogs, reviewComments, importInfo } = trace

  const recColumns = [
    { title: '记录号', dataIndex: 'record_no', width: 140,
      render: (t, r) => <Space>
        <a onClick={() => navigate(`/records/${r.id}`)} style={{ fontWeight: 600 }}>{t}</a>
        {r.is_duplicate ? <Tag color="purple">重复</Tag> : null}
      </Space> },
    { title: '地点', dataIndex: 'location_name', width: 200,
      render: (t, r) => <div><Tag>{r.location_code}</Tag> {r.location_area}/{r.location_building} {t}</div> },
    { title: '时段', dataIndex: 'trap_start_time',
      render: (_, r) => `${r.trap_start_time || '-'}~${r.trap_end_time || '-'}` },
    { title: '虫数', dataIndex: 'insect_count', width: 70, render: t => <b style={{ color: t > 0 ? '#cf1322' : '#389e0d' }}>{t}</b> },
    { title: '种类', dataIndex: 'insect_types', render: t => t || '-' },
    { title: '状态', dataIndex: 'sample_status', width: 100, render: s => <StatusTag status={s} /> },
    { title: '结论', dataIndex: 'conclusion', ellipsis: true,
      render: (t, r) => t ? <a onClick={() => navigate(`/records/${r.id}`)} title={t}>{t}</a> : <span style={{ color: '#bfbfbf' }}>-</span> },
    { title: '操作', key: 'act', width: 100, render: (_, r) => <Button type="link" size="small" onClick={() => navigate(`/records/${r.id}`)}>去样本</Button> },
  ]

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item><a onClick={() => navigate('/')}>看板总览</a></Breadcrumb.Item>
        <Breadcrumb.Item><a onClick={() => navigate('/batches')}>批次管理</a></Breadcrumb.Item>
        <Breadcrumb.Item>批次追溯 {batch.batch_no}</Breadcrumb.Item>
      </Breadcrumb>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/batches')}>返回批次列表</Button>
      </Space>

      {batch.has_batch_effect ? (
        <Alert style={{ marginBottom: 16 }} type="error" showIcon
          message={<Space><ThunderboltOutlined /> 批次效应标记</Space>}
          description={batch.batch_effect_note || '该批次被标记为存在批次效应'} />
      ) : null}

      <Alert style={{ marginBottom: 16 }} type="info" showIcon
        message="验收追溯链路：批次基础信息 → 该批次所有记录 → 每条记录的复核意见、变更日志、导入来源" />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={<span><FileTextOutlined /> ① 批次基础信息（来源）</span>} loading={loading}>
            <Descriptions column={4} size="small" bordered>
              <Descriptions.Item label="批次号"><b>{batch.batch_no}</b></Descriptions.Item>
              <Descriptions.Item label="诱捕日期">{batch.trap_date}</Descriptions.Item>
              <Descriptions.Item label="操作员">{batch.operator}</Descriptions.Item>
              <Descriptions.Item label="诱捕类型">{batch.trap_type || '-'}</Descriptions.Item>
              <Descriptions.Item label="天气">{batch.weather || '-'}</Descriptions.Item>
              <Descriptions.Item label="温度">{batch.temperature || '-'} ℃</Descriptions.Item>
              <Descriptions.Item label="湿度">{batch.humidity || '-'} %</Descriptions.Item>
              <Descriptions.Item label="记录数">{records.length} 条</Descriptions.Item>
              {batch.remark ? <Descriptions.Item label="备注" span={4}>{batch.remark}</Descriptions.Item> : null}
            </Descriptions>
          </Card>
        </Col>

        <Col span={24}>
          <Card title={<span><FileTextOutlined /> ② 批次下的所有记录（点任意条 → 进入样本详情，可看到最终结论 ↔ 样本清单跳转）</span>} style={{ marginTop: 16 }}>
            <Table size="small" rowKey="id" columns={recColumns} dataSource={records} scroll={{ x: 1100 }} pagination={false} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span><CommentOutlined /> ③ 本批次所有复核意见（处理记录）</span>} style={{ marginTop: 16 }}>
            {reviewComments && reviewComments.length > 0 ? (
              <Timeline className="trace-timeline"
                items={reviewComments.map(c => ({
                  color: c.comment_type === 'duplicate' ? 'purple' : 'blue',
                  children: <div>
                    <div>
                      <Space>
                        <b>{c.reviewer}</b> 对记录
                        <a onClick={() => navigate(`/records/${c.record_id}`)} className="link-text">
                          #{records.find(r => r.id === c.record_id)?.record_no || c.record_id}
                        </a>
                        {c.comment_type === 'duplicate' ? <Tag color="purple">重复标记</Tag> :
                         c.new_status ? <Tag color="blue">状态变更</Tag> : <Tag>复核意见</Tag>}
                      </Space>
                    </div>
                    {c.previous_status ? (
                      <div style={{ fontSize: 13 }}><StatusTag status={c.previous_status} /> → <StatusTag status={c.new_status} /></div>
                    ) : null}
                    <div style={{ marginTop: 4 }}>{c.comment}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatDate(c.created_at)}</div>
                  </div>
                }))} />
            ) : <Alert type="info" showIcon message="暂无复核意见" />}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span><HistoryOutlined /> ④ 本批次所有变更日志（处理记录）</span>} style={{ marginTop: 16 }}>
            {changelogs && changelogs.length > 0 ? (
              <Timeline className="trace-timeline"
                items={changelogs.map(c => ({
                  color: 'green',
                  children: <div>
                    <div>
                      <b>{c.changed_by || 'system'}</b> 修改记录
                      <a onClick={() => navigate(`/records/${c.record_id}`)} className="link-text">
                        #{records.find(r => r.id === c.record_id)?.record_no || c.record_id}
                      </a>
                      的 <Tag>{c.field_name}</Tag>
                    </div>
                    <div style={{ fontSize: 13, color: '#595959' }}>
                      {c.old_value || '(空)'} → {c.new_value || '(空)'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatDate(c.changed_at)}</div>
                  </div>
                }))} />
            ) : <Alert type="info" showIcon message="暂无变更记录" />}
          </Card>
        </Col>

        {importInfo ? (
          <Col span={24}>
            <Card title={<span><CopyOutlined /> ⑤ 本批次导入来源（倒查导入批次）</span>} style={{ marginTop: 16 }}>
              <Descriptions column={4} size="small" bordered>
                <Descriptions.Item label="导入批次号">{importInfo.import_batch_no}</Descriptions.Item>
                <Descriptions.Item label="来源文件">{importInfo.file_name}</Descriptions.Item>
                <Descriptions.Item label="导入人">{importInfo.imported_by}</Descriptions.Item>
                <Descriptions.Item label="导入时间">{formatDate(importInfo.created_at)}</Descriptions.Item>
                <Descriptions.Item label="导入统计">
                  共 {importInfo.total_count} 条：成功 {importInfo.success_count} / 重复 {importInfo.duplicate_count} / 错误 {importInfo.error_count}
                </Descriptions.Item>
                {importInfo.remark ? <Descriptions.Item label="备注" span={3}>{importInfo.remark}</Descriptions.Item> : null}
              </Descriptions>
            </Card>
          </Col>
        ) : null}
      </Row>
    </div>
  )
}
