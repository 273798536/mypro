import React, { useState } from 'react'
import {
  Card, Form, DatePicker, Input, InputNumber, Select, Upload, Button, Space,
  message, Steps, Result, Divider, Tag, Timeline, Alert, Statistic, Row, Col,
  Descriptions, List, Empty
} from 'antd'
import {
  SafetyCertificateOutlined,
  UploadOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
  ArrowRightOutlined,
  CheckCircleTwoTone,
  ExclamationCircleTwoTone,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { snapshotApi } from '../api.js'

const { TextArea } = Input
const { Option } = Select

function SealMonth() {
  const [form] = Form.useForm()
  const [lateFile, setLateFile] = useState(null)
  const [running, setRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState(null)

  const handleSubmit = async (values) => {
    setRunning(true)
    setCurrentStep(1)
    try {
      const formData = new FormData()
      formData.append('seal_month', values.seal_month.format('YYYY-MM'))
      formData.append('created_by', values.created_by)
      formData.append('old_snapshot_id', String(values.old_snapshot_id))

      if (values.has_late_material && lateFile) {
        formData.append('late_material_name', values.late_material_name || '迟到附件')
        formData.append('late_material_type', values.late_material_type || 'attachment')
        formData.append('late_impact_description', values.late_impact_description || '月底迟到材料')
        formData.append('late_material_file', lateFile)
      }

      setCurrentStep(2)
      const data = await snapshotApi.sealMonth(formData)

      setCurrentStep(3)
      setResult(data)
      message.success('月底封账完成！接口已说明所有变化')
    } catch (e) {
      console.error(e)
      message.error('封账失败：' + (e.response?.data?.detail || e.message))
    } finally {
      setRunning(false)
    }
  }

  const steps = [
    { title: '准备材料', icon: <DatabaseOutlined /> },
    { title: '导入旧快照', icon: <SafetyCertificateOutlined /> },
    { title: '补录晚到附件', icon: <ThunderboltOutlined /> },
    { title: '封账完成', icon: <FileDoneOutlined /> },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">月底封账流程</div>
        <div className="page-desc">
          按照月底封账的真实节奏：先导入旧材料 → 再补录晚到附件 → 接口返回清晰说明所有变化
        </div>
      </div>

      <Card style={{marginBottom:24}}>
        <Steps current={running || result ? currentStep : 0} items={steps} />
      </Card>

      {!result && (
        <Card title="封账参数配置">
          <Alert type="info" showIcon style={{marginBottom:20}}
            message="月底封账流程说明"
            description={
              <ol style={{marginBottom:0, paddingLeft:20}}>
                <li>系统先基于<strong>旧快照</strong>创建封账版本，继承所有样本判断和人工锁定</li>
                <li>若有<strong>晚到附件</strong>，系统将标记为迟到材料，自动估算影响并生成下一步处理指引</li>
                <li>补录后系统会重跑，且不会覆盖任何人工锁定的判断</li>
                <li>最终接口返回：变更历史、新材料记录、受影响样本列表、人类可读总结、下一步操作清单</li>
              </ol>
            }
          />
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              has_late_material: true,
              late_material_type: 'attachment',
            }}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="seal_month" label="封账月份" rules={[{required:true}]}>
                  <DatePicker picker="month" style={{width:'100%'}} format="YYYY-MM" placeholder="选择月份" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="old_snapshot_id" label="旧快照 ID（导入其所有材料和判断）" rules={[{required:true}]}>
                  <InputNumber min={1} style={{width:'100%'}} placeholder="如：1" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="created_by" label="操作人" rules={[{required:true}]}>
              <Input placeholder="如：小唐" />
            </Form.Item>

            <Divider orientation="left">晚到附件（可选）</Divider>
            <Form.Item name="has_late_material" label="是否有晚到附件" valuePropName="checked">
              <Select
                style={{width: 200}}
                onChange={(v)=>v}
                options={[
                  {label: '有，需要补录', value: true},
                  {label: '无，直接封账', value: false},
                ]}
              />
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(p, n) => p.has_late_material !== n.has_late_material}>
              {({getFieldValue}) => getFieldValue('has_late_material') && (
                <div>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item name="late_material_name" label="晚到附件名称" rules={[{required:true}]}>
                        <Input placeholder="如：6月迟到用户反馈数据" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="late_material_type" label="材料类型" rules={[{required:true}]}>
                        <Select>
                          <Option value="documentation">说明文档</Option>
                          <Option value="feature_data">特征数据</Option>
                          <Option value="feedback_data">用户反馈</Option>
                          <Option value="attachment">附件</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="晚到附件文件" rules={[{required:true}]}>
                    <Upload beforeUpload={(f)=>{setLateFile(f); return false}} maxCount={1}>
                      <Button icon={<UploadOutlined />}>{lateFile?lateFile.name:'选择晚到附件文件'}</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item name="late_impact_description" label="影响说明（用于生成下一步处理指引）">
                    <TextArea rows={2} placeholder="如：用户反馈数据迟到，影响部分6月样本判断" />
                  </Form.Item>
                </div>
              )}
            </Form.Item>

            <Form.Item style={{textAlign:'right', marginBottom:0, marginTop:20}}>
              <Button type="primary" size="large" icon={<SafetyCertificateOutlined />} htmlType="submit" loading={running}>
                {running ? '封账处理中...' : '开始月底封账'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {result && (
        <Space direction="vertical" size="large" style={{width:'100%'}}>
          <Result
            status="success"
            icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
            title={
              <Space>
                <span>月底封账完成！</span>
                <Tag color="purple">{form.getFieldValue('seal_month')?.format('YYYY-MM')}</Tag>
                <Tag color="green">新快照 #{result.snapshot_id}</Tag>
                <Tag color="blue">{result.final_status}</Tag>
              </Space>
            }
          />

          <div className="summary-box">
            <div className="summary-title">📋 人类可读的封账总结</div>
            <div className="summary-text">{result.human_readable_summary}</div>
          </div>

          <Row gutter={24}>
            <Col span={6}>
              <Card style={{height:'100%'}}>
                <Statistic title="变更记录数" value={result.changes_summary.length} prefix={<FileTextOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{height:'100%'}}>
                <Statistic title="补录新材料" value={result.new_materials.length} prefix={<ThunderboltOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{height:'100%'}}>
                <Statistic title="重判样本数" value={result.rejudged_samples.length} prefix={<ArrowRightOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card style={{height:'100%'}}>
                <Statistic
                  title="需人工操作"
                  value={result.action_required.filter(a=>!/无需/.test(a)).length}
                  prefix={<ExclamationCircleTwoTone twoToneColor="#fa8c16" />}
                />
              </Card>
            </Col>
          </Row>

          {result.new_materials.length > 0 && (
            <Card title={
              <Space>
                <ThunderboltOutlined style={{color:'#cf1322'}} />补录的晚到附件
              </Space>
            }>
              <Descriptions bordered column={1} size="small">
                {result.new_materials.map(m => (
                  <React.Fragment key={m.id}>
                    <Descriptions.Item label="材料名称">
                      <Space>
                        {m.material_name}
                        {m.is_late_arrival && <Tag className="tag-late">迟到</Tag>}
                        <Tag color="blue">{m.material_type}</Tag>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="上传人 / 时间">{m.uploaded_by} / {dayjs(m.uploaded_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="影响样本">约 {m.affected_samples_count} 条</Descriptions.Item>
                    <Descriptions.Item label="影响说明">{m.impact_description || '—'}</Descriptions.Item>
                    {m.next_action && (
                      <Descriptions.Item label="下一步操作">
                        <div style={{whiteSpace:'pre-wrap', lineHeight:1.8}}>{m.next_action}</div>
                      </Descriptions.Item>
                    )}
                  </React.Fragment>
                ))}
              </Descriptions>
            </Card>
          )}

          {result.rejudged_samples.length > 0 && (
            <Card title={
              <Space>
                <ArrowRightOutlined />重判样本对比 ({result.rejudged_samples.length}条)
              </Space>
            }>
              <List
                dataSource={result.rejudged_samples}
                renderItem={(item) => (
                  <List.Item>
                    <Space size="large">
                      <Tag color="blue" style={{minWidth:70}}>{item.sample_id}</Tag>
                      <span>
                        <Tag color="red" style={{textDecoration:'line-through'}}>{item.old_judgment || '（无）'}</Tag>
                        <ArrowRightOutlined style={{margin:'0 8px'}} />
                        <Tag color="green">{item.new_judgment}</Tag>
                      </span>
                      {item.old_score != null && (
                        <span style={{color:'#666'}}>
                          分数 {item.old_score?.toFixed(3)} → {item.new_score?.toFixed(3)}
                        </span>
                      )}
                      {item.explanation && <span style={{color:'#888'}}>{item.explanation}</span>}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Card title={
            <Space>
              <FileTextOutlined />详细变更历史时间线（共 {result.changes_summary.length} 条）
            </Space>
          }>
            <Timeline
              mode="left"
              items={result.changes_summary.map((c, i) => {
                const colorMap = {
                  snapshot_fork: 'blue',
                  late_feature_material: 'red',
                  threshold_update: 'orange',
                  human_judgment_update: 'purple',
                }
                return {
                  color: colorMap[c.change_type] || 'default',
                  children: (
                    <Card size="small">
                      <div style={{marginBottom:8}}>
                        <Space size="large">
                          <b>步骤 {i+1}</b>
                          <Tag color={colorMap[c.change_type] || 'default'}>{c.change_type}</Tag>
                          <span style={{color:'#666'}}>{dayjs(c.changed_at).format('YYYY-MM-DD HH:mm:ss')}</span>
                          <span>操作人: <b>{c.changed_by}</b></span>
                        </Space>
                      </div>
                      <div style={{fontWeight:500}}>{c.change_reason}</div>
                      {c.field_name && (
                        <div style={{fontSize:13, color:'#666', marginTop:4}}>
                          字段: <code>{c.field_name}</code>
                          {c.old_value && `  从 "${String(c.old_value).slice(0,80)}"`}
                          {` → "${String(c.new_value).slice(0,80)}"`}
                        </div>
                      )}
                      {c.affected_samples && c.affected_samples.length > 0 && (
                        <div style={{fontSize:13, marginTop:4}}>
                          影响样本: {c.affected_samples.slice(0,10).join(', ')}
                          {c.affected_samples.length > 10 ? '...' : ''}
                        </div>
                      )}
                      {c.next_step_hint && (
                        <div className="next-steps-box" style={{marginTop:12}}>
                          <div className="title">📌 下一步操作提示</div>
                          <div style={{whiteSpace:'pre-wrap', lineHeight:1.8}}>{c.next_step_hint}</div>
                        </div>
                      )}
                    </Card>
                  )
                }
              })}
            />
          </Card>

          <Card
            title={
              <Space>
                <ExclamationCircleTwoTone twoToneColor="#fa8c16" />评测工程师需执行的下一步操作
              </Space>
            }
            type="inner"
            style={{borderColor: '#ffd591'}}
          >
            {result.action_required.length === 0 ? (
              <Empty description="无需额外操作" />
            ) : (
              <ol style={{paddingLeft:20, margin:0}}>
                {result.action_required.map((a, i) => (
                  <li key={i} style={{padding:'6px 0', lineHeight:1.6}}>{a.replace(/^[\d]+\.\s*/, '')}</li>
                ))}
              </ol>
            )}
          </Card>

          <div style={{textAlign:'center'}}>
            <Space>
              <Button onClick={() => {
                setResult(null)
                setCurrentStep(0)
              }}>再次封账</Button>
              <Button type="primary" icon={<SafetyCertificateOutlined />}
                onClick={() => window.open(`/snapshots/${result.snapshot_id}`, '_blank')}>
                查看封账快照 #{result.snapshot_id}
              </Button>
            </Space>
          </div>
        </Space>
      )}
    </div>
  )
}

export default SealMonth
