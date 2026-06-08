import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SolutionType, OutlierType } from '../types';

const SOLUTION_INFO: Record<SolutionType, {
  label: string;
  icon: string;
  desc: string;
  targets: OutlierType[];
  detail: string;
}> = {
  're-run': {
    label: '重复运行',
    icon: 'refresh',
    desc: '重新运行校准算法，修正设备漂移和随机噪声',
    targets: ['drift', 'noise'],
    detail: '使用最新的设备基准值重新跑一次拟合流程，自动把漂移点拉回正常轨迹。',
  },
  're-record': {
    label: '补录',
    icon: 'fiber_new',
    desc: '针对相机视角丢失段，用传感器融合数据补录',
    targets: ['camera-loss'],
    detail: '调出丢失时段的辅助传感器（IMU/加速度计）数据，融合插值补全轨迹缺口。',
  },
  'manual': {
    label: '人工确认',
    icon: 'person',
    desc: '规划设计师逐条复核异常点，手动修正坐标',
    targets: ['interference', 'unknown'],
    detail: '在报告归档前，由设计师确认剩余异常，必要时根据原始录像手动改值。',
  },
};

export function ProblemSolvingPage() {
  const { currentSession, applySolution } = useApp();
  const [confirmType, setConfirmType] = useState<SolutionType | null>(null);

  const allSolutionsApplied = useMemo(() => {
    if (!currentSession) return false;
    return Object.values(currentSession.solutions).every(s => s.applied);
  }, [currentSession]);

  if (!currentSession) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">请先选择或导入一个会话</div>
      </div>
    );
  }

  const outliers = currentSession.points.filter(p => p.isOutlier);
  const rawOutlierCount = mockRawCount(currentSession.id);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">问题处理</h1>
        <p className="text-sm text-gray-500 mt-1">{currentSession.name}</p>
      </div>

      {currentSession.hasCameraLoss && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-icons text-red-600 text-xl mt-0.5">warning</span>
            <div className="flex-1">
              <p className="font-medium text-red-800">检测到相机视角丢失问题</p>
              <p className="text-sm text-red-600 mt-1">
                本会话存在 {currentSession.cameraLossSegments.length} 段视角丢失，
                必须完整执行「重复运行 → 补录 → 人工确认」三步处理，缺一不可。
              </p>
            </div>
            <div className="flex gap-1">
              {(['re-run', 're-record', 'manual'] as SolutionType[]).map(t => (
                <div
                  key={t}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs ${
                    currentSession.solutions[t].applied ? 'bg-green-500' : 'bg-red-300'
                  }`}
                  title={SOLUTION_INFO[t].label}
                >
                  {currentSession.solutions[t].applied ? '✓' : '!'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {(['re-run', 're-record', 'manual'] as SolutionType[]).map(type => {
          const info = SOLUTION_INFO[type];
          const sol = currentSession.solutions[type];
          const targetOutliers = outliers.filter(o => info.targets.includes(o.outlierType));

          return (
            <div
              key={type}
              className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${
                sol.applied ? 'border-green-400 bg-green-50/40' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    sol.applied ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <span className="material-icons text-white text-xl">
                    {sol.applied ? 'check' : info.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{info.label}</h3>
                    {sol.applied && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        已完成
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{info.desc}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-3">{info.detail}</p>

              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
                <div className="text-gray-500 mb-1.5">本次涉及异常点：</div>
                {targetOutliers.length === 0 ? (
                  <div className="text-gray-400">无匹配异常点，执行后无变化</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {targetOutliers.map(p => (
                      <span
                        key={p.id}
                        className={`px-2 py-0.5 rounded-full ${
                          p.isOutlier ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {p.id}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {sol.applied ? (
                <div className="text-xs text-gray-500">
                  执行人：{sol.operator} · {new Date(sol.appliedAt!).toLocaleString()}
                </div>
              ) : (
                <button
                  onClick={() => setConfirmType(type)}
                  className="w-full py-2.5 rounded-lg bg-primary text-white hover:bg-blue-800 transition-colors font-medium text-sm"
                >
                  执行 {info.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirmType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-icons text-3xl text-accent">help_outline</span>
              <div>
                <h3 className="font-semibold text-gray-800">
                  确认执行「{SOLUTION_INFO[confirmType].label}」？
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  操作将更新相关点的坐标和状态，变更会被记录。
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmType(null)}
                className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  applySolution(currentSession.id, confirmType);
                  setConfirmType(null);
                }}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-800"
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">新旧结论对比</h2>
          <div className="text-xs text-gray-500">
            原始异常点 {rawOutlierCount} 个 · 剩余 {outliers.length} 个
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <h3 className="font-medium text-gray-700">原始结论（处理前）</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">总数据点</span>
                <span className="font-medium">{currentSession.points.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">异常点</span>
                <span className="font-medium text-red-600">{rawOutlierCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">视角丢失段</span>
                <span className="font-medium text-red-600">
                  {currentSession.cameraLossSegments.length}
                </span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-gray-600 leading-relaxed">{currentSession.conclusions.raw}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${allSolutionsApplied ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <h3 className="font-medium text-gray-700">
                当前结论（{allSolutionsApplied ? '三步已完成' : '处理中'}）
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">总数据点</span>
                <span className="font-medium">{currentSession.points.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">异常点</span>
                <span className={`font-medium ${outliers.length === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {outliers.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">已处理方案</span>
                <span className="font-medium text-green-600">
                  {Object.values(currentSession.solutions).filter(s => s.applied).length}/3
                </span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-gray-600 leading-relaxed">
                  {currentSession.conclusions.processed || '请依次执行三种方案后生成处理后结论。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {allSolutionsApplied && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-icons text-green-600 text-xl mt-0.5">check_circle</span>
            <div>
              <p className="font-medium text-green-800">所有解决方案已执行完毕</p>
              <p className="text-sm text-green-600 mt-1">
                可以前往「报告」页面导出最终分析报告，交付甲方。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mockRawCount(sessionId: string): number {
  return sessionId === 'session-001' ? 6 : sessionId === 'session-002' ? 2 : 0;
}
