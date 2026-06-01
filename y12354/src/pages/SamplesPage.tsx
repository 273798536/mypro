import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Select, Row, Col, Statistic, Empty, Tooltip } from 'antd';
import { ReloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import { diagnoseCurve } from '../utils/diagnosis';
import type { DiagnosisResult, IVCurveData } from '../types';

const { Option } = Select;

export default function SamplesPage() {
  const { diagnoses, curves, addDiagnosis, selectedDiagnosis, setSelectedDiagnosis } = useAppStore();
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [reRunningId, setReRunningId] = useState<string | null>(null);

  const handleReRun = (record: DiagnosisResult) => {
    const curve = curves.find((c) => c.id === record.curveId);
    if (!curve) return;

    setReRunningId(record.id);
    setTimeout(() => {
      const result = diagnoseCurve(curve);
      const newDiagnosis: DiagnosisResult = {
        id: record.id + '_rerun_' + Date.now(),
        curveId: curve.id,
        inputHash: record.inputHash,
        ...result,
        createdAt: Date.now(),
      };
      addDiagnosis(newDiagnosis);
      setReRunningId(null);
    }, 1500);
  };

  const getFaultLevelColor = (level: string) => {
    switch (level) {
      case 'normal': return 'green';
      case 'warning': return 'orange';
      case 'error': return 'red';
      default: return 'default';
    }
  };

  const getFaultLevelText = (level: string) => {
    switch (level) {
      case 'normal': return '正常';
      case 'warning': return '预警';
      case 'error': return '故障';
      default: return '未知';
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '组件串号',
      dataIndex: 'curveId',
      key: 'curveId',
      render: (id: string) => {
        const curve = curves.find((c) => c.id === id);
        return curve?.serialNumber || '未知';
      },
    },
    {
      title: '诊断时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (timestamp: number) => new Date(timestamp).toLocaleString(),
      sorter: (a: DiagnosisResult, b: DiagnosisResult) => a.createdAt - b.createdAt,
    },
    {
      title: '输入哈希',
      dataIndex: 'inputHash',
      key: 'inputHash',
      render: (hash: string) => (
        <Tag color="blue" className="font-mono text-xs">
          {hash}
        </Tag>
      ),
    },
    {
      title: '故障等级',
      dataIndex: 'faultLevel',
      key: 'faultLevel',
      render: (level: string) => (
        <Tag color={getFaultLevelColor(level)}>
          {getFaultLevelText(level)}
        </Tag>
      ),
      filters: [
        { text: '正常', value: 'normal' },
        { text: '预警', value: 'warning' },
        { text: '故障', value: 'error' },
      ],
      onFilter: (value: string | number | boolean, record: DiagnosisResult) =>
        record.faultLevel === value,
    },
    {
      title: '异常数量',
      dataIndex: 'abnormalities',
      key: 'abnormalities',
      render: (abnormalities: any[]) => abnormalities.length,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: DiagnosisResult) => (
        <div className="flex gap-2">
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedDiagnosis(record);
                setCompareModalOpen(true);
              }}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="复算验证">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={reRunningId === record.id}
              onClick={() => handleReRun(record)}
            >
              复算
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const getComparisonData = () => {
    const selectedDiagnoses = diagnoses.filter((d) => compareIds.includes(d.id));
    if (selectedDiagnoses.length === 0) return [];

    const parameters = ['voc', 'isc', 'vm', 'im', 'ff', 'rs', 'rsh'];
    const parameterLabels: Record<string, string> = {
      voc: '开路电压(Voc)',
      isc: '短路电流(Isc)',
      vm: '最大功率点电压(Vm)',
      im: '最大功率点电流(Im)',
      ff: '填充因子(FF)',
      rs: '串联电阻(Rs)',
      rsh: '并联电阻(Rsh)',
    };

    return parameters.map((param) => ({
      parameter: parameterLabels[param],
      ...Object.fromEntries(
        selectedDiagnoses.map((d, index) => [
          `diag${index + 1}`,
          d.parameters[param as keyof typeof d.parameters],
        ])
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">样本回看库</h1>
        <div className="flex gap-2">
          <Select
            mode="multiple"
            placeholder="选择诊断进行对比"
            style={{ width: 400 }}
            value={compareIds}
            onChange={setCompareIds}
            disabled={diagnoses.length < 2}
          >
            {diagnoses.map((d) => {
              const curve = curves.find((c) => c.id === d.curveId);
              return (
                <Option key={d.id} value={d.id}>
                  {curve?.serialNumber || '未知'} - {new Date(d.createdAt).toLocaleString()}
                </Option>
              );
            })}
          </Select>
          {compareIds.length >= 2 && (
            <Button type="primary" onClick={() => setCompareModalOpen(true)}>
              参数对比
            </Button>
          )}
        </div>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总诊断数" value={diagnoses.length} prefix={<SearchOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="正常"
              value={diagnoses.filter((d) => d.faultLevel === 'normal').length}
              valueStyle={{ color: '#00B42A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="预警"
              value={diagnoses.filter((d) => d.faultLevel === 'warning').length}
              valueStyle={{ color: '#FF7D00' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="故障"
              value={diagnoses.filter((d) => d.faultLevel === 'error').length}
              valueStyle={{ color: '#F53F3F' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="历史诊断记录">
        {diagnoses.length === 0 ? (
          <Empty description="暂无诊断记录，请先在诊断工作台执行诊断" />
        ) : (
          <Table
            dataSource={diagnoses}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={compareIds.length >= 2 ? '参数对比' : '诊断详情'}
        open={compareModalOpen}
        onCancel={() => setCompareModalOpen(false)}
        width={compareIds.length >= 2 ? 900 : 600}
        footer={null}
      >
        {compareIds.length >= 2 ? (
          <div>
            <div className="mb-4">
              {compareIds.map((id, index) => {
                const d = diagnoses.find((diag) => diag.id === id);
                const curve = curves.find((c) => c.id === d?.curveId);
                return (
                  <Tag key={id} color={index === 0 ? 'blue' : 'green'}>
                    诊断{index + 1}: {curve?.serialNumber} - {d && new Date(d.createdAt).toLocaleString()}
                  </Tag>
                );
              })}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium">参数</th>
                  {compareIds.map((_, index) => (
                    <th key={index} className="px-4 py-2 text-center font-medium">
                      诊断{index + 1}
                    </th>
                  ))}
                  {compareIds.length >= 2 && (
                    <th className="px-4 py-2 text-center font-medium">差异</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {getComparisonData().map((row: any, rowIndex) => {
                  const values = compareIds.map((_, index) => row[`diag${index + 1}`]);
                  const hasDifference = values.length >= 2 && 
                    Math.abs(values[0] - values[1]) > 0.001;
                  return (
                    <tr key={rowIndex} className={`border-b ${hasDifference ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-2 font-medium">{row.parameter}</td>
                      {values.map((v: number, index: number) => (
                        <td key={index} className="px-4 py-2 text-center">
                          {v}
                        </td>
                      ))}
                      {values.length >= 2 && (
                        <td className="px-4 py-2 text-center">
                          {hasDifference && (
                            <Tag color="orange" className="text-xs">
                              差异: {(Math.abs(values[0] - values[1])).toFixed(4)}
                            </Tag>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : selectedDiagnosis ? (
          <div className="space-y-4">
            <div>
              <div className="text-gray-500 text-sm mb-2">诊断信息</div>
              <div>时间: {new Date(selectedDiagnosis.createdAt).toLocaleString()}</div>
              <div>输入哈希: {selectedDiagnosis.inputHash}</div>
              <div>
                故障等级:{' '}
                <Tag color={getFaultLevelColor(selectedDiagnosis.faultLevel)}>
                  {getFaultLevelText(selectedDiagnosis.faultLevel)}
                </Tag>
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-2">特征参数</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selectedDiagnosis.parameters).map(([key, value]) => (
                  <div key={key} className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-500 text-xs">{key.toUpperCase()}:</span>
                    <span className="ml-2 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {selectedDiagnosis.abnormalities.length > 0 && (
              <div>
                <div className="text-gray-500 text-sm mb-2">异常参数</div>
                {selectedDiagnosis.abnormalities.map((a) => (
                  <div key={a.id} className="p-2 bg-orange-50 rounded mb-2">
                    <div className="font-medium text-orange-700">{a.description}</div>
                    <div className="text-xs text-gray-600 mt-1">{a.explanation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Empty description="请选择诊断记录" />
        )}
      </Modal>
    </div>
  );
}
