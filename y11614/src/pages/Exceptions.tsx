import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  Empty
} from 'antd';
import { 
  WarningOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { 
  getExceptionTypeName, 
  getSeverityColor, 
  getSeverityName 
} from '../utils/exceptionDetector';
import { Exception, ExceptionType, ExceptionSeverity, ExceptionStatus } from '../types';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const Exceptions: React.FC = () => {
  const navigate = useNavigate();
  const { 
    exceptions, 
    employees, 
    resolveException, 
    ignoreException,
    addAuditLog,
    taxPeriods,
    currentTaxPeriodId
  } = useAppStore();
  
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExceptionType | undefined>();
  const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | undefined>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [activeTab, setActiveTab] = useState<ExceptionStatus>('pending');
  
  const currentPeriod = taxPeriods.find(p => p.id === currentTaxPeriodId);
  const periodName = currentPeriod?.periodName || '2026-05';
  
  const filteredExceptions = exceptions.filter(e => {
    const emp = employees.find(em => em.id === e.employeeId);
    
    const matchesSearch = !searchText 
      || e.description.includes(searchText)
      || (emp?.name && emp.name.includes(searchText))
      || e.source.includes(searchText);
    
    const matchesType = !typeFilter || e.type === typeFilter;
    const matchesSeverity = !severityFilter || e.severity === severityFilter;
    const matchesStatus = e.status === activeTab;
    
    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  });
  
  const pendingCount = exceptions.filter(e => e.status === 'pending').length;
  const resolvedCount = exceptions.filter(e => e.status === 'resolved').length;
  const ignoredCount = exceptions.filter(e => e.status === 'ignored').length;
  
  const errorCount = exceptions.filter(e => e.severity === 'error' && e.status === 'pending').length;
  const warningCount = exceptions.filter(e => e.severity === 'warning' && e.status === 'pending').length;
  const infoCount = exceptions.filter(e => e.severity === 'info' && e.status === 'pending').length;
  
  const handleViewDetail = (record: Exception) => {
    setSelectedException(record);
    setDetailModalVisible(true);
  };
  
  const handleResolve = (record: Exception) => {
    Modal.confirm({
      title: '确认处理异常',
      content: `确认已处理「${getExceptionTypeName(record.type)}」异常吗？`,
      onOk: () => {
        resolveException(record.id, '薪酬专员');
        addAuditLog({
          entityType: 'exception',
          entityId: record.id,
          action: 'resolve_exception',
          operator: '薪酬专员',
          timestamp: new Date().toISOString(),
          source: '异常中心',
          remark: `处理异常：${getExceptionTypeName(record.type)}`
        });
        message.success('异常已标记为已处理');
      }
    });
  };
  
  const handleIgnore = (record: Exception) => {
    Modal.confirm({
      title: '确认忽略异常',
      content: `确认要忽略「${getExceptionTypeName(record.type)}」异常吗？此操作不会影响计算结果。`,
      okText: '确认忽略',
      okButtonProps: { danger: true },
      onOk: () => {
        ignoreException(record.id);
        addAuditLog({
          entityType: 'exception',
          entityId: record.id,
          action: 'update',
          operator: '薪酬专员',
          timestamp: new Date().toISOString(),
          source: '异常中心',
          remark: `忽略异常：${getExceptionTypeName(record.type)}`
        });
        message.success('异常已忽略');
      }
    });
  };

  return (
    <div>
      <Card 
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WarningOutlined style={{ color: '#f97316' }} />
            异常中心 - {periodName}
          </div>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => message.info('正在重新检测异常...')}
            >
              重新检测
            </Button>
            <Button 
              type="primary"
              onClick={() => navigate('/calculation')}
            >
              返回计算
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Statistic 
              title="待处理异常" 
              value={pendingCount} 
              prefix={<WarningOutlined />}
              valueStyle={{ color: pendingCount > 0 ? '#dc2626' : '#10b981' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="错误" 
              value={errorCount} 
              valueStyle={{ color: '#dc2626' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="警告" 
              value={warningCount} 
              valueStyle={{ color: '#f97316' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="提示" 
              value={infoCount} 
              valueStyle={{ color: '#2563eb' }}
            />
          </Col>
        </Row>
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="搜索异常描述、员工、来源"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="筛选类型"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setTypeFilter(value)}
          >
            <Option value="deduction_mismatch">扣除月份错位</Option>
            <Option value="backpay_cross_period">补发跨税期</Option>
            <Option value="social_security_after_resign">离职后社保</Option>
            <Option value="data_inconsistency">数据不一致</Option>
            <Option value="calculation_error">计算提示</Option>
          </Select>
          <Select
            placeholder="筛选严重程度"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setSeverityFilter(value)}
          >
            <Option value="error">错误</Option>
            <Option value="warning">警告</Option>
            <Option value="info">提示</Option>
          </Select>
        </div>
      </Card>
      
      <Card 
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as ExceptionStatus)}
          style={{ padding: '0 24px' }}
          items={[
            { 
              key: 'pending', 
              label: `待处理 (${pendingCount})` 
            },
            { 
              key: 'resolved', 
              label: `已处理 (${resolvedCount})` 
            },
            { 
              key: 'ignored', 
              label: `已忽略 (${ignoredCount})` 
            }
          ]}
        />
        
        {filteredExceptions.length > 0 ? (
          <Table
            dataSource={filteredExceptions}
            rowKey="id"
            columns={[
              {
                title: '异常类型',
                dataIndex: 'type',
                width: 140,
                render: (type: ExceptionType) => (
                  <Tag color={getSeverityColor(filteredExceptions.find(e => e.type === type)?.severity || 'info')}>
                    {getExceptionTypeName(type)}
                  </Tag>
                )
              },
              {
                title: '严重程度',
                dataIndex: 'severity',
                width: 100,
                align: 'center',
                render: (severity: ExceptionSeverity) => (
                  <Tag color={getSeverityColor(severity)}>
                    {severity === 'error' ? <CloseCircleOutlined /> : severity === 'warning' ? <WarningOutlined /> : <SearchOutlined />}
                    {' '}{getSeverityName(severity)}
                  </Tag>
                )
              },
              {
                title: '员工',
                dataIndex: 'employeeName',
                width: 100,
                render: (name, record) => {
                  const emp = employees.find(e => e.id === record.employeeId);
                  return (
                    <div>
                      <div style={{ fontWeight: 500, color: '#1f2937' }}>{name || emp?.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{emp?.department}</div>
                    </div>
                  );
                }
              },
              {
                title: '异常描述',
                dataIndex: 'description',
                ellipsis: true,
                render: (text) => (
                  <span style={{ color: '#374151' }}>{text}</span>
                )
              },
              {
                title: '来源',
                dataIndex: 'source',
                width: 180,
                render: (text) => (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{text}</span>
                )
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                width: 160,
                render: (time) => new Date(time).toLocaleString('zh-CN')
              },
              {
                title: '操作',
                key: 'action',
                width: 180,
                fixed: 'right',
                render: (_, record) => (
                  <Space size="small">
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetail(record)}
                    >
                      详情
                    </Button>
                    {activeTab === 'pending' && (
                      <>
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => handleResolve(record)}
                        >
                          处理
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          danger
                          onClick={() => handleIgnore(record)}
                        >
                          忽略
                        </Button>
                      </>
                    )}
                  </Space>
                )
              }
            ]}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        ) : (
          <Empty 
            description={
              activeTab === 'pending' 
                ? '暂无待处理异常' 
                : activeTab === 'resolved' 
                  ? '暂无已处理异常' 
                  : '暂无已忽略异常'
            }
            style={{ padding: '60px 0' }}
          />
        )}
      </Card>
      
      <Modal
        title="异常详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={selectedException?.status === 'pending' ? [
          <Button key="ignore" danger onClick={() => {
            handleIgnore(selectedException);
            setDetailModalVisible(false);
          }}>
            忽略此异常
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="resolve" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            onClick={() => {
              handleResolve(selectedException);
              setDetailModalVisible(false);
            }}
          >
            标记为已处理
          </Button>
        ] : [
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedException && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tag color={getSeverityColor(selectedException.severity)} style={{ fontSize: 14, padding: '4px 12px' }}>
                {getExceptionTypeName(selectedException.type)}
              </Tag>
              <Tag color={selectedException.status === 'pending' ? 'warning' : selectedException.status === 'resolved' ? 'success' : 'default'}>
                {selectedException.status === 'pending' ? '待处理' : selectedException.status === 'resolved' ? '已处理' : '已忽略'}
              </Tag>
            </div>
            
            <Card size="small" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.6, margin: 0 }}>
                {selectedException.description}
              </p>
            </Card>
            
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  影响字段
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedException.affectedFields.map((field, i) => (
                    <Tag key={i} color="blue" size="small">{field}</Tag>
                  ))}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  数据来源
                </div>
                <span style={{ fontSize: 13, color: '#374151' }}>
                  {selectedException.source}
                </span>
              </Col>
            </Row>
            
            <Card 
              size="small" 
              style={{ 
                background: '#eff6ff', 
                borderColor: '#bfdbfe',
                marginBottom: 16 
              }}
              title={
                <span style={{ color: '#2563eb' }}>
                  💡 处理建议
                </span>
              }
            >
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af' }}>
                {selectedException.suggestion}
              </p>
            </Card>
            
            {selectedException.resolvedAt && (
              <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                处理时间：{new Date(selectedException.resolvedAt).toLocaleString('zh-CN')}
                {selectedException.resolvedBy && ` · 处理人：${selectedException.resolvedBy}`}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Exceptions;
