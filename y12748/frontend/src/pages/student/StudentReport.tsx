import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, Tag, Button, Space, Statistic, Alert,
  Descriptions, List, Empty, Progress, Tabs, Divider, Tooltip
} from 'antd'
import {
  ArrowLeftOutlined, BookOutlined, WarningOutlined, CheckCircleOutlined,
  CloseCircleOutlined, LineChartOutlined, FileTextOutlined, ExclamationCircleOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { reportApi } from '../../services/api'
import type { Report } from '../../types'
import ReliabilityCurveChart from '../../components/ReliabilityCurveChart'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

export default function StudentReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [studentView, setStudentView] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const rid = parseInt(id)
      const [r, sv] = await Promise.all([
        reportApi.get(rid),
        reportApi.getStudentView(rid)
      ])
      setReport(r)
      setStudentView(sv)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!report || !studentView) {
    return (
      <div className="page-container">
        <div className="empty-state">加载中...</div>
      </div>
    )
  }

  const passRate = studentView.total_questions > 0
    ? Math.round((studentView.passed_count / studentView.total_questions) * 100)
    : 0

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ marginBottom: 8 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/dashboard')}>
            返回首页
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined /> 可靠性寿命曲线分析报告
          </Title>
          <Tag color="blue">学生视图</Tag>
        </Space>
        <div className="page-description">
          批次: {studentView.batch_name || '未命名批次'}
          · 生成于 {dayjs(studentView.generated_at).format('YYYY-MM-DD HH:mm')}
        </div>
      </div>

      <Alert
        message="本次处理的是眼前这批具体材料"
        description="本报告包含当前批次中的学生错题、历史答案对比和约束冲突分析，所有内容均来自投研助理的实际复核结果。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderTop: '3px solid #1677ff' }}>
            <div className="stat-label">题目总数</div>
            <div className="stat-value">{studentView.total_questions}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderTop: '3px solid #52c41a' }}>
            <div className="stat-label">已通过</div>
            <div className="stat-value" style={{ color: '#52c41a' }}>{studentView.passed_count}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderTop: '3px solid #faad14' }}>
            <div className="stat-label">待处理</div>
            <div className="stat-value" style={{ color: '#faad14' }}>{studentView.pending_count}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderTop: '3px solid #722ed1' }}>
            <div className="stat-label">通过率</div>
            <div className="stat-value" style={{ color: '#722ed1' }}>{passRate}%</div>
          </Card>
        </Col>
      </Row>

      <Card
        className="card-shadow"
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <LineChartOutlined />
            <Title level={5} style={{ margin: 0 }}>可靠性寿命曲线分析</Title>
          </Space>
        }
      >
        {studentView.reliability_curve ? (
          <ReliabilityCurveChart data={studentView.reliability_curve} />
        ) : (
          <Empty description="暂无曲线数据" />
        )}
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            className="card-shadow"
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                <Title level={5} style={{ margin: 0 }}>数据质量统计</Title>
              </Space>
            }
          >
            {studentView.summary_statistics && (
              <div>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Tooltip title="单位缺失或单位与数值混写">
                      <Card size="small" style={{ background: '#fff2e8' }}>
                        <Statistic
                          title={<Space><ExclamationCircleOutlined style={{ color: '#faad14' }} />单位缺失</Space>}
                          value={studentView.summary_statistics.unit_issues || 0}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Card>
                    </Tooltip>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#fff7e6' }}>
                      <Statistic
                        title={<Space><ExclamationCircleOutlined style={{ color: '#faad14' }} />空值字段</Space>}
                        value={studentView.summary_statistics.empty_values || 0}
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#f9f0ff' }}>
                      <Statistic
                        title={<Space><ExclamationCircleOutlined style={{ color: '#722ed1' }} />数值备注混写</Space>}
                        value={studentView.summary_statistics.mixed_remarks || 0}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#fff0f6' }}>
                      <Statistic
                        title={<Space><ExclamationCircleOutlined style={{ color: '#eb2f96' }} />约束冲突</Space>}
                        value={studentView.summary_statistics.conflicts || 0}
                        valueStyle={{ color: '#eb2f96' }}
                      />
                    </Card>
                  </Col>
                </Row>
                <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
                  注：投研助理在复核时已对上述问题进行人工修正，所有修改均留痕可追溯。
                </Paragraph>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className="card-shadow"
            title={
              <Space>
                <BookOutlined style={{ color: '#1677ff' }} />
                <Title level={5} style={{ margin: 0 }}>学习进度总览</Title>
              </Space>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Text>整体完成度</Text>
              </div>
              <Progress percent={passRate} status={passRate >= 80 ? 'success' : passRate >= 60 ? 'active' : 'exception'} />
            </div>
            <Divider />
            <Descriptions column={1} size="small">
              <Descriptions.Item label="已通过题目">
                <Tag color="green">{studentView.passed_count}</Tag> 题
              </Descriptions.Item>
              <Descriptions.Item label="待处理题目">
                <Tag color="orange">{studentView.pending_count}</Tag> 题
              </Descriptions.Item>
              <Descriptions.Item label="需关注的错题">
                <Tag color="red">{(studentView.wrong_answers || []).length}</Tag> 题
              </Descriptions.Item>
              <Descriptions.Item label="存在约束冲突">
                <Tag color="magenta">{(studentView.conflicts || []).length}</Tag> 题
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card
        className="card-shadow"
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <Title level={5} style={{ margin: 0 }}>典型错题分析</Title>
            <Tag color="red">重点学习</Tag>
          </Space>
        }
      >
        {(studentView.wrong_answers && studentView.wrong_answers.length > 0) ? (
          <List
            dataSource={studentView.wrong_answers}
            renderItem={(item: any, idx: number) => (
              <List.Item key={idx}>
                <Card type="inner" size="small" style={{ width: '100%' }}
                  title={<Space><Tag color="red">错题 #{idx + 1}</Tag>{item.question_id}</Space>}>
                  <Paragraph style={{ marginBottom: 12 }}>{item.question_content}</Paragraph>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <div style={{ background: '#fff1f0', padding: 12, borderRadius: 4, border: '1px solid #ffa39e' }}>
                        <Text type="danger" style={{ fontWeight: 500 }}>学生答案:</Text>
                        <div style={{ marginTop: 4 }}>{item.student_answer || '-'}</div>
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div style={{ background: '#f6ffed', padding: 12, borderRadius: 4, border: '1px solid #b7eb8f' }}>
                        <Text type="success" style={{ fontWeight: 500 }}>正确答案:</Text>
                        <div style={{ marginTop: 4 }}>{item.correct_answer || '-'}</div>
                      </div>
                    </Col>
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <Space>
                      <Tag>材料: {item.material_name || '-'}</Tag>
                      <Tag color="blue">寿命: {item.lifetime_hours || '-'} {item.unit || ''}</Tag>
                    </Space>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无错题记录，做得很好！" />
        )}
      </Card>

      <Card
        className="card-shadow"
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <WarningOutlined style={{ color: '#eb2f96' }} />
            <Title level={5} style={{ margin: 0 }}>约束冲突与边界案例</Title>
            <Tag color="magenta">课堂讨论</Tag>
          </Space>
        }
      >
        {(studentView.conflicts && studentView.conflicts.length > 0) ? (
          <List
            dataSource={studentView.conflicts}
            renderItem={(item: any, idx: number) => (
              <List.Item key={idx}>
                <Card type="inner" size="small" style={{ width: '100%', background: '#fff0f6', border: '1px solid #ffadd2' }}
                  title={<Space><Tag color="magenta">冲突案例 #{idx + 1}</Tag>{item.question_id}</Space>}>
                  <Alert
                    message="冲突说明"
                    description={item.conflict_detail || '数据存在不一致'}
                    type="error"
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                  <Paragraph style={{ marginBottom: 12 }}>{item.question_content}</Paragraph>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <div style={{ background: '#fff1f0', padding: 12, borderRadius: 4 }}>
                        <Text type="danger" style={{ fontWeight: 500 }}>学生答案:</Text>
                        <div style={{ marginTop: 4 }}>{item.student_answer || '-'}</div>
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div style={{ background: '#f6ffed', padding: 12, borderRadius: 4 }}>
                        <Text type="success" style={{ fontWeight: 500 }}>参考正确答案:</Text>
                        <div style={{ marginTop: 4 }}>{item.correct_answer || '-'}</div>
                      </div>
                    </Col>
                  </Row>
                  <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
                    思考：如何处理约束条件互相冲突的情况？投研助理在复核时已记录解决方案，可查阅完整修正历史。
                  </Paragraph>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无约束冲突案例" />
        )}
      </Card>

      <Card
        className="card-shadow"
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Title level={5} style={{ margin: 0 }}>已通过参考答案示例</Title>
          </Space>
        }
      >
        {(studentView.passed_examples && studentView.passed_examples.length > 0) ? (
          <List
            grid={{ gutter: 16, column: 2, xs: 1, sm: 2, md: 2, lg: 3 }}
            dataSource={studentView.passed_examples}
            renderItem={(item: any, idx: number) => (
              <List.Item>
                <Card size="small" style={{ background: '#f6ffed' }}>
                  <Space direction="vertical" size={4}>
                    <Tag color="green">{item.question_id}</Tag>
                    <Text strong>材料: {item.material_name}</Text>
                    <Text type="secondary">
                      应力: {item.stress_level} MPa · 温度: {item.temperature} ℃
                    </Text>
                    <Text type="secondary">
                      寿命: {item.lifetime_hours} 小时
                    </Text>
                    <div>
                      <Tag color="blue">参考答案</Tag>
                      <Text>{item.correct_answer}</Text>
                    </div>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无示例" />
        )}
      </Card>
    </div>
  )
}
