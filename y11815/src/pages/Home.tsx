
import { Card, Statistic, Row, Col, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, AlertOutlined, DollarOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { Link } from 'react-router-dom';

export default function Home() {
  const ledgers = useStore((state) => state.ledgers);
  const exceptions = useStore((state) => state.exceptions);
  const patientBills = useStore((state) => state.patientBills);
  const settlements = useStore((state) => state.settlements);

  const totalAdvance = ledgers.reduce((sum, l) => sum + l.totalAdvance, 0);
  const totalRecovered = ledgers.reduce((sum, l) => sum + l.totalRecovered, 0);
  const totalPending = ledgers.reduce((sum, l) => sum + l.pendingAmount, 0);
  const recoveryRate = totalAdvance > 0 ? ((totalRecovered / totalAdvance) * 100).toFixed(1) : '0';

  const exceptionColumns = [
    {
      title: '异常类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          refund_delay: 'orange',
          insurance_reject: 'red',
          code_error: 'purple',
        };
        const labelMap: Record<string, string> = {
          refund_delay: '退费晚到',
          insurance_reject: '医保拒付',
          code_error: '编码错误',
        };
        return <Tag color={colorMap[type]}>{labelMap[type]}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '金额(元)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '关联单据',
      dataIndex: 'relatedBillId',
      key: 'relatedBillId',
      render: (id: string) => (
        <Link to={`/patient-bills?search=${id}`} className="text-blue-600 hover:underline">
          {id}
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总垫付金额"
              value={totalAdvance}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#165DFF' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已追偿金额"
              value={totalRecovered}
              precision={2}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#00B42A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待收回金额"
              value={totalPending}
              precision={2}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: totalPending > 0 ? '#F53F3F' : '#00B42A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="追偿完成率"
              value={parseFloat(recoveryRate)}
              suffix="%"
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#FF7D00' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="科室垫付情况" className="h-full">
            <Table
              dataSource={ledgers}
              rowKey="ledgerId"
              pagination={false}
              size="small"
            >
              <Table.Column title="科室" dataIndex="departmentName" key="dept" />
              <Table.Column
                title="垫付金额(元)"
                dataIndex="totalAdvance"
                key="advance"
                render={(v) => v.toLocaleString()}
              />
              <Table.Column
                title="已追偿(元)"
                dataIndex="totalRecovered"
                key="recovered"
                render={(v) => v.toLocaleString()}
              />
              <Table.Column
                title="未收回(元)"
                dataIndex="pendingAmount"
                key="pending"
                render={(v) => (
                  <span className={v > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                    {v.toLocaleString()}
                  </span>
                )}
              />
            </Table>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="异常提醒" className="h-full">
            <Table
              dataSource={exceptions}
              columns={exceptionColumns}
              rowKey="exceptionId"
              pagination={false}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="快速统计">
        <Row gutter={16}>
          <Col span={8}>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{patientBills.length}</div>
              <div className="text-gray-600 mt-2">患者账单数</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {settlements.filter((s) => s.status === 'completed').length}
              </div>
              <div className="text-gray-600 mt-2">已完成结算</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{exceptions.length}</div>
              <div className="text-gray-600 mt-2">异常记录数</div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
