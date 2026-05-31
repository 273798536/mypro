import { useState } from 'react';
import { 
  AlertTriangle, 
  Play, 
  CheckCircle, 
  XCircle,
  Zap,
  Users,
  MapPin,
  GraduationCap,
  Clock
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { boundaryScenarios } from '../data/boundaryScenarios';
import { runScheduleCheck } from '../engine/scheduleEngine';
import { SampleTypeBadge, SeverityBadge } from '../components/StatusBadge';
import type { Volunteer, Position, TrainingRecord, Assignment } from '../types';

export function BoundarySamples() {
  const { setVolunteers, setPositions, setTrainingRecords, runIdempotencyTest } = useScheduleStore();
  
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    sampleType: string;
    issues: { type: string; severity: string; message: string }[];
  } | null>(null);
  const [idempotencyResult, setIdempotencyResult] = useState<{ passed: boolean; message: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const categoryConfig = {
    conflict: { label: '岗位冲突', icon: Zap, color: 'text-wine-600', bg: 'bg-wine-50' },
    missing_training: { label: '培训缺失', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
    leave: { label: '临时请假', icon: Clock, color: 'text-wine-600', bg: 'bg-wine-50' },
    capacity: { label: '容量超限', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    mixed: { label: '混合场景', icon: AlertTriangle, color: 'text-navy-600', bg: 'bg-navy-50' },
  };
  
  async function runScenarioTest(scenarioId: string) {
    setSelectedScenario(scenarioId);
    setIsRunning(true);
    setTestResult(null);
    
    const scenario = boundaryScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const volunteers = scenario.setupData.volunteers.map((v, idx) => ({
      ...v,
      id: v.id || `vol-test-${idx + 1}`,
      phone: v.phone || '13800000000',
      skills: v.skills || [],
      availableSlots: v.availableSlots || [],
      isOnLeave: v.isOnLeave || false,
    } as Volunteer));
    
    const positions = scenario.setupData.positions.map((p, idx) => ({
      ...p,
      id: p.id || `pos-test-${idx + 1}`,
      requiredSkills: p.requiredSkills || [],
      requiredTraining: p.requiredTraining || [],
      timeSlot: p.timeSlot || '18:00-20:00',
      capacity: p.capacity || 1,
    } as Position));
    
    const trainingRecords = scenario.setupData.trainingRecords.map((r, idx) => ({
      ...r,
      id: r.id || `train-test-${idx + 1}`,
      volunteerId: r.volunteerId || '',
      trainingName: r.trainingName || '消防培训',
      completedAt: r.completedAt || '2026-05-01',
      status: r.status || 'passed',
    } as TrainingRecord));
    
    setVolunteers(volunteers);
    setPositions(positions);
    setTrainingRecords(trainingRecords);
    
    const assignments: Assignment[] = [];
    volunteers.forEach((volunteer, vIdx) => {
      positions.forEach((position, pIdx) => {
        assignments.push({
          id: `assign-test-${vIdx * positions.length + pIdx + 1}`,
          volunteerId: volunteer.id,
          positionId: position.id,
          timeSlot: position.timeSlot,
          status: 'assigned',
          reason: '测试分配'
        });
      });
    });
    
    useScheduleStore.setState({ assignments });
    
    const { checkResults } = runScheduleCheck(
      volunteers,
      positions,
      trainingRecords,
      assignments
    );
    
    const relevantResult = checkResults.find(r => 
      scenario.expectedIssues.some(expected => 
        r.issues.some(issue => issue.type === expected)
      )
    ) || checkResults[0];
    
    if (relevantResult) {
      const matchedExpected = scenario.expectedIssues.every(expected =>
        relevantResult.issues.some(issue => issue.type === expected)
      );
      
      const sampleTypeMatch = relevantResult.sampleType === scenario.expectedSampleType;
      
      setTestResult({
        success: matchedExpected && sampleTypeMatch,
        sampleType: relevantResult.sampleType,
        issues: relevantResult.issues.map(i => ({
          type: i.type,
          severity: i.severity,
          message: i.message
        }))
      });
    }
    
    setIsRunning(false);
  }
  
  function runScenarioIdempotencyTest(scenarioId: string) {
    const scenario = boundaryScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const volunteers = scenario.setupData.volunteers.map((v, idx) => ({
      ...v,
      id: v.id || `vol-test-${idx + 1}`,
      phone: v.phone || '13800000000',
      skills: v.skills || [],
      availableSlots: v.availableSlots || [],
      isOnLeave: v.isOnLeave || false,
    } as Volunteer));
    
    const positions = scenario.setupData.positions.map((p, idx) => ({
      ...p,
      id: p.id || `pos-test-${idx + 1}`,
      requiredSkills: p.requiredSkills || [],
      requiredTraining: p.requiredTraining || [],
      timeSlot: p.timeSlot || '18:00-20:00',
      capacity: p.capacity || 1,
    } as Position));
    
    const trainingRecords = scenario.setupData.trainingRecords.map((r, idx) => ({
      ...r,
      id: r.id || `train-test-${idx + 1}`,
      volunteerId: r.volunteerId || '',
      trainingName: r.trainingName || '消防培训',
      completedAt: r.completedAt || '2026-05-01',
      status: r.status || 'passed',
    } as TrainingRecord));
    
    const assignments: Assignment[] = [];
    volunteers.forEach((volunteer, vIdx) => {
      positions.forEach((position, pIdx) => {
        assignments.push({
          id: `assign-test-${vIdx * positions.length + pIdx + 1}`,
          volunteerId: volunteer.id,
          positionId: position.id,
          timeSlot: position.timeSlot,
          status: 'assigned',
          reason: '测试分配'
        });
      });
    });
    
    const result = runIdempotencyTest();
    setIdempotencyResult(result);
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            边界样例库
          </h1>
          <p className="text-navy-500 mt-1">
            测试各种边界场景，确保系统能正确识别和分类
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {boundaryScenarios.map((scenario) => {
          const config = categoryConfig[scenario.category];
          const Icon = config.icon;
          const isSelected = selectedScenario === scenario.id;
          
          return (
            <div 
              key={scenario.id} 
              className={`card transition-all duration-200 ${
                isSelected ? 'ring-2 ring-navy-500' : ''
              }`}
            >
              <div className={`card-header flex items-center gap-2 ${config.bg} border-b ${config.bg.replace('50', '200')}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`font-display font-semibold text-navy-900`}>
                  {scenario.name}
                </span>
              </div>
              <div className="card-body">
                <p className="text-sm text-navy-600 mb-4">
                  {scenario.description}
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-navy-500">预期结果:</span>
                  <SampleTypeBadge type={scenario.expectedSampleType} />
                </div>
                
                <div className="mb-4">
                  <p className="text-xs text-navy-500 mb-2">预期问题:</p>
                  <div className="flex flex-wrap gap-2">
                    {scenario.expectedIssues.map((issue, idx) => (
                      <span key={idx} className="badge bg-navy-100 text-navy-700">
                        {issue === 'conflict' ? '岗位冲突' :
                         issue === 'missing_training' ? '培训缺失' :
                         issue === 'leave' ? '临时请假' :
                         issue === 'capacity' ? '容量超限' :
                         issue === 'training_expiring' ? '培训过期' : issue}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => runScenarioTest(scenario.id)}
                    disabled={isRunning}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isRunning && isSelected ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    运行测试
                  </button>
                  <button
                    onClick={() => runScenarioIdempotencyTest(scenario.id)}
                    className="btn btn-secondary flex items-center justify-center gap-2"
                    title="幂等性测试"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
                
                {isSelected && testResult && (
                  <div className={`mt-4 p-3 rounded ${
                    testResult.success 
                      ? 'bg-forest-50 border border-forest-200' 
                      : 'bg-wine-50 border border-wine-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.success ? (
                        <CheckCircle className="w-5 h-5 text-forest-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-wine-600" />
                      )}
                      <span className={`font-medium ${
                        testResult.success ? 'text-forest-800' : 'text-wine-800'
                      }`}>
                        {testResult.success ? '测试通过' : '测试失败'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-navy-500">实际样本类型:</span>
                      <SampleTypeBadge type={testResult.sampleType as any} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-navy-500">检测到的问题:</p>
                      {testResult.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <SeverityBadge severity={issue.severity as any} />
                          <span className="text-sm text-navy-700">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {idempotencyResult && (
        <div className={`card p-4 flex items-center gap-4 ${
          idempotencyResult.passed 
            ? 'bg-forest-50 border-forest-200' 
            : 'bg-wine-50 border-wine-200'
        }`}>
          {idempotencyResult.passed ? (
            <CheckCircle className="w-6 h-6 text-forest-600" />
          ) : (
            <XCircle className="w-6 h-6 text-wine-600" />
          )}
          <div>
            <p className={`font-medium ${
              idempotencyResult.passed ? 'text-forest-800' : 'text-wine-800'
            }`}>
              幂等性测试结果
            </p>
            <p className={`text-sm ${
              idempotencyResult.passed ? 'text-forest-600' : 'text-wine-600'
            }`}>
              {idempotencyResult.message}
            </p>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          测试场景说明
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-navy-700 mb-3">错误级边界场景</p>
              <ul className="space-y-2 text-sm text-navy-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>岗位冲突:</strong> 验证同一志愿者同一时段不能分配多个岗位</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>培训缺失:</strong> 验证未完成必要培训的志愿者不能上岗</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>临时请假:</strong> 验证已请假志愿者不会被排班</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-navy-700 mb-3">警告级边界场景</p>
              <ul className="space-y-2 text-sm text-navy-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></span>
                  <span><strong>容量超限:</strong> 验证岗位分配人数超过容量时的警告</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></span>
                  <span><strong>培训过期:</strong> 验证培训即将过期时的提醒</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></span>
                  <span><strong>混合场景:</strong> 验证多种问题同时出现时的正确分类</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
