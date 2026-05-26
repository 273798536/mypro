import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Switch, 
  Modal, 
  message,
  Row,
  Col,
  Statistic,
  Divider
} from 'antd';
import { 
  CalendarOutlined, 
  LockOutlined, 
  UnlockOutlined, 
  EyeOutlined,
  PlusOutlined,
  TeamOutlined,
  MoneyCollectOutlined,
  CalculatorOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { formatCurrency } from '../utils/calculator';

const TaxPeriods: React.FC = () => {
  const navigate = useNavigate();
  const { 
    taxPeriods, 
    currentTaxPeriodId, 
    setCurrentTaxPeriod,
    lockTaxPeriod,
    unlockTaxPeriod,
    addAuditLog
  } = useAppStore();
  
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [lockAction, setLockAction] = useState<'lock' | 'unlock'>('lock');
  
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
  
  const handleLockClick = (period: any, action: 'lock' | 'unlock') => {
    setSelectedPeriod(period);
    setLockAction(action);
    setLockModalVisible(true);
  };
  
  const handleConfirmLock = () => {
    if (lockAction === 'lock') {
      lockTaxPeriod(selectedPeriod.id);
      addAuditLog({
        entityType: 'tax_period',
        entityId: selectedPeriod.id,
        action: 'lock',
        operator: '薪酬专员',
        timestamp: new Date().toISOString(),
        source: '税期管理',
        remark: `锁定税期：${selectedPeriod.periodName}`
      });
      message.success(`已锁定 ${selectedPeriod.periodName}`);
    } else {
      unlockTaxPeriod(selectedPeriod.id);
      addAuditLog({
        entityType: 'tax_period',
        entityId: selectedPeriod.id,
        action: 'unlock',
        operator: '薪酬专员',
        timestamp: new Date().toISOString(),
        source: '税期管理',
        remark: `解锁税期：${selectedPeriod.periodName}`
      });
      message.success(`已解锁 ${selectedPeriod.periodName}`);
    }
    setLockModalVisible(false);
  };
  
  const currentPeriod = taxPeriods.find(p => p.id === currentTaxPeriodId);
  
  return (
    <div>
      {currentPeriod && (
        <Card 
          style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CalendarOutlined style={{ color: '#2563eb' }} />
              当前税期：{currentPeriod.periodName}
              <Tag color={getStatusColor(currentPeriod.status)}>
                {getStatusText(currentPeriod.status)}
              </Tag>
            </div>
          }
          extra={
            <Space>
              {currentPeriod.status === 'in_progress' && (
                <Button 
                  type="primary" 
                  icon={<LockOutlined />}
                  onClick={() => handleLockClick(currentPeriod, 'lock')}
                >
                  锁定税期
                </Button>
              )}
              {currentPeriod.status === 'locked' && (
                <Button 
                  icon={<UnlockOutlined />}
                  onClick={() => handleLockClick(currentPeriod, 'unlock')}
                >
                  解锁税期
                </Button>
              )}
              <Button 
                type="primary" 
                ghost
                onClick={() => navigate('/calculation')}
              >
                开始计算
              </Button>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic 
                title="员工总数" 
                value={currentPeriod.totalEmployees} 
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#2563eb' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic 
                title="工资总额" 
                value={currentPeriod.totalSalary} 
                prefix="¥"
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#10b981' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic 
                title="个税总额" 
                value={currentPeriod.totalTax} 
                prefix="¥"
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#f97316' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic 
                title="异常数量" 
                value={currentPeriod.exceptionCount} 
                prefix={<WarningOutlined />}
                valueStyle={{ color: currentPeriod.exceptionCount > 0 ? '#dc2626' : '#10b981' }}
              />
            </Col>
          </Row>
        </Card>
      )}
      
      <Card 
        title="历史税期"
        style={{ borderRadius: 8, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            新建税期
          </Button>
        }
      >
        <Table
          dataSource={taxPeriods}
          rowKey="id"
          rowClassName={(record) => record.id === currentTaxPeriodId ? 'bg-blue-50' : ''}
          columns={[
            {
              title: '税期名称',
              dataIndex: 'periodName',
              width: 150,
              render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarOutlined style={{ color: '#2563eb' }} />
                  <span style={{ fontWeight: record.id === currentTaxPeriodId ? 600 : 400 }}>
                    {text}
                  </span>
                  {record.id === currentTaxPeriodId && (
                    <Tag color="blue" size="small">当前</Tag>
                  )}
                </div>
              )
            },
            {
              title: '开始日期',
              dataIndex: 'startDate',
              width: 120,
            },
            {
              title: '结束日期',
              dataIndex: 'endDate',
              width: 120,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (status) => (
                <Tag color={getStatusColor(status)}>
                  {getStatusText(status)}
                </Tag>
              )
            },
            {
              title: '员工数',
              dataIndex: 'totalEmployees',
              width: 80,
              align: 'center',
              render: (count) => `${count} 人`
            },
            {
              title: '工资总额',
              dataIndex: 'totalSalary',
              width: 120,
              align: 'right',
              render: (value) => formatCurrency(value)
            },
            {
              title: '个税总额',
              dataIndex: 'totalTax',
              width: 120,
              align: 'right',
              render: (value) => formatCurrency(value)
            },
            {
              title: '异常',
              dataIndex: 'exceptionCount',
              width: 80,
              align: 'center',
              render: (count) => count > 0 ? (
                <Tag color="error" icon={<WarningOutlined />}>{count}</Tag>
              ) : (
                <Tag color="success">0</Tag>
              )
            },
            {
              title: '扣除锁定',
              dataIndex: 'isLocked',
              width: 100,
              align: 'center',
              render: (locked, record) => (
                <Switch
                  checked={locked}
                  checkedChildren={<LockOutlined />}
                  unCheckedChildren={<UnlockOutlined />}
                  onChange={(checked) => handleLockClick(record, checked ? 'lock' : 'unlock')}
                  disabled={record.status === 'completed'}
                />
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
                    onClick={() => {
                      setCurrentTaxPeriod(record.id);
                      navigate('/calculation');
                    }}
                  >
                    查看
                  </Button>
                  {record.id !== currentTaxPeriodId && record.status !== 'completed' && (
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => {
                        setCurrentTaxPeriod(record.id);
                        message.success(`已切换到 ${record.periodName}`);
                      }}
                    >
                      切换
                    </Button>
                  )}
                </Space>
              )
            }
          ]}
          pagination={false}
        />
      </Card>
      
      <Modal
        title={lockAction === 'lock' ? '确认锁定税期' : '确认解锁税期'}
        open={lockModalVisible}
        onOk={handleConfirmLock}
        onCancel={() => setLockModalVisible(false)}
        okText={lockAction === 'lock' ? '确认锁定' : '确认解锁'}
        okButtonProps={{ danger: lockAction === 'lock' }}
      >
        <p>
          {lockAction === 'lock' 
            ? `锁定后，${selectedPeriod?.periodName} 的所有扣除项将无法修改。确认要锁定吗？`
            : `解锁后，${selectedPeriod?.periodName} 的扣除项将可以修改。确认要解锁吗？`
          }
        </p>
        {lockAction === 'lock' && (
          <p style={{ color: '#f97316', fontSize: 12 }}>
            ⚠️ 锁定后将无法导入新数据或修改工资项
          </p>
        )}
      </Modal>
    </div>
  );
};

export default TaxPeriods;
