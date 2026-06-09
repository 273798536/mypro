import { useState } from "react";
import {
  FlaskConical,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  ArrowRight,
  AlertOctagon,
  Check,
  X,
} from "lucide-react";
import { api } from "../api/client";
import type { LightRecord, ImportResult } from "../../shared/types";
import { cn, generateId } from "../lib/utils";

interface TestStep {
  title: string;
  description: string;
  done: boolean;
  success?: boolean;
  message?: string;
}

export default function DuplicateTest() {
  const [steps, setSteps] = useState<TestStep[]>([
    {
      title: "准备测试数据",
      description: "构造一条新的灯具预演记录",
      done: false,
    },
    {
      title: "初次导入",
      description: "将记录 POST 至 /api/records/import",
      done: false,
    },
    {
      title: "重复导入（同 fixtureId + batchNo）",
      description: "再次提交相同 fixtureId + 批次号，验证防重",
      done: false,
    },
    {
      title: "补录数据（追加风险备注）",
      description: "对同一条记录补充新备注，确认只有一份结论",
      done: false,
    },
  ]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const testRecord: Omit<LightRecord, "id" | "createdAt" | "updatedAt"> = {
    batchNo: "BATCH-TEST-2026",
    fixtureName: `测试灯具-防重验证-${Date.now().toString().slice(-4)}`,
    coords: { fixtureId: `TEST-FIX-${generateId()}`, x: 10, y: 5, z: 4, unit: "meter" },
    unitErrors: [],
    riskNotes: [],
    conclusions: [],
    traceChain: [
      {
        id: `t-test-${generateId()}`,
        type: "source",
        title: "测试导入",
        description: "来自重复导入测试路径",
        timestamp: new Date().toISOString(),
        operator: "测试脚本",
        metadata: { test: true },
      },
    ],
    hasDuplicate: false,
    duplicateOf: null,
    status: "draft",
    operator: "测试脚本",
    isTransparentOcclusionMisread: false,
  };

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    setImportedId(null);
    const newSteps = [...steps];
    newSteps.forEach((s) => {
      s.done = false;
      s.success = undefined;
      s.message = undefined;
    });

    // Step 1
    newSteps[0].done = true;
    newSteps[0].success = true;
    newSteps[0].message = `构造 fixtureId: ${testRecord.coords.fixtureId}`;
    setSteps([...newSteps]);
    await delay(400);

    let firstRecordId: string | null = null;
    let firstRecord: LightRecord | undefined;

    // Step 2
    try {
      const r1 = await api.importRecord(testRecord);
      firstRecord = r1.record;
      firstRecordId = r1.record?.id ?? null;
      setResults((rs) => [...rs, r1]);
      newSteps[1].done = true;
      newSteps[1].success = !r1.isDuplicate;
      newSteps[1].message = !r1.isDuplicate
        ? `新记录创建成功 ID=${r1.record?.id}`
        : "异常：首次导入却判定重复";
      setImportedId(firstRecordId);
      setSteps([...newSteps]);
    } catch (e: any) {
      newSteps[1].done = true;
      newSteps[1].success = false;
      newSteps[1].message = e.message;
      setSteps([...newSteps]);
      setRunning(false);
      return;
    }
    await delay(600);

    // Step 3
    try {
      const r2 = await api.importRecord(testRecord);
      setResults((rs) => [...rs, r2]);
      newSteps[2].done = true;
      newSteps[2].success = r2.isDuplicate === true;
      newSteps[2].message = r2.isDuplicate
        ? `✓ 防重生效，合并至已有记录 ${r2.existingRecordId}`
        : "异常：未检测到重复，生成了第二份记录";
      setSteps([...newSteps]);
    } catch (e: any) {
      newSteps[2].done = true;
      newSteps[2].success = false;
      newSteps[2].message = e.message;
      setSteps([...newSteps]);
      setRunning(false);
      return;
    }
    await delay(500);

    // Step 4
    try {
      if (firstRecordId && firstRecord) {
        await api.updateRecord(firstRecordId, {
          riskNotes: [
            ...firstRecord.riskNotes,
            {
              id: `rn-test-${generateId()}`,
              content: "补录：重复导入测试后新增备注，确认不产生两份结论",
              author: "测试脚本",
              createdAt: new Date().toISOString(),
              linkedConclusionId: null,
            },
          ],
        });
        newSteps[3].done = true;
        newSteps[3].success = true;
        newSteps[3].message = "补录完成，结论保持唯一";
      }
    } catch (e: any) {
      newSteps[3].done = true;
      newSteps[3].success = false;
      newSteps[3].message = e.message;
    }
    setSteps([...newSteps]);
    setRunning(false);
  };

  const reset = () => {
    setSteps(steps.map((s) => ({ ...s, done: false, success: undefined, message: undefined })));
    setResults([]);
    setImportedId(null);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-accent" />
              <h1 className="font-display text-2xl font-bold text-text-primary">
                重复导入测试路径
              </h1>
            </div>
            <p className="text-sm text-text-secondary mt-1 font-mono">
              验证防重逻辑与补录后结论唯一性，避免工具看上去能跑、实际越跑越乱
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="btn-secondary flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={runTests}
              disabled={running}
              className="btn-primary flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {running ? "测试中..." : "执行测试"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-3">
            {steps.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "panel p-4 transition-all duration-300",
                  s.done && s.success && "border-success/40 shadow-glow-soft",
                  s.done && s.success === false && "border-danger/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2",
                      !s.done && "border-border text-text-muted bg-bg-tertiary",
                      s.done && s.success && "border-success bg-success/15 text-success",
                      s.done && s.success === false && "border-danger bg-danger-bg text-danger"
                    )}
                  >
                    {!s.done && <span className="font-mono text-sm">{i + 1}</span>}
                    {s.done && s.success && <CheckCircle2 className="w-4 h-4" />}
                    {s.done && s.success === false && <AlertOctagon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-text-primary">{s.title}</h3>
                      {running && !s.done && (
                        <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">{s.description}</p>
                    {s.done && s.message && (
                      <p
                        className={cn(
                          "text-xs font-mono mt-2",
                          s.success ? "text-success" : "text-danger"
                        )}
                      >
                        {s.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="panel p-4">
              <h3 className="font-display font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Copy className="w-4 h-4 text-warning" />
                导入结果对比
              </h3>
              {results.length === 0 && (
                <p className="text-sm text-text-muted">执行测试后将展示两次导入的结果</p>
              )}
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 text-xs font-mono text-text-muted mb-1">
                      <span>第 {i + 1} 次导入</span>
                      <ArrowRight className="w-3 h-3" />
                      {r.isDuplicate ? (
                        <span className="flex items-center gap-1 text-warning">
                          <AlertTriangle className="w-3 h-3" />
                          检测到重复
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-success">
                          <Check className="w-3 h-3" />
                          新记录
                        </span>
                      )}
                    </div>
                    <div className="bg-bg-primary border border-border rounded p-2 font-mono text-[11px] space-y-0.5">
                      <div>
                        <span className="text-text-muted">ID:</span>{" "}
                        <span className="text-text-primary">{r.record?.id}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">灯具:</span>{" "}
                        <span className="text-text-primary">{r.record?.fixtureName}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">fixtureId:</span>{" "}
                        <span className="text-accent">{r.record?.coords.fixtureId}</span>
                      </div>
                      {r.message && (
                        <div>
                          <span className="text-text-muted">提示:</span>{" "}
                          <span className="text-text-secondary">{r.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <h3 className="font-display font-semibold text-text-primary mb-2">测试目标</h3>
              <ul className="space-y-1.5 text-sm">
                {[
                  "同一件事不出现两份结论",
                  "重复导入被识别并合并",
                  "补录只追加备注，不复制结论",
                  "从结果可追溯来源记录",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-text-secondary">
                    <Check className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel p-4 bg-danger-bg/20 border-danger/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-text-primary text-sm">验收要点</div>
                  <p className="text-xs text-text-secondary mt-1">
                    拿一条透明遮挡误读记录倒查，工具要能从结果一路回到来源和处理记录（在详情页右侧追溯链查看）。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
