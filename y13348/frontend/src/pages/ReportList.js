import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Modal, Card, Row, Col, Descriptions,
  List, message, Tabs, Select, Checkbox, Divider
} from 'antd';
import {
  EyeOutlined, DownloadOutlined, BarChartOutlined,
  FileTextOutlined, ArrowUpOutlined, ArrowDownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportAPI, sessionAPI } from '../services/api';
import { ReportComponentType } from '../services/api';

const { TabPane } = Tabs;
const { Option } = Select;

const componentTypeMap = {
  sample_change: { text: '样本变化', color: 'blue' },
  threshold_change: { text: '阈值变化', color: 'orange' },
  manual_correction: { text: '人工改判', color: 'green' }
};

function ReportList() {
  const [reports, setReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeComponent, setActiveComponent] = useState('sample_change');
  const [exportModal, setExportModal] = useState(false);
  const [exportComponents, setExportComponents] = useState([
    'sample_change', 'threshold_change', 'manual_correction'
  ]);
  const [exportFormat, setExportFormat] = useState('json');

  useEffect(() => {
    loadReports();
    loadSessions();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.list();
      setReports(response.data);
    } catch (error) {
      message.error('加载报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await sessionAPI.list();
      setSessions(response.data);
    } catch (error) {
      console.error('加载会话列表失败', error);
    }
  };

  const getSessionName = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.session_name || '-';
  };

  const handleViewDetail = async (report) => {
    try {
      const response = await reportAPI.get(report.id);
      setSelectedReport(response.data);
      setDetailModal(true);
      if (response.data.components?.length > 0) {
        setActiveComponent(response.data.components[0].component_type);
      }
    } catch (error) {
      message.error('加载报告详情失败');
    }
  };

  const handleExport = async () => {
    if (!selectedReport) return;
    try {
      const response = await reportAPI.export(selectedReport.id, {
        format: exportFormat,
        include_components: exportComponents
      });
      message.success('导出成功');
      console.log('导出数据:', response.data);
      setExportModal(false);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const renderDiffValue = (oldVal, newVal) => {
    if (oldVal === newVal) {
      return <span>{oldVal}</span>;
    }
    return (
      <Space>
        <span style={{ textDecoration: 'line-through', color: '#ff4d4f' }}>{oldVal}</span>
        <ArrowUpOutlined style={{ color: '#52c41a' }} />
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{newVal}</span>
      </Space>
    );
  };

  const columns = [
    {
      title: '报告名称',
      dataIndex: 'report_name',
      key: 'report_name',
      render: (text, record) => (
        <Space>
          <FileTextOutlined />
          <a onClick={() => handleViewDetail(record)}>{text}</a>
        </Space>
      )
    },
    {
      title: '关联会话',
      dataIndex: 'session_id',
      key: 'session_id',
      render: id => getSessionName(id)
    },
    {
      title: '版本',
      dataIndex: 'report_version',
      key: 'report_version',
      render: v => <Tag color="blue">v{v}</Tag>
    },
    {
      title: '变更总数',
      dataIndex: 'total_changed',
      key: 'total_changed',
      render: count => (
        <Tag color={count > 0 ? 'orange' : 'default'}>
          {count} 项
        </Tag>
      )
    },
    {
      title: '生成时间',
      dataIndex: 'generated_at',
      key: 'generated_at',
      render: t => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => {
              setSelectedReport(record);
              setExportModal(true);
            }}
          >
            导出
          </Button>
        </Space>
      )
    }
  ];

  const currentComponent = selectedReport?.components?.find(
    c => c.component_type === activeComponent
  );

  return (
    <div className="page-container">
      <Card
        title={
          <Space>
            <BarChartOutlined />
            灰度报告列表
          </Space>
        }
        extra={
          <Space>
            <Select
              placeholder="按会话筛选"
              style={{ width: 200 }}
              allowClear
              onChange={(val) => loadReports(val ? { session_id: val } : {})}
            >
              {sessions.map(s => (
                <Option key={s.id} value={s.id}>{s.session_name}</Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="报告详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          <Space>
            <Button onClick={() => {
              setExportModal(true);
            }} icon={<DownloadOutlined />}>
              导出报告
            </Button>
            <Button onClick={() => setDetailModal(false)}>关闭</Button>
          </Space>
        }
        width={900}
      >
        {selectedReport && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="报告名称">{selectedReport.report_name}</Descriptions.Item>
              <Descriptions.Item label="版本">{selectedReport.report_version}</Descriptions.Item>
              <Descriptions.Item label="关联会话">{getSessionName(selectedReport.session_id)}</Descriptions.Item>
              <Descriptions.Item label="生成时间">{dayjs(selectedReport.generated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="总变更数" span={2}>
                <Tag color="orange">{selectedReport.total_changed} 项</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报告摘要" span={2}>
                {selectedReport.overall_summary}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }} />

            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
              {selectedReport.components?.map(comp => (
                <Col key={comp.component_type} span={8}>
                  <Card 
                    size="small" 
                    hoverable
                    onClick={() => setActiveComponent(comp.component_type)}
                    style={{
                      borderColor: activeComponent === comp.component_type ? '#1890ff' : undefined,
                      cursor: 'pointer'
                    }}
                  >
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Tag color={componentTypeMap[comp.component_type]?.color}>
                        {componentTypeMap[comp.component_type]?.text}
                      </Tag>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                        {comp.changed_count}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {comp.summary}
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider orientation="left" style={{ margin: '8px 0' }}>
              <Tag color={componentTypeMap[activeComponent]?.color}>
                {componentTypeMap[activeComponent]?.text}
              </Tag>
              {currentComponent?.summary}
            </Divider>

            {currentComponent && (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {activeComponent === 'sample_change' || activeComponent === 'threshold_change' ? (
                  <Table
                    size="small"
                    dataSource={Object.entries(currentComponent.data?.diff || {}).map(([key, val]) => ({
                      key,
                      field: key,
                      old: val.old,
                      new: val.new
                    }))}
                    pagination={false}
                    columns={[
                      { title: '字段', dataIndex: 'field', key: 'field' },
                      { title: '原值', dataIndex: 'old', key: 'old', 
                        render: (v, r) => renderDiffValue(v, r.new) },
                      { title: '新值', dataIndex: 'new', key: 'new' }
                    ]}
                  />
                ) : activeComponent === 'manual_correction' ? (
                  <List
                    size="small"
                    dataSource={currentComponent.data?.details || []}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag>{correctionTypeMap[item.type] || item.type}</Tag>
                              <span>{item.target_item_name || item.target_item_id}</span>
                            </Space>
                          }
                          description={
                            <div>
                              <p style={{ margin: '4px 0' }}>
                                <strong>原始判断：</strong>
                                <span style={{ background: '#fff1f0', padding: '2px 6px', borderRadius: 4 }}>
                                  {JSON.stringify(item.original)}
                                </span>
                              </p>
                              <p style={{ margin: '4px 0' }}>
                                <strong>新判断：</strong>
                                <span style={{ background: '#f6ffed', padding: '2px 6px', borderRadius: 4 }}>
                                  {JSON.stringify(item.new)}
                                </span>
                              </p>
                              <p style={{ margin: '4px 0', color: '#666' }}>
                                <strong>原因：</strong>{item.reason}
                              </p>
                              <p style={{ margin: '4px 0', color: '#999', fontSize: 12 }}>
                                操作人：{item.operator} | {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                              </p>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12 }}>
                    {JSON.stringify(currentComponent.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="导出报告"
        open={exportModal}
        onCancel={() => setExportModal(false)}
        onOk={handleExport}
        okText="导出"
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 8 }}><strong>导出格式：</strong></p>
          <Select
            value={exportFormat}
            onChange={setExportFormat}
            style={{ width: '100%' }}
          >
            <Option value="json">JSON 格式</Option>
            <Option value="xlsx">Excel 格式</Option>
          </Select>
        </div>
        <div>
          <p style={{ marginBottom: 8 }}><strong>包含内容：</strong></p>
          <Checkbox.Group
            value={exportComponents}
            onChange={setExportComponents}
            style={{ width: '100%' }}
          >
            <Checkbox value="sample_change">样本变化</Checkbox>
            <Checkbox value="threshold_change">阈值变化</Checkbox>
            <Checkbox value="manual_correction">人工改判</Checkbox>
          </Checkbox.Group>
        </div>
      </Modal>
    </div>
  );
}

const correctionTypeMap = {
  false_positive: '误报修正',
  false_negative: '漏报修正',
  threshold_adjust: '阈值调整',
  other: '其他'
};

export default ReportList;
