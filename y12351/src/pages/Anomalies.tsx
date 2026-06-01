import { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Input, Tag, message } from 'antd';
import { useParameterStore } from '../store/parameterStore';
import { StatusBadge } from '../components/StatusBadge';
import {
  ANOMALY_TYPE_LABELS,
  ANOMALY_SEVERITY_LABELS,
  ScanParameter,
} from '../types';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;

export const Anomalies = () => {
  const navigate = useNavigate();
  const {
    anomalies,
    parameters,
    resolveAnomaly,
    confirmAnomaly,
    setSelectedParameter,
  } = useParameterStore();

  const [activeTab, setActiveTab] = useState('all');
  const [resolveModal, setResolveModal] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [handlerNote, setHandlerNote] = useState('');

  const getParamById = (id: string): ScanParameter | undefined => {
    return parameters.find((p) => p.id === id);
  };

  const filteredAnomalies = anomalies.filter((a) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return a.status === 'pending';
    if (activeTab === 'confirmed') return a.status === 'confirmed';
    if (activeTab === 'resolved') return a.status === 'resolved';
    if (activeTab === 'conflict') return a.type === 'conflict';
    if (activeTab === 'timeout') return a.type === 'timeout';
    if (activeTab === 'artifact') return a.type === 'artifact_misjudgment';
    return true;
  });

  const stats = {
    total: anomalies.length,
    pending: anomalies.filter((a) => a.status === 'pending').length,
    confirmed: anomalies.filter((a) => a.status === 'confirmed').length,
    resolved: anomalies.filter((a) => a.status === 'resolved').length,
  };

  const handleResolve = () => {
    if (selectedAnomaly) {
      resolveAnomaly(selectedAnomaly, handlerNote);
      message.success('异常已标记为已解决');
      setResolveModal(false);
      setHandlerNote('');
      setSelectedAnomaly(null);
    }
  };

  const handleConfirm = (id: string) => {
    confirmAnomaly(id);
    message.success('异常已确认');
  };

  const columns = [
    {
      title: '异常ID',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (id: string) => <span className="font-mono text-sm text-slate-600">{id}</span>,
    },
    {
      title: '关联参数',
      key: 'parameter',
      width: 200,
      render: (_: any, record: any) => {
        const param = getParamById(record.parameterId);
        return param ? (
          <div>
            <p className="font-medium text-slate-700">{param.scanType}</p>
            <p className="text-xs text-slate-500">{param.id}</p>
          </div>
        ) : (
          '-'
        );
      },
    },
    {
      title: '异常类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = {
          conflict: 'orange',
          timeout: 'red',
          artifact_misjudgment: 'purple',
        };
        return <Tag color={colors[type]}>{ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS]}</Tag>;
      },
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => <StatusBadge type="severity" status={severity as any} />,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      className: 'text-sm text-slate-600',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <StatusBadge type="anomaly" status={status as any} />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<Eye className="w-3 h-3" />}
            onClick={() => {
              setSelectedParameter(record.parameterId);
              navigate('/comparison');
            }}
          >
            查看参数
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<Check className="w-3 h-3" />}
                onClick={() => handleConfirm(record.id)}
              >
                确认
              </Button>
              <Button
                size="small"
                icon={<RotateCcw className="w-3 h-3" />}
                onClick={() => {
                  setSelectedAnomaly(record.id);
                  setResolveModal(true);
                }}
              >
                解决
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: (
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          全部
          <Tag color="blue">{stats.total}</Tag>
        </span>
      ),
    },
    {
      key: 'pending',
      label: (
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          待确认
          <Tag color="orange">{stats.pending}</Tag>
        </span>
      ),
    },
    {
      key: 'confirmed',
      label: (
        <span className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-500" />
          已确认
          <Tag color="blue">{stats.confirmed}</Tag>
        </span>
      ),
    },
    {
      key: 'resolved',
      label: (
        <span className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-green-500" />
          已解决
          <Tag color="green">{stats.resolved}</Tag>
        </span>
      ),
    },
    {
      key: 'conflict',
      label: (
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          参数冲突
        </span>
      ),
    },
    {
      key: 'timeout',
      label: (
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-500" />
          时间超限
        </span>
      ),
    },
    {
      key: 'artifact',
      label: (
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-purple-500" />
          伪影误判
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">异常清单</h1>
        <p className="text-slate-500 mt-1">
          参数冲突、时间超限、伪影误判统一管理，分类处理
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">异常总数</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">待确认</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">已确认</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.confirmed}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">已解决</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        <div className="mt-4">
          <Table
            dataSource={filteredAnomalies}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </div>
      </Card>

      <Modal
        title="标记为已解决"
        open={resolveModal}
        onOk={handleResolve}
        onCancel={() => {
          setResolveModal(false);
          setHandlerNote('');
          setSelectedAnomaly(null);
        }}
        okText="确认解决"
        cancelText="取消"
      >
        <div className="space-y-4">
          <p className="text-slate-600">请输入处理说明：</p>
          <TextArea
            value={handlerNote}
            onChange={(e) => setHandlerNote(e.target.value)}
            rows={4}
            placeholder="描述处理方式或原因..."
          />
        </div>
      </Modal>
    </div>
  );
};
