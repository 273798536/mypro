import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Table, Card, DatePicker, Button, Tag, Space, Modal, 
  message, Descriptions, Row, Col, Statistic
} from 'antd'
import { 
  DownloadOutlined, PlusOutlined, BarChartOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import { reportsAPI, rulesAPI } from '../api/client'
import dayjs from 'dayjs'

function ReportsPage() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [exportModal, setExportModal] = useState(false)
  const [compareModal, setCompareModal] = useState(false)
  const [selectedReports, setSelectedReports] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const queryClient = useQueryClient()

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', pagination.current, pagination.pageSize],
    queryFn: () => reportsAPI.list({
      page: pagination.current,
      pageSize: pagination.pageSize
    })
  })

  const { data: rules } = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesAPI.list()
  })

  const exportMutation = useMutation({
    mutationFn: (data) => reportsAPI.export(data),
    onSuccess: (result) => {
      message.success(`报表导出成功！共 ${result.totalRecords} 条记录`)
      setExportModal(false)
      queryClient.invalidateQueries(['reports'])
    }
  })

  const columns = [
    {
      title: '报表月份',
      dataIndex: 'report_month',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '报表类型',
      dataIndex: 'report_type',
      width: 120,
      render: (type) => type === 'deferral' ? '递延报表' : type
    },
    {
      title: '规则版本',
      dataIndex: 'rule_version',
      width: 120,
      render: (v) => <Tag color="purple">{v}</Tag>
    },
    {
      title: '记录数',
      dataIndex: 'total_records',
      width: 100
    },
    {
      title: '递延总额',
      dataIndex: 'total_deferred_amount',
      width: 120,
      render: (v) => <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{v?.toLocaleString()}</span>
    },
    {
      title: '确认收入总额',
      dataIndex: 'total_recognized_amount',
      width: 140,
      render: (v) => <span style={{ color: '#3f8600', fontWeight: 'bold' }}>¥{v?.toLocaleString()}</span>
    },
    {
      title: '导出人',
      dataIndex: 'exported_by',
      width: 100
    },
    {
      title: '导出时间',
      dataIndex: 'created_at',
      width: 180
    },
    {
      title: '状态',
      dataIndex: 'export_status',
      width: 100,
      render: (s) => s === 'completed' ? 
        <Tag color="green">已完成</Tag> : <Tag color="orange">{s}</Tag>
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={() => reportsAPI.download(record.id)}
          >
            下载
          </Button>
        </Space>
      )
    }
  ]

  const handleCompare = () => {
    if (selectedReports.length !== 2) {
      message.warning('请选择两个报表进行对比')
      return
    }
    reportsAPI.compare(selectedReports[0], selectedReports[1]).then(result => {
      setCompareResult(result)
      setCompareModal(true)
    })
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setExportModal(true)}
            >
              导出报表
            </Button>
            <Button 
              icon={<BarChartOutlined />}
              disabled={selectedReports.length !== 2}
              onClick={handleCompare}
            >
              对比报表 ({selectedReports.length}/2)
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={reports?.data || []}
          loading={isLoading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedReports,
            onChange: (keys) => setSelectedReports(keys),
            type: 'checkbox'
          }}
          pagination={{
            ...pagination,
            total: reports?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(p) => setPagination(p)}
        />
      </Card>

      <Modal
        title="导出递延报表"
        open={exportModal}
        onCancel={() => setExportModal(false)}
        onOk={() => {
          const month = dayjs().format('YYYY-MM')
          exportMutation.mutate({
            reportMonth: month,
            reportType: 'deferral',
            ruleVersionId: 1,
            exportedBy: 'admin'
          })
        }}
        confirmLoading={exportMutation.isLoading}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <FileExcelOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          <p style={{ marginTop: 16, fontSize: 16 }}>
            将导出当前月份的递延报表
          </p>
          <p style={{ color: '#666' }}>
            报表月份：{dayjs().format('YYYY-MM')}
          </p>
        </div>
      </Modal>

      <Modal
        title="报表对比"
        open={compareModal}
        width={800}
        onCancel={() => {
          setCompareModal(false)
          setCompareResult(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setCompareModal(false)
            setCompareResult(null)
          }}>
            关闭
          </Button>
        ]}
      >
        {compareResult && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card title="报表1" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="月份">
                      {compareResult.report1.report_month}
                    </Descriptions.Item>
                    <Descriptions.Item label="规则版本">
                      {compareResult.report1.ruleVersion?.version}
                    </Descriptions.Item>
                    <Descriptions.Item label="递延总额">
                      ¥{compareResult.report1.total_deferred_amount?.toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="确认收入">
                      ¥{compareResult.report1.total_recognized_amount?.toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="报表2" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="月份">
                      {compareResult.report2.report_month}
                    </Descriptions.Item>
                    <Descriptions.Item label="规则版本">
                      {compareResult.report2.ruleVersion?.version}
                    </Descriptions.Item>
                    <Descriptions.Item label="递延总额">
                      ¥{compareResult.report2.total_deferred_amount?.toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="确认收入">
                      ¥{compareResult.report2.total_recognized_amount?.toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>

            <Card title="差异对比" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title="递延金额差异" 
                    value={compareResult.difference.totalDeferred}
                    prefix="¥"
                    valueStyle={{ 
                      color: compareResult.difference.totalDeferred > 0 ? '#cf1322' : '#3f8600' 
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="确认收入差异" 
                    value={compareResult.difference.totalRecognized}
                    prefix="¥"
                    valueStyle={{ 
                      color: compareResult.difference.totalRecognized > 0 ? '#3f8600' : '#cf1322' 
                    }}
                  />
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReportsPage
