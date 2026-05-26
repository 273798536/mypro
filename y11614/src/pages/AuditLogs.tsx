import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select,
  Row,
  Col,
  Statistic,
  List,
  Timeline
} from 'antd';
import { 
  HistoryOutlined, 
  DownloadOutlined,
  SearchOutlined,
  UserOutlined,
  FileExcelOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store';
import { AuditLog, AuditAction, AuditEntityType } from '../types';

const { Search } = Input;
const { Option } = Select;

const AuditLogs: React.FC = () => {
  const { auditLogs, employees } = useAppStore();
  
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>();
  const [entityTypeFilter, setEntityTypeFilter] = useState<AuditEntityType | undefined>();
  const [operatorFilter, setOperatorFilter] = useState<string | undefined>();
  
  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'create': return <PlusOutlined />;
      case 'update': return <EditOutlined />;
      case 'delete': return <DeleteOutlined />;
      case 'import': return <FileExcelOutlined />;
      case 'export': return <DownloadOutlined />;
      case 'recalculate': return <ReloadOutlined />;
      case 'lock': return <CheckCircleOutlined />;
      case 'unlock': return <ReloadOutlined />;
      default: return <HistoryOutlined />;
    }
  };
  
  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'create': return 'green';
      case 'update': return 'blue';
      case 'delete': return 'red';
      case 'import': return 'cyan';
      case 'export': return 'purple';
      case 'recalculate': return 'orange';
      case 'lock': return 'success';
      case 'unlock': return 'warning';
      default: return 'default';
    }
  };
  
  const getActionName = (action: AuditAction) => {
    switch (action) {
      case 'create': return '新增';
      case 'update': return '更新';
      case 'delete': return '删除';
      case 'import': return '导入';
      case 'export': return '导出';
      case 'recalculate': return '重算';
      case 'lock': return '锁定';
      case 'unlock': return '解锁';
      case 'resolve_exception': return '处理异常';
      case 'ignore_exception': return '忽略异常';
      default: return '操作';
    }
  };
  
  const getEntityTypeName = (type: AuditEntityType) => {
    switch (type) {
      case 'employee': return '员工档案';
      case 'salary_item': return '工资项';
      case 'special_deduction': return '专项扣除';
      case 'back_pay': return '补发记录';
      case 'resignation': return '离职记录';
      case 'tax_period': return '税期';
      case 'calculation': return '工资计算';
      case 'exception': return '异常';
      case 'report': return '报告';
      case 'template': return '模板';
      default: return '其他';
    }
  };
  
  const operators = useMemo(() => {
    const set = new Set(auditLogs.map(log => log.operator));
    return Array.from(set);
  }, [auditLogs]);
  
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = !searchText 
        || log.remark?.includes(searchText)
        || log.operator.includes(searchText)
        || log.source.includes(searchText);
      
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesEntityType = !entityTypeFilter || log.entityType === entityTypeFilter;
      const matchesOperator = !operatorFilter || log.operator === operatorFilter;
      
      return matchesSearch && matchesAction && matchesEntityType && matchesOperator;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchText, actionFilter, entityTypeFilter, operatorFilter]);
  
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = auditLogs.filter(l => new Date(l.timestamp) >= today);
    const imports = auditLogs.filter(l => l.action === 'import').length;
    const exports = auditLogs.filter(l => l.action === 'export').length;
    const recalculations = auditLogs.filter(l => l.action === 'recalculate').length;
    
    return {
      total: auditLogs.length,
      today: todayLogs.length,
      imports,
      exports,
      recalculations
    };
  }, [auditLogs]);
  
  const recentLogs = useMemo(() => {
    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [auditLogs]);

  return (
    <div>
      <Card 
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HistoryOutlined style={{ color: '#8b5cf6' }} />
            操作日志
          </div>
        }
        extra={
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => console.log('导出审计日志')}
          >
            导出日志
          </Button>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Statistic 
              title="总操作数" 
              value={stats.total} 
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="今日操作" 
              value={stats.today} 
              valueStyle={{ color: '#2563eb' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="数据导入" 
              value={stats.imports} 
              prefix={<FileExcelOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="报表导出" 
              value={stats.exports} 
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#f97316' }}
            />
          </Col>
        </Row>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Search
            placeholder="搜索操作内容、操作人、来源"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="操作类型"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setActionFilter(value)}
          >
            <Option value="create">新增</Option>
            <Option value="update">更新</Option>
            <Option value="delete">删除</Option>
            <Option value="import">导入</Option>
            <Option value="export">导出</Option>
            <Option value="recalculate">重算</Option>
            <Option value="lock">锁定</Option>
            <Option value="unlock">解锁</Option>
          </Select>
          <Select
            placeholder="数据类型"
            allowClear
            style={{ width: 130 }}
            onChange={(value) => setEntityTypeFilter(value)}
          >
            <Option value="employee">员工档案</Option>
            <Option value="salary_item">工资项</Option>
            <Option value="special_deduction">专项扣除</Option>
            <Option value="back_pay">补发记录</Option>
            <Option value="resignation">离职记录</Option>
            <Option value="tax_period">税期</Option>
            <Option value="calculation">工资计算</Option>
            <Option value="exception">异常</Option>
            <Option value="report">报告</Option>
          </Select>
          <Select
            placeholder="操作人"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setOperatorFilter(value)}
          >
            {operators.map(op => (
              <Option key={op} value={op}>{op}</Option>
            ))}
          </Select>
        </div>
      </Card>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            bodyStyle={{ padding: 0 }}
            title="日志详情"
          >
            <Table
              dataSource={filteredLogs}
              rowKey="id"
              columns={[
                {
                  title: '时间',
                  dataIndex: 'timestamp',
                  width: 160,
                  render: (time) => (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(time).toLocaleString('zh-CN')}
                    </span>
                  )
                },
                {
                  title: '操作人',
                  dataIndex: 'operator',
                  width: 100,
                  render: (text) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserOutlined style={{ color: '#9ca3af' }} />
                      <span>{text}</span>
                    </div>
                  )
                },
                {
                  title: '操作',
                  dataIndex: 'action',
                  width: 90,
                  align: 'center',
                  render: (action: AuditAction) => (
                    <Tag color={getActionColor(action)} icon={getActionIcon(action)}>
                      {getActionName(action)}
                    </Tag>
                  )
                },
                {
                  title: '类型',
                  dataIndex: 'entityType',
                  width: 100,
                  render: (type: AuditEntityType) => (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {getEntityTypeName(type)}
                    </span>
                  )
                },
                {
                  title: '操作描述',
                  dataIndex: 'remark',
                  ellipsis: true,
                  render: (text) => (
                    <span style={{ color: '#374151' }}>{text || '-'}</span>
                  )
                },
                {
                  title: '来源',
                  dataIndex: 'source',
                  width: 120,
                  render: (text) => (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{text}</span>
                  )
                }
              ]}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            title="最近操作"
            size="small"
          >
            <Timeline
              mode="left"
              items={recentLogs.map((log, index) => ({
                color: index === 0 ? '#2563eb' : '#d1d5db',
                label: (
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ),
                children: (
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: '#1f2937', marginBottom: 2 }}>
                      <Tag color={getActionColor(log.action)} style={{ marginRight: 6 }}>
                        {getActionName(log.action)}
                      </Tag>
                      {getEntityTypeName(log.entityType)}
                    </div>
                    {log.remark && (
                      <div style={{ color: '#6b7280', fontSize: 11 }}>
                        {log.remark}
                      </div>
                    )}
                    <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>
                      {log.operator} · {log.source}
                    </div>
                  </div>
                )
              }))}
            />
          </Card>
          
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: 16 }}
            title="操作说明"
            size="small"
          >
            <List
              size="small"
              dataSource={[
                '所有数据修改操作都会被记录，包括新增、更新、删除',
                '数据导入和报表导出操作都会留下审计痕迹',
                '工资重算、税期锁定等关键操作会被详细记录',
                '异常处理操作（处理/忽略）会被记录操作人、时间和原因',
                '操作日志不可删除，保留至少 90 天'
              ]}
              renderItem={(item) => (
                <List.Item style={{ fontSize: 12, color: '#6b7280', padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} />
                  {item}
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AuditLogs;
