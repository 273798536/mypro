import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, DatePicker, Button, Space, Table, Tag, message, Alert, Divider } from 'antd'
import { FileSearchOutlined, DownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { reportsApi } from '../api'
import { StatusTag } from '../utils.jsx'

const { MonthPicker } = DatePicker

export default function Reports() {
  const [period, setPeriod] = useState(dayjs())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadReport() }, [period])

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await reportsApi.monthly({ year: period.year(), month: period.month() + 1 })
      setReport(res.data)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally { setLoading(false) }
  }

  const s = report?.summary || {}
  const locColumns = [
    { title: '地点编号', dataIndex: 'code', render: t => <Tag color="blue">{t}</Tag> },
    { title: '名称', dataIndex: 'name', render: (t, r) => <div>{t}<div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.area}/{r.building}/{r.floor}</div></div> },
    { title: '记录数', dataIndex: 'record_count', width: 80, render: t => <b>{t}</b> },
    { title: '虫数总计', dataIndex: 'insect_count', width: 100, render: t => <b style={{ color: t > 0 ? '#cf1322' : '#389e0d' }}>{t || 0}</b> },
    { title: '分布', key: 'dist', width: 220,
      render: (_, r) => <Space size={4}>
        <StatusTag status="normal" />{r.normal_count || 0}
        <StatusTag status="boundary" />{r.boundary_count || 0}
        <StatusTag status="bad" />{r.bad_count || 0}
      </Space> },
  ]

  const batchColumns = [
    { title: '批次号', dataIndex: 'batch_no', render: (t, r) => <Space><b>{t}</b>{r.has_batch_effect ? <Tag color="purple">批次效应</Tag> : null}</Space> },
    { title: '日期', dataIndex: 'trap_date', width: 120 },
    { title: '操作员', dataIndex: 'operator', width: 100 },
    { title: '记录数', dataIndex: 'record_count', width: 80 },
    { title: '虫数', dataIndex: 'insect_count', width: 80, render: t => <b style={{ color: t > 0 ? '#cf1322' : '#389e0d' }}>{t || 0}</b> },
    { title: '分布', key: 'dist', render: (_, r) => <Space size={4}>
      <StatusTag status="normal" />{r.normal_count || 0}
      <StatusTag status="boundary" />{r.boundary_count || 0}
      <StatusTag status="bad" />{r.bad_count || 0}
    </Space> },
    { title: '批次效应说明', dataIndex: 'batch_effect_note', ellipsis: true, render: t => t || '-' },
  ]

  const recColumns = [
    { title: '记录号', dataIndex: 'record_no', width: 120, render: t => <b>{t}</b> },
    { title: '批次号', dataIndex: 'batch_no', width: 180 },
    { title: '日期', dataIndex: 'trap_date', width: 110 },
    { title: '地点', dataIndex: 'location_name', width: 180,
      render: (t, r) => <div><Tag>{r.location_code}</Tag> {t}</div> },
    { title: '虫数', dataIndex: 'insect_count', width: 70, render: t => <b style={{ color: t > 0 ? '#cf1322' : '#389e0d' }}>{t}</b> },
    { title: '种类', dataIndex: 'insect_types', render: t => t || '-' },
    { title: '状态', dataIndex: 'sample_status', width: 100, render: s => <StatusTag status={s} /> },
    { title: '最终结论', dataIndex: 'conclusion', ellipsis: true },
  ]

  return (
    <div>
      <Alert style={{ marginBottom: 16 }} type="info" showIcon
        message="月底或课前使用：这里可以按月查看汇总、按地点/按批次统计，并导出CSV报告给上级或教学使用。" />

      <Card title={<span><FileSearchOutlined /> 月度汇总报告</span>}
        extra={<Space>
          <MonthPicker value={period} onChange={setPeriod} format="YYYY年MM月" />
          <Button onClick={loadReport} loading={loading}>重新生成</Button>
          <Button type="primary" icon={<DownloadOutlined />}
            onClick={() => reportsApi.exportCsv({ dateFrom: report?.period?.dateFrom, dateTo: report?.period?.dateTo })}>
            导出CSV
          </Button>
        </Space>}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card loading={loading}><Statistic title={`${report?.period?.year}年${report?.period?.month}月 记录总数`} value={s.total_records} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading}><Statistic title="涉及批次数" value={s.total_batches} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading}><Statistic title="涉及地点数" value={s.total_locations} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading}><Statistic title="昆虫总数量" value={s.total_insect_count || 0} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading} className="stat-card-normal"><Statistic title={<span><CheckCircleOutlined /> 正常样本</span>} value={s.normal_count || 0} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading} className="stat-card-boundary"><Statistic title={<span><ExclamationCircleOutlined /> 边界样本</span>} value={s.boundary_count || 0} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading} className="stat-card-bad"><Statistic title={<span><CloseCircleOutlined /> 异常样本</span>} value={s.bad_count || 0} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading} className="stat-card-pending"><Statistic title={<span><ClockCircleOutlined /> 待复核</span>} value={s.pending_count || 0} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading}><Statistic title="重复导入标记数" value={s.duplicate_count || 0} /></Card></Col>
          <Col xs={12} sm={6}><Card loading={loading}><Statistic title="平均质量评分" value={s.avg_quality_score ? Number(s.avg_quality_score).toFixed(1) : '-'} suffix="分" /></Card></Col>
        </Row>

        <Divider orientation="left">按采样地点统计</Divider>
        <Table size="small" rowKey="id" columns={locColumns} dataSource={report?.byLocation || []} pagination={false} loading={loading} />

        <Divider orientation="left">按批次统计</Divider>
        <Table size="small" rowKey="id" columns={batchColumns} dataSource={report?.byBatch || []} pagination={false} loading={loading} />

        <Divider orientation="left">明细记录（样本清单，可点回记录详情）</Divider>
        <Table size="small" rowKey="id" columns={recColumns} dataSource={report?.records || []} loading={loading}
          onRow={r => ({ style: { cursor: 'pointer' } })}
          scroll={{ x: 1200 }} />
      </Card>
    </div>
  )
}
