import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Row, Col, Descriptions, Tag, Space, Button, Form, Input, Select,
  InputNumber, Timeline, Divider, List, message, Modal, Table, Tooltip, Breadcrumb, Alert
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, ThunderboltOutlined,
  CopyOutlined, HistoryOutlined, FileTextOutlined, CommentOutlined
} from '@ant-design/icons'
import { recordsApi, batchesApi } from '../api'
import { StatusTag, formatDate } from '../utils.jsx'

const { Option } = Select
const { TextArea } = Input

export default function RecordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [commentForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [commenting, setCommenting] = useState(false)

  useEffect(() => { loadDetail() }, [id])

  const loadDetail = async () => {
    setLoading(true)
    try {
      const res = await recordsApi.get(id)
      setRecord(res.data)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally { setLoading(false) }
  }

  const onSubmitEdit = async (values) => {
    setSubmitting(true)
    try {
      await recordsApi.update(id, { ...values, reviewed_by: values.sample_status !== 'pending' ? (values.reviewed_by || '主管') : null })
      message.success('保存成功')
      setEditing(false)
      loadDetail()
    } catch (e) {
      message.error('保存失败: ' + (e.error || e.message))
    } finally { setSubmitting(false) }
  }

  const onAddComment = async (values) => {
    setCommenting(true)
    try {
      await recordsApi.addComment(id, { ...values, reviewer: values.reviewer || '主管' })
      message.success('复核意见已添加')
      commentForm.resetFields()
      loadDetail()
    } catch (e) {
      message.error('提交失败: ' + (e.error || e.message))
    } finally { setCommenting(false) }
  }

  if (!record && !loading) return <div>记录不存在</div>

  const r = record || {}

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item><a onClick={() => navigate('/')}>看板总览</a></Breadcrumb.Item>
        <Breadcrumb.Item><a onClick={() => navigate('/records')}>诱捕记录</a></Breadcrumb.Item>
        <Breadcrumb.Item>记录详情 {r.record_no}</Breadcrumb.Item>
      </Breadcrumb>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/records')}>返回列表</Button>
        <Button type="primary" icon={<EditOutlined />} onClick={() => { editForm.setFieldsValue(r); setEditing(true) }}>
          人工修正
        </Button>
      </Space>

      {r.is_duplicate ? (
        <Alert
          style={{ marginBottom: 16 }} type="warning" showIcon
          message={<Space><CopyOutlined /> 该记录被标记为重复导入</Space>}
          description={r.duplicate_of_no ? (
            <span>来源原始记录：<a onClick={() => navigate(`/records/${r.duplicate_of_id}`)} className="link-text">
              ↩ 跳转查看 {r.duplicate_of_no}
            </a>，避免出现两份结论，请在原始记录上操作复核。</span>
          ) : '来源未知'}
        />
      ) : null}

      {r.duplicates && r.duplicates.length > 0 ? (
        <Alert
          style={{ marginBottom: 16 }} type="info" showIcon
          message={<Space><CopyOutlined /> 以下记录被标记为该记录的重复导入：</Space>}
          description={<Space wrap>
            {r.duplicates.map(d => <Tag key={d.id} color="purple"><a onClick={() => navigate(`/records/${d.id}`)}>{d.record_no}</a></Tag>)}
          </Space>}
        />
      ) : null}

      {r.has_batch_effect ? (
        <Alert
          style={{ marginBottom: 16 }} type="error" showIcon
          message={<Space><ThunderboltOutlined /> 该批次存在批次效应，复核时需注意</Space>}
          description={<span>
            批次 <b>{r.batch_no}</b> 标记说明：{r.batch_effect_note || '无详细说明'}
            &nbsp;—&nbsp; <a onClick={() => navigate(`/batches/${r.batch_id}/trace`)} className="link-text">从批次一路倒查来源 →</a>
          </span>}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title={<span><FileTextOutlined /> 样本基础信息</span>} loading={loading}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="记录编号" span={2}>
                <Space><b style={{ fontSize: 16 }}>{r.record_no}</b><StatusTag status={r.sample_status} />
                  {r.is_duplicate ? <Tag color="purple">重复导入</Tag> : null}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="批次号">
                <a onClick={() => navigate(`/batches/${r.batch_id}/trace`)}>{r.batch_no} <ThunderboltOutlined /></a>
              </Descriptions.Item>
              <Descriptions.Item label="诱捕日期">{r.trap_date}</Descriptions.Item>
              <Descriptions.Item label="采样地点" span={2}>
                <Tag color="blue">{r.location_code}</Tag> {r.location_name}
                <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                  {r.location_area} / {r.location_building} / {r.location_floor}
                </div>
                {r.location_description ? <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.location_description}</div> : null}
              </Descriptions.Item>
              <Descriptions.Item label="诱捕时段">{r.trap_start_time || '-'} ~ {r.trap_end_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作员">{r.batch_operator}</Descriptions.Item>
              <Descriptions.Item label="环境条件">
                {r.weather} {r.temperature}℃ {r.humidity ? `湿度${r.humidity}%` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="采集人">{r.collected_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="昆虫数量"><b style={{ color: r.insect_count > 0 ? '#cf1322' : '#389e0d', fontSize: 16 }}>{r.insect_count || 0}</b> 只</Descriptions.Item>
              <Descriptions.Item label="昆虫种类">{r.insect_types || '-'}</Descriptions.Item>
              <Descriptions.Item label="质量评分">
                {r.quality_score !== null && r.quality_score !== undefined ? (
                  <Tag color={r.quality_score >= 80 ? 'green' : r.quality_score >= 60 ? 'orange' : 'red'}>
                    {r.quality_score} 分
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="复核人">{r.reviewed_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="复核时间">{formatDate(r.reviewed_at)}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={<span style={{ marginTop: 16, display: 'inline-block' }}><CommentOutlined /> 最终结论（样本清单 ↔ 结论 双向跳转）</span>}
            style={{ marginTop: 16 }}
            extra={r.conclusion ? <Tag color="green">已出具</Tag> : <Tag color="default">未出具</Tag>}
          >
            {r.conclusion ? (
              <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, lineHeight: 1.8 }}>
                {r.conclusion}
              </div>
            ) : (
              <Alert type="info" showIcon message="尚未出具结论，点击右上角「人工修正」填写样本状态和结论" />
            )}
          </Card>

          <Card title={<span style={{ marginTop: 16, display: 'inline-block' }}><HistoryOutlined /> 变更日志（从结果一路回到处理记录）</span>}
            style={{ marginTop: 16 }}>
            {r.changelogs && r.changelogs.length > 0 ? (
              <Timeline className="trace-timeline"
                items={r.changelogs.map(c => ({
                  color: 'blue',
                  children: <div>
                    <div><b>{c.changed_by || 'system'}</b> 修改了 <Tag>{c.field_name}</Tag></div>
                    <div style={{ fontSize: 13, color: '#595959' }}>
                      从 <span style={{ background: '#fff1f0', padding: '1px 6px', borderRadius: 4 }}>{c.old_value || '(空)'}</span>
                      &nbsp;→&nbsp;
                      改为 <span style={{ background: '#f6ffed', padding: '1px 6px', borderRadius: 4 }}>{c.new_value || '(空)'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>{formatDate(c.changed_at)}</div>
                  </div>
                }))}
              />
            ) : <Alert type="info" showIcon message="暂无变更记录" />}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title={<span><CommentOutlined /> 复核意见（日常反复沟通 → 改为在此留痕）</span>}
            extra={<Button size="small" type="primary" icon={<CommentOutlined />} onClick={() => setCommenting(true)} disabled={commenting}>
              写复核意见
            </Button>}
          >
            {r.comments && r.comments.length > 0 ? (
              <List
                itemLayout="vertical"
                dataSource={r.comments}
                renderItem={c => (
                  <List.Item key={c.id}>
                    <List.Item.Meta
                      avatar={<div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1677ff', color: '#fff', textAlign: 'center', lineHeight: '36px', fontWeight: 600 }}>
                        {(c.reviewer || '?').slice(0, 1)}
                      </div>}
                      title={<Space>
                        <b>{c.reviewer}</b>
                        {c.comment_type === 'duplicate' ? <Tag color="purple">系统标记</Tag> :
                         c.previous_status || c.new_status ? <Tag color="blue">状态变更</Tag> :
                         <Tag>复核意见</Tag>}
                        {c.previous_status ? <span><StatusTag status={c.previous_status} /> → <StatusTag status={c.new_status} /></span> : null}
                      </Space>}
                      description={<span style={{ color: '#8c8c8c' }}>{formatDate(c.created_at)}</span>}
                    />
                    <div style={{ marginTop: 4, lineHeight: 1.7 }}>{c.comment}</div>
                  </List.Item>
                )}
              />
            ) : <Alert type="info" showIcon message="暂无复核意见" />}
          </Card>

          {r.importInfo ? (
            <Card title={<span style={{ marginTop: 16, display: 'inline-block' }}><CopyOutlined /> 导入来源（倒查导入批次）</span>}
              style={{ marginTop: 16 }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="导入批次号">{r.importInfo.import_batch_no}</Descriptions.Item>
                <Descriptions.Item label="来源文件">{r.importInfo.file_name}</Descriptions.Item>
                <Descriptions.Item label="导入人">{r.importInfo.imported_by}</Descriptions.Item>
                <Descriptions.Item label="导入时间">{formatDate(r.importInfo.created_at)}</Descriptions.Item>
                <Descriptions.Item label="导入情况">
                  成功 {r.importInfo.success_count} / 重复 {r.importInfo.duplicate_count} / 错误 {r.importInfo.error_count}
                </Descriptions.Item>
                {r.importInfo.remark ? <Descriptions.Item label="备注">{r.importInfo.remark}</Descriptions.Item> : null}
              </Descriptions>
            </Card>
          ) : null}
        </Col>
      </Row>

      <Modal title="人工修正样本" open={editing} onCancel={() => setEditing(false)} width={700}
        footer={null} destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={onSubmitEdit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="trap_start_time" label="诱捕开始时间"><Input placeholder="如 08:00" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trap_end_time" label="诱捕结束时间"><Input placeholder="如 16:00" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="insect_count" label="昆虫数量"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quality_score" label="质量评分"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="insect_types" label="昆虫种类"><Input placeholder="如：果蝇、蛾蠓" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sample_status" label="样本状态" rules={[{ required: true, message: '请选择状态' }]}>
                <Select>
                  <Option value="pending">待复核</Option>
                  <Option value="normal">正常</Option>
                  <Option value="boundary">边界</Option>
                  <Option value="bad">异常</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reviewed_by" label="复核人"><Input placeholder="如：主管" /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="collected_by" label="采集人"><Input /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="conclusion" label="最终结论" rules={[{ required: true, message: '请填写结论' }]}>
                <TextArea rows={4} placeholder="填写最终复核结论，将与样本清单双向关联" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right', margin: 0 }}>
            <Space>
              <Button onClick={() => setEditing(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>保存修改</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="添加复核意见" open={commenting} onCancel={() => setCommenting(false)} width={600} footer={null} destroyOnClose>
        <Form form={commentForm} layout="vertical" onFinish={onAddComment}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="reviewer" label="复核人" rules={[{ required: true }]}><Input placeholder="如：主管" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="new_status" label="变更状态为（可选）">
                <Select allowClear placeholder="不变更则不填">
                  <Option value="normal">正常</Option>
                  <Option value="boundary">边界</Option>
                  <Option value="bad">异常</Option>
                  <Option value="pending">待复核</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="comment" label="复核意见" rules={[{ required: true, message: '请填写意见' }]}>
                <TextArea rows={4} placeholder="填写复核意见，避免反复口头沟通" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right', margin: 0 }}>
            <Space>
              <Button onClick={() => setCommenting(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={commenting}>提交</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
