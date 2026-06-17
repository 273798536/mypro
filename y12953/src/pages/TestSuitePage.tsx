import { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Database,
} from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import type { BackupRecord } from '@/types';

export default function TestSuitePage() {
  const testScenarios = useBackupStore((state) => state.testScenarios);
  const runTestScenario = useBackupStore((state) => state.runTestScenario);
  const resetTestScenario = useBackupStore((state) => state.resetTestScenario);
  const importBackup = useBackupStore((state) => state.importBackup);

  const [importResult, setImportResult] = useState<{
    success: boolean;
    isDuplicate: boolean;
    message: string;
  } | null>(null);

  const handleRun = (scenarioId: string) => {
    runTestScenario(scenarioId);
  };

  const handleReset = (scenarioId: string) => {
    resetTestScenario(scenarioId);
  };

  const testDuplicateImport = () => {
    const testBackup: BackupRecord = {
      id: 'test-duplicate',
      tableName: 'test_import_table',
      backupTime: new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
      source: 'test-source',
      recordCount: 1000,
      status: 'normal',
      schemaVersion: 'v1.0.0',
      driftCount: 0,
      fields: [
        { name: 'id', expectedType: 'BIGINT', actualType: 'BIGINT', isDrifted: false, description: '主键' },
        { name: 'name', expectedType: 'VARCHAR(100)', actualType: 'VARCHAR(100)', isDrifted: false, description: '名称' },
      ],
      slowQueries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result1 = importBackup(testBackup);
    const result2 = importBackup(testBackup);

    setImportResult({
      success: result1.success && result2.isDuplicate,
      isDuplicate: result2.isDuplicate,
      message: result2.message,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white font-mono">测试路径</h1>
        <p className="text-navy-300 mt-1 text-sm">
          场景验证 · 确保工具能跑且不越跑越乱
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium">为什么要有测试路径？</p>
            <p className="text-amber-200/80 text-sm mt-1">
              备份恢复演练台如果看上去能跑、实际越跑越乱，安全审计员反而更头疼。
              测试路径里放了重复导入场景，每次使用前可以跑一遍，确认工具的去重逻辑正常。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {testScenarios.map((scenario, idx) => (
          <div
            key={scenario.id}
            className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden"
            style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: `${idx * 100}ms`, opacity: 0 }}
          >
            <div className="px-5 py-4 border-b border-navy-700/50 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    scenario.status === 'passed'
                      ? 'bg-emerald-500/20'
                      : scenario.status === 'failed'
                      ? 'bg-red-500/20'
                      : scenario.status === 'running'
                      ? 'bg-amber-500/20'
                      : 'bg-navy-700/50'
                  }`}
                >
                  {scenario.status === 'passed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : scenario.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : scenario.status === 'running' ? (
                    <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                  ) : (
                    <FlaskConical className="w-5 h-5 text-navy-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{scenario.name}</h3>
                  <p className="text-sm text-navy-400 mt-0.5">{scenario.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {scenario.status !== 'idle' && (
                  <button
                    onClick={() => handleReset(scenario.id)}
                    disabled={scenario.status === 'running'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-navy-700/50 hover:bg-navy-600/50 text-navy-300 hover:text-white rounded-lg border border-navy-600/50 hover:border-navy-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    重置
                  </button>
                )}
                <button
                  onClick={() => handleRun(scenario.id)}
                  disabled={scenario.status === 'running'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                    scenario.status === 'running'
                      ? 'bg-navy-600/50 text-navy-400 cursor-not-allowed'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400/50'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  {scenario.status === 'running' ? '运行中...' : '运行测试'}
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="space-y-3">
                {scenario.steps.map((step, stepIdx) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      step.status === 'running'
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : step.status === 'passed'
                        ? 'bg-emerald-500/5'
                        : 'bg-navy-900/30'
                    }`}
                    style={{
                      animation:
                        step.status === 'passed' || step.status === 'running'
                          ? 'fadeInUp 0.3s ease-out forwards'
                          : 'none',
                      animationDelay: `${stepIdx * 50}ms`,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                      {step.status === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : step.status === 'running' ? (
                        <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                      ) : step.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-navy-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          step.status === 'passed'
                            ? 'text-emerald-300'
                            : step.status === 'running'
                            ? 'text-amber-300'
                            : step.status === 'failed'
                            ? 'text-red-300'
                            : 'text-navy-300'
                        }`}
                      >
                        {step.name}
                      </p>
                      <p className="text-xs text-navy-500 mt-0.5">{step.description}</p>
                    </div>
                    <span className="text-xs text-navy-500">
                      步骤 {stepIdx + 1}/{scenario.steps.length}
                    </span>
                  </div>
                ))}
              </div>

              {scenario.result && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    scenario.status === 'passed'
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      scenario.status === 'passed' ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    结论：{scenario.result}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700/50">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Copy className="w-5 h-5 text-amber-400" />
            手动验证：重复导入
          </h3>
          <p className="text-xs text-navy-400 mt-1">
            点击下方按钮模拟重复导入同一份备份，验证去重逻辑是否生效
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={testDuplicateImport}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg border border-amber-500/30 hover:border-amber-400/50 transition-all text-sm"
            >
              <Database className="w-4 h-4" />
              导入两次相同备份
            </button>
            {importResult && (
              <div
                className={`flex-1 p-3 rounded-lg ${
                  importResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <p
                  className={`text-sm ${
                    importResult.success ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {importResult.success ? '✅ 去重正常：' : '❌ 去重失败：'}
                  {importResult.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
