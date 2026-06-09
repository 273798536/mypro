import { useState } from "react";
import { X, Upload, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useStore } from "@/store/useStore";
import { detectOutliers } from "@/utils/sequence";
import type { SequenceProblem } from "@/types";

interface Props {
  onClose: () => void;
}

function parseSample(text: string): SequenceProblem[] {
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj)) return obj as SequenceProblem[];
    if (obj && typeof obj === "object") return [obj as SequenceProblem];
  } catch {
    /* fallthrough */
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const result: SequenceProblem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t|]/).map((p) => p.trim());
    if (parts.length < 4) continue;
    const [id, title, formula, initStr, compStr, histStr] = parts;
    const parseArr = (s: string) =>
      (s || "")
        .split(/[; ]/)
        .map((x) => parseFloat(x))
        .filter((x) => !isNaN(x));
    const initialTerms = parseArr(initStr);
    const computedValues = parseArr(compStr);
    const historicalAnswers = parseArr(histStr || compStr);
    if (!id || computedValues.length === 0) continue;
    const outlier = detectOutliers(computedValues, Math.min(5, Math.floor(computedValues.length / 2)));
    result.push({
      id,
      title: title || `导入题目 ${i + 1}`,
      recurrenceFormula: formula || "未提供",
      initialTerms: initialTerms.length ? initialTerms : [computedValues[0]],
      computedValues,
      historicalAnswers,
      status: "pending",
      isExtrapolationOutlier: outlier.indices.length > 0,
      outlierIndices: outlier.indices,
      dataGrade: "pending",
      note: "批量导入",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return result;
}

const SAMPLE_TEXT = `SEQ-DEMO-1, 调和数列示例, aₙ = 1/n, 1, 1 0.5 0.333 0.25 0.2 9999 0.143 0.125, 1 0.5 0.333 0.25 0.2 0.167 0.143 0.125
SEQ-DEMO-2, 立方数列示例, aₙ = n³, 1, 1 8 27 64 125 216, 1 8 27 64 125 216`;

export default function ImportModal({ onClose }: Props) {
  const { importProblems } = useStore();
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    added: number;
    updated: number;
    skipped: number;
    conflicts: number;
  } | null>(null);

  const handleImport = () => {
    if (!text.trim()) return;
    const parsed = parseSample(text);
    if (parsed.length === 0) {
      alert("未能解析到有效数据，请检查格式");
      return;
    }
    const r = importProblems(parsed, "张编辑");
    setResult(r);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-ink-700" />
            <h3 className="font-serif font-bold text-lg text-ink-800">批量导入 / 补录</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          {result ? (
            <div className="space-y-4 py-6">
              <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-confirm/10 flex items-center justify-center text-confirm">
                  <CheckCircle size={32} />
                </div>
              </div>
              <div className="text-center">
                <div className="font-serif font-bold text-lg text-ink-800">导入完成</div>
                <div className="text-xs text-ink-500 mt-1">
                  系统自动按「题目标识 + 递推公式」去重，避免同一件事出现两份结论
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 pt-2">
                <div className="rounded-lg p-3 bg-confirm-soft border border-confirm/20 text-center">
                  <div className="font-serif font-bold text-2xl text-confirm">
                    {result.added}
                  </div>
                  <div className="text-xs text-ink-600 mt-0.5">新增</div>
                </div>
                <div className="rounded-lg p-3 bg-warn-soft border border-warn/20 text-center">
                  <div className="font-serif font-bold text-2xl text-warn">
                    {result.updated}
                  </div>
                  <div className="text-xs text-ink-600 mt-0.5">合并更新</div>
                </div>
                <div className="rounded-lg p-3 bg-ink-50 border border-ink-100 text-center">
                  <div className="font-serif font-bold text-2xl text-ink-600">
                    {result.skipped}
                  </div>
                  <div className="text-xs text-ink-600 mt-0.5">跳过(重复)</div>
                </div>
                <div className="rounded-lg p-3 bg-alert-soft border border-alert/20 text-center">
                  <div className="font-serif font-bold text-2xl text-alert">
                    {result.conflicts}
                  </div>
                  <div className="text-xs text-ink-600 mt-0.5">冲突项</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg p-3 bg-ink-50 border border-ink-100">
                <div className="flex items-start gap-2 text-xs text-ink-600">
                  <Info size={14} className="text-ink-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-ink-700 mb-1">支持两种格式</div>
                    <div>① JSON 数组 ② 每行一条：编号, 标题, 公式, 初始项, 计算值(空格分隔), 历史答案(空格分隔)</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-medium text-ink-700">数据内容</div>
                  <button
                    onClick={() => setText(SAMPLE_TEXT)}
                    className="text-xs text-ink-500 hover:text-ink-700 underline"
                  >
                    填入示例
                  </button>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  placeholder="粘贴或输入题目数据..."
                  className="w-full px-3 py-2 text-xs font-mono border border-ink-200 rounded-md focus:outline-none focus:border-ink-500 focus:ring-2 focus:ring-ink-100 resize-none bg-ivory"
                />
              </div>

              <div className="rounded-lg p-3 bg-alert-soft/60 border border-alert/20 text-xs text-ink-600">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-alert mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-alert">去重规则：</span>
                    相同编号 + 相同递推公式视为同一题目。值完全一致则跳过；值不一致则合并（保留已修正状态），并记录合并日志。
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ink-100 bg-ink-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-ink-600 hover:bg-ink-100 transition"
          >
            {result ? "关闭" : "取消"}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              className="px-5 py-2 rounded-md text-sm font-medium bg-ink-700 text-ivory hover:bg-ink-800 transition disabled:opacity-50"
              disabled={!text.trim()}
            >
              执行导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
