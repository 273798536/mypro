import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Select,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  List,
  Progress,
  Descriptions,
  Divider,
  Alert
} from 'antd';
import { 
  FileExcelOutlined, 
  FilePdfOutlined, 
  EyeOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  MoneyCollectOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store';
import { exportToExcel, exportToPDF, downloadSampleTemplate } from '../utils/exporter';
import { formatCurrency } from '../utils/calculator';

const { Option } = Select;

const Reports: React.FC = () => {
  const { 
    employees, 
    salaryCalculations, 
    exceptions, 
    specialDeductions, 
    backPayRecords,
    taxPeriods,
    currentTaxPeriodId,
    addAuditLog
  } = useAppStore();
  
  const [selectedPeriodId, setSelectedPeriodId] = useState(currentTaxPeriodId);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const currentPeriod = taxPeriods.find(p => p.id === selectedPeriodId);
  const periodName = currentPeriod?.periodName || '2026-05';
  const isLocked = currentPeriod?.isLocked || false;
  const periodKey = currentPeriod?.periodName?.replace('年', '-').replace('月', '') || '2026-05';
  
  const periodCalculations = salaryCalculations.filter(c => c.taxPeriodId === selectedPeriodId);
  const periodExceptions = exceptions.filter(e => e.taxPeriod === periodKey);
  const periodDeductions = specialDeductions.filter(d => d.effectiveMonth <= periodKey);
  const periodBackPay = backPayRecords.filter(b => b.targetPeriod === periodKey);
  
  const stats = useMemo(() => {
    const totalGross = periodCalculations.reduce((sum, c) => sum + c.grossSalary, 0);
    const totalTax = periodCalculations.reduce((sum, c) => sum + c.taxAmount, 0);
    const totalNet = periodCalculations.reduce((sum, c) => sum + c.netSalary, 0);
    const totalBackPay = periodBackPay.reduce((sum, b) => sum + b.amount, 0);
    const totalDeductions = periodDeductions.reduce((sum, d) => sum + d.amount, 0);
    
    const pendingExceptions = periodExceptions.filter(e => e.status === 'pending').length;
    const resolvedExceptions = periodExceptions.filter(e => e.status === 'resolved').length;
    
    return {
      employeeCount: periodCalculations.length,
      totalGross,
      totalTax,
      totalNet,
      totalBackPay,
      totalDeductions,
      pendingExceptions,
      resolvedExceptions,
      exceptionRate: periodCalculations.length > 0 
        ? Math.round((periodExceptions.length / periodCalculations.length) * 100) 
        : 0,
      accuracyScore: periodCalculations.length > 0
        ? Math.round(((periodCalculations.length - pendingExceptions) / periodCalculations.length) * 100)
        : 100
    };
  }, [periodCalculations, periodExceptions, periodDeductions, periodBackPay]);
  
  const departmentSummary = useMemo(() => {
    const deptMap = new Map<string, { count: number; gross: number; tax: number; net: number }>();
    
    periodCalculations.forEach(calc => {
      const emp = employees.find(e => e.id === calc.employeeId);
      const dept = emp?.department || '未知部门';
      
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { count: 0, gross: 0, tax: 0, net: 0 });
      }
      
      const deptData = deptMap.get(dept)!;
      deptData.count += 1;
      deptData.gross += calc.grossSalary;
      deptData.tax += calc.taxAmount;
      deptData.net += calc.netSalary;
    });
    
    return Array.from(deptMap.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  }, [periodCalculations, employees]);
  
  const topTaxPayers = useMemo(() => {
    return [...periodCalculations]
      .sort((a, b) => b.taxAmount - a.taxAmount)
      .slice(0, 5)
      .map(calc => {
        const emp = employees.find(e => e.id === calc.employeeId);
        return {
          ...calc,
          name: emp?.name || '未知',
          department: emp?.department || '未知'
        };
      });
  }, [periodCalculations, employees]);
  
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportToExcel(
        employees,
        periodCalculations,
        periodExceptions,
        periodDeductions,
        periodBackPay,
        currentPeriod
      );
      addAuditLog({
        entityType: 'report',
        entityId: periodName,
        action: 'export',
        operator: '薪酬专员',
        timestamp: new Date().toISOString(),
        source: '报告中心',
        remark: `导出 ${periodName} 工资报表（Excel）`
      });
      message.success('Excel 报表导出成功');
    } catch (error) {
      message.error('导出失败：' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };
  
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF(
        employees,
        periodCalculations,
        periodExceptions,
        currentPeriod
      );
      addAuditLog({
        entityType: 'report',
        entityId: periodName,
        action: 'export',
        operator: '薪酬专员',
        timestamp: new Date().toISOString(),
        source: '报告中心',
        remark: `导出 ${periodName} 工资报表（PDF）`
      });
      message.success('PDF 报表导出成功');
    } catch (error) {
      message.error('导出失败：' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };
  
  const handleDownloadTemplate = () => {
    downloadSampleTemplate();
    addAuditLog({
      entityType: 'template',
      entityId: 'sample',
      action: 'download',
      operator: '薪酬专员',
      timestamp: new Date().toISOString(),
      source: '报告中心',
      remark: '下载数据导入样例模板'
    });
    message.success('样例模板下载成功');
  };
  
  const reportSections = [
    {
      title: '员工工资明细',
      description: '包含所有员工的工资构成、扣除项、个税计算明细',
      icon: <TeamOutlined style={{ fontSize: 24, color: '#2563eb' }} />
    },
    {
      title: '专项扣除汇总',
      description: '子女教育、继续教育、住房贷款利息、赡养老人等专项附加扣除',
      icon: <MoneyCollectOutlined style={{ fontSize: 24, color: '#10b981' }} />
    },
    {
      title: '补发工资明细',
      description: '跨税期补发工资的明细记录和税额调整',
      icon: <MoneyCollectOutlined style={{ fontSize: 24, color: '#f97316' }} />
    },
    {
      title: '异常检测报告',
      description: '扣除月份错位、补发跨税期、离职后社保等异常检测结果',
      icon: <WarningOutlined style={{ fontSize: 24, color: '#dc2626' }} />
    },
    {
      title: '部门汇总统计',
      description: '按部门分组的工资总额、个税总额、人均工资统计',
      icon: <BarChartOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />
    }
  ];

  return (
    <div>
      <Card 
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileExcelOutlined style={{ color: '#10b981' }} />
            报告中心
          </div>
        }
        extra={
          <Space>
            <Select
              style={{ width: 150 }}
              value={selectedPeriodId}
              onChange={setSelectedPeriodId}
            >
              {taxPeriods.map(period => (
                <Option key={period.id} value={period.id}>
                  {period.periodName} {period.isLocked ? '(已锁定)' : ''}
                </Option>
              ))}
            </Select>
            <Button 
              icon={<HistoryOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载样例模板
            </Button>
            <Button 
              icon={<EyeOutlined />}
              onClick={() => setPreviewModalVisible(true)}
            >
              预览报告
            </Button>
            <Button 
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={exporting}
            >
              导出 Excel
            </Button>
            <Button 
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={exporting}
            >
              导出 PDF
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#f0fdf4', border: 'none' }}>
              <Statistic 
                title="员工人数" 
                value={stats.employeeCount} 
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#10b981' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#eff6ff', border: 'none' }}>
              <Statistic 
                title="应发工资总计" 
                value={stats.totalGross} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#2563eb' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#fef2f2', border: 'none' }}>
              <Statistic 
                title="个税总计" 
                value={stats.totalTax} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#dc2626' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: '#faf5ff', border: 'none' }}>
              <Statistic 
                title="实发工资总计" 
                value={stats.totalNet} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#8b5cf6' }}
              />
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} sm={8}>
            <Card size="small">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>补发工资</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#f97316' }}>
                    ¥{formatCurrency(stats.totalBackPay)}
                  </div>
                </div>
                <Tag color="orange">{periodBackPay.length} 笔</Tag>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>专项扣除</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }}>
                    ¥{formatCurrency(stats.totalDeductions)}
                  </div>
                </div>
                <Tag color="green">{periodDeductions.length} 条</Tag>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small">
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>数据质量评分</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: stats.accuracyScore >= 90 ? '#10b981' : stats.accuracyScore >= 70 ? '#f97316' : '#dc2626' }}>
                    {stats.accuracyScore}分
                  </span>
                </div>
                <Progress 
                  percent={stats.accuracyScore} 
                  showInfo={false}
                  strokeColor={stats.accuracyScore >= 90 ? '#10b981' : stats.accuracyScore >= 70 ? '#f97316' : '#dc2626'}
                  size="small"
                />
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                待处理异常: {stats.pendingExceptions} 条 · 已处理: {stats.resolvedExceptions} 条
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            title="报告内容"
          >
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 1 }}
              dataSource={reportSections}
              renderItem={(item) => (
                <List.Item>
                  <Card size="small" hoverable style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 8, 
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                          {item.description}
                        </div>
                      </div>
                      <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            title="部门汇总"
            size="small"
          >
            {departmentSummary.map(dept => (
              <div key={dept.name} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{dept.name}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{dept.count} 人</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                  <span>应发: ¥{formatCurrency(dept.gross)}</span>
                  <span>实发: ¥{formatCurrency(dept.net)}</span>
                </div>
                <Progress 
                  percent={dept.gross > 0 ? Math.round((dept.net / dept.gross) * 100) : 0} 
                  showInfo={false}
                  size="small"
                  strokeColor="#2563eb"
                  style={{ marginTop: 4 }}
                />
              </div>
            ))}
          </Card>
          
          <Card 
            style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: 16 }}
            title="个税缴纳 TOP 5"
            size="small"
          >
            {topTaxPayers.map((payer, index) => (
              <div 
                key={payer.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < topTaxPayers.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'blue'}>
                    {index + 1}
                  </Tag>
                  <div>
                    <div style={{ fontSize: 13, color: '#1f2937' }}>{payer.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{payer.department}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#dc2626' }}>
                  ¥{formatCurrency(payer.taxAmount)}
                </div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
      
      <Modal
        title={`${periodName} 工资报表预览`}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button key="excel" icon={<FileExcelOutlined />} onClick={() => {
            handleExportExcel();
            setPreviewModalVisible(false);
          }}>
            导出 Excel
          </Button>,
          <Button key="pdf" type="primary" icon={<FilePdfOutlined />} onClick={() => {
            handleExportPDF();
            setPreviewModalVisible(false);
          }}>
            导出 PDF
          </Button>
        ]}
      >
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          <Card size="small" style={{ marginBottom: 16, background: '#f9fafb' }}>
            <Descriptions title="报表概览" column={2} size="small">
              <Descriptions.Item label="税期">{periodName}</Descriptions.Item>
              <Descriptions.Item label="状态">{isLocked ? '已锁定' : '编辑中'}</Descriptions.Item>
              <Descriptions.Item label="员工人数">{stats.employeeCount} 人</Descriptions.Item>
              <Descriptions.Item label="生成时间">{new Date().toLocaleString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="应发工资总额">{formatCurrency(stats.totalGross)} 元</Descriptions.Item>
              <Descriptions.Item label="实发工资总额">{formatCurrency(stats.totalNet)} 元</Descriptions.Item>
              <Descriptions.Item label="个税总额">{formatCurrency(stats.totalTax)} 元</Descriptions.Item>
              <Descriptions.Item label="异常待处理">{stats.pendingExceptions} 条</Descriptions.Item>
            </Descriptions>
          </Card>
          
          <Divider>工资明细</Divider>
          
          <Table
            dataSource={periodCalculations.slice(0, 10).map(c => {
              const emp = employees.find(e => e.id === c.employeeId);
              return { ...c, employeeName: emp?.name || '' };
            })}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '员工', dataIndex: 'employeeName', key: 'name', width: 100 },
              { title: '应发工资', dataIndex: 'grossSalary', key: 'gross', width: 100, render: (v: number) => `¥${formatCurrency(v)}` },
              { title: '社保', dataIndex: 'socialSecurityPersonal', key: 'ss', width: 80, render: (v: number) => `¥${formatCurrency(v)}` },
              { title: '公积金', dataIndex: 'housingFundPersonal', key: 'hf', width: 80, render: (v: number) => `¥${formatCurrency(v)}` },
              { title: '专项扣除', dataIndex: 'specialDeductionTotal', key: 'sd', width: 90, render: (v: number) => `¥${formatCurrency(v)}` },
              { title: '个税', dataIndex: 'taxAmount', key: 'tax', width: 80, render: (v: number) => `¥${formatCurrency(v)}` },
              { title: '实发工资', dataIndex: 'netSalary', key: 'net', width: 100, render: (v: number) => <span style={{ fontWeight: 500 }}>¥{formatCurrency(v)}</span> }
            ]}
          />
          
          {periodCalculations.length > 10 && (
            <div style={{ textAlign: 'center', padding: 12, color: '#6b7280', fontSize: 12 }}>
              ... 还有 {periodCalculations.length - 10} 条记录，完整内容请查看导出文件
            </div>
          )}
          
          {periodExceptions.length > 0 && (
            <>
              <Divider>异常提醒</Divider>
              <Alert
                message={`检测到 ${periodExceptions.length} 条异常`}
                description={
                  <div>
                    {periodExceptions.slice(0, 3).map((e, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <Tag color={e.severity === 'error' ? 'red' : e.severity === 'warning' ? 'orange' : 'blue'}>
                          {e.severity === 'error' ? '错误' : e.severity === 'warning' ? '警告' : '提示'}
                        </Tag>
                        <span style={{ fontSize: 12 }}>{e.description}</span>
                      </div>
                    ))}
                    {periodExceptions.length > 3 && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        还有 {periodExceptions.length - 3} 条异常，请在异常中心查看完整列表
                      </div>
                    )}
                  </div>
                }
                type="warning"
                showIcon
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Reports;
