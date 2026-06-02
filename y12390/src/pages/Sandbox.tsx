import { useState } from 'react';
import { Plus, Play, RefreshCw, CheckCircle2, XCircle, FileText, Clock, Trash2, AlertTriangle, Settings } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Sandbox, SandboxRun, SandboxDiff, Anomaly } from '@/types';

const mockSandboxes: Sandbox[] = [
  {
    id: 'sb-001',
    name: '贝斯音色测试沙箱',
    createdAt: Date.now() - 86400000 * 2,
    path: '/sandboxes/bass-test',
    status: 'ready',
    runs: [
      {
        id: 'run-001',
        sandboxId: 'sb-001',
        runNumber: 1,
        startTime: Date.now() - 86400000 * 1,
        endTime: Date.now() - 86400000 * 1 + 45000,
        inputFiles: ['bass_input.wav'],
        outputFiles: ['bass_output.wav'],
        results: {
          id: 'result-001',
          presetVersionId: 'pv-serum-bass-100',
          parameters: [],
          outputHash: 'a1b2c3d4e5f6',
          anomalies: [],
        },
      },
      {
        id: 'run-002',
        sandboxId: 'sb-001',
        runNumber: 2,
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3600000 + 42000,
        inputFiles: ['bass_input.wav'],
        outputFiles: ['bass_output.wav'],
        results: {
          id: 'result-002',
          presetVersionId: 'pv-serum-bass-100',
          parameters: [],
          outputHash: 'a1b2c3d4e5f6',
          anomalies: [],
        },
        isIdempotent: true,
      },
    ],
  },
  {
    id: 'sb-002',
    name: '主音音色调试沙箱',
    createdAt: Date.now() - 86400000 * 1,
    path: '/sandboxes/lead-test',
    status: 'ready',
    runs: [
      {
        id: 'run-003',
        sandboxId: 'sb-002',
        runNumber: 1,
        startTime: Date.now() - 7200000,
        endTime: Date.now() - 7200000 + 38000,
        inputFiles: ['lead_input.wav'],
        outputFiles: ['lead_output.wav'],
        results: {
          id: 'result-003',
          presetVersionId: 'pv-massive-lead-100',
          parameters: [],
          outputHash: 'x1y2z3a4b5c6',
          anomalies: [],
        },
      },
      {
        id: 'run-004',
        sandboxId: 'sb-002',
        runNumber: 2,
        startTime: Date.now() - 1800000,
        endTime: Date.now() - 1800000 + 41000,
        inputFiles: ['lead_input.wav'],
        outputFiles: ['lead_output.wav'],
        results: {
          id: 'result-004',
          presetVersionId: 'pv-massive-lead-100',
          parameters: [],
          outputHash: 'x1y2z3a4b5c7',
          anomalies: [],
        },
        isIdempotent: false,
        diffFromPrevious: [
          {
            type: 'parameter',
            name: 'Osc 1 Detune',
            expected: '25.00',
            actual: '25.50',
          },
          {
            type: 'output_hash',
            name: '输出文件哈希',
            expected: 'x1y2z3a4b5c6',
            actual: 'x1y2z3a4b5c7',
          },
        ],
      },
    ],
  },
  {
    id: 'sb-003',
    name: '鼓组效果测试',
    createdAt: Date.now() - 3600000,
    path: '/sandboxes/drums-test',
    status: 'running',
    runs: [],
  },
];

