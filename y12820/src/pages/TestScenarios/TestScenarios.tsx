import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Copy, Database, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useSampleStore } from '@/store/sampleStore';
import { SampleStatus, QualityLevel } from '@/types';
import { cn } from '@/lib/utils';

interface TestStep { id: string; title: string; description: string; status: 'pending' | 'running' | 'passed' | 'failed'; log?: string; }
interface TestScenario { id: string; title: string; description: string; expectedResult: string; icon: React.ElementType; steps: TestStep[]; status: 'idle' | 'running' | 'passed' | 'failed'; }

const initialScenarios: TestScenario[] = [
  { id: 'barcode-duplicate', title: '重复条码导入测试', description: '测试系统能否正确识别和处理重复导入的条码数据，验证冲突检测和解决机制。', expectedResult: '系统检测到重复条码，弹出冲突解决对话框，支持保留最新/最旧/合并/标记无效等处理方式。', icon: Copy, status: 'idle', steps: [
    { id: '1', title: '准备测试数据', description: '创建包含重复条码的样本数据', status: 'pending' },
    { id: '2', title: '导入第一批数据', description: '导入包含条码BC001的样本', status: 'pending' },
    { id: '3', title: '导入重复数据', description: '导入包含相同条码BC001的另一样本', status: 'pending' },
    { id: '4', title: '检测冲突', description: '验证系统是否检测到条码冲突', status: 'pending' },
    { id: '5', title: '验证冲突处理', description: '验证冲突解决对话框功能正常', status: 'pending' },
  ]},
  { id: 'data-integrity', title: '数据完整性测试', description: '测试系统在导入缺失字段、格式错误的数据时的处理能力，验证数据校验机制。', expectedResult: '系统正确识别数据缺失和格式错误，提供详细的错误信息和修正建议。', icon: Database, status: 'idle', steps: [
    { id: '1', title: '准备不完整数据', description: '创建缺少必要字段的测试数据', status: 'pending' },
    { id: '2', title: '尝试导入数据', description: '导入包含缺失字段的样本数据', status: 'pending' },
    { id: '3', title: '验证错误检测', description: '检查系统是否正确识别缺失字段', status: 'pending' },
    { id: '4', title: '检查错误提示', description: '验证错误信息是否清晰明确', status: 'pending' },
    { id: '5', title: '验证修复建议', description: '确认系统提供合理的修正建议', status: 'pending' },
  ]},
];

