import { useState } from 'react'
import {
  Card, Row, Col, Form, InputNumber, Select, Button, Space, Typography,
  Divider, Statistic, Table, Tag, Alert, message, Input, Empty
} from 'antd'
import {
  CalculatorOutlined, ThunderboltOutlined, ExperimentOutlined, ReloadOutlined
} from '@ant-design/icons'
import { calculateApi, recordApi } from '../services/api'
import type { QuestionRecord } from '../../types'
import ReliabilityCurveChart from '../../components/ReliabilityCurveChart'

const { Title, Text, Paragraph } = Typography

export default function FormulaCalculatorPage() {
  const [arrheniusForm] = Form.useForm()
  const [iplForm] = Form.useForm()
  const [eyringForm] = Form.useForm()
  const [arrheniusResult, setArrheniusResult] = useState<any>(null)
  const [iplResult, setIplResult] = useState<any>(null)
  const [eyringResult, setEyringResult] = useState<any>(null)
  const [selectedRecords, setSelectedRecords] = useState<QuestionRecord[]>([])
  const [searchResults, setSearchResults] = useState<QuestionRecord[]>([])
  const [curveData, setCurveData] = useState<any>(null)
  const [curveLoading, setCurveLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  const searchRecords = async () => {
    try {
      const data = await recordApi.list({ limit: 50 })
      let results = data
      if (searchKeyword) {
        results = data.filter(r =>
          (r.question_id && r.question_id.includes(searchKeyword)) ||
          (r.material_name && r.material_name.includes(searchKeyword))
        )
      }
      setSearchResults(results)
    } catch {
      message.error('查询失败')
    }
  }

  const toggleRecord = (record: QuestionRecord) => {
    const exists = selectedRecords.find(r => r.id === record.id)
    if (exists) {
      setSelectedRecords(selectedRecords.filter(r => r.id !== record.id))
    } else {
      setSelectedRecords([...selectedRecords, record])
    }
  }

  const handleCalculateCurve = async () => {
    const validIds = selectedRecords.filter(r => r.lifetime_hours && r.lifetime_hours > 0).map(r => r.id)
    if (validIds.length < 2) {
      message.warning('请至少选择2条有效寿命数据的记录')
      return
    }
    setCurveLoading(true)
    try {
      const data = await calculateApi.reliabilityCurve(validIds)
      setCurveData(data)
      message.success('计算完成')
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '计算失败')
    } finally {
      setCurveLoading(false)
    }
  }

  const handleArrhenius = async (values: any) => {
    try {
      const result = await calculateApi.arrhenius(values)
      setArrheniusResult(result)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '计算失败')
    }
  }

  const handleIpl = async (values: any) => {
    try {
      const result = await calculateApi.inversePowerLaw(values)
      setIplResult(result)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '计算失败')
    }
  }

  const handleEyring = async (values: any) => {
    try {
      const result = await calculateApi.eyring(values)
      setEyringResult(result)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '计算失败')
    }
  }

  const recordColumns = [
    { title: '题目编号', dataIndex: 'question_id', width: 100 },
    { title: '材料', dataIndex: 'material_name', width: 150 },
    {
      title: '寿命',
      width: 140,
      render: (_: any, r: QuestionRecord) => (
        <Space>
          <span>{r.lifetime_hours || '-'}</span>
          <Tag color={r.has_unit_issue ? 'red' : 'default'}>{r.unit || '无'}</Tag>
        </Space>
      )
    },
    {
      title: '应力', dataIndex: 'stress_level', width: 100,
      render: (v: number) => v != null ? `${v} MPa` : '-'
    },
    {
      title: '温度', dataIndex: 'temperature', width: 100,
      render: (v: number) => v != null ? `${v} ℃` : '-'
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: string) => <Tag>{v}</Tag>
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">公式计算 - 可靠性寿命曲线（日常入口）</div>
        <div className="page-description">
          支持Weibull分布寿命曲线拟合、Arrhenius温度模型、逆幂律应力模型、Eyring耦合模型
        </div>
      </div>

      <Alert
        message="可靠性寿命曲线的日常入口"
        description="日常使用时在此处进行公式计算，月底或课前再前往「复核管理」进行批量复核。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card
        className="card-shadow"
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <CalculatorOutlined />
            <Title level={5} style={{ margin: 0 }}>Weibull 寿命曲线计算</Title>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col xs={24} lg={10}>
            <Card type="inner" title="选择数据记录" size="small">
              <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                <Input
                  placeholder="搜索题目编号或材料"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  onPressEnter={searchRecords}
                />
                <Button icon={<ReloadOutlined />} onClick={searchRecords}>查询</Button>
              </Space.Compact>

              <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 12 }}>
                <Table
                  rowKey="id"
                  size="small"
                  columns={[
                    ...recordColumns,
                    {
                      title: '操作', width: 80,
                      render: (_: any, r: QuestionRecord) => {
                        const selected = selectedRecords.find(x => x.id === r.id)
                        return (
                          <Button
                            type={selected ? 'primary' : 'default'}
                            size="small"
                            onClick={() => toggleRecord(r)}
                          >
                            {selected ? '已选' : '选择'}
                          </Button>
                        )
                      }
                    }
                  ]}
                  dataSource={searchResults}
                  pagination={false}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">已选 {selectedRecords.length} 条记录</Text>
                {selectedRecords.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {selectedRecords.map(r => (
                      <Tag key={r.id} closable onClose={() => toggleRecord(r)}>
                        {r.question_id}: {r.material_name} {r.lifetime_hours}h
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="primary"
                block
                loading={curveLoading}
                onClick={handleCalculateCurve}
                disabled={selectedRecords.length < 2}
              >
                {selectedRecords.length < 2
                  ? `请至少选择2条记录（当前${selectedRecords.length}条）`
                  : `开始计算 (${selectedRecords.length}条记录)`}
              </Button>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            {curveData ? (
              <ReliabilityCurveChart data={curveData} />
            ) : (
              <div className="empty-state" style={{ background: '#fafafa', borderRadius: 8, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>
                  <ExperimentOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                  <div><Text type="secondary">选择记录后点击计算，将在此处显示Weibull寿命曲线</Text></div>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card className="card-shadow" title={<Space><ThunderboltOutlined />Arrhenius 温度模型</Space>}>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              L = L₀ · exp[(Ea/k)(1/T - 1/T₀)]
            </Paragraph>
            <Form form={arrheniusForm} layout="vertical" size="small" onFinish={handleArrhenius}
              initialValues={{ temp_ref: 25, temp_actual: 125, activation_energy: 0.8, lifetime_ref: 100000 }}>
              <Form.Item name="lifetime_ref" label="参考寿命 L₀ (小时)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item name="activation_energy" label="激活能 Ea (eV)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.1} />
              </Form.Item>
              <Form.Item name="temp_ref" label="参考温度 T₀ (℃)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="temp_actual" label="实际温度 T (℃)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>计算</Button>
              </Form.Item>
            </Form>
            {arrheniusResult && (
              <div className="result-display">
                <Statistic title="预测寿命 (小时)" value={arrheniusResult.predicted_lifetime_hours?.toFixed(1)} />
                {arrheniusResult.acceleration_factor && (
                  <Statistic title="加速因子 AF" value={arrheniusResult.acceleration_factor?.toFixed(2)} />
                )}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="card-shadow" title={<Space><ExperimentOutlined />逆幂律模型 (IPL)</Space>}>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              L = L₀ · (S₀/S)ⁿ
            </Paragraph>
            <Form form={iplForm} layout="vertical" size="small" onFinish={handleIpl}
              initialValues={{ stress_ref: 100, stress_actual: 200, exponent: 3, lifetime_ref: 100000 }}>
              <Form.Item name="lifetime_ref" label="参考寿命 L₀ (小时)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item name="stress_ref" label="参考应力 S₀" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item name="stress_actual" label="实际应力 S" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item name="exponent" label="指数 n" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.5} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>计算</Button>
              </Form.Item>
            </Form>
            {iplResult && (
              <div className="result-display">
                <Statistic title="预测寿命 (小时)" value={iplResult.predicted_lifetime_hours?.toFixed(1)} />
                {iplResult.acceleration_factor && (
                  <Statistic title="加速因子 AF" value={iplResult.acceleration_factor?.toFixed(2)} />
                )}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="card-shadow" title={<Space><CalculatorOutlined />Eyring 耦合模型</Space>}>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              L = L₀ · (T₀/T) · exp[(Ea/k)(1/T-1/T₀)] · (S₀/S)ⁿ
            </Paragraph>
            <Form form={eyringForm} layout="vertical" size="small" onFinish={handleEyring}
              initialValues={{
                temp_ref: 25, temp_actual: 125,
                stress_ref: 100, stress_actual: 200,
                activation_energy: 0.8, exponent: 3,
                lifetime_ref: 100000
              }}>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="lifetime_ref" label="参考寿命 L₀" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="activation_energy" label="Ea (eV)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} step={0.1} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="temp_ref" label="T₀ (℃)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="temp_actual" label="T (℃)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="stress_ref" label="S₀" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="stress_actual" label="S" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="exponent" label="指数 n" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} step={0.5} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>计算</Button>
              </Form.Item>
            </Form>
            {eyringResult && (
              <div className="result-display">
                <Statistic title="预测寿命 (小时)" value={eyringResult.predicted_lifetime_hours?.toFixed(1)} />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
