import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Image, CheckCircle, HelpCircle, XCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { scenes } from "@/data/mock/scenes";
import { useGameStore } from "@/stores/gameStore";
import { useReviewStore } from "@/stores/reviewStore";
import { downloadDataUrl } from "@/utils/export";
import type { JudgmentType } from "@/types";

interface ExportConfig {
  showSafe: boolean;
  showReview: boolean;
  showError: boolean;
  includeWatermark: boolean;
}

export default function ExportCenter() {
  const navigate = useNavigate();
  const params = useParams();
  const loadSession = useGameStore((s) => s.loadSession);
  const session = useGameStore((s) => s.session);
  const allJudgments = useReviewStore((s) => s.judgments);
  const allScreenshots = useReviewStore((s) => s.screenshots);

  const [config, setConfig] = useState<ExportConfig>({
    showSafe: true,
    showReview: true,
    showError: true,
    includeWatermark: true,
  });

  useMemo(() => {
    if (params.sessionId) loadSession(params.sessionId);
  }, [params.sessionId, loadSession]);

  const sessionScreenshots = useMemo(
    () => (params.sessionId ? allScreenshots[params.sessionId] || [] : []),
    [allScreenshots, params.sessionId],
  );
  const judgments = useMemo(
    () => (params.sessionId ? allJudgments[params.sessionId] || [] : []),
    [allJudgments, params.sessionId],
  );
  const scene = session ? scenes.find((s) => s.id === session.sceneId) : undefined;

  const typeIcon = {
    safe: <CheckCircle className="w-3.5 h-3.5 text-pore-glow" />,
    review: <HelpCircle className="w-3.5 h-3.5 text-warning-review" />,
    error: <XCircle className="w-3.5 h-3.5 text-warning-error" />,
  };
  const typeTag = {
    safe: "tag-safe",
    review: "tag-review",
    error: "tag-error",
  };
  const typeLabel = {
    safe: "直接可用",
    review: "需复核",
    error: "越界错误",
  };

  const toggle = (key: keyof ExportConfig) => {
    setConfig((c) => ({ ...c, [key]: !c[key] }));
  };

  const downloadAll = () => {
    sessionScreenshots.forEach((s, i) => {
      setTimeout(() => {
        downloadDataUrl(s.dataUrl, `pore-export-${params.sessionId?.slice(-6)}-${i + 1}.png`);
      }, i * 300);
    });
  };

  const filteredJudgments = judgments.filter((j) => {
    if (j.type === "safe" && !config.showSafe) return false;
    if (j.type === "review" && !config.showReview) return false;
    if (j.type === "error" && !config.showError) return false;
    return true;
  });

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mine-300">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="grain-overlay" />
      <div className="relative z-10 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/result/${session.id}`)}
            className="btn-secondary flex items-center gap-1.5 !px-3 !py-2"
          >
            <ArrowLeft className="w-4 h-4" /> 返回结算
          </button>
          <h1 className="font-serif text-2xl font-bold text-amber-glow flex-1">截图导出中心</h1>
          <span className="text-sm text-mine-400 font-mono">
            {scene?.name} · {sessionScreenshots.length} 张截图
          </span>
          <button onClick={downloadAll} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> 批量导出
          </button>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          <div className="card-glass p-4 space-y-4 h-fit">
            <h3 className="font-serif text-base font-semibold text-amber-glow">导出配置</h3>

            <div className="space-y-2">
              {(["safe", "review", "error"] as JudgmentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(`show${t[0].toUpperCase() + t.slice(1)}` as keyof ExportConfig)}
                  className="w-full flex items-center justify-between p-2.5 rounded hover:bg-mine-700/40 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm text-mine-200">
                    {typeIcon[t]}
                    {typeLabel[t]}
                    <span className={`tag ${typeTag[t]} ml-1`}>
                      {judgments.filter((j) => j.type === t).length}
                    </span>
                  </span>
                  {config[`show${t[0].toUpperCase() + t.slice(1)}` as keyof ExportConfig] ? (
                    <ToggleRight className="w-5 h-5 text-amber-glow" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-mine-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-mine-600/30 space-y-2">
              <button
                onClick={() => toggle("includeWatermark")}
                className="w-full flex items-center justify-between p-2.5 rounded hover:bg-mine-700/40 transition-colors"
              >
                <span className="text-sm text-mine-200">叠加溯源水印</span>
                {config.includeWatermark ? (
                  <ToggleRight className="w-5 h-5 text-amber-glow" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-mine-500" />
                )}
              </button>
            </div>

            <div className="pt-3 border-t border-mine-600/30 space-y-1 text-xs text-mine-400">
              <p>• 溯源水印包含：场景名、剖切轴/值、来源表、行号、图像名、备注</p>
              <p>• 批量导出将依次下载所有截图，间隔300ms</p>
              <p>• 评审会可直接查看绿色标记=直接可用、黄色=需物理老师复核</p>
            </div>
          </div>

          <div className="space-y-4">
            {filteredJudgments.length > 0 && (
              <div>
                <h3 className="font-serif text-base font-semibold text-amber-glow mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4" /> 判断记录 ({filteredJudgments.length})
                </h3>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredJudgments.map((j, idx) => {
                    const relatedShot = sessionScreenshots.find((s) => s.judgmentId === j.id);
                    return (
                      <div key={j.id} className="card-glass p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-mine-400">#{idx + 1}</span>
                          {typeIcon[j.type]}
                          <span className={`tag ${typeTag[j.type]}`}>{typeLabel[j.type]}</span>
                        </div>
                        <div className="font-mono text-xs text-mine-300">
                          {j.cutAxis.toUpperCase()} = {j.cutValue.toFixed(3)}
                          {j.isBoundaryCrossed && (
                            <span className="text-warning-error ml-1">越界</span>
                          )}
                        </div>
                        {relatedShot ? (
                          <img
                            src={relatedShot.dataUrl}
                            alt=""
                            className="w-full h-32 object-cover rounded border border-mine-600/40"
                          />
                        ) : (
                          <div className="w-full h-32 rounded border border-dashed border-mine-600/40 flex items-center justify-center text-xs text-mine-500">
                            未截图
                          </div>
                        )}
                        {j.comment && (
                          <div className="text-[11px] text-amber-glow/80 border-l-2 border-amber-glow/40 pl-2">
                            {j.comment}
                          </div>
                        )}
                        {relatedShot && (
                          <button
                            onClick={() =>
                              downloadDataUrl(
                                relatedShot.dataUrl,
                                `pore-${j.type}-${j.id.slice(-5)}.png`,
                              )
                            }
                            className="btn-secondary w-full !py-1.5 !text-xs flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> 下载
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sessionScreenshots.length > 0 && (
              <div>
                <h3 className="font-serif text-base font-semibold text-amber-glow mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4" /> 全部截图 ({sessionScreenshots.length})
                </h3>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sessionScreenshots.map((s, i) => (
                    <div key={s.id} className="card-glass p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-mine-400 font-mono">截图 #{i + 1}</span>
                      </div>
                      <img
                        src={s.dataUrl}
                        alt=""
                        className="w-full h-40 object-cover rounded border border-mine-600/40"
                      />
                      <pre className="text-[10px] text-mine-400 whitespace-pre-wrap font-mono leading-relaxed bg-mine-900/50 p-2 rounded max-h-24 overflow-y-auto">
                        {s.traceInfo}
                      </pre>
                      <button
                        onClick={() =>
                          downloadDataUrl(s.dataUrl, `pore-shot-${s.id.slice(-6)}.png`)
                        }
                        className="btn-secondary w-full !py-1.5 !text-xs flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> 下载
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sessionScreenshots.length === 0 && filteredJudgments.length === 0 && (
              <div className="card-glass p-12 text-center">
                <Image className="w-10 h-10 text-mine-600 mx-auto mb-3" />
                <div className="text-mine-400 mb-1">暂无截图</div>
                <div className="text-xs text-mine-500">
                  请在训练过程中点击「截图」按钮采集带溯源信息的图像
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