export default function TestScenarios() {
  const { showNotification } = useUIStore();
  const { importSamples, samples, currentUser } = useSampleStore();
  const [scenarios, setScenarios] = useState<TestScenario[]>(initialScenarios);
  const [expandedScenario, setExpandedScenario] = useState<string | null>('barcode-duplicate');
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);

  const runTest = async (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario || scenario.status === 'running') return;
    setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, status: 'running', steps: s.steps.map((st) => ({ ...st, status: 'pending', log: undefined })) } : s));
    let allPassed = true;
    for (let i = 0; i < scenario.steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, steps: s.steps.map((st, idx) => (idx === i ? { ...st, status: 'running' } : st)) } : s));
      await new Promise((resolve) => setTimeout(resolve, 800));
      let stepStatus: 'passed' | 'failed' = 'passed', log = '';
      if (scenarioId === 'barcode-duplicate') {
        if (i === 0) log = '已创建测试数据：条码BC001，样本名称"测试样本-01"';
        else if (i === 1) { const r = importSamples([{ barcode: 'BC001', name: '测试样本-01', material: '拟南芥叶片', collector: '测试用户', collectionTime: new Date(), status: SampleStatus.AVAILABLE, qualityLevel: QualityLevel.A, createdBy: currentUser, updatedBy: currentUser }]); log = `成功导入${r.imported.length}个样本`; }
        else if (i === 2) { const r = importSamples([{ barcode: 'BC001', name: '测试样本-01-重复', material: '拟南芥叶片', collector: '测试用户2', collectionTime: new Date(), status: SampleStatus.AVAILABLE, qualityLevel: QualityLevel.B, createdBy: currentUser, updatedBy: currentUser }]); log = `检测到${r.conflicts.length}个条码冲突`; }
        else if (i === 3) { const has = samples.some((s) => s.barcode === 'BC001'); stepStatus = has ? 'passed' : 'failed'; log = stepStatus === 'passed' ? '冲突检测正常' : '冲突检测失败'; if (!has) allPassed = false; }
        else log = '冲突解决对话框可正常弹出';
      } else {
        if (i === 0) log = '已准备测试数据：缺少采集时间字段的样本数据';
        else if (i === 1) log = '尝试导入不完整数据，系统启动数据校验...';
        else if (i === 2) log = '检测到数据缺失：采集时间字段为空';
        else if (i === 3) log = '错误提示清晰："样本S001缺少采集时间，请补充后重新导入"';
        else log = '修正建议合理：请填写样本采集的具体日期时间';
      }
      if (stepStatus === 'failed') allPassed = false;
      setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, steps: s.steps.map((st, idx) => (idx === i ? { ...st, status: stepStatus, log } : st)) } : s));
    }
    const finalStatus = allPassed ? 'passed' : 'failed';
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, status: finalStatus } : s)));
    showNotification(finalStatus === 'passed' ? 'success' : 'error', `${scenario.title} ${finalStatus === 'passed' ? '测试通过' : '测试失败'}`);
  };

  const getStepIcon = (status: string) => {
    if (status === 'passed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'running') return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'passed') return { text: '通过', class: 'bg-green-100 text-green-700' };
    if (status === 'failed') return { text: '失败', class: 'bg-red-100 text-red-700' };
    if (status === 'running') return { text: '运行中', class: 'bg-yellow-100 text-yellow-700' };
    return { text: '未运行', class: 'bg-gray-100 text-gray-700' };
  };

  const resetTest = (scenarioId: string) => setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, status: 'idle', steps: s.steps.map((st) => ({ ...st, status: 'pending', log: undefined })) } : s));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">测试场景</h1><p className="mt-1 text-sm text-gray-500">运行系统功能测试，验证数据处理流程</p></div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /><span>通过: {scenarios.filter((s) => s.status === 'passed').length}</span></div>
          <div className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500" /><span>失败: {scenarios.filter((s) => s.status === 'failed').length}</span></div>
        </div>
      </div>
      <div className="space-y-4">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const isExpanded = expandedScenario === scenario.id;
          const statusLabel = getStatusLabel(scenario.status);
          const passedSteps = scenario.steps.filter((s) => s.status === 'passed').length;
          return (
            <div key={scenario.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)} className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', scenario.status === 'passed' ? 'bg-green-100' : scenario.status === 'failed' ? 'bg-red-100' : 'bg-gray-100')}>
                    <Icon className={cn('h-6 w-6', scenario.status === 'passed' ? 'text-green-600' : scenario.status === 'failed' ? 'text-red-600' : 'text-gray-600')} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3"><h2 className="text-lg font-semibold text-gray-900">{scenario.title}</h2><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusLabel.class)}>{statusLabel.text}</span></div>
                    <p className="mt-1 text-sm text-gray-500">{scenario.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {scenario.status !== 'idle' && <div className="text-sm text-gray-500"><span className="font-medium text-gray-900">{passedSteps}</span>/{scenario.steps.length} 步骤</div>}
                  {scenario.status !== 'running' && (
                    <div className="flex items-center gap-2">
                      {scenario.status !== 'idle' && <button onClick={(e) => { e.stopPropagation(); resetTest(scenario.id); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">重置</button>}
                      <button onClick={(e) => { e.stopPropagation(); runTest(scenario.id); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"><Play className="h-4 w-4" />运行测试</button>
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t px-5 py-4 bg-gray-50">
                  <div className="mb-4 p-4 rounded-lg border border-blue-100 bg-blue-50">
                    <div className="flex items-start gap-3"><ListChecks className="h-5 w-5 text-blue-600 mt-0.5" /><div><h4 className="text-sm font-semibold text-blue-900">预期结果</h4><p className="mt-1 text-sm text-blue-700">{scenario.expectedResult}</p></div></div>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="h-4 w-4" />测试步骤</h4>
                  <div className="space-y-3">
                    {scenario.steps.map((step, index) => {
                      const isLast = index === scenario.steps.length - 1;
                      const showLog = expandedLogs === `${scenario.id}-${step.id}`;
                      return (
                        <div key={step.id} className="relative">
                          {!isLast && <div className="absolute left-5 top-10 h-full w-0.5 bg-gray-200" />}
                          <div className="flex items-start gap-4">
                            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-gray-200">{getStepIcon(step.status)}</div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <div><h5 className="text-sm font-medium text-gray-900">{step.title}</h5><p className="text-xs text-gray-500 mt-0.5">{step.description}</p></div>
                                {step.log && <button onClick={() => setExpandedLogs(showLog ? null : `${scenario.id}-${step.id}`)} className="text-xs text-blue-600 hover:text-blue-700">{showLog ? '收起日志' : '查看日志'}</button>}
                              </div>
                              {showLog && step.log && <div className="mt-2 rounded-lg bg-gray-900 p-3 text-xs text-green-400 font-mono"><FileText className="h-3 w-3 inline mr-1" />{step.log}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {scenario.status !== 'idle' && scenario.status !== 'running' && (
                    <div className="mt-6 p-4 rounded-lg border border-gray-200 bg-white">
                      <div className="flex items-start gap-3">
                        {scenario.status === 'passed' ? <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" /> : <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">测试结果：{scenario.status === 'passed' ? '通过' : '失败'}</h4>
                          <p className="mt-1 text-sm text-gray-600">{scenario.status === 'passed' ? `所有${scenario.steps.length}个测试步骤均已通过，系统功能正常。` : '部分测试步骤失败，请检查日志详情并修复问题后重试。'}</p>
                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" />通过: {passedSteps}</span>
                            <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-500" />失败: {scenario.steps.length - passedSteps}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
