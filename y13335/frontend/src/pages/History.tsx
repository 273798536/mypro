import { useEffect, useState } from 'react'
import {
  Table,
  Select,
  Space,
  Button,
  Card,
  Tag,
  Input,
  Descriptions,
  Drawer,
  Typography,
  Badge,
} from 'antd'
import { SearchOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons'
import api from '../api'
import type { ReviewHistory } from '../types'
import type { PaginatedResponse } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { Title, Text } = Typography

function History() {
  const [histories, setHistories] = useState<ReviewHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [actionType, setActionType] = useState<string | undefined>()
  const [operator, setOperator] = useState('')

  const [detailVisible, setDetailVisible] = useState(false)
  const [currentItem, setCurrentItem] = useState<ReviewHistory | null>(null)

  useEffect(() => {
    fetchHistories()
  }, [page, pageSize, actionType, operator])

  const fetchHistories = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (actionType) params.action_type = actionType
      if (operator) params.operator = operator

      const res = await api.get('/history/', { params }) as PaginatedResponse<ReviewHistory>
      setHistories(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchHistories()
  }

  const viewDetail = (item: ReviewHistory) => {
    setCurrentItem(item)
    setDetailVisible(true)
  }

  const getActionTypeInfo = (type: string) => {
    const map: Record<string, { text: string; color: string; icon?: string }> = {
      correction_created: { text: '修正录入', color: 'blue' },
      correction_updated: { text: '修正更新', color: 'geekblue' },
      version_compare: { text: '版本对比', color: 'purple' },
      correction_confirmed: { text: '修正确认', color: 'green' },
      review_note_added: { text: '复核备注', color: 'orange' },
      sample_created: { text: '样本新增', color: 'cyan' },
      sample_updated: { text: '样本更新', color: 'cyan' },
    }
    return map[type] || { text: type, color: 'default' }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '样本ID',
      dataIndex: 'sample_id',
      key: 'sample_id',
      width: 100,
    },
    {
      title: '操作类型',
      dataIndex: 'action_type',
      key: 'action_type',
      width: 120,
      render: (type: string) => {
        const info = getActionTypeInfo(type)
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
      render: (op: string) => op || '未知',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: ReviewHistory) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        <HistoryOutlined style={{ marginRight: 8 }} />
        复核历史
      </Title>
      <Text type="secondary">
        所有操作留痕，人工确认前后的变化均记录在案，月底封账复盘时可追溯
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="操作类型"
            value={actionType}
            onChange={setActionType}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="correction_created">修正录入</Option>
            <Option value="correction_updated">修正更新</Option>
            <Option value="version_compare">版本对比</Option>
            <Option value="correction_confirmed">修正确认</Option>
            <Option value="review_note_added">复核备注</Option>
          </Select>
          <Input
            placeholder="操作人"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            style={{ width: 160 }}
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>

        <Table
          loading={loading}
          columns={columns}
          dataSource={histories}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <Drawer
        title="历史记录详情"
        width={480}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        destroyOnClose
      >
        {currentItem && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={1} bordered size="small">
              <Descriptions.Item label="样本ID">
                {currentItem.sample_id}
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                <Tag color={getActionTypeInfo(currentItem.action_type).color}>
                  {getActionTypeInfo(currentItem.action_type).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {currentItem.operator || '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {currentItem.remark || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="操作时间">
                {dayjs(currentItem.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>变更前数据：</Text>
              <pre
                style={{
                  background: '#fdf2f0',
                  padding: 12,
                  borderRadius: 4,
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {Object.keys(currentItem.before_data || {}).length
                  ? JSON.stringify(currentItem.before_data, null, 2)
                  : '（无）'}
              </pre>
            </div>

            <div>
              <Text strong>变更后数据：</Text>
              <pre
                style={{
                  background: '#f0fff4',
                  padding: 12,
                  borderRadius: 4,
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {Object.keys(currentItem.after_data || {}).length
                  ? JSON.stringify(currentItem.after_data, null, 2)
                  : '（无）'}
              </pre>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  )
}

export default History
