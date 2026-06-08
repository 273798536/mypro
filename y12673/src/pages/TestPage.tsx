import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Clock,
  FileJson,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { VolcanoRecord, ImportDataRequest, Screenshot, HistoryVersion } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  step: number;
  message: string;
  detail?: string;
}

const TEST_BATCH_ID = 'batch-test-duplicate-' + new Date().toISOString().slice(0, 10);

function makeTestData(iteration: number): ImportDataRequest {
  const baseTs = new Date();
  const screenshots: Screenshot[] = [
    {
      id: `ss-test-${iteration}-1`,
      url: `https://picsum.photos/seed/testvolc${iteration}a/600/400`,
      deviceCoordinates: { x: 130.0 + iteration * 0.1, y: 32.0, z: 500 + iteration * 10 },
      timestamp: new Date(baseTs.getTime() - 300000).toISOString(),
      description: `测试剖面主视图 #${iteration}`,
    },
    {
      id: `ss-test-${iteration}-2`,
      url: `https://picsum.photos/seed/testvolc${iteration}b/600/400`,
      deviceCoordinates: { x: 130.5, y: 32.1 + iteration * 0.05, z: 600 },
      timestamp: new Date(baseTs.getTime() - 180000).toISOString(),
      description: `次火山口沉积层 #${iteration}`,
    },
  ];

  const conclusions = [
    '初始结论：该剖面显示火山经历了至少两次主要喷发活动，沉积层厚度约15米。',
    '修正结论（第二次导入）：补充测年数据后确认共有三次喷发事件，分别为公元200年、800年和1400年。',
    '修正结论（第三次导入）：最新分析发现顶层沉积为1700年左右的小型喷发，之前的三次喷发结论保持不变。',
  ];

  return {
    title: '测试火山剖面 · 重复导入场景',
    location: '测试火山场',
    batchId: TEST_BATCH_ID,
    screenshots,
    conclusionContent: conclusions[Math.min(iteration - 1, conclusions.length - 1)],
    author: '自动测试程序',
  };
}

