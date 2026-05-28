
import { useState } from 'react';
import { Card, Row, Col, Progress, Table, Tag, Collapse, Button, Space, Tooltip } from 'antd';
import { AlertOutlined, ArrowUpOutlined, CheckCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { ExceptionRecord } from '../types';

const { Panel } = Collapse;

const exceptionTypeLabels: Record<string, string> = {
  refund_delay: '退费晚到',
  insurance_reject: '医保拒付',
  code_error: '编码错误',
};

const exceptionTypeColors: Record<string, string> = {
  refund_delay: 'orange',
  insurance_reject: 'red',
  code_error: 'purple',
};

export default function AdvanceLedger() {
  const ledgers = useStore((state) => state.ledgers);
  const exceptions = useStore((state) => state.exceptions);
  const patientBills = useStore((state) => state.patientBills);

  const [expandedKeys, setExpandedKeys] = useState<string[]>(['refund_delay', 'insurance_reject', 'code_error']);

  const getExceptionsByType = (type: string) => {
    return exceptions.filter((e) => e.type === type);
  };

  const getExceptionPanelHeader = (type: string) => {
    const list = getExceptionsByType(type);
    const totalAmount = list.reduce((sum, e) => sum + e.amount, 0);
    return (
      <Space>
        <Tag color={exceptionTypeColors[type]}>{exceptionTypeLabels[type]}</Tag>
        <span>{list.length} 条记录</span>
        <span className="text-red-600">涉及金额: ¥{totalAmount.toLocaleString()}</span>
      </Space>
    );
  };

  const exceptionColumns = [
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: ExceptionRecord) => (
        <div>
          <div>{text}</div>
          <div className="text-gray-500 text-sm mt-1">
            <span className="text-gray-400">位置：</span>
            {record.position}
          </div>
        </div>
      ),
    },
    {
      title: '金额(元)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <span className="text-red-600 font-medium">{v.toLocaleString()}</span>,
      width: 120,
    },
    {
      title: '关联单据',
      dataIndex: 'relatedBillId',
      key: 'relatedBillId',
      render: (id: string, record: ExceptionRecord) => (
        <Space direction="vertical" size={0}>
          <div className="text-blue-600 text-xs">账单: {record.relatedBillId}</div>
          {record.relatedSettlementId && (
            <div className="text-green-600 text-xs">结算单: {record.relatedSettlementId}</div>
          )}
        </Space>
      ),
      width: 120,
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="科室垫付汇总">
        <Row gutter={[16, 16]}>
          {ledgers.map((ledger) => {
            const recoveryRate =
              ledger.totalAdvance > 0
                ? ((ledger.totalRecovered / ledger.totalAdvance) * 100).toFixed(1)
                : '0';
            const deptExceptions = exceptions.filter(
              (e) =>
                patientBills.find((b) => b.billId === e.relatedBillId)?.departmentId ===
                ledger.departmentId
            );

            return (
              <Col span={8} key={ledger.ledgerId}>
                <Card
                  size="small"
                  className={`h-full ${deptExceptions.length > 0 ? 'border-orange-300' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{ledger.departmentName}</h3>
                      {deptExceptions.length > 0 && (
                        <Tag color="orange" icon={<AlertOutlined />}>
                          {deptExceptions.length} 个异常
                        </Tag>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>追偿进度</span>
                        <span>{recoveryRate}%</span>
                      </div>
                      <Progress
                        percent={parseFloat(recoveryRate)}
                        status={parseFloat(recoveryRate) < 50 ? 'exception' : 'active'}
                        size="small"
                      />
                    </div>

                    <Row gutter={8}>
                      <Col span={12}>
                        <div className="text-sm text-gray-500">垫付金额</div>
                        <div className="text-lg font-semibold text-blue-600">
                          ¥{ledger.totalAdvance.toLocaleString()}
                        </div>
                      </Col>
                      <Col span={12}>
                        <div className="text-sm text-gray-500">已追偿</div>
                        <div className="text-lg font-semibold text-green-600">
                          ¥{ledger.totalRecovered.toLocaleString()}
                        </div>
                      </Col>
                    </Row>

                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">未收回金额</span>
                        <span
                          className={`text-xl font-bold ${
                            ledger.pendingAmount > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          ¥{ledger.pendingAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card title="异常说明" extra={<span className="text-gray-500">共 {exceptions.length} 条异常</span>}>
        <Collapse
          activeKey={expandedKeys}
          onChange={(keys) => setExpandedKeys(keys as string[])}
          accordion={false}
        >
          <Panel header={getExceptionPanelHeader('refund_delay')} key="refund_delay">
            <Table
              dataSource={getExceptionsByType('refund_delay')}
              columns={exceptionColumns}
              rowKey="exceptionId"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无退费晚到异常' }}
            />
          </Panel>

          <Panel header={getExceptionPanelHeader('insurance_reject')} key="insurance_reject">
            <Table
              dataSource={getExceptionsByType('insurance_reject')}
              columns={exceptionColumns}
              rowKey="exceptionId"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无医保拒付异常' }}
            />
          </Panel>

          <Panel header={getExceptionPanelHeader('code_error')} key="code_error">
            <Table
              dataSource={getExceptionsByType('code_error')}
              columns={exceptionColumns}
              rowKey="exceptionId"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无编码错误异常' }}
            />
          </Panel>
        </Collapse>
      </Card>

      <Card title="数据验证规则">
        <Row gutter={16}>
          <Col span={8}>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center mb-2">
                <AlertOutlined className="text-orange-500 mr-2" />
                <span className="font-medium">退费晚到判定</span>
              </div>
              <div className="text-sm text-gray-600">
                申请日期 + 7天标准周期 &lt; 当前日期 → 标记为晚到
              </div>
              <div className="text-xs text-gray-400 mt-2">
                晚到天数 = 当前日期 - 申请日期 - 7天
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center mb-2">
                <ArrowUpOutlined className="text-red-500 mr-2" />
                <span className="font-medium">医保拒付关联</span>
              </div>
              <div className="text-sm text-gray-600">
                拒付项必须关联到具体账单明细
              </div>
              <div className="text-xs text-gray-400 mt-2">
                可追溯到：结算单 → 患者账单 → 具体费用项
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <CheckCircleOutlined className="text-purple-500 mr-2" />
                <span className="font-medium">科室编码校验</span>
              </div>
              <div className="text-sm text-gray-600">
                费用项编码必须在科室有效编码列表内
              </div>
              <div className="text-xs text-gray-400 mt-2">
                错误编码 → 高亮显示 + 异常记录
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
