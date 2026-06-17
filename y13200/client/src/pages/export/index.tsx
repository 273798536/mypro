import React, { useState, useEffect } from 'react';
import {
  Card,
  Checkbox,
  DatePicker,
  Select,
  Button,
  Table,
  List,
  Space,
  Row,
  Col,
  Typography,
  message,
  Tag,
  Divider,
  Radio,
  Form,
  Alert,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  SettingOutlined,
  DragOutlined,
  EyeOutlined,
  HistoryOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '@/store';
import { trackApi, exportApi } from '@/api';
import type { Track, TrackStatus, ExportTemplate } from '@/types';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { CheckableTag } = Tag;

interface ExportTemplateData {
  id: string;
  name: string;
  description: string;
  applicableScene: string;
  fieldCount: number;
  fields: string[];
  icon: React.ReactNode;
  color: string;
}

const templates: ExportTemplateData[] = [
  {
    id: '1',
    name: '现场沟通版',
    description: '精简版导出，包含核心曲目信息和状态，便于现场快速核对',
    applicableScene: '现场执行、彩排沟通',
    fieldCount: 8,
    fields: ['trackNo', 'title', 'artist', 'status', 'duration', 'timecode', 'deviation', 'latestNote'],
    icon: <FileTextOutlined />,
    color: '#1677ff',
  },
  {
    id: '2',
    name: '运营核对版',
    description: '包含匹配信息和材料状态，用于运营团队核对进度',
    applicableScene: '运营管理、进度跟踪',
    fieldCount: 12,
    fields: ['trackNo', 'title', 'artist', 'status', 'matchStatus', 'confidence', 'fileName', 'duration', 'timecode', 'deviation', 'submittedBy', 'submittedAt'],
    icon: <FileExcelOutlined />,
    color: '#52c41a',
  },
  {
    id: '3',
    name: '完整明细版',
    description: '完整导出所有字段，包含版本历史和复核记录，用于存档和审计',
    applicableScene: '数据存档、审计审查',
    fieldCount: 20,
    fields: ['trackNo', 'title', 'artist', 'status', 'expectedDuration', 'expectedTimecode', 'matchStatus', 'confidence', 'fileName', 'duration', 'timecode', 'deviation', 'version', 'submittedBy', 'submittedAt', 'latestNote', 'reviewCount', 'lastReviewer', 'lastReviewTime', 'auditCount'],
    icon: <FileTextOutlined />,
    color: '#722ed1',
  },
  {
    id: '4',
    name: '时码专项版',
    description: '专注于时码相关字段，用于时码校对和偏差分析',
    applicableScene: '时码校对、技术分析',
    fieldCount: 10,
    fields: ['trackNo', 'title', 'artist', 'expectedTimecode', 'timecode', 'deviation', 'deviationStatus', 'duration', 'expectedDuration', 'durationDiff'],
    icon: <ClockCircleOutlined />,
    color: '#fa8c16',
  },
];

const allFields = [
  { key: 'trackNo', label: '曲目编号', group: '基本信息' },
  { key: 'title', label: '曲目标题', group: '基本信息' },
  { key: 'artist', label: '艺术家', group: '基本信息' },
  { key: 'status', label: '状态', group: '基本信息' },
  { key: 'expectedDuration', label: '预期时长', group: '基本信息' },
  { key: 'expectedTimecode', label: '预期时码', group: '基本信息' },
  { key: 'matchStatus', label: '匹配状态', group: '匹配信息' },
  { key: 'confidence', label: '匹配置信度', group: '匹配信息' },
  { key: 'fileName', label: '文件名', group: '材料信息' },
  { key: 'duration', label: '实际时长', group: '材料信息' },
  { key: 'timecode', label: '实际时码', group: '材料信息' },
  { key: 'deviation', label: '时码偏差', group: '材料信息' },
  { key: 'deviationStatus', label: '偏差状态', group: '材料信息' },
  { key: 'version', label: '版本号', group: '材料信息' },
  { key: 'submittedBy', label: '提交者', group: '材料信息' },
  { key: 'submittedAt', label: '提交时间', group: '材料信息' },
  { key: 'latestNote', label: '最新备注', group: '备注信息' },
  { key: 'reviewCount', label: '复核次数', group: '复核信息' },
  { key: 'lastReviewer', label: '最后复核人', group: '复核信息' },
  { key: 'lastReviewTime', label: '最后复核时间', group: '复核信息' },
  { key: 'auditCount', label: '审计记录数', group: '审计信息' },
];

const statusOptions: { value: TrackStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待处理', color: 'default' },
  { value: 'matching', label: '匹配中', color: 'processing' },
  { value: 'matched', label: '已匹配', color: 'success' },
  { value: 'mismatch', label: '不匹配', color: 'error' },
  { value: 'reviewing', label: '复核中', color: 'warning' },
  { value: 'suspended', label: '已挂起', color: 'warning' },
  { value: 'approved', label: '已通过', color: 'success' },
  { value: 'rejected', label: '已驳回', color: 'error' },
];

const mockPreviewData = [
  {
    key: '1',
    trackNo: 1,
    title: '夜曲',
    artist: '周杰伦',
    status: 'approved',
    duration: '4:23',
    timecode: '00:05:30',
    deviation: '+0.5s',
    matchStatus: 'matched',
  },
  {
    key: '2',
    trackNo: 2,
    title: '稻香',
    artist: '周杰伦',
    status: 'reviewing',
    duration: '3:45',
    timecode: '00:10:15',
    deviation: '-1.2s',
    matchStatus: 'matched',
  },
  {
    key: '3',
    trackNo: 3,
    title: '晴天',
    artist: '周杰伦',
    status: 'suspended',
    duration: '4:12',
    timecode: '00:15:00',
    deviation: '+3.8s',
    matchStatus: 'matched',
  },
  {
    key: '4',
    trackNo: 4,
    title: '七里香',
    artist: '周杰伦',
    status: 'pending',
    duration: '-',
    timecode: '-',
    deviation: '-',
    matchStatus: 'pending',
  },
  {
    key: '5',
    trackNo: 5,
    title: '青花瓷',
    artist: '周杰伦',
    status: 'matched',
    duration: '3:58',
    timecode: '00:22:45',
    deviation: '-0.3s',
    matchStatus: 'matched',
  },
];

const mockExportHistory = [
  {
    id: '1',
    templateName: '现场沟通版',
    format: 'CSV',
    recordCount: 25,
    exportedBy: '管理员',
    exportedAt: '2024-01-15 14:30:00',
    fileSize: '128KB',
  },
  {
    id: '2',
    templateName: '完整明细版',
    format: 'Excel',
    recordCount: 25,
    exportedBy: '张三',
    exportedAt: '2024-01-14 10:15:00',
    fileSize: '256KB',
  },
  {
    id: '3',
    templateName: '时码专项版',
    format: 'CSV',
    recordCount: 25,
    exportedBy: '李四',
    exportedAt: '2024-01-13 16:45:00',
    fileSize: '96KB',
  },
];

const ExportPage: React.FC = () => {
  const setLoading = useAppStore((state) => state.setLoading);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');
  const [selectedFields, setSelectedFields] = useState<string[]>(templates[0].fields);
  const [selectedStatuses, setSelectedStatuses] = useState<TrackStatus[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState(mockPreviewData);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const [exportHistory, setExportHistory] = useState(mockExportHistory);

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  useEffect(() => {
    if (currentTemplate) {
      setSelectedFields(currentTemplate.fields);
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    if (checked) {
      setSelectedFields([...selectedFields, fieldKey]);
    } else {
      setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
    }
  };

  const handleSelectAllFields = (checked: boolean) => {
    if (checked) {
      setSelectedFields(allFields.map((f) => f.key));
    } else {
      setSelectedFields([]);
    }
  };

  const handleFieldDragStart = (e: React.DragEvent, fieldKey: string) => {
    e.dataTransfer.setData('fieldKey', fieldKey);
  };

  const handleFieldDragOver = (e: React.DragEvent, fieldKey: string) => {
    e.preventDefault();
    if (dragOverField !== fieldKey) {
      setDragOverField(fieldKey);
    }
  };

  const handleFieldDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault();
    setDragOverField(null);
    const sourceField = e.dataTransfer.getData('fieldKey');
    if (sourceField === targetField) return;

    const newFields = [...selectedFields];
    const sourceIndex = newFields.indexOf(sourceField);
    const targetIndex = newFields.indexOf(targetField);
    if (sourceIndex !== -1 && targetIndex !== -1) {
      newFields.splice(sourceIndex, 1);
      newFields.splice(targetIndex, 0, sourceField);
      setSelectedFields(newFields);
    }
  };

  const handleFieldDragEnd = () => {
    setDragOverField(null);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      message.error('请至少选择一个导出字段');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportApi.exportTracks(exportFormat);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${dayjs().format('YYYYMMDD_HHmmss')}.${exportFormat === 'csv' ? 'csv' : exportFormat === 'excel' ? 'xlsx' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const newHistoryItem = {
        id: Date.now().toString(),
        templateName: currentTemplate?.name || '自定义',
        format: exportFormat === 'csv' ? 'CSV' : exportFormat === 'excel' ? 'Excel' : 'JSON',
        recordCount: 25,
        exportedBy: '管理员',
        exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        fileSize: Math.floor(Math.random() * 200 + 50) + 'KB',
      };
      setExportHistory([newHistoryItem, ...exportHistory]);

      message.success(`导出成功，共 ${previewData.length} 条记录`);
    } catch (error) {
      message.error('导出失败');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const groupedFields = allFields.reduce((acc, field) => {
    if (!acc[field.group]) {
      acc[field.group] = [];
    }
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof allFields>);

  const previewColumns = selectedFields.slice(0, 6).map((fieldKey) => {
    const field = allFields.find((f) => f.key === fieldKey);
    return {
      title: field?.label || fieldKey,
      dataIndex: fieldKey,
      key: fieldKey,
      render: (value: string) => {
        if (fieldKey === 'status') {
          const status = statusOptions.find((s) => s.value === value);
          return status ? <Tag color={status.color}>{status.label}</Tag> : value;
        }
        if (fieldKey === 'deviation') {
          const color = value === '-' ? 'default' : value.startsWith('+') || value.startsWith('-') ? (Math.abs(parseFloat(value)) > 2 ? 'error' : 'success') : 'default';
          return <Tag color={color}>{value}</Tag>;
        }
        return value;
      },
    };
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <div className="page-header">
            <Title level={3} style={{ margin: 0 }}>CSV导出</Title>
            <Paragraph type="secondary" style={{ margin: '8px 0 0 0' }}>
              选择导出模板和字段，配置筛选条件，导出曲目数据
            </Paragraph>
          </div>
        </Card>

        <Card
          title={
            <Space>
              <FileTextOutlined />
              导出模板
            </Space>
          }
          extra={<Text type="secondary">选择一个预设模板或自定义字段</Text>}
        >
          <Row gutter={[16, 16]}>
            {templates.map((template) => (
              <Col xs={24} sm={12} lg={6} key={template.id}>
                <Card
                  hoverable
                  onClick={() => handleTemplateSelect(template.id)}
                  style={{
                    borderColor: selectedTemplate === template.id ? template.color : undefined,
                    borderWidth: selectedTemplate === template.id ? 2 : 1,
                    background: selectedTemplate === template.id ? `${template.color}10` : undefined,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    height: '100%',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: template.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 18,
                        }}
                      >
                        {template.icon}
                      </div>
                      {selectedTemplate === template.id && (
                        <CheckCircleOutlined style={{ color: template.color, fontSize: 18 }} />
                      )}
                    </Space>
                    <Title level={5} style={{ margin: 0, color: selectedTemplate === template.id ? template.color : undefined }}>
                      {template.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {template.description}
                    </Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>适用场景</Text>
                        <Tag color="blue" style={{ margin: 0 }}>{template.applicableScene}</Tag>
                      </Space>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>字段数量</Text>
                        <Text strong>{template.fieldCount} 个</Text>
                      </Space>
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <SettingOutlined />
                  字段配置
                </Space>
              }
              extra={
                <Checkbox
                  checked={selectedFields.length === allFields.length}
                  indeterminate={selectedFields.length > 0 && selectedFields.length < allFields.length}
                  onChange={(e) => handleSelectAllFields(e.target.checked)}
                >
                  全选
                </Checkbox>
              }
              style={{ height: '100%' }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                拖拽调整字段顺序，点击勾选/取消字段
              </Text>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {Object.entries(groupedFields).map(([group, fields]) => (
                  <div key={group}>
                    <Text strong style={{ display: 'block', marginBottom: 8, color: 'rgba(255,255,255,0.65)' }}>
                      {group}
                    </Text>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {fields.map((field) => {
                        const isSelected = selectedFields.includes(field.key);
                        return (
                          <div
                            key={field.key}
                            draggable={isSelected}
                            onDragStart={(e) => handleFieldDragStart(e, field.key)}
                            onDragOver={(e) => handleFieldDragOver(e, field.key)}
                            onDrop={(e) => handleFieldDrop(e, field.key)}
                            onDragEnd={handleFieldDragEnd}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              borderRadius: 6,
                              background: isSelected ? (dragOverField === field.key ? 'rgba(22, 119, 255, 0.2)' : 'rgba(22, 119, 255, 0.1)') : 'transparent',
                              border: isSelected ? '1px solid rgba(22, 119, 255, 0.4)' : '1px solid transparent',
                              cursor: isSelected ? 'move' : 'default',
                              transition: 'all 0.2s',
                            }}
                          >
                            <DragOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }} />
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => handleFieldToggle(field.key, e.target.checked)}
                            >
                              {field.label}
                            </Checkbox>
                          </div>
                        );
                      })}
                    </Space>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card
                title={
                  <Space>
                    <FilterOutlined />
                    筛选条件
                  </Space>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>状态筛选</Text>
                      <Space wrap>
                        {statusOptions.map((status) => (
                          <CheckableTag
                            key={status.value}
                            color={status.color}
                            checked={selectedStatuses.includes(status.value)}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedStatuses([...selectedStatuses, status.value]);
                              } else {
                                setSelectedStatuses(selectedStatuses.filter((s) => s !== status.value));
                              }
                            }}
                          >
                            {status.label}
                          </CheckableTag>
                        ))}
                      </Space>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>日期范围</Text>
                      <RangePicker
                        style={{ width: '100%' }}
                        value={dateRange}
                        onChange={setDateRange}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card
                title={
                  <Space>
                    <EyeOutlined />
                    数据预览
                    <Tag color="blue">前 5 条</Tag>
                  </Space>
                }
                extra={
                  <Text type="secondary">
                    已选择 <Text strong style={{ color: '#1677ff' }}>{selectedFields.length}</Text> 个字段，
                    预计导出 <Text strong style={{ color: '#52c41a' }}>{previewData.length}</Text> 条记录
                  </Text>
                }
              >
                {selectedFields.length > 0 ? (
                  <Table
                    dataSource={previewData}
                    columns={previewColumns}
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
                    <EyeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <Paragraph>请选择字段以预览数据</Paragraph>
                  </div>
                )}
              </Card>

              <Card>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                      <Text strong>导出格式：</Text>
                      <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                        <Radio.Button value="csv">CSV</Radio.Button>
                        <Radio.Button value="excel">Excel</Radio.Button>
                        <Radio.Button value="json">JSON</Radio.Button>
                      </Radio.Group>
                    </Space>
                    <Button
                      type="primary"
                      size="large"
                      icon={<DownloadOutlined />}
                      loading={isExporting}
                      onClick={handleExport}
                      disabled={selectedFields.length === 0}
                    >
                      {isExporting ? '导出中...' : '导出数据'}
                    </Button>
                  </Space>
                  {selectedFields.length === 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message="请至少选择一个导出字段"
                    />
                  )}
                </Space>
              </Card>

              <Card
                title={
                  <Space>
                    <HistoryOutlined />
                    导出历史
                  </Space>
                }
              >
                <List
                  dataSource={exportHistory}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button type="link" size="small" icon={<DownloadOutlined />}>
                          下载
                        </Button>,
                        <Button type="link" size="small" icon={<CopyOutlined />}>
                          复制链接
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              background: '#1677ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            <FileExcelOutlined />
                          </div>
                        }
                        title={
                          <Space>
                            <Text strong>{item.templateName}</Text>
                            <Tag>{item.format}</Tag>
                            <Tag color="blue">{item.recordCount} 条</Tag>
                          </Space>
                        }
                        description={
                          <Space>
                            <UserOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />
                            <Text type="secondary">{item.exportedBy}</Text>
                            <ClockCircleOutlined style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 12 }} />
                            <Text type="secondary">{item.exportedAt}</Text>
                            <Text type="secondary" style={{ marginLeft: 12 }}>{item.fileSize}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default ExportPage;