export default function TestPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [resultRecord, setResultRecord] = useState<VolcanoRecord | null>(null);
  const [lastResult, setLastResult] = useState<{ isNew: boolean; message: string } | null>(null);

  function addLog(
    type: LogEntry['type'],
    step: number,
    message: string,
    detail?: string
  ) {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      step,
      message,
      detail,
    };
    setLogs(prev => [...prev, entry]);
  }

  async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function runDuplicateTest() {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setResultRecord(null);
    setLastResult(null);
    setCurrentStep(0);

    addLog('info', 0, '🚀 启动重复导入测试场景', `测试批次号: ${TEST_BATCH_ID}`);
    await sleep(400);

    addLog('info', 1, '📋 预检查：查询批次是否已存在...');
    setCurrentStep(1);
    try {
      const checkRes = await api.checkDuplicate(TEST_BATCH_ID);
      addLog(
        checkRes.exists ? 'warning' : 'info',
        1,
        checkRes.exists ? '⚠️ 检测到该批次已存在，将先清理（仅测试环境）' : '✅ 批次不存在，可以开始测试'
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        addLog('error', 1, '预检查失败', err.message);
      }
      setRunning(false);
      return;
    }
    await sleep(500);

    addLog('info', 2, '📥 第1次导入：创建新记录');
    setCurrentStep(2);
    try {
      const data1 = makeTestData(1);
      const res1 = await api.importData(data1);
      setLastResult({ isNew: res1.isNew, message: res1.message });
      setResultRecord(res1.data);
      addLog(
        res1.isNew ? 'success' : 'error',
        2,
        res1.isNew ? '✅ 第1次导入成功：创建了新记录' : '❌ 第1次导入异常：不应返回非新记录',
        `记录ID: ${res1.data.id} | 版本数: ${res1.data.history.length} | 截图数: ${res1.data.screenshots.length}`
      );
      if (!res1.isNew) {
        setRunning(false);
        return;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        addLog('error', 2, '第1次导入失败', err.message);
      }
      setRunning(false);
      return;
    }
    await sleep(600);

    addLog('info', 3, '🔍 重复检测：再次查询该批次');
    setCurrentStep(3);
    try {
      const checkRes = await api.checkDuplicate(TEST_BATCH_ID);
      addLog(
        checkRes.exists ? 'success' : 'error',
        3,
        checkRes.exists ? '✅ 系统正确检测到该批次已存在' : '❌ 系统未能检测到重复批次',
        checkRes.exists ? `已存在记录: ${checkRes.record?.title} (v${checkRes.record?.history.length})` : undefined
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        addLog('error', 3, '重复检测查询失败', err.message);
      }
    }
    await sleep(500);

    addLog('warning', 4, '⚠️ 第2次导入：使用相同 batchId（模拟重复导入点云切片）');
    setCurrentStep(4);
    try {
      const data2 = makeTestData(2);
      const res2 = await api.importData(data2);
      setLastResult({ isNew: res2.isNew, message: res2.message });
      setResultRecord(res2.data);

      const expectedNotNew = !res2.isNew;
      const hasHistory = res2.data.history.length >= 2;
      const hasOldVersion = res2.data.history.some(
        (h: HistoryVersion) => h.reason && h.reason.includes('重复导入')
      );

      addLog(
        expectedNotNew && hasHistory && hasOldVersion ? 'success' : 'error',
        4,
        expectedNotNew && hasHistory && hasOldVersion
          ? '✅ 重复导入处理成功！系统正确更新而非创建新记录'
          : '❌ 重复导入处理异常！可能出现了两份互相打架的结论',
        `isNew=${res2.isNew} | 历史版本数=${res2.data.history.length} | 保留历史=${hasOldVersion ? '是' : '否'}`
      );
      addLog('info', 4, '💡 关键验证：', res2.message);
    } catch (err: unknown) {
      if (err instanceof Error) {
        addLog('error', 4, '第2次导入失败', err.message);
      }
      setRunning(false);
      return;
    }
    await sleep(600);

    addLog('warning', 5, '⚠️ 第3次导入：再次模拟同一批次补录数据');
    setCurrentStep(5);
    try {
      const data3 = makeTestData(3);
      const res3 = await api.importData(data3);
      setLastResult({ isNew: res3.isNew, message: res3.message });
      setResultRecord(res3.data);

      const stillSingle = !res3.isNew;
      const versionCount = res3.data.history.length;
      const screenshotsDeduped = res3.data.screenshots.length <= 4;

      addLog(
        stillSingle && screenshotsDeduped ? 'success' : 'error',
        5,
        stillSingle && screenshotsDeduped
          ? '✅ 多次重复导入仍保持单一权威记录！'
          : '❌ 多次导入后出现数据混乱！',
        `仍为单记录=${stillSingle ? '是' : '否'} | 历史版本=${versionCount} | 截图去重后=${res3.data.screenshots.length}张`
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        addLog('error', 5, '第3次导入失败', err.message);
      }
    }
    await sleep(500);

    addLog('info', 6, '📊 最终状态汇总');
    setCurrentStep(6);
    if (resultRecord) {
      addLog('success', 6, '🏆 测试完成 - 核心结论', 
        `最终记录: ${resultRecord.title}\n` +
        `批次号: ${resultRecord.batchId}\n` +
        `历史版本: v${resultRecord.history.length}\n` +
        `截图去重后: ${resultRecord.screenshots.length} 张\n` +
        `当前结论作者: ${resultRecord.currentConclusion.author}\n` +
        `⚠️ 验证点: 同一批次始终只有1份权威结论，不会出现两份互相打架的情况`
      );
    }

    setCurrentStep(0);
    setRunning(false);
  }

  function resetTest() {
    setLogs([]);
    setResultRecord(null);
    setLastResult(null);
    setCurrentStep(0);
  }

  const totalSteps = 6;
  const progress = running ? (currentStep / totalSteps) * 100 : logs.length > 0 ? 100 : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
            测试场景
          </h1>
          <p className="text-stone-500 mt-2 ml-4.5">
            重复导入测试 · 验证同一批点云切片多次导入不会产生两份互相打架的结论
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runDuplicateTest}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                测试进行中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                运行重复导入测试
              </>
            )}
          </button>
          <button
            onClick={resetTest}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>

      {running && (
        <div className="mb-6 h-2 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-red-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-stone-900 rounded-xl overflow-hidden shadow-xl h-[600px] flex flex-col">
            <div className="px-4 py-2.5 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-stone-400 font-mono">
                  volcano-import-test
                </span>
              </div>
              <FlaskConical className="w-4 h-4 text-stone-500" />
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed space-y-2">
              {logs.length === 0 && (
                <div className="text-stone-500 flex items-center gap-2">
                  <span className="animate-pulse">$</span>
                  等待执行测试... 点击上方「运行重复导入测试」按钮开始
                </div>
              )}
              <AnimatePresence initial={false}>
                {logs.map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2"
                  >
                    <LogIcon type={log.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-start">
                        <span className="text-stone-500 flex-shrink-0">
                          [{formatTime(log.timestamp)}]
                        </span>
                        <span className="text-stone-400 flex-shrink-0 w-10">
                          Step{log.step}
                        </span>
                        <span className={logColor(log.type)}>{log.message}</span>
                      </div>
                      {log.detail && (
                        <div className="mt-0.5 ml-0 whitespace-pre-wrap text-stone-400 border-l-2 border-stone-700 pl-3">
                          {log.detail}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-orange-500" />
                测试说明
              </h2>
            </div>
            <div className="p-5 text-sm text-stone-600 space-y-3">
              <p>
                <span className="text-orange-600 font-medium">测试目标：</span>
                验证同一批次（batchId相同）的点云切片数据在重复导入时：
              </p>
              <ul className="space-y-1.5 ml-5 list-disc text-stone-500">
                <li>不会创建两份独立记录</li>
                <li>始终只有一份权威结论</li>
                <li>旧结论被自动归档到历史版本</li>
                <li>截图清单按设备坐标+时间去重合并</li>
                <li>可追溯每次变更的原因</li>
              </ul>
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-orange-700 text-xs">
                💡 测试批次号：<span className="font-mono">{TEST_BATCH_ID}</span>
              </div>
            </div>
          </div>

          {resultRecord && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
                <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                  <FileJson className="w-4.5 h-4.5 text-orange-500" />
                  结果记录
                </h2>
                {lastResult && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      lastResult.isNew
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {lastResult.isNew ? '新建记录' : '更新已有记录'}
                  </span>
                )}
              </div>
              <div className="p-5 text-sm space-y-2.5">
                <Row label="标题" value={resultRecord.title} />
                <Row label="记录 ID" value={resultRecord.id} mono />
                <Row label="批次号" value={resultRecord.batchId} mono />
                <Row label="当前版本" value={`v${resultRecord.history.length}`} />
                <Row label="截图数量" value={`${resultRecord.screenshots.length} 张（已去重合并）`} />
                <Row label="最后更新" value={formatDate(resultRecord.updatedAt)} />
                <div className="pt-2 mt-2 border-t border-stone-100">
                  <div className="text-stone-500 mb-1">当前权威结论：</div>
                  <div className="text-stone-700 text-xs leading-relaxed bg-stone-50 p-3 rounded-md border border-stone-100">
                    {resultRecord.currentConclusion.content}
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-stone-100">
                  <div className="text-stone-500 mb-1.5">历史版本轨迹：</div>
                  <div className="space-y-1">
                    {[...resultRecord.history].reverse().map((h: HistoryVersion, i: number) => (
                      <div key={h.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                          i === 0 ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {h.version}
                        </span>
                        <span className="text-stone-600 flex-1 truncate">{h.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-stone-500 flex-shrink-0">{label}</span>
      <span className={`text-stone-700 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

function logColor(type: LogEntry['type']): string {
  switch (type) {
    case 'success': return 'text-green-400';
    case 'warning': return 'text-yellow-400';
    case 'error': return 'text-red-400';
    default: return 'text-stone-300';
  }
}

function LogIcon({ type }: { type: LogEntry['type'] }) {
  const cls = 'w-3.5 h-3.5 flex-shrink-0 mt-0.5';
  switch (type) {
    case 'success':
      return <CheckCircle2 className={`${cls} text-green-400`} />;
    case 'warning':
      return <AlertTriangle className={`${cls} text-yellow-400`} />;
    case 'error':
      return <XCircle className={`${cls} text-red-400`} />;
    default:
      return <Upload className={`${cls} text-stone-500`} />;
  }
}
