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
  CheckCircleOutlined, 
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { ImportFile, Employee, SalaryItem, SpecialDeduction, BackPay, Resignation, DeductionType } from '../types';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store';
import { downloadSampleTemplate } from '../utils/exporter';

interface ParsedData {
  rows: Record<string, unknown>[];
  errors: string[];
}

const parseEmployeeSheet = (rows: Record<string, unknown>[]): { data: Employee[]; errors: string[] } => {
  const errors: string[] = [];
  const data: Employee[] = [];
  
  rows.forEach((row, i) => {
    const line = i + 2;
    const employeeNo = String(row['员工编号'] || '').trim();
    const name = String(row['姓名'] || '').trim();
    const department = String(row['部门'] || '').trim();
    const position = String(row['岗位'] || '').trim();
    const joinDate = String(row['入职日期'] || '').trim();
    const socialSecurityBase = Number(row['社保基数']) || 0;
    const housingFundBase = Number(row['公积金基数']) || 0;
    
    if (!employeeNo) { errors.push(`第${line}行：员工编号不能为空`); return; }
    if (!name) { errors.push(`第${line}行：姓名不能为空`); return; }
    if (!department) { errors.push(`第${line}行：部门不能为空`); return; }
    
    data.push({
      id: `emp-${employeeNo}`,
      name,
      employeeNo,
      department,
      position: position || '未指定',
      joinDate: joinDate || '2020-01-01',
      idCard: String(row['身份证号'] || ''),
      socialSecurityBase,
      housingFundBase: housingFundBase || socialSecurityBase,
      status: 'active'
    });
  });
  
  return { data, errors };
};

const parseSalarySheet = (rows: Record<string, unknown>[], taxPeriod: string): { data: SalaryItem[]; errors: string[] } => {
  const errors: string[] = [];
  const data: SalaryItem[] = [];
  
  rows.forEach((row, i) => {
    const line = i + 2;
    const employeeNo = String(row['员工编号'] || '').trim();
    const baseSalary = Number(row['基本工资']) || 0;
    const performanceBonus = Number(row['绩效奖金']) || 0;
    const overtimePay = Number(row['加班费']) || 0;
    const allowance = Number(row['津贴']) || 0;
    const otherIncome = Number(row['其他收入']) || 0;
    const socialSecurityPersonal = Number(row['社保个人']) || 0;
    const housingFundPersonal = Number(row['公积金个人']) || 0;
    const otherDeduction = Number(row['其他扣款']) || 0;
    
    if (!employeeNo) { errors.push(`第${line}行：员工编号不能为空`); return; }
    if (baseSalary <= 0) { errors.push(`第${line}行：基本工资必须大于0`); return; }
    
    data.push({
      id: `sal-imp-${employeeNo}-${taxPeriod.replace('-', '')}`,
      employeeId: `emp-${employeeNo}`,
      taxPeriod,
      baseSalary,
      performanceBonus,
      overtimePay,
      allowance,
      otherIncome,
      socialSecurityPersonal,
      housingFundPersonal,
      otherDeduction
    });
  });
  
  return { data, errors };
};

const parseDeductionSheet = (rows: Record<string, unknown>[]): { data: SpecialDeduction[]; errors: string[] } => {
  const errors: string[] = [];
  const data: SpecialDeduction[] = [];
  const validTypes: DeductionType[] = ['children_education', 'continuing_education', 'housing_loan', 'housing_rent', 'elderly_care', 'infant_care'];
  
  rows.forEach((row, i) => {
    const line = i + 2;
    const employeeNo = String(row['员工编号'] || '').trim();
    const deductionType = String(row['扣除类型'] || '').trim() as DeductionType;
    const amount = Number(row['金额']) || 0;
    const effectiveMonth = String(row['生效月份'] || '').trim();
    
    if (!employeeNo) { errors.push(`第${line}行：员工编号不能为空`); return; }
    if (!validTypes.includes(deductionType)) { errors.push(`第${line}行：扣除类型「${deductionType}」无效，有效值：${validTypes.join(', ')}`); return; }
    if (amount <= 0) { errors.push(`第${line}行：金额必须大于0`); return; }
    if (!effectiveMonth) { errors.push(`第${line}行：生效月份不能为空`); return; }
    
    data.push({
      id: `ded-imp-${employeeNo}-${deductionType}-${effectiveMonth}`,
      employeeId: `emp-${employeeNo}`,
      deductionType,
      amount,
      effectiveMonth,
      expiryMonth: row['失效月份'] ? String(row['失效月份']) : undefined,
      source: 'system_import',
      isLocked: false
    });
  });
  
  return { data, errors };
};

