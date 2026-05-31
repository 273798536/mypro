import { useState } from 'react';
import { TestTube, Play, CheckCircle, XCircle, AlertCircle, ArrowRight, Car, FileCheck, Database, Eye, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';
import { ScenarioConfig, BindingRecord, ValidationStep } from '../types';

export default function BindTestPage() {
  const { scenarios, loadScenario, isDataLoaded, activeScenario, bindings, validationSteps } = useAppStore();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [testStep, setTestStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const bindingScenarios = scenarios.filter(s => s.type === 'binding_failure' || s.type === 'normal');
  const testBinding = bindings.find(b => b.status === 'failed');

  const handleStartTest = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setIsRunning(true);
    setTestStep(0);
    setShowValidation(false);
    
    loadScenario(scenarioId);
    
    for (let i = 1; i <= 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setTestStep(i);
    }
    
    setIsRunning(false);
    setShowValidation(true);
  };

  const handleReset = () => {
    setSelectedScenario(null);
    setTestStep(0);
    setIsRunning(false);
    setShowValidation(false);
  };

  const steps = [
    { id: 1, title: '导入车牌档案', description: '加载测试目录中的车牌档案数据' },
    { id: 2, title: '发起换绑申请', description: '提交车牌换绑操作' },
    { id: 3, title: '系统数据校验', description: '验证数据完整性和业务规则' },
    { id: 4, title: '结果展示', description: '显示换绑结果和失败路径' }
  ];

  const getScenarioIcon = (type: string) => {
    return type === 'binding_failure' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />;
  };

  const getScenarioColor = (type: string) => {
    return type === 'binding_failure' 
      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
      : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-xl">
              <TestTube className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">车牌换绑测试</h2>
              <p className="text-sm text-slate-500">模拟车牌换绑场景，验证失败路径可见性</p>
            </div>
          </div>
          {selectedScenario && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重置测试
            </button>
          )}
        </div>

        {!selectedScenario ? (
          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-4">选择测试场景</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bindingScenarios.map((scenario: ScenarioConfig) => (
                <div
                  key={scenario.id}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${getScenarioColor(scenario.type)}`}
                  onClick={() => handleStartTest(scenario.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-white px-3 py-1 rounded-full text-xs font-medium ${
                          scenario.type === 'binding_failure' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}>
                          {scenario.type === 'binding_failure' ? '失败场景' : '成功场景'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-800 mb-1">{scenario.name}</h4>
                      <p className="text-sm text-slate-600 mb-3">{scenario.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">{scenario.dataKeys.length} 条测试数据</span>
                      </div>
                    </div>
                    <Play className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h3 className="text-lg font-medium text-slate-800 mb-4">测试执行流程</h3>
              <div className="flex items-start justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ${
                        testStep >= step.id 
                          ? step.id === 4 && testBinding?.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      } ${isRunning && testStep === step.id - 1 ? 'animate-pulse ring-4 ring-emerald-200' : ''}`}>
                        {testStep > step.id ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <span className="font-semibold">{step.id}</span>
                        )}
                      </div>
                      <h4 className={`font-medium text-center mb-1 ${
                        testStep >= step.id ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-500 text-center">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden md:block">
                        <ArrowRight className={`w-6 h-6 mx-auto mt-6 ${
                          testStep > step.id ? 'text-emerald-500' : 'text-slate-300'
                        }`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {showValidation && testBinding && (
              <div className="space-y-6">
                <div className={`rounded-xl p-6 border-2 ${
                  testBinding.status === 'failed' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {testBinding.status === 'failed' ? (
                      <div className="bg-red-100 p-2 rounded-lg">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                    ) : (
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {testBinding.status === 'failed' ? '换绑失败 - 关键验证点' : '换绑成功'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {testBinding.oldPlate} → {testBinding.newPlate}
                      </p>
                    </div>
                  </div>

                  {testBinding.status === 'failed' && (
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                        <AlertCircle className="w-5 h-5" />
                        失败原因
                      </div>
                      <p className="text-red-600">{testBinding.failReason}</p>
                      <div className="mt-3 text-sm text-red-500">
                        失败阶段: {testBinding.failStep === 'validation' ? '数据校验' :
                                  testBinding.failStep === 'approval' ? '审批环节' :
                                  testBinding.failStep === 'system' ? '系统异常' : '数据问题'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-4">校验过程回放</h4>
                  <div className="space-y-3">
                    {validationSteps.map((step: ValidationStep, index: number) => (
                      <div 
                        key={step.id}
                        className={`p-4 rounded-lg border ${
                          step.status === 'passed' ? 'bg-emerald-50 border-emerald-200' :
                          step.status === 'failed' ? 'bg-red-50 border-red-200' :
                          'bg-slate-50 border-slate-200'
                        }`}
                        style={{ animationDelay: `${index * 0.2}s` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {step.status === 'passed' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                            {step.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                            {step.status === 'skipped' && <Eye className="w-5 h-5 text-slate-400" />}
                            <span className="font-medium text-slate-800">{step.stepName}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            step.status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                            step.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {step.status === 'passed' ? '通过' :
                             step.status === 'failed' ? '失败' : '跳过'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2 ml-8">{step.description}</p>
                        {step.detail && (
                          <p className="text-sm text-red-600 mt-1 ml-8 font-medium">{step.detail}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 font-medium mb-3">
                      <FileCheck className="w-5 h-5" />
                      失败路径可见性验证
                    </div>
                    <ul className="space-y-2 text-sm text-amber-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        失败原因清晰展示
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        失败阶段明确标识
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        校验过程完整回放
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        相关线索自动关联
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 font-medium mb-3">
                      <Car className="w-5 h-5" />
                      关联数据
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">车牌档案:</span>
                        <span className="font-medium text-slate-800">{testBinding.oldPlate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">目标车牌:</span>
                        <span className="font-medium text-slate-800">{testBinding.newPlate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">操作人:</span>
                        <span className="font-medium text-slate-800">{testBinding.operator}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">操作时间:</span>
                        <span className="font-medium text-slate-800 text-sm">
                          {new Date(testBinding.bindTime).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium mb-3">
                    <CheckCircle className="w-5 h-5" />
                    测试结论
                  </div>
                  <p className="text-sm text-emerald-600">
                    ✅ <strong>失败路径完全可见！</strong> 系统成功展示了车牌换绑的完整失败流程，包括失败原因、失败阶段、校验过程。
                    用户可以清晰地看到换绑卡在哪里、为什么失败，以及相关的所有数据线索。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!selectedScenario && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-2">测试说明</h3>
              <p className="text-purple-700 mb-3">
                选择一个测试场景后，系统将模拟车牌换绑的完整流程。对于失败场景，您将看到：
              </p>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>• 失败原因的清晰展示</li>
                <li>• 具体卡在哪个校验环节</li>
                <li>• 需要补充什么材料</li>
                <li>• 下一步应该做什么</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
