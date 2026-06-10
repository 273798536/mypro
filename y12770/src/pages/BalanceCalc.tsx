import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FlaskConical, Sparkles, GitBranch, AlertTriangle, ChevronRight, Plus, X, ArrowRight, ThermometerSun } from "lucide-react";
import { mockApi, type BalanceResult, type TimelineItem } from "@/utils/mock";

export default function BalanceCalc() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reactants, setReactants] = useState<string[]>(["KNO3", "C", "S"]);
  const [products, setProducts] = useState<string[]>(["K2S", "N2", "CO2"]);
  const [newReactant, setNewReactant] = useState("");
  const [newProduct, setNewProduct] = useState("");
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockApi.getTimeline().then((t) => {
      setTimeline(t);
      setLoading(false);
    });
  }, []);

  const handleBalance = async () => {
    setCalculating(true);
    const result = await mockApi.calculateBalance(reactants, products);
    setBalanceResult(result);
    setCalculating(false);
  };

  const addReactant = () => {
    if (newReactant.trim()) {
      setReactants([...reactants, newReactant.trim()]);
      setNewReactant("");
    }
  };

  const addProduct = () => {
    if (newProduct.trim()) {
      setProducts([...products, newProduct.trim()]);
      setNewProduct("");
    }
  };

  const removeReactant = (idx: number) => setReactants(reactants.filter((_, i) => i !== idx));
  const removeProduct = (idx: number) => setProducts(products.filter((_, i) => i !== idx));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-lab-textLight">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-lab-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-lab-primary">配平计算</h1>
            <p className="text-sm text-lab-textLight mt-1">分析任务 #{id}</p>
          </div>
          <button onClick={() => navigate(`/report/${id}`)} className="btn-primary flex items-center gap-2">
            <span>生成报告</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-4 h-4 text-lab-primary" />
                <h3 className="font-semibold text-lab-text">反应式输入</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-lab-text mb-2 block">反应物</label>
                  <div className="space-y-2 mb-3">
                    {reactants.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-lab-bg rounded-lg border border-lab-border">
                        <span className="font-mono text-sm text-lab-text flex-1">{r}</span>
                        <button onClick={() => removeReactant(idx)} className="p-1 text-lab-textLight hover:text-lab-danger rounded hover:bg-lab-danger/10">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newReactant}
                      onChange={(e) => setNewReactant(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addReactant()}
                      placeholder="输入化学式，如 H2O"
                      className="input-field text-sm font-mono"
                    />
                    <button onClick={addReactant} className="px-3 py-2 bg-lab-primary/10 text-lab-primary rounded-md hover:bg-lab-primary/20 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-lab-text mb-2 block">生成物</label>
                  <div className="space-y-2 mb-3">
                    {products.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-lab-bg rounded-lg border border-lab-border">
                        <span className="font-mono text-sm text-lab-text flex-1">{p}</span>
                        <button onClick={() => removeProduct(idx)} className="p-1 text-lab-textLight hover:text-lab-danger rounded hover:bg-lab-danger/10">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addProduct()}
                      placeholder="输入化学式，如 CO2"
                      className="input-field text-sm font-mono"
                    />
                    <button onClick={addProduct} className="px-3 py-2 bg-lab-primary/10 text-lab-primary rounded-md hover:bg-lab-primary/20 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-lab-border flex items-center justify-between">
                <div className="text-sm font-mono text-lab-textLight">
                  {reactants.join(" + ")} → {products.join(" + ")}
                </div>
                <button onClick={handleBalance} disabled={calculating} className="btn-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{calculating ? "计算中..." : "一键配平"}</span>
                </button>
              </div>
            </div>

            {balanceResult && (
              <div className="glass-card p-5 bg-gradient-to-br from-lab-primary/5 to-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-lab-primary" />
                  <h3 className="font-semibold text-lab-text">配平结果</h3>
                </div>
                <div className="bg-lab-bg rounded-lg p-4 border border-lab-primary/20 mb-4">
                  <p className="font-mono text-lg text-lab-text text-center">{balanceResult.balancedEquation}</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-lab-bg rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-lab-danger/10 flex items-center justify-center">
                    <ThermometerSun className="w-5 h-5 text-lab-danger" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-lab-textLight">反应焓变 ΔH</p>
                    <p className="text-xl font-bold text-lab-danger font-mono">{balanceResult.deltaH} kJ/mol</p>
                  </div>
                  <div className="status-danger">放热反应</div>
                </div>
              </div>
            )}

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-4 h-4 text-lab-primary" />
                <h3 className="font-semibold text-lab-text">材料追溯时间线</h3>
              </div>
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-lab-border" />
                {timeline.map((item, idx) => {
                  const isDeviation = Math.abs(item.deviation) > 10;
                  return (
                    <div key={item.id} className="relative pb-5 last:pb-0">
                      <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white ${isDeviation ? "bg-lab-danger shadow-lg shadow-lab-danger/30" : "bg-lab-success"}`} />
                      <div className={`p-3 rounded-lg border ${isDeviation ? "bg-lab-danger/5 border-lab-danger/20" : "bg-lab-bg border-lab-border"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-lab-text">{item.reagentName}</span>
                              <span className="text-xs font-mono text-lab-textLight">{item.batchNo}</span>
                              {idx < timeline.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-lab-textLight" />}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 text-xs">
                              <span className="text-lab-textLight">
                                浓度: <span className={`font-mono ${isDeviation ? "text-lab-danger font-semibold" : "text-lab-text"}`}>{item.concentration.toFixed(2)} mol/L</span>
                              </span>
                              <span className="text-lab-textLight">
                                标准值: <span className="font-mono text-lab-text">{item.standardConcentration.toFixed(2)} mol/L</span>
                              </span>
                              <span className={`font-mono ${isDeviation ? "text-lab-danger font-semibold" : "text-lab-success"}`}>
                                {item.deviation > 0 ? "+" : ""}{item.deviation.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-lab-textLight mt-1">
                              来源: {item.source} · {item.timestamp}
                            </p>
                            {isDeviation && (
                              <div className="mt-2 p-2 bg-lab-warning/10 rounded-md flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-lab-warning flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-lab-text">
                                  浓度与标准值偏差 ±15%，请质检工程师复核
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold text-sm text-lab-text mb-3">配平提示</h3>
              <ul className="text-xs text-lab-textLight space-y-2">
                <li>• 输入元素符号区分大小写（如 Fe、NaCl）</li>
                <li>• 支持下标数字直接书写（如 H2O、CO2）</li>
                <li>• 每个化学式单独输入一行</li>
              </ul>
            </div>
            <div className="glass-card p-4">
              <h3 className="font-semibold text-sm text-lab-text mb-3">快速导航</h3>
              <div className="space-y-2">
                <button onClick={() => navigate("/weighing")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-lab-bg text-sm text-lab-textLight hover:text-lab-text transition-colors">
                  ← 返回称量单
                </button>
                <button onClick={() => navigate(`/analysis/${id}`)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-lab-bg text-sm text-lab-textLight hover:text-lab-text transition-colors">
                  ← 谱峰分析
                </button>
                <button onClick={() => navigate("/trace")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-lab-bg text-sm text-lab-textLight hover:text-lab-text transition-colors">
                  异常留痕中心 →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
