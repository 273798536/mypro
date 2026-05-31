import { useState } from 'react';
import { 
  Upload, 
  Users, 
  MapPin, 
  GraduationCap, 
  CheckCircle2, 
  ChevronRight,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { 
  generateVolunteers, 
  generatePositions, 
  generateTrainingRecordsPhase1,
  generateTrainingRecordsPhase2,
  generateInitialAssignments
} from '../data/mockData';
import { PhaseBadge } from '../components/StatusBadge';

type Step = 'phase1' | 'phase2' | 'complete';

export function DataImport() {
  const { 
    volunteers, 
    positions, 
    trainingRecords,
    snapshots,
    setVolunteers,
    setPositions,
    setTrainingRecords,
    runScheduleCheck,
    runIdempotencyTest
  } = useScheduleStore();
  
  const [currentStep, setCurrentStep] = useState<Step>(
    snapshots.some(s => s.phase === 'phase2') ? 'complete' :
    snapshots.some(s => s.phase === 'phase1') ? 'phase2' : 'phase1'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [idempotencyResult, setIdempotencyResult] = useState<{ passed: boolean; message: string } | null>(null);
  
  const steps = [
    { 
      id: 'phase1' as const, 
      label: '第一阶段', 
      description: '导入志愿者名单和入口岗位',
      icon: Users,
      completed: snapshots.some(s => s.phase === 'phase1')
    },
    { 
      id: 'phase2' as const, 
      label: '第二阶段', 
      description: '补录培训记录',
      icon: GraduationCap,
      completed: snapshots.some(s => s.phase === 'phase2')
    },
    { 
      id: 'complete' as const, 
      label: '完成', 
      description: '查看变化对比',
      icon: CheckCircle2,
      completed: currentStep === 'complete'
    },
  ];
  
  async function handlePhase1Import() {
    setIsProcessing(true);
    
    const vols = generateVolunteers(20, 42);
    const pos = generatePositions(42);
    const training = generateTrainingRecordsPhase1(vols, 42);
    const { assignments } = generateInitialAssignments(vols, pos, 42);
    
    setVolunteers(vols);
    setPositions(pos);
    setTrainingRecords(training);
    
    const assignmentsWithIds = assignments.map((a, idx) => ({
      ...a,
      id: `assign-${String(idx + 1).padStart(3, '0')}`
    }));
    
    useScheduleStore.setState({ assignments: assignmentsWithIds });
    
    await runScheduleCheck('phase1', '第一阶段：志愿者+岗位');
    
    setIsProcessing(false);
    setCurrentStep('phase2');
  }
  
  async function handlePhase2Import() {
    setIsProcessing(true);
    
    const phase2Training = generateTrainingRecordsPhase2(volunteers, trainingRecords, 42);
    setTrainingRecords(phase2Training);
    
    await runScheduleCheck('phase2', '第二阶段：补录培训记录');
    
    setIsProcessing(false);
    setCurrentStep('complete');
  }
  
  function handleRunIdempotencyTest() {
    const result = runIdempotencyTest();
    setIdempotencyResult(result);
  }
  
  function handleReset() {
    useScheduleStore.getState().resetAll();
    setCurrentStep('phase1');
    setIdempotencyResult(null);
  }
  
  const phase1Snapshot = snapshots.find(s => s.phase === 'phase1');
  const phase2Snapshot = snapshots.find(s => s.phase === 'phase2');
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            数据导入
          </h1>
          <p className="text-navy-500 mt-1">
            分两阶段导入数据，系统自动记录变化
          </p>
        </div>
        <button
          onClick={handleReset}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重置所有数据
        </button>
      </div>
      
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = step.completed;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`relative flex flex-col items-center ${
                  isActive ? 'opacity-100' : isCompleted ? 'opacity-100' : 'opacity-50'
                }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted 
                      ? 'bg-forest-600 border-forest-600 text-white' 
                      : isActive 
                        ? 'bg-white border-navy-600 text-navy-600' 
                        : 'bg-navy-50 border-navy-300 text-navy-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : (
                      <Icon className="w-8 h-8" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium text-navy-900">{step.label}</p>
                  <p className="text-xs text-navy-500 text-center max-w-[140px]">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-24 h-1 mx-2 ${
                    steps[idx].completed ? 'bg-forest-500' : 'bg-navy-200'
                  }`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-navy-600" />
              第一阶段：志愿者 + 入口岗位
            </div>
            {phase1Snapshot && <PhaseBadge phase="phase1" />}
          </div>
          <div className="card-body">
            {phase1Snapshot ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy-50 rounded p-4">
                    <p className="text-3xl font-bold text-navy-900">{volunteers.length}</p>
                    <p className="text-sm text-navy-500">志愿者</p>
                  </div>
                  <div className="bg-navy-50 rounded p-4">
                    <p className="text-3xl font-bold text-navy-900">{positions.length}</p>
                    <p className="text-sm text-navy-500">岗位</p>
                  </div>
                </div>
                <div className="bg-forest-50 border border-forest-200 rounded p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-forest-600" />
                  <div>
                    <p className="font-medium text-forest-800">第一阶段已完成</p>
                    <p className="text-sm text-forest-600">
                      生成于 {new Date(phase1Snapshot.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-navy-600 mb-2">
                    检查结果：{phase1Snapshot.checkResults.length} 条记录
                  </p>
                  <div className="flex gap-2">
                    <span className="badge badge-normal">
                      正常 {phase1Snapshot.checkResults.filter(r => r.sampleType === 'normal').length}
                    </span>
                    <span className="badge badge-boundary">
                      边界 {phase1Snapshot.checkResults.filter(r => r.sampleType === 'boundary').length}
                    </span>
                    <span className="badge badge-bad">
                      异常 {phase1Snapshot.checkResults.filter(r => r.sampleType === 'bad').length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-navy-400" />
                </div>
                <p className="text-navy-600 mb-4">
                  点击按钮生成第一阶段测试数据
                </p>
                <p className="text-sm text-navy-500 mb-6">
                  将生成 20 名志愿者、6 个岗位和初始培训记录
                </p>
                <button
                  onClick={handlePhase1Import}
                  disabled={isProcessing}
                  className="btn btn-primary"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      处理中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      导入第一阶段数据
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-navy-600" />
              第二阶段：补录培训记录
            </div>
            {phase2Snapshot && <PhaseBadge phase="phase2" />}
          </div>
          <div className="card-body">
            {phase2Snapshot ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy-50 rounded p-4">
                    <p className="text-3xl font-bold text-navy-900">{trainingRecords.length}</p>
                    <p className="text-sm text-navy-500">培训记录总数</p>
                  </div>
                  <div className="bg-forest-50 rounded p-4">
                    <p className="text-3xl font-bold text-forest-700">
                      +{trainingRecords.length - (phase1Snapshot?.trainingRecords.length || 0)}
                    </p>
                    <p className="text-sm text-forest-600">新增培训记录</p>
                  </div>
                </div>
                <div className="bg-forest-50 border border-forest-200 rounded p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-forest-600" />
                  <div>
                    <p className="font-medium text-forest-800">第二阶段已完成</p>
                    <p className="text-sm text-forest-600">
                      生成于 {new Date(phase2Snapshot.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-navy-600 mb-2">
                    检查结果：{phase2Snapshot.checkResults.length} 条记录
                  </p>
                  <div className="flex gap-2">
                    <span className="badge badge-normal">
                      正常 {phase2Snapshot.checkResults.filter(r => r.sampleType === 'normal').length}
                    </span>
                    <span className="badge badge-boundary">
                      边界 {phase2Snapshot.checkResults.filter(r => r.sampleType === 'boundary').length}
                    </span>
                    <span className="badge badge-bad">
                      异常 {phase2Snapshot.checkResults.filter(r => r.sampleType === 'bad').length}
                    </span>
                  </div>
                </div>
              </div>
            ) : currentStep === 'phase2' ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
                <p className="text-navy-600 mb-4">
                  培训记录已到，补录第二阶段数据
                </p>
                <p className="text-sm text-navy-500 mb-6">
                  模拟晚半天收到的培训记录，系统将重新检查并对比变化
                </p>
                <button
                  onClick={handlePhase2Import}
                  disabled={isProcessing}
                  className="btn btn-primary"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      处理中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      补录培训记录
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChevronRight className="w-10 h-10 text-navy-300" />
                </div>
                <p className="text-navy-400">
                  请先完成第一阶段导入
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {currentStep === 'complete' && (
        <div className="card">
          <div className="card-header">
            幂等性验证
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-navy-600 mb-1">
                  验证系统重复运行结果是否一致
                </p>
                <p className="text-sm text-navy-500">
                  连续运行3次排班检查，确保结果完全相同
                </p>
              </div>
              <button
                onClick={handleRunIdempotencyTest}
                className="btn btn-secondary"
              >
                运行幂等性测试
              </button>
            </div>
            
            {idempotencyResult && (
              <div className={`mt-4 p-4 rounded flex items-center gap-3 ${
                idempotencyResult.passed 
                  ? 'bg-forest-50 border border-forest-200' 
                  : 'bg-wine-50 border border-wine-200'
              }`}>
                {idempotencyResult.passed ? (
                  <CheckCircle2 className="w-6 h-6 text-forest-600" />
                ) : (
                  <Clock className="w-6 h-6 text-wine-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    idempotencyResult.passed ? 'text-forest-800' : 'text-wine-800'
                  }`}>
                    {idempotencyResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