const parseBackPaySheet = (rows: Record<string, unknown>[]): { data: BackPay[]; errors: string[] } => {
  const errors: string[] = [];
  const data: BackPay[] = [];
  
  rows.forEach((row, i) => {
    const line = i + 2;
    const employeeNo = String(row['员工编号'] || '').trim();
    const originalPeriod = String(row['原所属期'] || '').trim();
    const targetPeriod = String(row['目标期'] || '').trim();
    const amount = Number(row['金额']) || 0;
    const reason = String(row['原因'] || '').trim();
    const taxAdjustment = Number(row['税额调整']) || 0;
    
    if (!employeeNo) { errors.push(`第${line}行：员工编号不能为空`); return; }
    if (!originalPeriod) { errors.push(`第${line}行：原所属期不能为空`); return; }
    if (!targetPeriod) { errors.push(`第${line}行：目标期不能为空`); return; }
    if (amount <= 0) { errors.push(`第${line}行：金额必须大于0`); return; }
    
    const originalYear = parseInt(originalPeriod.split('-')[0]);
    const targetYear = parseInt(targetPeriod.split('-')[0]);
    
    data.push({
      id: `back-imp-${employeeNo}-${originalPeriod.replace('-', '')}`,
      employeeId: `emp-${employeeNo}`,
      originalPeriod,
      targetPeriod,
      amount,
      reason: reason || '补发工资',
      taxAdjustment,
      isCrossPeriod: originalYear !== targetYear
    });
  });
  
  return { data, errors };
};

const parseResignationSheet = (rows: Record<string, unknown>[]): { data: Resignation[]; errors: string[] } => {
  const errors: string[] = [];
  const data: Resignation[] = [];
  
  rows.forEach((row, i) => {
    const line = i + 2;
    const employeeNo = String(row['员工编号'] || '').trim();
    const resignationDate = String(row['离职日期'] || '').trim();
    const socialSecurityEndMonth = String(row['社保截止月'] || '').trim();
    const housingFundEndMonth = String(row['公积金截止月'] || '').trim();
    const severancePay = Number(row['补偿金']) || 0;
    
    if (!employeeNo) { errors.push(`第${line}行：员工编号不能为空`); return; }
    if (!resignationDate) { errors.push(`第${line}行：离职日期不能为空`); return; }
    
    data.push({
      id: `res-imp-${employeeNo}`,
      employeeId: `emp-${employeeNo}`,
      resignationDate,
      lastWorkingDay: resignationDate,
      socialSecurityEndMonth: socialSecurityEndMonth || resignationDate.substring(0, 7),
      housingFundEndMonth: housingFundEndMonth || resignationDate.substring(0, 7),
      hasSeverancePay: severancePay > 0,
      severancePayAmount: severancePay
    });
  });
  
  return { data, errors };
};

const readExcelFile = (file: File): Promise<Record<string, unknown>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

