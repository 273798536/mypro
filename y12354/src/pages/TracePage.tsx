import { useState } from 'react';
import { Card, Select, Tag, Descriptions, Divider, Collapse, Empty } from 'antd';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { TraceNode } from '../types';

const { Option } = Select;

const nodeTypeNames: Record<string, string> = {
  curveFitting: 'IV曲线拟合',
  temperatureCorrection: '温度修正',
  faultClassification: '故障分层诊断',
};

const nodeTypeColors: Record<string, string> = {
  curveFitting: '#165DFF',
  temperatureCorrection: '#00B42A',
  faultClassification: '#FF7D00',
};

export default function TracePage() {
  const { diagnoses, selectedDiagnosis, setSelectedDiagnosis, curves } = useAppStore();
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-orange-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  const renderTraceFlow = () => {
    if (!selectedDiagnosis) return null;

    return (
      <div className="flex items-center justify-center py-8">
        {selectedDiagnosis.traceNodes.map((node, index) => (
          <div key={node.id} className="flex items-center">
            <div
              className={`flex flex-col items-center cursor-pointer p-4 rounded-lg transition-all ${
                selectedNode?.id === node.id
                  ? 'bg-blue-50 ring-2 ring-blue-300'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedNode(node)}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: nodeTypeColors[node.type] + '20' }}
              >
                {getStatusIcon(node.status)}
              </div>
              <div className="text-sm font-medium text-gray-800">{node.name}</div>
              <Tag
                color={node.status === 'success' ? 'green' : node.status === 'warning' ? 'orange' : 'red'}
                className="mt-2"
              >
                {node.status === 'success' ? '成功' : node.status === 'warning' ? '警告' : '错误'}
              </Tag>
              <div className="text-xs text-gray-500 mt-1">
                耗时: {node.duration}ms
              </div>
            </div>
            {index < selectedDiagnosis.traceNodes.length - 1 && (
              <ChevronRight size={24} className="text-gray-300 mx-4" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderNodeDetail = () => {
    if (!selectedNode) return <Empty description="请点击上方节点查看详情" />;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(selectedNode.status)}
          <span className="text-lg font-semibold">{selectedNode.name}</span>
          <Tag color={selectedNode.status === 'success' ? 'green' : selectedNode.status === 'warning' ? 'orange' : 'red'}>
            {selectedNode.status === 'success' ? '成功' : selectedNode.status === 'warning' ? '警告' : '错误'}
          </Tag>
        </div>

        <Divider orientation="left">输入数据</Divider>
        <Descriptions bordered size="small" column={2}>
          {Object.entries(selectedNode.input || {}).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>

        <Divider orientation="left">输出结果</Divider>
        <Descriptions bordered size="small" column={2}>
          {Object.entries(selectedNode.output || {}).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>

        <Divider orientation="left">算法参数</Divider>
        <Descriptions bordered size="small" column={2}>
          {Object.entries(selectedNode.parameters || {}).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">链路追溯面板</h1>
        <Select
          style={{ width: 300 }}
          placeholder="选择诊断记录"
          value={selectedDiagnosis?.id || undefined}
          onChange={(id) => {
            const diag = diagnoses.find((d) => d.id === id);
            setSelectedDiagnosis(diag || null);
            setSelectedNode(null);
          }}
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
      </div>

      <Card title="诊断链路">
        {diagnoses.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            暂无诊断记录，请先在诊断工作台执行诊断
          </div>
        ) : !selectedDiagnosis ? (
          <div className="text-center text-gray-400 py-12">
            请从右上角下拉框选择一个诊断记录
          </div>
        ) : (
          renderTraceFlow()
        )}
      </Card>

      <Card title="节点详情">
        {renderNodeDetail()}
      </Card>

      {selectedDiagnosis && (
        <Card title="诊断参数对比">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">参数</th>
                  <th className="px-4 py-2 text-left">曲线拟合</th>
                  <th className="px-4 py-2 text-left">温度修正后</th>
                </tr>
              </thead>
              <tbody>
                {selectedDiagnosis.traceNodes[0]?.output && selectedDiagnosis.traceNodes[1]?.output && (
                  <>
                    <tr className="border-b">
                      <td className="px-4 py-2">开路电压(Voc)</td>
                      <td className="px-4 py-2">{selectedDiagnosis.traceNodes[0].output.voc}V</td>
                      <td className="px-4 py-2 font-medium text-blue-600">
                        {selectedDiagnosis.traceNodes[1].output.voc}V
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">短路电流(Isc)</td>
                      <td className="px-4 py-2">{selectedDiagnosis.traceNodes[0].output.isc}A</td>
                      <td className="px-4 py-2 font-medium text-blue-600">
                        {selectedDiagnosis.traceNodes[1].output.isc}A
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">最大功率电压(Vm)</td>
                      <td className="px-4 py-2">{selectedDiagnosis.traceNodes[0].output.vm}V</td>
                      <td className="px-4 py-2 font-medium text-blue-600">
                        {selectedDiagnosis.traceNodes[1].output.vm}V
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">最大功率电流(Im)</td>
                      <td className="px-4 py-2">{selectedDiagnosis.traceNodes[0].output.im}A</td>
                      <td className="px-4 py-2 font-medium text-blue-600">
                        {selectedDiagnosis.traceNodes[1].output.im}A
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
