import { useEffect, useState } from 'react'
import {
  Card,
  Select,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Divider,
  Descriptions,
  Alert,
  Typography,
  Badge,
} from 'antd'
import { SwapOutlined, ArrowUpOutlined, ArrowDownOutlined, BarChartOutlined } from '@ant-design/icons'
import api from '../api'
import type { AlgorithmVersion, VersionCompareResult } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { Title, Text } = Typography

function Versions() {
  const [versions, setVersions] = useState<AlgorithmVersion[]>([])
  const [oldVersionId, setOldVersionId] = useState<number | null>(null)
  const [newVersionId, setNewVersionId] = useState<number | null>(null)
  const [compareResult, setCompareResult] = useState<VersionCompareResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    try {
      const res = await api.get('/versions/') as AlgorithmVersion[]
      setVersions(res)
      if (res.length >= 2) {
        setOldVersionId(res[res.length - 2].id)
        setNewVersionId(res[res.length - 1].id)
      } else if (res.length === 1) {
        setNewVersionId(res[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    }
  }

  const handleCompare = async () => {
    if (!oldVersionId || !newVersionId) return
    setLoading(true)
    try {
      const res = await api.get(`/versions/${newVersionId}/compare/${oldVersionId}`) as VersionCompareResult
      setCompareResult(res)
    } catch (error) {
      console.error('Failed to compare versions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (oldVersionId && newVersionId && oldVersionId !== newVersionId) {
      handleCompare()
    }
  }, [oldVersionId, newVersionId])

  const diffColumns = [
    {
      title: '样本ID',
      dataIndex: 'sample_id',
      key: 'sample_id',
      width: 100,
    },
    {
      title: '查询内容',
      dataIndex: 'sample_query',
      key: 'sample_query',
      ellipsis: true,
    },
    {
      title: '旧版结果',
      key: 'old_result',
      width: 120,
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Tag color={record.old_pass ? 'green' : 'red'}>
            {record.old_pass ? '通过' : '未通过'}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            分数: {record.old_score}
          </Text>
          {record.old_is_repeat && <Badge status="warning" text="重复评测" />}
        </Space>
      ),
    },
    {
      title: '新版结果',
      key: 'new_result',
      width: 120,
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Tag color={record.new_pass ? 'green' : 'red'}>
            {record.new_pass ? '通过' : '未通过'}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            分数: {record.new_score}
          </Text>
          {record.new_is_repeat && <Badge status="warning" text="重复评测" />}
        </Space>
      ),
    },
    {
      title: '变化',
      key: 'change',
      width: 100,
      render: (_: any, record: any) => {
        if (record.new_pass && !record.old_pass) {
          return <Tag color="green" icon={<ArrowUpOutlined />}>通过率提升</Tag>
        }
        if (!record.new_pass && record.old_pass) {
          return <Tag color="red" icon={<ArrowDownOutlined />}>通过率下降</Tag>
        }
        return <Tag>无变化</Tag>
      },
    },
  ]

  const renderThresholdDiff = () => {
    if (!compareResult) return null
    const { old: oldConfig, new: newConfig } = compareResult.threshold_diff

    const keys = Array.from(new Set([...Object.keys(oldConfig || {}), ...Object.keys(newConfig || {})]))

    return (
      <Descriptions column={1} size="small" bordered>
        {keys.map((key) => {
          const oldVal = oldConfig?.[key]
          const newVal = newConfig?.[key]
          const changed = oldVal !== newVal

          return (
            <Descriptions.Item
              key={key}
              label={
                <Space>
                  <span>{key}</span>
                  {changed && <Tag color="orange">已变更</Tag>}
                </Space>
              }
            >
              <Space>
                <Text delete type={changed ? 'danger' : 'secondary'}>
                  {JSON.stringify(oldVal)}
                </Text>
                <Text type="secondary">→</Text>
                <Text strong={changed}>
                  {JSON.stringify(newVal)}
                </Text>
              </Space>
            </Descriptions.Item>
          )
        })}
      </Descriptions>
    )
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>版本对比</Title>
      <Text type="secondary">对比不同版本的阈值配置、评测结果和人工修正变化</Text>

      <Card style={{ marginTop: 16 }}>
        <Space wrap>
          <span>旧版本：</span>
          <Select
            value={oldVersionId}
            onChange={setOldVersionId}
            style={{ width: 200 }}
            placeholder="选择旧版本"
          >
            {versions.map((v) => (
              <Option key={v.id} value={v.id}>
                {v.version} {v.is_active && '(当前)'}
              </Option>
            ))}
          </Select>

          <SwapOutlined style={{ color: '#999' }} />

          <span>新版本：</span>
          <Select
            value={newVersionId}
            onChange={setNewVersionId}
            style={{ width: 200 }}
            placeholder="选择新版本"
          >
            {versions.map((v) => (
              <Option key={v.id} value={v.id}>
                {v.version} {v.is_active && '(当前)'}
              </Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={handleCompare}
            disabled={!oldVersionId || !newVersionId || oldVersionId === newVersionId}
          >
            开始对比
          </Button>
        </Space>
      </Card>

      {oldVersionId === newVersionId && oldVersionId !== null && (
        <Alert
          type="warning"
          message="请选择两个不同的版本进行对比"
          style={{ marginTop: 16 }}
        />
      )}

      {compareResult && (
        <>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Card className="stats-card">
                <Statistic title="对比样本总数" value={compareResult.total_samples} />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stats-card">
                <Statistic title="结果一致" value={compareResult.same_count} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stats-card">
                <Statistic
                  title="通过率提升"
                  value={compareResult.pass_increase}
                  prefix={<ArrowUpOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stats-card">
                <Statistic
                  title="通过率下降"
                  value={compareResult.pass_decrease}
                  prefix={<ArrowDownOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="阈值配置对比">
                {renderThresholdDiff()}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="人工修正统计">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label={`${compareResult.version_old.version} 修正数`}>
                    {compareResult.correction_stats.old_count} 条
                  </Descriptions.Item>
                  <Descriptions.Item label={`${compareResult.version_new.version} 修正数`}>
                    {compareResult.correction_stats.new_count} 条
                  </Descriptions.Item>
                  <Descriptions.Item label="变化">
                    <Tag color={compareResult.correction_stats.increase > 0 ? 'orange' : 'green'}>
                      {compareResult.correction_stats.increase > 0 ? '+' : ''}
                      {compareResult.correction_stats.increase} 条
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientation="left" plain>版本信息</Divider>
                <Space direction="vertical" size="small">
                  <div>
                    <Text strong>旧版：</Text>
                    <Tag>{compareResult.version_old.version}</Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {dayjs(compareResult.version_old.created_at).format('YYYY-MM-DD')}
                    </Text>
                  </div>
                  <div>
                    <Text strong>新版：</Text>
                    <Tag color="blue">{compareResult.version_new.version}</Tag>
                    {compareResult.version_new.is_active && <Tag color="green">当前版本</Tag>}
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {dayjs(compareResult.version_new.created_at).format('YYYY-MM-DD')}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          <Card
            title={`差异样本详情 (${compareResult.sample_diffs.length} 条)`}
            style={{ marginTop: 16 }}
            extra={
              <Text type="secondary">
                重复评测样本已标记，不计入正常通过统计
              </Text>
            }
          >
            <Table
              loading={loading}
              columns={diffColumns}
              dataSource={compareResult.sample_diffs}
              rowKey="sample_id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}
    </div>
  )
}

export default Versions
