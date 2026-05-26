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
  Progress,
  Row,
  Col,
  Statistic,
  Divider
} from 'antd';
import { 
  CalculatorOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  EditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { formatCurrency } from '../utils/calculator';
import { getExceptionTypeName, getSeverityColor } from '../utils/exceptionDetector';
import { calculateSalary } from '../utils/calculator';

const { Search } = Input;
const { Option } = Select;

const Calculation: React.FC = () => {
  const navigate = useNavigate();
  const { 
    employees, 
    salaryCalculations, 
    specialDeductions,
    backPayRecords,
    salaryItems,
    exceptions,
    taxPeriods,
    currentTaxPeriodId,
    addAuditLog,
    updateSalaryCalculation,
    setSalaryCalculations
  } = useAppStore();
  
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const currentPeriod = taxPeriods.find(p => p.id === currentTaxPeriodId);
  const periodName = currentPeriod?.periodName || '2026-05';
  
  const departments = [...new Set(employees.map(e => e.department))];
  
  const filteredCalculations = salaryCalculations.filter(calc => {
    const emp = employees.find(e => e.id === calc.employeeId);
    if (!emp) return false;
    
    const matchesSearch = emp.name.includes(searchText) 
      || emp.employeeNo.includes(searchText)
      || emp.department.includes(searchText);
    
    const matchesDept = !departmentFilter || emp.department === departmentFilter;
    
    return matchesSearch && matchesDept;
  });
  
  const employeeExceptions = exceptions.filter(e => e.taxPeriod === periodName);
  
  const getEmployeeExceptions = (employeeId: string) => {
    return employeeExceptions.filter(e => e.employeeId === employeeId);
  };
  
  const handleCalculateAll = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const newCalculations = salaryItems.map(item => 
        calculateSalary(item, specialDeductions, backPayRecords, periodName)
      );
      
      setSalaryCalculations(newCalculations);
      
      addAuditLog({
        entityType: 'calculation',
        entityId: 'batch',
        action: 'calculate',
        operator: '薪酬专员',
        timestamp: new Date().toISOString(),
        source: '工资计算',
        remark: `批量计算${periodName}工资，共${newCalculations.length}人`
      });
      
      setIsCalculating(false);
      message.success('工资计算完成');
    }, 2000);
  };
  
  const handleRecalculate = (record: any) => {
    const salaryItem = salaryItems.find(s => s.employeeId === record.employeeId && s.taxPeriod === periodName);
    if (!salaryItem) return;
    
    const newCalc = calculateSalary(salaryItem, specialDeductions, backPayRecords, periodName);
    updateSalaryCalculation(record.id, { ...newCalc, calculationStatus: 'recalculated' });
    
    addAuditLog({
      entityType: 'calculation',
      entityId: record.id,
      action: 'calculate',
      operator: '薪酬专员',
      timestamp: new Date().toISOString(),
      source: '工资计算',
      remark: `重新计算员工工资`
    });
    
    message.success('重新计算完成');
  };
  
  const handleViewDetail = (record: any) => {
    const emp = employees.find(e => e.id === record.employeeId);
    const empDeductions = specialDeductions.filter(d => d.employeeId === record.employeeId);
    const empBackPay = backPayRecords.find(b => b.employeeId === record.employeeId && b.targetPeriod === periodName);
    const empExceptions = getEmployeeExceptions(record.employeeId);
    
    setSelectedCalc({
      ...record,
      employee: emp,
      deductions: empDeductions,
      backPay: empBackPay,
      exceptions: empExceptions
    });
    setDetailModalVisible(true);
  };
  
  const totalGross = salaryCalculations.reduce((sum, c) => sum + c.grossSalary, 0);
  const totalTax = salaryCalculations.reduce((sum, c) => sum + c.taxAmount, 0);
  const totalNet = salaryCalculations.reduce((sum, c) => sum + c.netSalary, 0);
  
  const deductionTypeNames: Record<string, string> = {
    'children_education': '子女教育',
    'continuing_education': '继续教育',
    'housing_loan': '住房贷款利息',
    'housing_rent': '住房租金',
    'elderly_care': '赡养老人',
    'infant_care': '0-3岁婴幼儿照护'
  };

  return (
    <div>
      <Card 
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalculatorOutlined style={{ color: '#2563eb' }} />
            工资计算 - {periodName}
            {currentPeriod && (
              <Tag color={currentPeriod.isLocked ? 'warning' : 'processing'}>
                {currentPeriod.isLocked ? <LockOutlined /> : null}
                {currentPeriod.isLocked ? '已锁定' : '处理中'}
              </Tag>
            )}
          </div>
        }
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<CalculatorOutlined />}
              onClick={handleCalculateAll}
              loading={isCalculating}
              disabled={currentPeriod?.isLocked}
            >
              重新计算全部
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => navigate('/reports')}
            >
              导出报告
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Statistic 
              title="应发工资总计" 
              value={totalGross} 
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: '#2563eb', fontSize: 20 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="个税总计" 
              value={totalTax} 
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: '#f97316', fontSize: 20 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="实发工资总计" 
              value={totalNet} 
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: '#10b981', fontSize: 20 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="计算完成" 
              value={salaryCalculations.length} 
              suffix={`/ ${employees.filter(e => e.status === 'active').length} 人`}
              valueStyle={{ color: '#8b5cf6', fontSize: 20 }}
            />
          </Col>
        </Row>
        
        {isCalculating && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={60} status="active" />
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 8 }}>
              正在计算中，请稍候...
            </p>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="搜索员工姓名、工号、部门"
            allowClear
            style={{ width: 250 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            placeholder="筛选部门"
            allowClear
            style={{ width: 150 }}
            onChange={setDepartmentFilter}
          >
            {departments.map(dept => (
              <Option key={dept} value={dept}>{dept}</Option>
            ))}
          </Select>
        </div>
        
        <Table
          dataSource={filteredCalculations}
          rowKey="id"
          scroll={{ x: 1200 }}
          columns={[
            {
              title: '员工信息',
              key: 'employee',
              width: 180,
              fixed: 'left',
              render: (_, record) => {
                const emp = employees.find(e => e.id === record.employeeId);
                const empExceptions = getEmployeeExceptions(record.employeeId);
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500, color: '#1f2937' }}>{emp?.name}</span>
                      {empExceptions.length > 0 && (
                        <Tag color="error" icon={<WarningOutlined />}>
                          {empExceptions.length}
                        </Tag>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {emp?.employeeNo} · {emp?.department}
                    </div>
                  </div>
                );
              }
            },
            {
              title: '应发工资',
              dataIndex: 'grossSalary',
              width: 120,
              align: 'right',
              render: (value) => <span style={{ fontWeight: 500 }}>{formatCurrency(value)}</span>
            },
            {
              title: '社保个人',
              dataIndex: 'socialSecurityPersonal',
              width: 100,
              align: 'right',
              render: (value) => formatCurrency(value)
            },
            {
              title: '公积金个人',
              dataIndex: 'housingFundPersonal',
              width: 100,
              align: 'right',
              render: (value) => formatCurrency(value)
            },
            {
              title: '专项扣除',
              dataIndex: 'specialDeductionTotal',
              width: 100,
              align: 'right',
              render: (value) => formatCurrency(value)
            },
            {
              title: '应纳税所得额',
              dataIndex: 'taxableIncome',
              width: 120,
              align: 'right',
              render: (value) => formatCurrency(value)
            },
            {
              title: '个税',
              dataIndex: 'taxAmount',
              width: 100,
              align: 'right',
              render: (value) => <span style={{ color: '#f97316' }}>{formatCurrency(value)}</span>
            },
            {
              title: '补发调整',
              dataIndex: 'backPayAdjustment',
              width: 100,
              align: 'right',
              render: (value) => value > 0 ? <span style={{ color: '#8b5cf6' }}>{formatCurrency(value)}</span> : '-'
            },
            {
              title: '实发工资',
              dataIndex: 'netSalary',
              width: 120,
              align: 'right',
              fixed: 'right',
              render: (value) => <span style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(value)}</span>
            },
            {
              title: '状态',
              dataIndex: 'calculationStatus',
              width: 100,
              align: 'center',
              render: (status) => (
                <Tag color={status === 'calculated' ? 'success' : status === 'recalculated' ? 'processing' : 'default'}>
                  {status === 'calculated' ? '已计算' : status === 'recalculated' ? '已重算' : '待计算'}
                </Tag>
              )
            },
            {
              title: '操作',
              key: 'action',
              width: 150,
              fixed: 'right',
              render: (_, record) => (
                <Space size="small">
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(record)}
                  >
                    明细
                  </Button>
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<ReloadOutlined />}
                    onClick={() => handleRecalculate(record)}
                    disabled={currentPeriod?.isLocked}
                  >
                    重算
                  </Button>
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
      </Card>
      
      <Modal
        title="工资明细"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="recalculate" 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={() => {
              handleRecalculate(selectedCalc);
              setDetailModalVisible(false);
            }}
            disabled={currentPeriod?.isLocked}
          >
            重新计算
          </Button>
        ]}
        width={700}
      >
        {selectedCalc && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, marginBottom: 12, color: '#1f2937' }}>
                {selectedCalc.employee?.name}
                <Tag style={{ marginLeft: 8 }}>{selectedCalc.employee?.department}</Tag>
                <Tag style={{ marginLeft: 8 }}>{selectedCalc.employee?.employeeNo}</Tag>
              </h3>
            </div>
            
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="收入明细">
                  <div style={{ fontSize: 13, lineHeight: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>基本工资</span>
                      <span>{formatCurrency(selectedCalc.employee?.socialSecurityBase || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>绩效奖金</span>
                      <span>{formatCurrency(Math.floor((selectedCalc.employee?.socialSecurityBase || 0) * 0.3))}</span>
                    </div>
                    {selectedCalc.backPay && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6' }}>
                        <span>补发工资</span>
                        <span>{formatCurrency(selectedCalc.backPay.amount)}</span>
                      </div>
                    )}
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>应发工资</span>
                      <span style={{ color: '#2563eb' }}>{formatCurrency(selectedCalc.grossSalary)}</span>
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card size="small" title="扣除明细">
                  <div style={{ fontSize: 13, lineHeight: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>社保个人</span>
                      <span>{formatCurrency(selectedCalc.socialSecurityPersonal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>公积金个人</span>
                      <span>{formatCurrency(selectedCalc.housingFundPersonal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>起征点</span>
                      <span>{formatCurrency(5000)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>专项扣除合计</span>
                      <span>{formatCurrency(selectedCalc.specialDeductionTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f97316' }}>
                      <span>个人所得税</span>
                      <span>{formatCurrency(selectedCalc.taxAmount)}</span>
                    </div>
                    {selectedCalc.backPayAdjustment > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6' }}>
                        <span>补发税额调整</span>
                        <span>{formatCurrency(selectedCalc.backPayAdjustment)}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
            
            {selectedCalc.deductions?.length > 0 && (
              <Card 
                size="small" 
                title="专项扣除明细" 
                style={{ marginTop: 16 }}
              >
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  {selectedCalc.deductions.map((d: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>
                        {deductionTypeNames[d.deductionType]}
                        {d.isLocked && <LockOutlined style={{ marginLeft: 4, color: '#f97316' }} />}
                      </span>
                      <span>{formatCurrency(d.amount)} / 月</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {selectedCalc.exceptions?.length > 0 && (
              <Card 
                size="small" 
                title={
                  <span style={{ color: '#dc2626' }}>
                    <WarningOutlined style={{ marginRight: 4 }} />
                    异常提醒 ({selectedCalc.exceptions.length})
                  </span>
                } 
                style={{ marginTop: 16, borderColor: '#fecaca' }}
              >
                {selectedCalc.exceptions.map((e: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < selectedCalc.exceptions.length - 1 ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Tag color={getSeverityColor(e.severity)}>
                        {getExceptionTypeName(e.type)}
                      </Tag>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>来源: {e.source}</span>
                    </div>
                    <p style={{ fontSize: 13, margin: 0, color: '#374151' }}>{e.description}</p>
                    <p style={{ fontSize: 12, margin: '4px 0 0 0', color: '#2563eb' }}>💡 {e.suggestion}</p>
                  </div>
                ))}
              </Card>
            )}
            
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              background: '#f0fdf4', 
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: 13 }}>实发工资</span>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                  {formatCurrency(selectedCalc.netSalary)}
                </div>
              </div>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#10b981' }} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Calculation;
