import React, { useState } from 'react';
import { 
  Card, 
  Upload, 
  Button, 
  Table, 
  Tag, 
  Progress, 
  Space, 
  Row, 
  Col, 
  Steps,
  message,
  Modal,
  Divider
} from 'antd';
import { 
  InboxOutlined, 
  FileExcelOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useAppStore } from '../store';
import { downloadSampleTemplate } from '../utils/exporter';
import { ImportFile } from '../types';

const { Dragger } = Upload;

const DataImport: React.FC = () => {
  const { importFiles, addImportFile, updateImportFile, removeImportFile } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const fileTypes = [
    { type: 'employee', name: '员工档案', icon: '👥', color: '#2563eb' },
    { type: 'salary', name: '工资项', icon: '💰', color: '#10b981' },
    { type: 'deduction', name: '专项扣除', icon: '📝', color: '#f97316' },
    { type: 'backpay', name: '补发记录', icon: '📋', color: '#8b5cf6' },
    { type: 'resignation', name: '离职记录', icon: '🚪', color: '#dc2626' },
    { type: 'tax_preview', name: '个税试算', icon: '🧮', color: '#0891b2' },
  ];
  
  const handleFileUpload = (type: string, file: File) => {
    const newFile: ImportFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: type as ImportFile['type'],
      status: 'uploading',
      rowCount: 0,
      errorCount: 0,
      uploadedAt: new Date().toISOString()
    };
    
    addImportFile(newFile);
    
    setTimeout(() => {
      updateImportFile(newFile.id, { status: 'uploaded', rowCount: Math.floor(Math.random() * 50) + 10 });
      
      setTimeout(() => {
        updateImportFile(newFile.id, { status: 'validating' });
        
        setTimeout(() => {
          const hasError = Math.random() > 0.7;
          updateImportFile(newFile.id, { 
            status: hasError ? 'invalid' : 'valid',
            errorCount: hasError ? Math.floor(Math.random() * 5) + 1 : 0,
            errors: hasError ? ['第3行：员工编号不能为空', '第7行：日期格式不正确'] : undefined
          });
          
          message.success(`${file.name} 上传完成`);
        }, 1000);
      }, 1000);
    }, 1000);
    
    return false;
  };
  
  const handlePreview = (file: ImportFile) => {
    const mockData = Array.from({ length: 5 }, (_, i) => ({
      key: i,
      员工编号: `E${String(1001 + i).padStart(3, '0')}`,
      姓名: ['张三', '李四', '王五', '赵六', '钱七'][i],
      部门: ['技术部', '产品部', '市场部', '财务部', '人事部'][i],
      基本工资: 15000 + Math.floor(Math.random() * 20000),
    }));
    setPreviewData(mockData);
    setPreviewVisible(true);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'processing';
      case 'uploaded': return 'default';
      case 'validating': return 'processing';
      case 'valid': return 'success';
      case 'invalid': return 'error';
      default: return 'default';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return '上传中';
      case 'uploaded': return '已上传';
      case 'validating': return '校验中';
      case 'valid': return '校验通过';
      case 'invalid': return '校验失败';
      default: return status;
    }
  };
  
  const allValid = importFiles.length > 0 && importFiles.every(f => f.status === 'valid');
  
  return (
    <div>
      <Card 
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
        title="导入步骤"
      >
        <Steps current={currentStep} items={[
          { title: '下载模板', description: '获取标准导入模板' },
          { title: '上传数据', description: '上传填写好的Excel' },
          { title: '数据校验', description: '系统自动检查数据' },
          { title: '确认导入', description: '确认无误后导入' },
        ]} />
      </Card>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title="上传数据文件"
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            extra={
              <Button icon={<DownloadOutlined />} onClick={downloadSampleTemplate}>
                下载导入模板
              </Button>
            }
          >
            <Row gutter={[12, 12]}>
              {fileTypes.map((fileType) => (
                <Col xs={24} sm={12} md={8} key={fileType.type}>
                  <div style={{ 
                    border: '2px dashed #e5e7eb', 
                    borderRadius: 8, 
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: '#fafafa'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = fileType.color;
                    e.currentTarget.style.background = `${fileType.color}08`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#fafafa';
                  }}
                  >
                    <Upload
                      accept=".xlsx,.xls"
                      showUploadList={false}
                      beforeUpload={(file) => handleFileUpload(fileType.type, file)}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{fileType.icon}</div>
                      <div style={{ fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>{fileType.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>点击或拖拽上传</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>.xlsx / .xls</div>
                    </Upload>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title="上传说明"
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.8 }}>
              <p style={{ marginBottom: 12 }}>
                <strong>📋 请按照以下步骤操作：</strong>
              </p>
              <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li style={{ marginBottom: 8 }}>点击上方按钮下载标准导入模板</li>
                <li style={{ marginBottom: 8 }}>按照模板格式填写数据</li>
                <li style={{ marginBottom: 8 }}>保存为Excel文件(.xlsx/.xls)</li>
                <li style={{ marginBottom: 8 }}>上传对应的文件类型</li>
                <li style={{ marginBottom: 8 }}>等待系统校验完成</li>
                <li>确认无误后点击导入</li>
              </ol>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <p style={{ marginBottom: 8 }}>
                <strong>⚠️ 注意事项：</strong>
              </p>
              <ul style={{ paddingLeft: 20, fontSize: 12, color: '#6b7280' }}>
                <li style={{ marginBottom: 4 }}>请勿修改模板的表头和格式</li>
                <li style={{ marginBottom: 4 }}>日期格式请使用 YYYY-MM-DD</li>
                <li style={{ marginBottom: 4 }}>金额请使用数字格式</li>
                <li style={{ marginBottom: 4 }}>员工编号必须唯一</li>
                <li>如有疑问请联系系统管理员</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
      
      {importFiles.length > 0 && (
        <Card 
          title="已上传文件"
          style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          extra={
            <Space>
              <Button onClick={() => setCurrentStep(3)} disabled={!allValid}>
                开始导入
              </Button>
              <Button danger onClick={() => importFiles.forEach(f => removeImportFile(f.id))}>
                清空全部
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={importFiles}
            rowKey="id"
            columns={[
              {
                title: '文件类型',
                dataIndex: 'type',
                width: 120,
                render: (type) => {
                  const ft = fileTypes.find(f => f.type === type);
                  return (
                    <Tag color={ft?.color}>
                      {ft?.icon} {ft?.name}
                    </Tag>
                  );
                }
              },
              {
                title: '文件名',
                dataIndex: 'name',
                render: (text) => <span style={{ color: '#1f2937' }}>{text}</span>
              },
              {
                title: '数据行数',
                dataIndex: 'rowCount',
                width: 100,
                align: 'center',
                render: (count) => count > 0 ? `${count} 行` : '-'
              },
              {
                title: '错误数',
                dataIndex: 'errorCount',
                width: 100,
                align: 'center',
                render: (count) => count > 0 ? (
                  <span style={{ color: '#dc2626' }}>{count} 个</span>
                ) : (
                  <span style={{ color: '#10b981' }}>0</span>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 120,
                render: (status) => (
                  <Tag color={getStatusColor(status)}>
                    {status === 'uploading' || status === 'validating' ? (
                      <Progress percent={60} size="small" showInfo={false} style={{ width: 50, marginRight: 8 }} />
                    ) : status === 'valid' ? (
                      <CheckCircleOutlined style={{ color: '#10b981', marginRight: 4 }} />
                    ) : status === 'invalid' ? (
                      <CloseCircleOutlined style={{ color: '#dc2626', marginRight: 4 }} />
                    ) : null}
                    {getStatusText(status)}
                  </Tag>
                )
              },
              {
                title: '上传时间',
                dataIndex: 'uploadedAt',
                width: 160,
                render: (time) => new Date(time).toLocaleString('zh-CN')
              },
              {
                title: '操作',
                key: 'action',
                width: 150,
                render: (_, record) => (
                  <Space size="small">
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(record)}
                    >
                      预览
                    </Button>
                    {record.errors && (
                      <Button 
                        type="link" 
                        size="small" 
                        danger
                        onClick={() => message.error(record.errors?.join('\n'))}
                      >
                        查看错误
                      </Button>
                    )}
                    <Button 
                      type="link" 
                      size="small" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={() => removeImportFile(record.id)}
                    >
                      删除
                    </Button>
                  </Space>
                )
              }
            ]}
            pagination={false}
          />
        </Card>
      )}
      
      <Modal
        title="数据预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <Table
          dataSource={previewData}
          pagination={false}
          size="small"
        />
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 16 }}>
          仅显示前5条数据预览
        </p>
      </Modal>
    </div>
  );
};

export default DataImport;
