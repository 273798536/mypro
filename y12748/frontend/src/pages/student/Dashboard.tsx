import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, List, Tag, Button, Space, Statistic, Empty, Alert, Tooltip
} from 'antd'
import {
  FileTextOutlined, CheckCircleOutlined, WarningOutlined, DashboardOutlined,
  TeamOutlined, EyeOutlined, BookOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { reportApi, systemApi, batchApi } from '../../services/api'
import type { Report } from '../../types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isFirstRun, setIsFirstRun] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [r, s, chk] = await Promise.all([
        reportApi.list({ report_type: 'student', limit: 20 }),
        systemApi.stats(),
        systemApi.firstRunCheck()
      ])
      setReports(r)
      setStats(s)
      setIsFirstRun(chk.is_first_run)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <Space>
            <TeamOutlined />
            学生学习中心
          </Space>
        </div>
        <div className="page-description">
          查看可靠性寿命曲线分析报告，理解材料寿命特性与常见错误
        </div>
      </div>

      {isFirstRun && (
        <Alert
          message="示例数据已准备"
          description="系统首次打开时已自动加载示例数据，包含学生错题、历史答案和约束冲突等典型案例，无需先造表即可学习。"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Alert
        message="学习提示"
        description="点击下方报告卡片查看详细的可靠性寿命曲线分析。报告中包含当前批次具体材料的处理结果，以及常见错题分析。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #1677ff' }}>
            <div className="stat-label">可用报告</div>
            <div className="stat-value">{reports.length}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #52c41a' }}>
            <div className="stat-label">已通过记录</div>
            <div className="stat-value">{stats?.passed_records || 0}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #faad14' }}>
            <div className="stat-label">待学习记录</div>
            <div className="stat-value">{stats?.pending_records || 0}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #722ed1' }}>
            <div className="stat-label">数据批次</div>
            <div className="stat-value">{stats?.total_batches || 0}</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card
            className="card-shadow"
            title={
              <Space>
                <FileTextOutlined />
                <Title level={5} style={{ margin: 0 }}>学习报告列表</Title>
              </Space>
            }
          >
            {reports.length === 0 ? (
              <Empty
                description={
                  <div>
                    <BookOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                    <div>暂无学生报告</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                      请等待投研助理完成复核并生成报告
                    </div>
                  </div>
                }
              />
            ) : (
              <List
                dataSource={reports}
                renderItem={(report) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/student/reports/${report.id}`)}
                      >
                        查看报告
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span style={{ fontWeight: 500 }}>
                            可靠性寿命曲线报告 #{report.id}
                          </span>
                          <Tag color="blue">学生报告</Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Space split={<Text type="secondary">|</Text>}>
                            <Text type="secondary">
                              生成时间: {dayjs(report.generated_at).format('YYYY-MM-DD HH:mm')}
                            </Text>
                            <Text type="secondary">
                              生成者: {report.generated_by}
                            </Text>
                          </Space>
                          {report.summary && (
                            <Space>
                              <Tag icon={<CheckCircleOutlined />} color="green">
                                通过: {report.summary.by_status?.passed || 0}
                              </Tag>
                              <Tag icon={<WarningOutlined />} color="orange">
                                待处理: {report.summary.by_status?.pending || 0}
                              </Tag>
                              <Tooltip title="本报告包含学生错题、历史答案和约束冲突分析">
                                <Tag color="purple">典型案例学习</Tag>
                              </Tooltip>
                            </Space>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="card-shadow" title={<Space><DashboardOutlined /><Title level={5} style={{ margin: 0 }}>学习指南</Title></Space>}>
            <Paragraph>
              <Text strong>本次处理的是眼前这批具体材料：</Text>
            </Paragraph>
            <ul style={{ paddingLeft: 20, color: '#595959' }}>
              <li>查看报告中的<b style={{ color: '#d46b08' }}>学生错题</b>部分，理解常见错误</li>
              <li>对比<b style={{ color: '#722ed1' }}>历史答案</b>，了解答案演变过程</li>
              <li>分析<b style={{ color: '#eb2f96' }}>约束冲突</b>案例，学习边界条件处理</li>
              <li>通过<b style={{ color: '#1677ff' }}>可靠性寿命曲线</b>直观理解材料寿命分布</li>
              <li>关注<b style={{ color: '#faad14' }}>数据质量问题</b>（单位缺失、空值等）</li>
            </ul>
            <Divider />
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              所有报告均来自投研助理的实际复核结果，包含完整的修正留痕和状态推进记录。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

import { Divider } from 'antd'
