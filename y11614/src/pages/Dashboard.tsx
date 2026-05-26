import React from 'react';
import { Card, Row, Col, Progress, Tag, Button, List } from 'antd';
import { 
  TeamOutlined, 
  MoneyCollectOutlined, 
  CalculatorOutlined, 
  WarningOutlined,
  ArrowRightOutlined,
  ImportOutlined,
  FileTextOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useAppStore } from '../store';
import { formatCurrency } from '../utils/calculator';
import { monthlyTrendData, exceptionTypeDistribution } from '../data/mockData';
import { getExceptionTypeName, getSeverityColor } from '../utils/exceptionDetector';

const COLORS = ['#dc2626', '#f97316', '#2563eb', '#10b981', '#8b5cf6'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    employees, 
    taxPeriods, 
    salaryCalculations, 
    exceptions,
    currentTaxPeriodId,
    auditLogs 
  } = useAppStore();
  
  const currentPeriod = taxPeriods.find(p => p.id === currentTaxPeriodId);
  const pendingExceptions = exceptions.filter(e => e.status === 'pending');
  const recentLogs = auditLogs.slice(0, 5);
  
  const totalSalary = salaryCalculations.reduce((sum, c) => sum + c.grossSalary, 0);
  const totalTax = salaryCalculations.reduce((sum, c) => sum + c.taxAmount, 0);
  const totalNet = salaryCalculations.reduce((sum, c) => sum + c.netSalary, 0);
  
  const quickActions = [
    { icon: <ImportOutlined />, title: '数据导入', desc: '导入员工、工资等数据', path: '/import', color: '#2563eb' },
    { icon: <CalculatorOutlined />, title: '工资计算', desc: '开始计算本月工资', path: '/calculation', color: '#10b981' },
    { icon: <WarningOutlined />, title: '处理异常', desc: `${pendingExceptions.length}条待处理`, path: '/exceptions', color: '#f97316' },
    { icon: <FileTextOutlined />, title: '生成报告', desc: '导出工资明细报告', path: '/reports', color: '#8b5cf6' },
  ];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_progress': return 'processing';
      case 'locked': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '未开始';
      case 'in_progress': return '处理中';
      case 'locked': return '已锁定';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            onClick={() => navigate('/tax-periods')}
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, marginBottom: 8 }}>当前税期</p>
                <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1f2937' }}>
                  {currentPeriod?.periodName}
                </p>
                <Tag color={getStatusColor(currentPeriod?.status || 'pending')} style={{ marginTop: 8 }}>
                  {getStatusText(currentPeriod?.status || 'pending')}
                </Tag>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: 'rgba(37, 99, 235, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ClockCircleOutlined style={{ fontSize: 24, color: '#2563eb' }} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, marginBottom: 8 }}>员工总数</p>
                <p style={{ fontSize: 28, fontWeight: 600, margin: 0, color: '#1f2937' }}>
                  {employees.length}
                </p>
                <p style={{ fontSize: 12, color: '#10b981', margin: 0, marginTop: 4 }}>
                  在职 {employees.filter(e => e.status === 'active').length} 人
                </p>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: 'rgba(16, 185, 129, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <TeamOutlined style={{ fontSize: 24, color: '#10b981' }} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, marginBottom: 8 }}>工资总额</p>
                <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#1f2937' }}>
                  {formatCurrency(totalSalary)}
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, marginTop: 4 }}>
                  实发 {formatCurrency(totalNet)}
                </p>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: 'rgba(37, 99, 235, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <MoneyCollectOutlined style={{ fontSize: 24, color: '#2563eb' }} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            onClick={() => navigate('/exceptions')}
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, marginBottom: 8 }}>待处理异常</p>
                <p style={{ fontSize: 28, fontWeight: 600, margin: 0, color: pendingExceptions.length > 0 ? '#dc2626' : '#10b981' }}>
                  {pendingExceptions.length}
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, marginTop: 4 }}>
                  共 {exceptions.length} 条异常
                </p>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: pendingExceptions.length > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <WarningOutlined style={{ fontSize: 24, color: pendingExceptions.length > 0 ? '#dc2626' : '#10b981' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {currentPeriod && (
        <Card 
          title="计算进度"
          style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <Progress 
                percent={100} 
                status="success"
                strokeColor={{
                  '0%': '#2563eb',
                  '100%': '#10b981',
                }}
              />
            </div>
            <div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>已完成计算</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
                {salaryCalculations.length} / {employees.filter(e => e.status === 'active').length} 人
              </p>
            </div>
            <Button type="primary" onClick={() => navigate('/calculation')}>
              查看明细 <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title="工资趋势"
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            extra={<Button type="link" onClick={() => navigate('/tax-periods')}>查看全部</Button>}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  />
                  <Legend />
                  <Bar dataKey="salary" name="工资总额" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tax" name="个税总额" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title="异常分布"
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            extra={<Button type="link" onClick={() => navigate('/exceptions')}>处理</Button>}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={exceptionTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ type, value }) => `${type}: ${value}`}
                    labelLine={false}
                  >
                    {exceptionTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="快捷操作"
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <Row gutter={[12, 12]}>
              {quickActions.map((action, index) => (
                <Col xs={12} key={index}>
                  <div 
                    onClick={() => navigate(action.path)}
                    style={{ 
                      padding: 16, 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 8, 
                        background: `${action.color}15`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <span style={{ fontSize: 20, color: action.color }}>{action.icon}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 500, color: '#1f2937' }}>{action.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{action.desc}</p>
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="最近操作"
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            extra={<Button type="link" onClick={() => navigate('/audit-logs')}>全部日志</Button>}
          >
            <List
              dataSource={recentLogs}
              renderItem={(log) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span style={{ color: '#1f2937' }}>
                        {log.operator} {log.action === 'create' ? '创建了' : log.action === 'update' ? '更新了' : log.action === 'calculate' ? '执行了' : log.action === 'lock' ? '锁定了' : log.action === 'resolve_exception' ? '处理了' : ''}
                        {log.entityType === 'tax_period' ? '税期' : log.entityType === 'employee' ? '员工' : log.entityType === 'deduction' ? '扣除项' : log.entityType === 'calculation' ? '计算' : log.entityType === 'exception' ? '异常' : ''}
                      </span>
                    }
                    description={
                      <div>
                        <span style={{ color: '#6b7280', fontSize: 12 }}>{log.remark}</span>
                        <br />
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>
                          {new Date(log.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
