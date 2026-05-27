import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Timeline,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Row,
  Col,
  Alert,
  Popconfirm,
  Tooltip,
  Divider,
} from 'antd';
import {
  ArrowLeft,
  Edit3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  History,
  Users,
  FileText,
  TrendingUp,
  Save,
  X,
  Check,
} from 'lucide-react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { useBillStore } from '@/store/billStore';
import { formatCurrency } from '@/services/calculationService';
import { getRiskSummary, hasHighRisk } from '@/services/riskService';
import { STATUS_LABELS, RISK_LEVEL_LABELS } from '@/types';
import type { Bill } from '@/types';

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bills, updateBill, updateEndorsement, recalculateBill, resolveRisk, updateBillStatus, exportBills } = useBillStore();
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editForm] = Form.useForm();
  const [editingEndorsement, setEditingEndorsement] = useState<string | null>(null);
  const [endorsementForm] = Form.useForm();
  const [operator] = useState('当前操作员');
  
  useEffect(() => {
    if (id) {
      const found = bills.find(b => b.id === id);
      setBill(found || null);
    }
  }, [id, bills]);
  
  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <p className="text-gray-500">票据不存在</p>
          <Button onClick={() => navigate('/')} className="mt-4">返回列表</Button>
        </Card>
      </div>
    );
  }
  
  const riskSummary = getRiskSummary(bill.risks);
  const unresolvedRisks = bill.risks.filter(r => !r.resolved);
  const hasHigh = hasHighRisk(bill.risks);
  
  const handleEditField = (field: string) => {
    setEditingField(field);
    editForm.setFieldsValue({
      [field]: bill[field as keyof Bill],
    });
  };
  
  const handleSaveField = async () => {
    try {
      const values = await editForm.validateFields();
      const reason = window.prompt('请输入修改原因：');
      if (!reason) {
        message.warning('请输入修改原因');
        return;
      }
      updateBill(bill.id, values, operator, reason);
      message.success('修改已保存');
      setEditingField(null);
      editForm.resetFields();
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleEditEndorsement = (endorsementId: string) => {
    const endorsement = bill.endorsements.find(e => e.id === endorsementId);
    if (endorsement) {
      setEditingEndorsement(endorsementId);
      endorsementForm.setFieldsValue(endorsement);
    }
  };
  
  const handleSaveEndorsement = async () => {
    try {
      const values = await endorsementForm.validateFields();
      const reason = window.prompt('请输入修改原因：');
      if (!reason) {
        message.warning('请输入修改原因');
        return;
      }
      updateEndorsement(bill.id, editingEndorsement!, values, operator, reason);
      message.success('背书记录已更新');
      setEditingEndorsement(null);
      endorsementForm.resetFields();
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleRecalculate = () => {
    Modal.confirm({
      title: '确认重新计算',
      content: '将使用当前参数重新计算贴现利息，是否继续？',
      onOk: () => {
        recalculateBill(bill.id, operator);
        message.success('已重新计算');
      },
    });
  };
  
  const handleResolveRisk = (index: number) => {
    Modal.confirm({
      title: '标记风险为已解决',
      content: '确认该风险已核实处理？',
      onOk: () => {
        resolveRisk(bill.id, index, operator);
        message.success('已标记为已解决');
      },
    });
  };
  
  const handleApprove = () => {
    if (hasHigh) {
      message.error('存在未解决的高风险，无法通过审核');
      return;
    }
    const reason = window.prompt('请输入审核意见：');
    if (reason !== null) {
      updateBillStatus(bill.id, 'approved', operator, reason || '审核通过');
      message.success('审核通过');
    }
  };
  
  const handleReject = () => {
    const reason = window.prompt('请输入驳回原因：');
    if (reason) {
      updateBillStatus(bill.id, 'rejected', operator, reason);
      message.success('已驳回');
    }
  };
  
  const handleExport = () => {
    exportBills([bill.id]);
    message.success('已导出');
  };
  
  const getEndorsementChartOption = () => {
    const sorted = [...bill.endorsements].sort((a, b) => a.sequence - b.sequence);
    const nodes = sorted.map((e, i) => ({
      name: `第${e.sequence}手`,
      value: `${e.endorser}\n↓\n${e.endorsee}`,
      itemStyle: {
        color: e.isBroken ? '#f5222d' : '#1890ff',
      },
    }));
    
    const links = sorted.slice(0, -1).map((e, i) => {
      const next = sorted[i + 1];
      const isBroken = e.endorsee.trim() !== next.endorser.trim();
      return {
        source: i,
        target: i + 1,
        lineStyle: {
          color: isBroken ? '#f5222d' : '#d9d9d9',
          type: isBroken ? 'dashed' : 'solid',
          width: isBroken ? 3 : 2,
        },
        label: {
          show: isBroken,
          formatter: '断裂!',
          color: '#f5222d',
        },
      };
    });
    
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const idx = params.dataIndex;
            const e = sorted[idx];
            return `
              <div style="padding: 8px;">
                <div><strong>第${e.sequence}手背书</strong></div>
                <div>背书人：${e.endorser}</div>
                <div>被背书人：${e.endorsee}</div>
                <div>日期：${e.date}</div>
                ${e.isBroken ? '<div style="color:#f5222d">链路断裂</div>' : ''}
              </div>
            `;
          }
          return '';
        },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        symbolSize: 60,
        roam: false,
        label: {
          show: true,
          formatter: '{b}',
          fontSize: 12,
          width: 100,
          overflow: 'break',
        },
        edgeLabel: {
          show: true,
          formatter: '{b}',
          fontSize: 11,
        },
        force: {
          repulsion: 300,
          edgeLength: 150,
        },
        data: nodes,
        links: links,
        lineStyle: {
          curveness: 0,
        },
      }],
    };
  };
  
  const endorsementColumns = [
    {
      title: '序号',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 80,
    },
    {
      title: '背书人',
      dataIndex: 'endorser',
      key: 'endorser',
      render: (text: string, record: any) => (
        editingEndorsement === record.id ? (
          <Form.Item name="endorser" noStyle>
            <Input />
          </Form.Item>
        ) : (
          <span className={record.isBroken ? 'text-red-600' : ''}>{text}</span>
        )
      ),
    },
    {
      title: '被背书人',
      dataIndex: 'endorsee',
      key: 'endorsee',
      render: (text: string, record: any) => (
        editingEndorsement === record.id ? (
          <Form.Item name="endorsee" noStyle>
            <Input />
          </Form.Item>
        ) : (
          <span className={record.isBroken ? 'text-red-600 font-medium' : ''}>{text}</span>
        )
      ),
    },
    {
      title: '背书日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (text: string, record: any) => (
        editingEndorsement === record.id ? (
          <Form.Item name="date" noStyle>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          text
        )
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record: any) => (
        record.isBroken ? (
          <Tag color="error">链路断裂</Tag>
        ) : (
          <Tag color="success">正常</Tag>
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record: any) => (
        editingEndorsement === record.id ? (
          <Space>
            <Button size="small" type="primary" icon={<Save size={12} />} onClick={handleSaveEndorsement}>
              保存
            </Button>
            <Button size="small" icon={<X size={12} />} onClick={() => setEditingEndorsement(null)}>
              取消
            </Button>
          </Space>
        ) : (
          <Button size="small" type="link" icon={<Edit3 size={12} />} onClick={() => handleEditEndorsement(record.id)}>
            修正
          </Button>
        )
      ),
    },
  ];
  
  const renderFieldValue = (field: string, value: any, label: string) => {
    if (editingField === field) {
      return (
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name={field} noStyle>
            {field === 'amount' || field === 'discountRate' ? (
              <InputNumber style={{ width: 'calc(100% - 120px)' }} />
            ) : field === 'dueDate' || field === 'issueDate' ? (
              <DatePicker style={{ width: 'calc(100% - 120px)' }} />
            ) : field === 'discountRateVersion' ? (
              <Select style={{ width: 'calc(100% - 120px)' }}>
                <Select.Option value="v2.1">v2.1 (最新)</Select.Option>
                <Select.Option value="v2.0">v2.0</Select.Option>
                <Select.Option value="v1.0">v1.0</Select.Option>
              </Select>
            ) : (
              <Input style={{ width: 'calc(100% - 120px)' }} />
            )}
          </Form.Item>
          <Button type="primary" icon={<Check size={12} />} onClick={handleSaveField}>保存</Button>
          <Button icon={<X size={12} />} onClick={() => setEditingField(null)}>取消</Button>
        </Space.Compact>
      );
    }
    
    return (
      <Space>
        <span>{value}</span>
        <Tooltip title={`修改${label}`}>
          <Button type="text" size="small" icon={<Edit3 size={12} />} onClick={() => handleEditField(field)} />
        </Tooltip>
      </Space>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-900 text-white px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Space>
            <Button icon={<ArrowLeft size={14} />} onClick={() => navigate('/')}>
              返回列表
            </Button>
            <div>
              <h1 className="text-lg font-bold">票据详情 - {bill.billNumber}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Tag color={hasHigh ? 'error' : riskSummary.total > 0 ? 'warning' : 'success'}>
                  {hasHigh ? '存在高风险' : riskSummary.total > 0 ? `存在${riskSummary.total}项风险` : '无风险'}
                </Tag>
                <Tag color={
                  bill.status === 'approved' ? 'success' :
                  bill.status === 'rejected' ? 'error' :
                  bill.status === 'modified' ? 'warning' : 'processing'
                }>
                  {STATUS_LABELS[bill.status]}
                </Tag>
              </div>
            </div>
          </Space>
          <Space>
            <Button icon={<Download size={14} />} onClick={handleExport}>
              导出
            </Button>
            <Popconfirm
              title="确认驳回"
              description="确定要驳回此票据吗？"
              onConfirm={handleReject}
              okText="确认驳回"
              cancelText="取消"
            >
              <Button danger icon={<XCircle size={14} />}>
                驳回
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<CheckCircle size={14} />}
              onClick={handleApprove}
              disabled={hasHigh}
            >
              {hasHigh ? '存在高风险' : '审核通过'}
            </Button>
          </Space>
        </div>
      </div>
      
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {unresolvedRisks.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className={hasHigh ? 'text-red-500' : 'text-orange-500'} />
              <h3 className="text-lg font-semibold">风险提示</h3>
            </div>
            <div className="space-y-3">
              {unresolvedRisks.map((risk, index) => (
                <Alert
                  key={index}
                  type={risk.level === 'high' ? 'error' : 'warning'}
                  showIcon
                  message={
                    <Space className="w-full" style={{ justifyContent: 'space-between' }}>
                      <span>
                        <Tag color={risk.level === 'high' ? 'error' : 'warning'}>
                          {RISK_LEVEL_LABELS[risk.level]}
                        </Tag>
                        {risk.message}
                      </span>
                      <Button size="small" onClick={() => handleResolveRisk(index)}>
                        标记已解决
                      </Button>
                    </Space>
                  }
                />
              ))}
            </div>
          </Card>
        )}
        
        <Row gutter={16}>
          <Col span={16}>
            <Card title="基本信息" extra={<FileText size={16} />}>
              <Form form={editForm}>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="票据号码">
                    {renderFieldValue('billNumber', bill.billNumber, '票据号码')}
                  </Descriptions.Item>
                  <Descriptions.Item label="数据来源">
                    {bill.source}
                  </Descriptions.Item>
                  <Descriptions.Item label="票面金额">
                    {renderFieldValue('amount', formatCurrency(bill.amount), '票面金额')}
                  </Descriptions.Item>
                  <Descriptions.Item label="申请人">
                    {renderFieldValue('applicant', bill.applicant, '申请人')}
                  </Descriptions.Item>
                  <Descriptions.Item label="出票日期">
                    {renderFieldValue('issueDate', bill.issueDate, '出票日期')}
                  </Descriptions.Item>
                  <Descriptions.Item label="到期日">
                    {renderFieldValue('dueDate', bill.dueDate, '到期日')}
                  </Descriptions.Item>
                  <Descriptions.Item label="贴现率">
                    {renderFieldValue('discountRate', `${bill.discountRate}%`, '贴现率')}
                  </Descriptions.Item>
                  <Descriptions.Item label="贴现率版本">
                    {renderFieldValue('discountRateVersion', bill.discountRateVersion, '贴现率版本')}
                  </Descriptions.Item>
                </Descriptions>
              </Form>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card
              title="利息计算"
              extra={
                <Button size="small" icon={<RefreshCw size={12} />} onClick={handleRecalculate}>
                  重新计算
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">计息天数</div>
                  <div className="text-2xl font-bold text-blue-600 font-mono">{bill.calculation.days} 天</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">贴现利息</div>
                  <div className="text-2xl font-bold text-orange-600 font-mono">
                    {formatCurrency(bill.calculation.discountAmount)}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">实付金额</div>
                  <div className="text-2xl font-bold text-green-600 font-mono">
                    {formatCurrency(bill.calculation.actualAmount)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-1">计算公式：</div>
                  <div className="font-mono">{bill.calculation.formula}</div>
                  <div className="mt-2">计算版本：{bill.calculation.version}</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
        
        <Card title={<span className="flex items-center gap-2"><Users size={16} />背书链路</span>}>
          <div className="h-64 mb-4 border rounded-lg p-4 bg-gray-50">
            <ReactECharts option={getEndorsementChartOption()} style={{ height: '100%' }} />
          </div>
          <Form form={endorsementForm}>
            <Table
              rowKey="id"
              columns={endorsementColumns}
              dataSource={[...bill.endorsements].sort((a, b) => a.sequence - b.sequence)}
              pagination={false}
              size="small"
            />
          </Form>
        </Card>
        
        <Card title={<span className="flex items-center gap-2"><History size={16} />修正历史</span>}>
          {bill.auditLogs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无修正记录</p>
          ) : (
            <Timeline
              items={[...bill.auditLogs].reverse().map(log => ({
                color: log.field === 'status' && log.newValue === 'approved' ? 'green' :
                       log.field === 'status' && log.newValue === 'rejected' ? 'red' : 'blue',
                children: (
                  <Card size="small" className="mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Tag color="blue">{log.fieldLabel}</Tag>
                        <span className="ml-2">
                          <span className="text-gray-500 line-through">{log.oldValue}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{log.newValue}</span>
                        </span>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>{log.operator}</div>
                        <div>{log.timestamp}</div>
                      </div>
                    </div>
                    {log.reason && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        原因：{log.reason}
                      </div>
                    )}
                  </Card>
                ),
              }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