const DataImport: React.FC = () => {
  const { 
    importFiles, 
    addImportFile, 
    updateImportFile, 
    removeImportFile,
    setEmployees,
    setSalaryItems,
    setSpecialDeductions,
    setBackPayRecords,
    setResignations,
    addAuditLog,
    currentTaxPeriodId,
    taxPeriods,
    employees: existingEmployees
  } = useAppStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');
  const [parsedResults, setParsedResults] = useState<Map<string, ParsedData>>(new Map());
  const [isImporting, setIsImporting] = useState(false);
  
  const currentPeriod = taxPeriods.find(p => p.id === currentTaxPeriodId);
  const taxPeriod = currentPeriod?.periodName?.replace('年', '-').replace('月', '') || '2026-05';
  
  const fileTypes = [
    { type: 'employee', name: '员工档案', icon: '👥', color: '#2563eb' },
    { type: 'salary', name: '工资项', icon: '💰', color: '#10b981' },
    { type: 'deduction', name: '专项扣除', icon: '📝', color: '#f97316' },
    { type: 'backpay', name: '补发记录', icon: '📋', color: '#8b5cf6' },
    { type: 'resignation', name: '离职记录', icon: '🚪', color: '#dc2626' },
    { type: 'tax_preview', name: '个税试算', icon: '🧮', color: '#0891b2' },
  ];
  
  const handleFileUpload = async (type: string, file: File) => {
    const newFile: ImportFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      type: type as ImportFile['type'],
      status: 'uploading',
      rowCount: 0,
      errorCount: 0,
      uploadedAt: new Date().toISOString()
    };
    
    addImportFile(newFile);
    setCurrentStep(1);
    
    try {
      const rows = await readExcelFile(file);
      
      updateImportFile(newFile.id, { 
        status: 'validating', 
        rowCount: rows.length 
      });
      
      let parsed: ParsedData;
      
      switch (type) {
        case 'employee': {
          const result = parseEmployeeSheet(rows);
          parsed = { rows, errors: result.errors };
          break;
        }
        case 'salary': {
          const result = parseSalarySheet(rows, taxPeriod);
          parsed = { rows, errors: result.errors };
          break;
        }
        case 'deduction': {
          const result = parseDeductionSheet(rows);
          parsed = { rows, errors: result.errors };
          break;
        }
        case 'backpay': {
          const result = parseBackPaySheet(rows);
          parsed = { rows, errors: result.errors };
          break;
        }
        case 'resignation': {
          const result = parseResignationSheet(rows);
          parsed = { rows, errors: result.errors };
          break;
        }
        default:
          parsed = { rows, errors: [] };
      }
      
      setParsedResults(prev => new Map(prev).set(newFile.id, parsed));
      
      updateImportFile(newFile.id, { 
        status: parsed.errors.length > 0 ? 'invalid' : 'valid',
        errorCount: parsed.errors.length,
        errors: parsed.errors.length > 0 ? parsed.errors.slice(0, 10) : undefined
      });
      
      setCurrentStep(2);
      
      if (parsed.errors.length === 0) {
        message.success(`${file.name} 解析成功，共 ${rows.length} 行数据`);
      } else {
        message.warning(`${file.name} 解析完成，${parsed.errors.length} 个错误`);
      }
    } catch {
      updateImportFile(newFile.id, { 
        status: 'invalid', 
        errorCount: 1,
        errors: ['文件解析失败，请检查文件格式是否正确']
      });
      message.error('文件解析失败');
    }
    
    return false;
  };
  
  const handlePreview = (file: ImportFile) => {
    const parsed = parsedResults.get(file.id);
    if (parsed && parsed.rows.length > 0) {
      const previewRows = parsed.rows.slice(0, 20);
      setPreviewData(previewRows);
      setPreviewTitle(`${file.name} - 数据预览`);
    } else {
      setPreviewData([]);
      setPreviewTitle(`${file.name} - 暂无数据`);
    }
    setPreviewVisible(true);
  };
  
  const handleConfirmImport = async () => {
    setIsImporting(true);
    setCurrentStep(3);
    
    let totalImported = 0;
    
    for (const file of importFiles) {
      if (file.status !== 'valid') continue;
      
      const parsed = parsedResults.get(file.id);
      if (!parsed) continue;
      
      try {
        switch (file.type) {
          case 'employee': {
            const result = parseEmployeeSheet(parsed.rows);
            if (result.data.length > 0) {
              const merged = [...existingEmployees];
              result.data.forEach(emp => {
                const idx = merged.findIndex(e => e.employeeNo === emp.employeeNo);
                if (idx >= 0) {
                  merged[idx] = { ...merged[idx], ...emp };
                } else {
                  merged.push(emp);
                }
              });
              setEmployees(merged);
              totalImported += result.data.length;
            }
            break;
          }
          case 'salary': {
            const result = parseSalarySheet(parsed.rows, taxPeriod);
            if (result.data.length > 0) {
              setSalaryItems(result.data);
              totalImported += result.data.length;
            }
            break;
          }
          case 'deduction': {
            const result = parseDeductionSheet(parsed.rows);
            if (result.data.length > 0) {
              setSpecialDeductions(result.data);
              totalImported += result.data.length;
            }
            break;
          }
          case 'backpay': {
            const result = parseBackPaySheet(parsed.rows);
            if (result.data.length > 0) {
              setBackPayRecords(result.data);
              totalImported += result.data.length;
            }
            break;
          }
          case 'resignation': {
            const result = parseResignationSheet(parsed.rows);
            if (result.data.length > 0) {
              setResignations(result.data);
              totalImported += result.data.length;
            }
            break;
          }
        }
        
        addAuditLog({
          entityType: file.type === 'employee' ? 'employee' 
            : file.type === 'salary' ? 'salary' 
            : file.type === 'deduction' ? 'deduction' 
            : file.type === 'backpay' ? 'backpay' 
            : 'salary',
          entityId: file.id,
          action: 'import',
          operator: '薪酬专员',
          timestamp: new Date().toISOString(),
          source: '数据导入',
          remark: `导入${fileTypes.find(f => f.type === file.type)?.name || file.type}数据：${file.name}，共${parsed.rows.length}行`
        });
      } catch {
        message.error(`导入 ${file.name} 失败`);
      }
    }
    
    setIsImporting(false);
    message.success(`数据导入完成，共导入 ${totalImported} 条记录`);
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
  
  const allValid = importFiles.length > 0 && importFiles.some(f => f.status === 'valid');
  
  const previewColumns = previewData.length > 0 
    ? Object.keys(previewData[0]).map(key => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        width: 120,
        render: (val: unknown) => String(val ?? '')
      }))
    : [];

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
                      beforeUpload={(file) => {
                        handleFileUpload(fileType.type, file);
                        return false;
                      }}
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
                <li style={{ marginBottom: 4 }}>专项扣除类型可选：children_education / continuing_education / housing_loan / housing_rent / elderly_care / infant_care</li>
                <li>数据导入后会覆盖当前同类数据</li>
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
              <Button 
                type="primary" 
                icon={<ImportOutlined />}
                onClick={handleConfirmImport}
                disabled={!allValid}
                loading={isImporting}
              >
                确认导入到系统
              </Button>
              <Button danger onClick={() => {
                importFiles.forEach(f => removeImportFile(f.id));
                setParsedResults(new Map());
              }}>
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
                    {record.errors && record.errors.length > 0 && (
                      <Button 
                        type="link" 
                        size="small" 
                        danger
                        onClick={() => {
                          Modal.error({
                            title: '数据校验错误',
                            content: (
                              <div>
                                {record.errors?.map((err, i) => (
                                  <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>{err}</div>
                                ))}
                              </div>
                            ),
                            width: 500
                          });
                        }}
                      >
                        查看错误
                      </Button>
                    )}
                    <Button 
                      type="link" 
                      size="small" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        removeImportFile(record.id);
                        setParsedResults(prev => {
                          const next = new Map(prev);
                          next.delete(record.id);
                          return next;
                        });
                      }}
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
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
      >
        {previewData.length > 0 ? (
          <>
            <Table
              dataSource={previewData.map((row, i) => ({ ...row, _key: i }))}
              columns={previewColumns}
              rowKey="_key"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 16 }}>
              显示前 {Math.min(previewData.length, 20)} 条数据（共 {previewData.length} 行）
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            暂无数据预览
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DataImport;
