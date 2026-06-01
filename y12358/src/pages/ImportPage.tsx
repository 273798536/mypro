import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Upload,
  message,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
} from 'antd';
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  Database,
  History,
  Plus,
  Eye,
} from 'lucide-react';
import type { UploadProps } from 'antd';
import { useAppStore } from '../store';
import {
  formatDateTime,
  generateId,
  detectPressureAnomalies,
} from '../utils';
import type {
  LoadRecord,
  OilPressureSeries,
  DeviceLedger,
  OilPressurePoint,
} from '../types';

const { Dragger } = Upload;
const { TabPane } = Tabs;
const { TextArea } = Input;

const ImportPage: React.FC = () => {
  const {
    ledgers,
    loadRecords,
    oilPressureSeries,
    addLoadRecord,
    addOilPressureSeries,
    addLedger,
    getLedgerByVersion,
  } = useAppStore();

  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadRecordColumns = [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      key: 'recordNo',
      width: 160,
      render: (text: string) => <span className="font-mono text-sm">{text}</span>,
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 140,
    },
    {
      title: '载重时间',
      dataIndex: 'loadTime',
      key: 'loadTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '载重(kg)',
      dataIndex: 'loadWeight',
      key: 'loadWeight',
      width: 100,
      render: (val: number, record: LoadRecord) => (
        <span className={record.isOverload ? 'text-red-500 font-semibold' : ''}>
          {val}
        </span>
      ),
    },
    {
      title: '额定载荷(kg)',
      dataIndex: 'ratedLoad',
      key: 'ratedLoad',
      width: 110,
    },
    {
      title: '作业高度(m)',
      dataIndex: 'height',
      key: 'height',
      width: 100,
      render: (val: number, record: LoadRecord) => (
        <span className={record.isHeightOver ? 'text-red-500 font-semibold' : ''}>
          {val}
        </span>
      ),
    },
    {
      title: '台账版本',
      dataIndex: 'ledgerVersion',
      key: 'ledgerVersion',
      width: 100,
      render: (text: string) => (
        <Tag color="blue" className="font-mono">
          {text}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: LoadRecord['status']) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          confirmed: 'green',
          disputed: 'red',
        };
        const texts: Record<string, string> = {
          pending: '待处理',
          confirmed: '已确认',
          disputed: '有争议',
        };
        return <Tag color={colors[status]}>{texts[status]}</Tag>;
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: () => (
        <Button type="link" size="small" icon={<Eye size={14} />}>
          查看
        </Button>
      ),
    },
  ];

  const oilPressureColumns = [
    {
      title: '关联记录',
      dataIndex: 'recordNo',
      key: 'recordNo',
      width: 160,
      render: (text: string) => <span className="font-mono text-sm">{text}</span>,
    },
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 110,
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '采样点数',
      dataIndex: 'dataPoints',
      key: 'dataPoints',
      width: 90,
      render: (points: OilPressurePoint[]) => points.length,
    },
    {
      title: '异常数量',
      dataIndex: 'anomalies',
      key: 'anomalies',
      width: 90,
      render: (anomalies: any[]) => (
        <span className={anomalies.length > 0 ? 'text-red-500 font-semibold' : ''}>
          {anomalies.length}
        </span>
      ),
    },
    {
      title: '台账版本',
      dataIndex: 'ledgerVersion',
      key: 'ledgerVersion',
      width: 100,
      render: (text: string) => (
        <Tag color="blue" className="font-mono">
          {text}
        </Tag>
      ),
    },
    {
      title: '导入时间',
      dataIndex: 'importTime',
      key: 'importTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
  ];

  const ledgerColumns = [
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 110,
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 140,
    },
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (text: string, record: DeviceLedger) => (
        <Space>
          <Tag color={record.isCurrent ? 'green' : 'default'} className="font-mono">
            {text}
          </Tag>
          {record.isCurrent && <Tag color="success">当前版本</Tag>}
        </Space>
      ),
    },
    {
      title: '版本名称',
      dataIndex: 'versionName',
      key: 'versionName',
      width: 140,
    },
    {
      title: '额定载荷(kg)',
      dataIndex: 'ratedLoad',
      key: 'ratedLoad',
      width: 110,
    },
    {
      title: '最大高度(m)',
      dataIndex: 'maxHeight',
      key: 'maxHeight',
      width: 100,
    },
    {
      title: '预警压力(MPa)',
      dataIndex: 'pressureWarning',
      key: 'pressureWarning',
      width: 110,
    },
    {
      title: '报警压力(MPa)',
      dataIndex: 'pressureAlarm',
      key: 'pressureAlarm',
      width: 110,
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 110,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  ];

  const loadUploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.xlsx,.xls',
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((l) => l.trim());
          const headers = lines[0].split(',').map((h) => h.trim());

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            const data: Record<string, string> = {};
            headers.forEach((h, idx) => (data[h] = values[idx]));

            const ledger = getLedgerByVersion(
              data['deviceId'] || 'DEV-001',
              data['ledgerVersion'] || 'v2.0'
            );
            const ratedLoad = ledger?.ratedLoad || 5000;
            const maxHeight = ledger?.maxHeight || 10;
            const loadWeight = Number(data['loadWeight'] || 0);
            const height = Number(data['height'] || 0);

            const record: LoadRecord = {
              id: generateId(),
              recordNo: data['recordNo'] || `REC-IMPORT-${Date.now()}-${i}`,
              deviceId: data['deviceId'] || 'DEV-001',
              deviceName: data['deviceName'] || '液压升降机A1',
              loadTime: data['loadTime'] || new Date().toISOString(),
              loadWeight,
              ratedLoad,
              isOverload: loadWeight > ratedLoad,
              height,
              maxHeight,
              isHeightOver: height > maxHeight,
              remark: data['remark'] || '',
              remarkHistory: data['remark']
                ? [
                    {
                      id: generateId(),
                      content: data['remark'],
                      operator: '导入用户',
                      operateTime: new Date().toISOString(),
                    },
                  ]
                : [],
              ledgerVersion: data['ledgerVersion'] || 'v2.0',
              createTime: new Date().toISOString(),
              updateTime: new Date().toISOString(),
              status: 'pending',
            };

            addLoadRecord(record);
          }

          message.success(`成功导入 ${lines.length - 1} 条载重记录`);
        } catch (error) {
          message.error('文件解析失败，请检查格式');
        }
      };
      reader.readAsText(file);
      return false;
    },
  };

  const pressureUploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.xlsx,.xls',
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((l) => l.trim());
          const headers = lines[0].split(',').map((h) => h.trim());

          const dataPoints: OilPressurePoint[] = [];
          let deviceId = 'DEV-001';
          let recordNo = '';
          let ledgerVersion = 'v2.0';

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            const data: Record<string, string> = {};
            headers.forEach((h, idx) => (data[h] = values[idx]));

            if (i === 1) {
              deviceId = data['deviceId'] || deviceId;
              recordNo = data['recordNo'] || `REC-OIL-${Date.now()}`;
              ledgerVersion = data['ledgerVersion'] || ledgerVersion;
            }

            dataPoints.push({
              timestamp: data['timestamp'] || new Date().toISOString(),
              pressure: Number(data['pressure'] || 22),
              temperature: data['temperature']
                ? Number(data['temperature'])
                : undefined,
            });
          }

          const ledger = getLedgerByVersion(deviceId, ledgerVersion);
          const anomalies = detectPressureAnomalies(
            dataPoints,
            ledger?.pressureWarning || 27,
            ledger?.pressureAlarm || 30
          );

          const series: OilPressureSeries = {
            id: generateId(),
            deviceId,
            recordNo,
            startTime: dataPoints[0]?.timestamp || new Date().toISOString(),
            endTime:
              dataPoints[dataPoints.length - 1]?.timestamp ||
              new Date().toISOString(),
            sampleInterval: 10,
            dataPoints,
            anomalies,
            ledgerVersion,
            importTime: new Date().toISOString(),
          };

          addOilPressureSeries(series);
          message.success(
            `成功导入油压序列，共 ${dataPoints.length} 个采样点，检测到 ${anomalies.length} 个异常`
          );
        } catch (error) {
          message.error('文件解析失败，请检查格式');
        }
      };
      reader.readAsText(file);
      return false;
    },
  };

  const handleAddLedger = (values: any) => {
    const ledger: DeviceLedger = {
      id: generateId(),
      deviceId: values.deviceId,
      deviceName: values.deviceName,
      version: values.version,
      versionName: values.versionName,
      ratedLoad: values.ratedLoad,
      maxHeight: values.maxHeight,
      ratedPressure: values.ratedPressure,
      pressureWarning: values.pressureWarning,
      pressureAlarm: values.pressureAlarm,
      effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
      isCurrent: true,
      createTime: new Date().toISOString(),
      remark: values.remark,
    };

    addLedger(ledger);
    setLedgerModalVisible(false);
    form.resetFields();
    message.success('设备台账版本添加成功');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">数据导入</h2>
          <p className="text-sm text-gray-500">
            导入载重记录、油压序列数据，管理设备台账多版本
          </p>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setLedgerModalVisible(true)}
          >
            新增台账版本
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="load" size="large">
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <FileSpreadsheet size={18} />
              载重记录
              <Tag color="blue">{loadRecords.length}</Tag>
            </span>
          }
          key="load"
        >
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  导入载重记录
                </h4>
                <Dragger {...loadUploadProps} showUploadList={false}>
                  <p className="ant-upload-drag-icon">
                    <UploadIcon size={36} className="text-blue-500 mx-auto" />
                  </p>
                  <p className="ant-upload-text text-gray-600">
                    点击或拖拽文件到此处上传
                  </p>
                  <p className="ant-upload-hint text-xs text-gray-400 mt-2">
                    支持 CSV、Excel 格式，需包含 recordNo, deviceId, loadWeight,
                    height, loadTime 等字段
                  </p>
                </Dragger>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  导入说明
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>
                      载重记录将自动根据关联的台账版本计算是否超载、高度是否越界
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>备注修改历史将自动记录，保留完整追溯链</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>建议先导入设备台账，再导入业务数据</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Table
            columns={loadRecordColumns}
            dataSource={loadRecords}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <Database size={18} />
              油压序列
              <Tag color="blue">{oilPressureSeries.length}</Tag>
            </span>
          }
          key="pressure"
        >
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  导入油压序列
                </h4>
                <Dragger {...pressureUploadProps} showUploadList={false}>
                  <p className="ant-upload-drag-icon">
                    <UploadIcon size={36} className="text-red-500 mx-auto" />
                  </p>
                  <p className="ant-upload-text text-gray-600">
                    点击或拖拽文件到此处上传
                  </p>
                  <p className="ant-upload-hint text-xs text-gray-400 mt-2">
                    支持 CSV、Excel 格式，需包含 timestamp, pressure, temperature 等时序字段
                  </p>
                </Dragger>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  自动分析说明
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>
                      系统自动检测压力尖峰、骤降、异常波动、超限四类异常
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>
                      异常区间将在图表中用红色/橙色背景高亮标注
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>
                      阈值基于台账版本中的预警值和报警值自动计算
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Table
            columns={oilPressureColumns}
            dataSource={oilPressureSeries}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <History size={18} />
              设备台账
              <Tag color="blue">{ledgers.length}</Tag>
            </span>
          }
          key="ledger"
        >
          <Card className="mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-700 mb-2">
                多版本管理说明
              </h4>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• 设备台账支持多版本，新版本不会覆盖旧版本</li>
                <li>• 每条校核记录绑定具体的台账版本号，确保口径一致</li>
                <li>• 高度越界记录与台账版本绑定，不会被新版本覆盖</li>
                <li>• 新增版本时，旧版本自动标记为非当前版本</li>
              </ul>
            </div>
          </Card>

          <Table
            columns={ledgerColumns}
            dataSource={ledgers}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      <Modal
        title="新增设备台账版本"
        open={ledgerModalVisible}
        onCancel={() => setLedgerModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAddLedger}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="deviceId"
              label="设备ID"
              rules={[{ required: true, message: '请输入设备ID' }]}
            >
              <Input placeholder="如：DEV-001" />
            </Form.Item>
            <Form.Item
              name="deviceName"
              label="设备名称"
              rules={[{ required: true, message: '请输入设备名称' }]}
            >
              <Input placeholder="如：液压升降机A1" />
            </Form.Item>
            <Form.Item
              name="version"
              label="版本号"
              rules={[{ required: true, message: '请输入版本号' }]}
            >
              <Input placeholder="如：v2.0" />
            </Form.Item>
            <Form.Item
              name="versionName"
              label="版本名称"
              rules={[{ required: true, message: '请输入版本名称' }]}
            >
              <Input placeholder="如：大修后参数更新" />
            </Form.Item>
            <Form.Item
              name="ratedLoad"
              label="额定载荷(kg)"
              rules={[{ required: true, message: '请输入额定载荷' }]}
            >
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item
              name="maxHeight"
              label="最大高度(m)"
              rules={[{ required: true, message: '请输入最大高度' }]}
            >
              <InputNumber className="w-full" min={0} step={0.1} />
            </Form.Item>
            <Form.Item
              name="ratedPressure"
              label="额定压力(MPa)"
              rules={[{ required: true, message: '请输入额定压力' }]}
            >
              <InputNumber className="w-full" min={0} step={0.1} />
            </Form.Item>
            <Form.Item
              name="pressureWarning"
              label="预警压力(MPa)"
              rules={[{ required: true, message: '请输入预警压力' }]}
            >
              <InputNumber className="w-full" min={0} step={0.1} />
            </Form.Item>
            <Form.Item
              name="pressureAlarm"
              label="报警压力(MPa)"
              rules={[{ required: true, message: '请输入报警压力' }]}
            >
              <InputNumber className="w-full" min={0} step={0.1} />
            </Form.Item>
            <Form.Item
              name="effectiveDate"
              label="生效日期"
              rules={[{ required: true, message: '请选择生效日期' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </div>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入版本变更说明" />
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setLedgerModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              确认添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ImportPage;
