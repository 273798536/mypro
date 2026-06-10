import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Scatter, ScatterChart } from "recharts";
import { Plus, Trash2, ArrowRight, AlertTriangle, Activity, Layers } from "lucide-react";
import { mockApi, type Peak } from "@/utils/mock";

const OVERLAP_START = 155;
const OVERLAP_END = 175;
const HAS_CURVE = true;

export default function PeakAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [curveData, setCurveData] = useState<{ time: number; temperature: number }[]>([]);
  const [normalPeaks, setNormalPeaks] = useState<Peak[]>([]);
  const [overlappingPeaks, setOverlappingPeaks] = useState<Peak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!HAS_CURVE) {
        setLoading(false);
        return;
      }
      const [curve, peaks] = await Promise.all([mockApi.getTemperatureCurve(), mockApi.getPeaks()]);
      setCurveData(curve);
      setNormalPeaks(peaks.normalPeaks);
      setOverlappingPeaks(peaks.overlappingPeaks);
      setLoading(false);
    };
    fetchData();
  }, []);

  const allPeaks = [...normalPeaks, ...overlappingPeaks];

  const handleAddPeak = () => {
    const newPeak: Peak = {
      id: `custom-${Date.now()}`,
      time: 100,
      temperature: 60,
      intensity: 0.5,
      label: `自定义峰${normalPeaks.length + overlappingPeaks.length + 1}`,
    };
    setNormalPeaks([...normalPeaks, newPeak]);
  };

  const handleDeletePeak = (peakId: string) => {
    setNormalPeaks(normalPeaks.filter((p) => p.id !== peakId));
    setOverlappingPeaks(overlappingPeaks.filter((p) => p.id !== peakId));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-lab-textLight">加载中...</div>;
  }

  if (!HAS_CURVE) {
    return (
      <div className="min-h-screen bg-lab-bg p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl text-lab-primary">谱峰分析</h1>
            <p className="text-sm text-lab-textLight mt-1">分析任务 #{id}</p>
          </div>
          <div className="glass-card p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-lab-warning/15 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-lab-warning" />
            </div>
            <h3 className="text-lg font-semibold text-lab-text mb-2">缺少温度曲线数据</h3>
            <p className="text-sm text-lab-textLight mb-4 max-w-md">
              当前任务尚未获取到温度-时间曲线数据。请确认称量单已正确导入且仪器数据已同步。
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate("/weighing")} className="btn-secondary">返回导入称量单</button>
              <button className="btn-primary">重新同步数据</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lab-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-lab-primary">谱峰分析</h1>
            <p className="text-sm text-lab-textLight mt-1">分析任务 #{id}</p>
          </div>
          <button onClick={() => navigate(`/balance/${id}`)} className="btn-primary flex items-center gap-2">
            <span>执行配平计算</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="glass-card p-5 bg-lab-primaryDark">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-white/70" />
                <h3 className="text-white font-medium">温度-时间曲线</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="time" stroke="#ffffff60" tick={{ fill: "#ffffff80", fontSize: 11 }} label={{ value: "时间 (s)", position: "insideBottom", offset: -5, fill: "#ffffff60", fontSize: 11 }} />
                    <YAxis stroke="#ffffff60" tick={{ fill: "#ffffff80", fontSize: 11 }} label={{ value: "温度 (°C)", angle: -90, position: "insideLeft", fill: "#ffffff60", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#152A45", border: "1px solid #2C5282", borderRadius: 8, color: "#fff" }} labelStyle={{ color: "#fff" }} />
                    <ReferenceArea x1={OVERLAP_START} x2={OVERLAP_END} fill="#C0392B" fillOpacity={0.25} />
                    <Line type="monotone" dataKey="temperature" stroke="url(#tempGradient)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#60A5FA" }} />
                    <ScatterChart>
                      <Scatter data={allPeaks.map((p) => ({ time: p.time, temperature: p.temperature }))} fill="#FC8181" shape="circle" />
                    </ScatterChart>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-lab-danger/50" />
                  <span>重叠峰区域</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-lab-dangerLight" />
                  <span>已标记峰位</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-lab-primary" />
                  <h3 className="font-semibold text-sm text-lab-text">识别峰列表</h3>
                </div>
                <button onClick={handleAddPeak} className="p-1.5 rounded-md bg-lab-primary/10 text-lab-primary hover:bg-lab-primary/20 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {normalPeaks.map((peak) => (
                  <div key={peak.id} className="flex items-center justify-between p-2.5 rounded-lg bg-lab-bg group">
                    <div>
                      <p className="text-xs font-medium text-lab-text">{peak.label}</p>
                      <p className="text-xs text-lab-textLight mt-0.5">
                        t={peak.time}s · {peak.temperature}°C
                      </p>
                    </div>
                    <button onClick={() => handleDeletePeak(peak.id)} className="p-1 rounded text-lab-textLight hover:text-lab-danger hover:bg-lab-danger/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-lab-danger" />
                <h3 className="font-semibold text-sm text-lab-text">重叠峰</h3>
                <span className="status-danger">{overlappingPeaks.length}</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                {overlappingPeaks.map((peak) => (
                  <div key={peak.id} className="flex items-center justify-between p-2.5 rounded-lg bg-lab-danger/5 border border-lab-danger/20 group">
                    <div>
                      <p className="text-xs font-medium text-lab-text">{peak.label}</p>
                      <p className="text-xs text-lab-textLight mt-0.5">
                        t={peak.time}s · {peak.temperature}°C
                      </p>
                    </div>
                    <button onClick={() => handleDeletePeak(peak.id)} className="p-1 rounded text-lab-textLight hover:text-lab-danger hover:bg-lab-danger/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-lab-textLight mt-3">
                检测到 {OVERLAP_START}-{OVERLAP_END}s 区间存在重叠峰，建议人工复核。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
