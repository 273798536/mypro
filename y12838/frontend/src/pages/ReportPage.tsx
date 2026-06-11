import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Select, Table, Tag, Button, Space,
  Progress, Descriptions, Modal, Form, Input, message, Drawer,
  Image, Badge, Alert
} from 'antd';
import {
  DownloadOutlined, BarChartOutlined, FileExcelOutlined,
  ExclamationCircleOutlined, EyeOutlined, EditOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import {
  Sample, activityLevelLabels, activityLevelColors,
  reviewStatusLabels, reviewStatusColors, MicroscopeImage
} from '../types';
import { reportApi, sampleApi, imageApi } from '../api';

export default function ReportPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sampleDrawer, setSampleDrawer] = useState(false);
  const [currentSample, setCurrentSample] = useState<Sample | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    sampleApi.batches().then(setBatches);
    reportApi.dashboard().then(setDashboard);
  }, []);

  useEffect(() => {
    if (selectedBatch) loadReport(selectedBatch);
  }, [selectedBatch]);

  const loadReport = async (batch: string) => {
    setLoading(true);
    try {
      const data = await reportApi.getData(batch);
      setReportData(data);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedBatch) return;
    try {
      const res = await reportApi.export(selectedBatch);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `菌种活性报告_${selectedBatch}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('报告已导出');
    } catch (e: any) {
      message.error('导出失败');
    }
  };

  const openSampleDetail = async (sample: Sample) => {
    const detail = await sampleApi.get(sample.id);
    setCurrentSample(detail);
    setSampleDrawer(true);
  };

  const openEdit = (sample: Sample) => {
    setCurrentSample(sample);
    editForm.setFieldsValue({
      activity_level: sample.activity_level,
      conclusion: sample.conclusion,
      sequencing_result: sample.sequencing_result,
      source_note: sample.source_note,
      review_status: sample.review_status,
      reviewer: sample.reviewer
    });
    setEditModalOpen(true);
  };

  const handleSaveSample = async () => {
    try {
      const values = await editForm.validateFields();
      await sampleApi.update(currentSample!.id, values);
      message.success('已保存');
      setEditModalOpen(false);
      loadReport(selectedBatch!);
    } catch {}
  };

  const getActivityChart = () => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}: {c} ({d}%)' },
      data: [
        { name: activityLevelLabels.high, value: reportData?.stats?.high || 0, itemStyle: { color: activityLevelColors.high } },
        { name: activityLevelLabels.medium, value: reportData?.stats?.medium || 0, itemStyle: { color: activityLevelColors.medium } },
        { name: activityLevelLabels.low, value: reportData?.stats?.low || 0, itemStyle: { color: activityLevelColors.low } },
        { name: activityLevelLabels.inactive, value: reportData?.stats?.inactive || 0, itemStyle: { color: activityLevelColors.inactive } },
        { name: '未评级', value: (reportData?.stats?.total || 0) - (reportData?.stats?.high || 0) - (reportData?.stats?.medium || 0) - (reportData?.stats?.low || 0) - (reportData?.stats?.inactive || 0), itemStyle: { color: '#d9d9d9' } }
      ]
    }]
  });

  const getReviewChart = () => ({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      label: { show: true, formatter: '{b}\n{c} ({d}%)' },
      data: [
        { name: reviewStatusLabels.reviewed, value: reportData?.stats?.reviewed || 0, itemStyle: { color: reviewStatusColors.reviewed } },
        { name: reviewStatusLabels.pending, value: reportData?.stats?.pending || 0, itemStyle: { color: reviewStatusColors.pending } },
        { name: reviewStatusLabels.conflict, value: reportData?.stats?.conflict || 0, itemStyle: { color: reviewStatusColors.conflict } }
      ]
    }]
  });

  const getStrainChart = () => {
    const data = reportData?.strain_distribution || [];
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.map((d: any) => d.strain_name) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.map((d: any) => d.count), itemStyle: { color: '#1677ff' }, label: { show: true, position: 'top' } }]
    };
  };

  const columns: ColumnsType<Sample> = [
    { title: '原始行号', dataIndex: 'original_row', width: 80, fixed: 'left', render: v => <Tag color="default">R{v}</Tag> },
    { title: '试剂批号', dataIndex: 'reagent_batch', width: 120 },
    { title: '样本编号', dataIndex: 'sample_no', width: 100, render: (t, r) => <Button type="link" onClick={() => openSampleDetail(r)}>{t}</Button> },
    { title: '菌种名称', dataIndex: 'strain_name', width: 140 },
    {
      title: '活性等级', dataIndex: 'activity_level', width: 100,
      render: v => v ? <Tag color={activityLevelColors[v]}>{activityLevelLabels[v]}</Tag> : <span style={{ color: '#999' }}>-</span>
    },
    {
      title: '复核状态', dataIndex: 'review_status', width: 100,
      render: v => <Tag color={reviewStatusColors[v]}>
        {v === 'conflict' && <ExclamationCircleOutlined />} {reviewStatusLabels[v]}
      </Tag>
    },
    { title: '测序结果', dataIndex: 'sequencing_result', width: 140, ellipsis: true },
    { title: '结论', dataIndex: 'conclusion', width: 160, ellipsis: true },
    {
      title: '关联图片', width: 100,
      render: (_, r) => r.image_count ? <Badge count={r.image_count}><EyeOutlined /></Badge> : <span style={{ color: '#999' }}>-</span>
    },
    {
      title: '来源追溯', width: 220,
      render: (_, r) => (
        <div className="trace-info" style={{ margin: 0, padding: '4px 8px' }}>
          <span>文件: <code style={{ fontSize: 11 }}>{r.source_file}</code></span>
          <span>批次: <code style={{ fontSize: 11 }}>{r.import_batch.slice(0, 8)}</code></span>
        </div>
      )
    },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openSampleDetail(r)}>详情</Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-card">
        <div className="page-header">
          <h2 className="page-title">发酵菌种活性报告</h2>
          <Space>
            <Select
              placeholder="选择试剂批号查看报告"
              style={{ width: 240 }}
              value={selectedBatch}
              onChange={setSelectedBatch}
              showSearch
              optionFilterProp="label"
              options={batches.map((b: any) => ({
                label: `${b.reagent_batch}（${b.sample_count}个样本，${b.conflict_count}个冲突）`,
                value: b.reagent_batch
              }))}
            />
            {selectedBatch && (
              <Button icon={<DownloadOutlined />} type="primary" onClick={handleExport}>
                下载Excel报告
              </Button>
            )}
          </Space>
        </div>

        {!selectedBatch && (
          <div>
            <Row gutter={16}>
              <Col span={6}>
                <Card><Statistic title="总试剂批号数" value={dashboard?.totalStats?.total_samples || 0} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="待复核样本" value={dashboard?.totalStats?.total_pending || 0} valueStyle={{ color: '#faad14' }} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="已复核样本" value={dashboard?.totalStats?.total_reviewed || 0} valueStyle={{ color: '#52c41a' }} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="冲突样本" value={dashboard?.totalStats?.total_conflict || 0} valueStyle={{ color: '#ff4d4f' }} /></Card>
              </Col>
            </Row>
            <div style={{ marginTop: 16, color: '#888', textAlign: 'center' }}>
              请从上方选择一个试剂批号查看详细报告
            </div>
          </div>
        )}

        {selectedBatch && reportData && (
          <>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="样本总数" value={reportData.stats.total} />
                  <Progress
                    percent={Math.round((reportData.stats.reviewed / reportData.stats.total) * 100)}
                    style={{ marginTop: 12 }}
                    status={reportData.stats.conflict > 0 ? 'exception' : 'active'}
                  />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    复核进度：{reportData.stats.reviewed}/{reportData.stats.total}
                    {reportData.stats.conflict > 0 && <span style={{ color: '#ff4d4f', marginLeft: 8 }}>冲突{reportData.stats.conflict}</span>}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="活性分布">
                  <ReactECharts option={getActivityChart()} style={{ height: 200 }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="复核状态">
                  <ReactECharts option={getReviewChart()} style={{ height: 200 }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="菌种分布">
                  <ReactECharts option={getStrainChart()} style={{ height: 200 }} />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="样本明细（点击样本编号查看详情，图表、明细、下载均来自同一数据来源）">
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={reportData.samples}
                scroll={{ x: 1400 }}
                pagination={{ pageSize: 20 }}
              />
            </Card>
          </>
        )}
      </div>

      <Drawer
        title={`样本详情 - ${currentSample?.sample_no}`}
        open={sampleDrawer}
        onClose={() => setSampleDrawer(false)}
        width={720}
      >
        {currentSample && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="试剂批号">{currentSample.reagent_batch}</Descriptions.Item>
              <Descriptions.Item label="样本编号">{currentSample.sample_no}</Descriptions.Item>
              <Descriptions.Item label="菌种名称">{currentSample.strain_name}</Descriptions.Item>
              <Descriptions.Item label="活性等级">
                {currentSample.activity_level ? (
                  <Tag color={activityLevelColors[currentSample.activity_level]}>
                    {activityLevelLabels[currentSample.activity_level]}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="复核状态">
                <Tag color={reviewStatusColors[currentSample.review_status]}>
                  {reviewStatusLabels[currentSample.review_status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="复核人">{currentSample.reviewer || '-'}</Descriptions.Item>
              <Descriptions.Item label="测序结果" span={2}>{currentSample.sequencing_result || '-'}</Descriptions.Item>
              <Descriptions.Item label="结论" span={2}>{currentSample.conclusion || '-'}</Descriptions.Item>
              <Descriptions.Item label="原始行号" span={2}>
                <Tag>R{currentSample.original_row}</Tag>（来自文件：<code>{currentSample.source_file}</code>）
              </Descriptions.Item>
              <Descriptions.Item label="导入批次" span={2}><code>{currentSample.import_batch}</code></Descriptions.Item>
              <Descriptions.Item label="来源备注" span={2}>{currentSample.source_note || '-'}</Descriptions.Item>
            </Descriptions>

            {currentSample.review_status === 'conflict' && (
              <Alert
                type="error"
                showIcon
                message="该样本存在冲突"
                description="重复导入时发现与已复核结论不一致，请人工确认后修正。"
                style={{ marginBottom: 16 }}
              />
            )}

            <div className="trace-info">
              <span>追溯：创建于 {new Date(currentSample.created_at).toLocaleString()}</span>
              <span>最后更新：{new Date(currentSample.updated_at).toLocaleString()}</span>
            </div>

            <h4 style={{ marginTop: 16 }}>关联显微照片（{currentSample.images?.length || 0}张）</h4>
            <Row gutter={[12, 12]}>
              {currentSample.images?.map((img: MicroscopeImage) => (
                <Col span={8} key={img.id}>
                  <Image
                    width="100%"
                    src={imageApi.fileUrl(img.id)}
                    style={{ borderRadius: 4 }}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{img.file_name}</div>
                </Col>
              ))}
              {!currentSample.images?.length && (
                <Col span={24} style={{ color: '#999' }}>暂无关联图片，可到"图像标注"页面关联。</Col>
              )}
            </Row>
          </div>
        )}
      </Drawer>

      <Modal
        title="编辑样本结论"
        open={editModalOpen}
        onOk={handleSaveSample}
        onCancel={() => setEditModalOpen(false)}
        width={560}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="activity_level" label="活性等级">
            <Select options={Object.entries(activityLevelLabels).map(([v, l]) => ({ label: l, value: v }))} />
          </Form.Item>
          <Form.Item name="review_status" label="复核状态">
            <Select options={Object.entries(reviewStatusLabels).map(([v, l]) => ({ label: l, value: v }))} />
          </Form.Item>
          <Form.Item name="reviewer" label="复核人"><Input /></Form.Item>
          <Form.Item name="sequencing_result" label="测序结果">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="conclusion" label="最终结论">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="source_note" label="来源备注">
            <Input.TextArea rows={2} placeholder="可补充原始表格行备注或其他追溯信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
