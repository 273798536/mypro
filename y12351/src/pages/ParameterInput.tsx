import { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Steps, message, Card } from 'antd';
import { Save, Play, Plus, Trash2 } from 'lucide-react';
import { useParameterStore } from '../store/parameterStore';
import {
  SCAN_TYPE_OPTIONS,
  TISSUE_TYPE_LABELS,
  ARTIFACT_TYPE_LABELS,
  TissueType,
  ArtifactType,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';

const { Step } = Steps;

export const ParameterInput = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    parameters,
    addParameter,
    updateParameter,
    calculateResults,
    isCalculating,
    setSelectedParameter,
    selectedParameterId,
    deleteParameter,
  } = useParameterStore();

  const selectedParam = parameters.find((p) => p.id === selectedParameterId);

  const handleNext = async () => {
    try {
      const values = await form.validateFields();

      if (currentStep === 0) {
        const id = addParameter(values);
        setEditingId(id);
        setSelectedParameter(id);
        message.success('扫描参数已保存');
        setCurrentStep(1);
      } else if (currentStep === 1) {
        if (editingId) {
          updateParameter(editingId, values);
          message.success('组织类型已补充');
          setCurrentStep(2);
        }
      }
    } catch {
      message.error('请检查表单填写');
    }
  };

  const handleCalculate = async () => {
    if (editingId) {
      const values = await form.validateFields();
      updateParameter(editingId, values);
      await calculateResults(editingId);
      message.success('参数计算完成，检测结果已生成');
    }
  };

  const handleSelectParam = (id: string) => {
    setSelectedParameter(id);
    setEditingId(id);
    const param = parameters.find((p) => p.id === id);
    if (param) {
      form.setFieldsValue(param);
      if (param.tissueType && param.artifactLabel) {
        setCurrentStep(2);
      } else if (param.tissueType) {
        setCurrentStep(1);
      } else {
        setCurrentStep(0);
      }
    }
  };

  const handleNewParam = () => {
    setSelectedParameter(null);
    setEditingId(null);
    setCurrentStep(0);
    form.resetFields();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">参数录入</h1>
          <p className="text-slate-500 mt-1">分步骤录入扫描参数，支持后续补充组织类型和伪影标签</p>
        </div>
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleNewParam}
          className="flex items-center gap-2"
        >
          新建参数
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="w-72 flex-shrink-0">
          <Card title="参数列表" className="sticky top-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {parameters.map((param) => (
                <div
                  key={param.id}
                  onClick={() => handleSelectParam(param.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedParameterId === param.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-500">{param.id}</span>
                    <StatusBadge type="scan" status={param.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-700 truncate">{param.scanType}</p>
                  <p className="text-xs text-slate-500">
                    TR {param.tr}ms / TE {param.te}ms
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex-1">
          <Card>
            <Steps current={currentStep} className="mb-8">
              <Step title="扫描参数" description="录入基础扫描参数" />
              <Step title="组织类型" description="补充组织类型信息" />
              <Step title="伪影标签" description="标记伪影并计算" />
            </Steps>

            <Form
              form={form}
              layout="vertical"
              className="max-w-2xl"
              initialValues={{
                scanType: '',
                tr: 600,
                te: 15,
                flipAngle: 90,
                sliceThickness: 5,
                fov: '240x240',
                matrix: '256x256',
                bandwidth: 32,
                nex: 2,
              }}
            >
              {currentStep >= 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700 text-lg">第一步：扫描参数</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      name="scanType"
                      label="扫描类型"
                      rules={[{ required: true, message: '请选择扫描类型' }]}
                    >
                      <Select
                        options={SCAN_TYPE_OPTIONS.map((t) => ({ label: t, value: t }))}
                        placeholder="选择扫描类型"
                        disabled={currentStep > 0}
                      />
                    </Form.Item>
                    <Form.Item name="flipAngle" label="翻转角 (°)">
                      <InputNumber min={1} max={180} className="w-full" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item
                      name="tr"
                      label="重复时间 TR (ms)"
                      rules={[{ required: true, message: '请输入TR' }]}
                    >
                      <InputNumber min={1} className="w-full" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item
                      name="te"
                      label="回波时间 TE (ms)"
                      rules={[{ required: true, message: '请输入TE' }]}
                    >
                      <InputNumber min={1} className="w-full" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item name="sliceThickness" label="层厚 (mm)">
                      <InputNumber min={0.5} step={0.5} className="w-full" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item name="fov" label="视野 FOV">
                      <Input placeholder="如 240x240" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item name="matrix" label="矩阵">
                      <Input placeholder="如 256x256" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item name="bandwidth" label="带宽 (kHz)">
                      <InputNumber className="w-full" disabled={currentStep > 0} />
                    </Form.Item>
                    <Form.Item name="nex" label="激励次数 NEX">
                      <InputNumber min={1} className="w-full" disabled={currentStep > 0} />
                    </Form.Item>
                  </div>
                </div>
              )}

              {currentStep >= 1 && (
                <div className="mt-8 space-y-4">
                  <h3 className="font-semibold text-slate-700 text-lg">第二步：组织类型</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      name="tissueType"
                      label="组织类型"
                      rules={[{ required: currentStep >= 2, message: '请选择组织类型' }]}
                    >
                      <Select
                        options={Object.entries(TISSUE_TYPE_LABELS).map(([value, label]) => ({
                          label,
                          value,
                        }))}
                        placeholder="选择组织类型"
                        disabled={currentStep > 1}
                      />
                    </Form.Item>
                  </div>
                </div>
              )}

              {currentStep >= 2 && (
                <div className="mt-8 space-y-4">
                  <h3 className="font-semibold text-slate-700 text-lg">第三步：伪影标签</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="artifactLabel" label="伪影类型">
                      <Select
                        options={Object.entries(ARTIFACT_TYPE_LABELS).map(([value, label]) => ({
                          label,
                          value,
                        }))}
                        placeholder="选择伪影类型（如无则选无伪影）"
                      />
                    </Form.Item>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-4">
                  {selectedParam && (
                    <Button
                      danger
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => {
                        deleteParameter(selectedParam.id);
                        handleNewParam();
                        message.success('已删除');
                      }}
                    >
                      删除
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {currentStep > 0 && currentStep < 2 && (
                    <Button onClick={() => setCurrentStep(currentStep - 1)}>上一步</Button>
                  )}
                  {currentStep < 2 && (
                    <Button type="primary" onClick={handleNext} icon={<Save className="w-4 h-4" />}>
                      保存并继续
                    </Button>
                  )}
                  {currentStep === 2 && (
                    <Button
                      type="primary"
                      onClick={handleCalculate}
                      loading={isCalculating}
                      icon={<Play className="w-4 h-4" />}
                    >
                      开始计算
                    </Button>
                  )}
                </div>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
};
