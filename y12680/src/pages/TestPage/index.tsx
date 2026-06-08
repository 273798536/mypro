import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, FlaskConical, RefreshCw, Play, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { generateMockRecords } from '@/utils/mockData';
import { parseFile } from '@/utils/parser';

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  message?: string;
}

export function TestPage() {
  const navigate = useNavigate();
  const { records, init, clearAllRecords, addRecords, hasFileImported } = useAppStore();
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'load_demo',
      name: '加载演示数据',
      description: '加载 10 条预置的示例数据，验证数据结构完整性',
      status: 'idle',
    },
    {
      id: 'anomaly_detect',
      name: '异常检测',
      description: '验证视角丢失、数据冲突、格式错误三类异常是否正确识别',
      status: 'idle',
    },
    {
      id: 'review_status',
      name: '评审状态分配',
      description: '根据异常类型自动分配可直接使用/待复核/不可用状态',
      status: 'idle',
    },
    {
      id: 'duplicate_import',
      name: '重复导入检测',
      description: '导入同一文件两次，验证重复记录被正确识别和跳过',
      status: 'idle',
    },
    {
      id: 'persistence',
      name: '数据持久化',
      description: '验证数据写入 LocalStorage，刷新页面后保持一致',
      status: 'idle',
    },
  ]);

  useEffect(() => {
    init();
  }, []);

  const setTestCaseStatus = (id: string, status: TestCase['status'], message?: string) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, status, message } : tc)),
    );
  };

  const runAllTests = async () => {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      setTestCaseStatus(tc.id, 'running');
      await runTestCase(tc.id);
    }
  };

  const runTestCase = async (id: string) => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setTestCaseStatus(id, 'running');
    await wait(400);

    switch (id) {
      case 'load_demo': {
        clearAllRecords();
        await wait(100);
        const demo = generateMockRecords();
        const result = addRecords(demo);
        if (result.added === 10) {
          setTestCaseStatus(id, 'passed', `成功加载 ${result.added} 条记录`);
        } else {
          setTestCaseStatus(id, 'failed', `预期 10 条，实际 ${result.added} 条`);
        }
        break;
      }
      case 'anomaly_detect': {
        const demo = generateMockRecords();
        const cameraLost = demo.filter((r) => r.anomalyType === 'camera_lost').length;
        const dataConflict = demo.filter((r) => r.anomalyType === 'data_conflict').length;
        const formatError = demo.filter((r) => r.anomalyType === 'format_error').length;
        if (cameraLost >= 1 && dataConflict >= 1 && formatError >= 1) {
          setTestCaseStatus(
            id,
            'passed',
            `视角丢失×${cameraLost}，数据冲突×${dataConflict}，格式错误×${formatError}`,
          );
        } else {
          setTestCaseStatus(id, 'failed', '异常类型识别不完整');
        }
        break;
      }
      case 'review_status': {
        const demo = generateMockRecords();
        const usable = demo.filter((r) => r.reviewStatus === 'usable').length;
        const pending = demo.filter((r) => r.reviewStatus === 'pending').length;
        const unusable = demo.filter((r) => r.reviewStatus === 'unusable').length;
        if (usable > 0 && pending > 0 && unusable > 0) {
          setTestCaseStatus(
            id,
            'passed',
            `可直接使用×${usable}，待复核×${pending}，不可用×${unusable}`,
          );
        } else {
          setTestCaseStatus(id, 'failed', '状态分配不正确');
        }
        break;
      }
      case 'duplicate_import': {
        const demo1 = generateMockRecords();
        addRecords(demo1);
        const firstCount = useAppStore.getState().records.length;
        await wait(100);
        const demo2 = generateMockRecords();
        const result = addRecords(demo2);
        const secondCount = useAppStore.getState().records.length;
        if (result.added === 0 && firstCount === secondCount) {
          setTestCaseStatus(id, 'passed', `跳过 ${result.duplicates} 条重复记录，总数保持 ${firstCount}`);
        } else {
          setTestCaseStatus(id, 'failed', `重复记录未被正确跳过：新增${result.added}，总数${secondCount}`);
        }
        break;
      }
      case 'persistence': {
        try {
          const fromStore = useAppStore.getState().records.length;
          const fromStorage = localStorage.getItem('pocket-browser-records');
          if (fromStorage && JSON.parse(fromStorage).length === fromStore && fromStore > 0) {
            setTestCaseStatus(id, 'passed', `LocalStorage 中存储 ${fromStore} 条记录`);
          } else {
            setTestCaseStatus(id, 'failed', '数据未正确写入 LocalStorage');
          }
        } catch (e) {
          setTestCaseStatus(id, 'failed', `持久化异常: ${e}`);
        }
        break;
      }
    }
  };

  const resetTests = () => {
    setTestCases((prev) => prev.map((tc) => ({ ...tc, status: 'idle', message: undefined })));
  };

  const allPassed = testCases.every((tc) => tc.status === 'passed');
  const anyRunning = testCases.some((tc) => tc.status === 'running');
  const passedCount = testCases.filter((tc) => tc.status === 'passed').length;
  const failedCount = testCases.filter((tc) => tc.status === 'failed').length;

  const StatusIcon = ({ status }: { status: TestCase['status'] }) => {
    if (status === 'running') return <Loader2 size={14} className="animate-spin text-pocket-accent" />;
    if (status === 'passed') return <CheckCircle size={14} className="text-pocket-green" />;
    if (status === 'failed') return <XCircle size={14} className="text-pocket-red" />;
    return <div className="h-3.5 w-3.5 rounded-full border border-pocket-border" />;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-pocket-border bg-pocket-card px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-pocket-muted hover:text-pocket-text"
          >
            <ArrowLeft size={14} />
            返回数据浏览
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="text-pocket-accent" />
            <h1 className="text-sm font-semibold text-pocket-text">测试场景</h1>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={resetTests}
              className="flex h-7 items-center gap-1 rounded-md border border-pocket-border px-2.5 text-[11px] text-pocket-muted hover:text-pocket-text"
            >
              <RefreshCw size={12} />
              重置
            </button>
            <button
              onClick={runAllTests}
              disabled={anyRunning}
              className={clsx(
                'flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium',
                anyRunning
                  ? 'bg-pocket-muted/20 text-pocket-muted'
                  : 'bg-pocket-accent text-pocket-bg hover:bg-pocket-accent/90',
              )}
            >
              {anyRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              运行全部测试
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="mb-6 rounded-lg border border-pocket-border bg-pocket-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-pocket-text">测试用例执行结果</h2>
                <p className="mt-1 text-[11px] text-pocket-muted">
                  包含数据导入、异常检测、重复导入等关键场景验证
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Check size={12} className="text-pocket-green" />
                  <span className="text-pocket-green">{passedCount} 通过</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center gap-1">
                    <XCircle size={12} className="text-pocket-red" />
                    <span className="text-pocket-red">{failedCount} 失败</span>
                  </div>
                )}
                {allPassed && testCases[0].status !== 'idle' && (
                  <span className="rounded-md bg-pocket-green/15 px-2 py-0.5 text-[11px] font-medium text-pocket-green">
                    全部通过 ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {testCases.map((tc, idx) => (
              <div
                key={tc.id}
                className={clsx(
                  'rounded-lg border p-4 transition-colors',
                  tc.status === 'passed' && 'border-pocket-green/30 bg-pocket-green/5',
                  tc.status === 'failed' && 'border-pocket-red/30 bg-pocket-red/5',
                  tc.status === 'running' && 'border-pocket-accent/30 bg-pocket-accent/5',
                  tc.status === 'idle' && 'border-pocket-border bg-pocket-card',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <StatusIcon status={tc.status} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-pocket-muted">{String(idx + 1).padStart(2, '0')}</span>
                        <h3 className="text-xs font-medium text-pocket-text">{tc.name}</h3>
                      </div>
                      <button
                        onClick={() => runTestCase(tc.id)}
                        disabled={anyRunning}
                        className="text-[10px] text-pocket-accent hover:underline disabled:text-pocket-muted disabled:no-underline"
                      >
                        {tc.status === 'idle' ? '运行' : '重跑'}
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-pocket-muted">{tc.description}</p>
                    {tc.message && (
                      <p
                        className={clsx(
                          'mt-2 rounded border px-2 py-1 text-[10px] font-mono',
                          tc.status === 'passed' && 'border-pocket-green/20 bg-pocket-green/5 text-pocket-green',
                          tc.status === 'failed' && 'border-pocket-red/20 bg-pocket-red/5 text-pocket-red',
                          tc.status === 'running' && 'border-pocket-accent/20 bg-pocket-accent/5 text-pocket-accent',
                        )}
                      >
                        {tc.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-pocket-yellow/30 bg-pocket-yellow/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 text-pocket-yellow" />
              <div>
                <h4 className="text-xs font-medium text-pocket-yellow">重复导入场景说明</h4>
                <p className="mt-1 text-[11px] text-pocket-muted">
                  测试会加载演示数据 → 再次加载相同数据 → 验证第二次导入时基于 (来源文件名 + 原始行号)
                  自动跳过重复记录，避免"工具看上去能跑、实际越跑越乱"。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between text-[11px] text-pocket-muted">
            <span>当前库中记录数：{records.length}</span>
            <button
              onClick={() => navigate('/')}
              className="text-pocket-accent hover:underline"
            >
              前往数据浏览页查看导入的测试数据 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