const mockAnomalies: Anomaly[] = [
  {
    id: 'anom-sb-001',
    type: 'mismatch',
    severity: 'warning',
    status: 'open',
    entityType: 'sandbox_run',
    entityId: 'run-004',
    entityName: '主音音色调试沙箱 - 第2次运行',
    description: '两次运行结果不一致，检测到幂等性问题',
    affectedItems: [],
    impactExplanation: '相同输入产生了不同的输出，可能存在非确定性因素影响处理结果。',
    detectedAt: Date.now() - 1800000,
    detectedBy: 'system',
  },
];

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${seconds}s`;
}

export default function Sandbox() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>(mockSandboxes);
  const [selectedSandboxId, setSelectedSandboxId] = useState<string | null>('sb-001');
  const [newSandboxName, setNewSandboxName] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const selectedSandbox = sandboxes.find(s => s.id === selectedSandboxId);
  const latestRun = selectedSandbox?.runs[selectedSandbox.runs.length - 1];
  const previousRun = selectedSandbox?.runs[selectedSandbox.runs.length - 2];

  const handleCreateSandbox = () => {
    if (!newSandboxName.trim()) return;
    const newSandbox: Sandbox = {
      id: `sb-${Date.now()}`,
      name: newSandboxName,
      createdAt: Date.now(),
      path: `/sandboxes/${newSandboxName.toLowerCase().replace(/\s+/g, '-')}`,
      status: 'ready',
      runs: [],
    };
    setSandboxes([newSandbox, ...sandboxes]);
    setNewSandboxName('');
    setSelectedSandboxId(newSandbox.id);
  };

  const handleRunTest = () => {
    if (!selectedSandbox || !selectedFile) return;
    setIsRunning(true);

    setTimeout(() => {
      const newRun: SandboxRun = {
        id: `run-${Date.now()}`,
        sandboxId: selectedSandbox.id,
        runNumber: selectedSandbox.runs.length + 1,
        startTime: Date.now(),
        endTime: Date.now() + Math.random() * 30000 + 10000,
        inputFiles: [selectedFile],
        outputFiles: [selectedFile.replace('.wav', '_output.wav')],
        results: {
          id: `result-${Date.now()}`,
          presetVersionId: 'pv-serum-bass-100',
          parameters: [],
          outputHash: Math.random() > 0.3
            ? (latestRun?.results.outputHash || `hash-${Date.now()}`)
            : `hash-${Date.now()}`,
          anomalies: [],
        },
        isIdempotent: latestRun ? Math.random() > 0.3 : undefined,
      };

      if (latestRun && newRun.results.outputHash !== latestRun.results.outputHash) {
        newRun.isIdempotent = false;
        newRun.diffFromPrevious = [
          {
            type: 'output_hash',
            name: '输出文件哈希',
            expected: latestRun.results.outputHash,
            actual: newRun.results.outputHash,
          },
        ];
      } else if (latestRun) {
        newRun.isIdempotent = true;
      }

      const updatedSandboxes = sandboxes.map(sb => {
        if (sb.id === selectedSandbox.id) {
          return {
            ...sb,
            runs: [...sb.runs, newRun],
          };
        }
        return sb;
      });

      setSandboxes(updatedSandboxes);
      setIsRunning(false);
    }, 2000);
  };

  const handleReset = () => {
    if (!selectedSandbox) return;
    const updatedSandboxes = sandboxes.map(sb => {
      if (sb.id === selectedSandbox.id) {
        return {
          ...sb,
          runs: [],
        };
      }
      return sb;
    });
    setSandboxes(updatedSandboxes);
  };

  const handleDelete = (sandboxId: string) => {
    setSandboxes(sandboxes.filter(s => s.id !== sandboxId));
    if (selectedSandboxId === sandboxId) {
      setSelectedSandboxId(sandboxes[0]?.id || null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">测试沙箱</h1>
          <p className="mt-1 text-sm text-muted-foreground">在隔离环境中测试，不影响正式数据</p>
        </div>
      </div>

      <div className="border-2 border-dashed border-warning/50 rounded-2xl bg-warning/5 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-warning" />
          <span className="px-3 py-1 bg-warning/20 text-warning text-sm font-medium rounded-full">
            测试环境
          </span>
          <span className="text-sm text-warning">所有操作仅在沙箱内生效</span>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">创建沙箱</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newSandboxName}
                    onChange={(e) => setNewSandboxName(e.target.value)}
                    placeholder="输入沙箱名称..."
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSandbox()}
                  />
                  <Button
                    onClick={handleCreateSandbox}
                    className="w-full"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    创建沙箱
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">沙箱列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {sandboxes.length > 0 ? (
                  <div className="divide-y divide-border">
                    {sandboxes.map((sandbox) => (
                      <div
                        key={sandbox.id}
                        className={cn(
                          'p-4 cursor-pointer transition-colors relative group',
                          selectedSandboxId === sandbox.id
                            ? 'bg-primary/10'
                            : 'hover:bg-accent'
                        )}
                        onClick={() => setSelectedSandboxId(sandbox.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{sandbox.name}</span>
                              <Badge variant={sandbox.status === 'running' ? 'warning' : 'success'}>
                                {sandbox.status === 'running' ? '运行中' : '就绪'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{sandbox.path}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(sandbox.createdAt).toLocaleDateString()}
                              </span>
                              <span>{sandbox.runs.length} 次运行</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sandbox.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/70 hover:text-destructive transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="暂无沙箱" description="创建第一个沙箱开始测试" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-8 space-y-4">
            {selectedSandbox ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{selectedSandbox.name}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                      >
                        重置沙箱
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">创建时间</p>
                        <p className="mt-1 font-medium text-foreground">
                          {new Date(selectedSandbox.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">运行次数</p>
                        <p className="mt-1 font-medium text-foreground">{selectedSandbox.runs.length} 次</p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">状态</p>
                        <p className="mt-1">
                          <Badge variant={selectedSandbox.status === 'running' ? 'warning' : 'success'}>
                            {selectedSandbox.status === 'running' ? '运行中' : '就绪'}
                          </Badge>
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-6">
                      <h4 className="font-medium text-foreground mb-4">运行测试</h4>
                      <div className="flex gap-4">
                        <select
                          value={selectedFile || ''}
                          onChange={(e) => setSelectedFile(e.target.value)}
                          className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="">选择输入文件...</option>
                          <option value="bass_input.wav">bass_input.wav</option>
                          <option value="lead_input.wav">lead_input.wav</option>
                          <option value="drums_input.wav">drums_input.wav</option>
                        </select>
                        <Button
                          onClick={handleRunTest}
                          disabled={!selectedFile || isRunning}
                          loading={isRunning}
                          leftIcon={<Play className="h-4 w-4" />}
                        >
                          运行测试
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {latestRun && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">运行结果 - 第 {latestRun.runNumber} 次运行</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">开始时间</p>
                          <p className="mt-1 font-medium text-foreground">
                            {new Date(latestRun.startTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">执行时长</p>
                          <p className="mt-1 font-medium text-foreground">
                            {latestRun.endTime ? formatDuration(latestRun.endTime - latestRun.startTime) : '-'}
                          </p>
                        </div>
                      </div>

                      {latestRun.isIdempotent !== undefined && previousRun && (
                        <div className={cn(
                          'rounded-lg p-4 mb-6',
                          latestRun.isIdempotent
                            ? 'bg-success/10 border border-success/30'
                            : 'bg-destructive/10 border border-destructive/30'
                        )}>
                          <div className="flex items-center gap-3">
                            {latestRun.isIdempotent ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : (
                              <XCircle className="h-6 w-6 text-destructive" />
                            )}
                            <div>
                              <p className={cn(
                                'font-medium',
                                latestRun.isIdempotent ? 'text-success' : 'text-destructive'
                              )}>
                                幂等性验证: {latestRun.isIdempotent ? '通过' : '失败'}
                              </p>
                              <p className={cn(
                                'text-sm',
                                latestRun.isIdempotent ? 'text-success' : 'text-destructive'
                              )}>
                                {latestRun.isIdempotent
                                  ? '两次运行结果完全一致，系统表现稳定'
                                  : '检测到运行结果差异，请查看下方详情'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {latestRun.diffFromPrevious && latestRun.diffFromPrevious.length > 0 && (
                        <div>
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            差异列表
                          </h4>
                          <div className="space-y-2">
                            {latestRun.diffFromPrevious.map((diff: SandboxDiff, idx: number) => (
                              <div key={idx} className="bg-destructive/10 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-destructive">{diff.name}</p>
                                    <p className="text-xs text-destructive/70">类型: {diff.type}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                      预期: <span className="font-mono text-foreground">{diff.expected}</span>
                                    </p>
                                    <p className="text-sm text-destructive">
                                      实际: <span className="font-mono font-medium">{diff.actual}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {previousRun && (
                        <div className="mt-6 border-t border-border pt-6">
                          <h4 className="font-medium text-foreground mb-3">运行记录</h4>
                          <div className="space-y-2">
                            {selectedSandbox.runs.slice().reverse().map((run) => (
                              <div
                                key={run.id}
                                className={cn(
                                  'flex items-center justify-between p-3 rounded-lg',
                                  run.id === latestRun.id ? 'bg-primary/10' : 'bg-muted'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-muted-foreground/70" />
                                  <div>
                                    <p className="font-medium text-foreground">第 {run.runNumber} 次运行</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(run.startTime).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {run.isIdempotent !== undefined && (
                                    run.isIdempotent ? (
                                      <Badge variant="success">幂等</Badge>
                                    ) : (
                                      <Badge variant="danger">不幂等</Badge>
                                    )
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {run.endTime ? formatDuration(run.endTime - run.startTime) : '-'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedSandbox.runs.filter(r => !r.isIdempotent).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">异常告警</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mockAnomalies.map((anomaly) => (
                        <Alert key={anomaly.id} anomaly={anomaly} />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {!latestRun && (
                  <Card>
                    <CardContent className="py-12">
                      <EmptyState
                        title="暂无运行记录"
                        description="选择输入文件并点击运行测试开始"
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    title="选择一个沙箱"
                    description="从左侧列表选择或创建一个新的沙箱"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
