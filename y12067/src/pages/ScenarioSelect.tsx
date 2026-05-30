import { scenarios } from "@/data/scenarios";
import ScenarioCard from "@/components/ScenarioCard";
import { useNavigate } from "react-router-dom";
import { Flame, Shield, Building } from "lucide-react";

export default function ScenarioSelect() {
  const navigate = useNavigate();

  const handleSelect = (id: string) => {
    navigate(`/game/${id}`);
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-gray-700/40 bg-bg-light/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Flame size={22} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-100 tracking-tight">
                商场消防疏散局
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                FIRE EVACUATION COMMAND
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-400 max-w-xl leading-relaxed mt-2">
            选择场景开始疏散演练。每个场景含真实数据异常（出口缺字段、备注信息、晚到人流），
            你的每个操作将即时影响人流模拟结果。
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Building size={14} className="text-accent" />
          <h2 className="text-sm font-bold text-gray-300">可用场景</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((s) => (
            <ScenarioCard key={s.id} scenario={s} onSelect={handleSelect} />
          ))}
        </div>

        <div className="mt-10 border-t border-gray-700/40 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-info" />
            <h2 className="text-sm font-bold text-gray-300">操作说明</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
            <div className="bg-bg-light/50 rounded-lg border border-gray-700/30 p-3">
              <div className="text-accent font-medium mb-1">📻 广播</div>
              <p>选择楼层和目标出口，向人群发送疏散广播。广播后该区域人群会向指定出口移动。</p>
            </div>
            <div className="bg-bg-light/50 rounded-lg border border-gray-700/30 p-3">
              <div className="text-warn font-medium mb-1">🛗 电梯管控</div>
              <p>火警期间电梯应立即停用。未停用的电梯会吸引人群前往，导致误用和困人风险。</p>
            </div>
            <div className="bg-bg-light/50 rounded-lg border border-gray-700/30 p-3">
              <div className="text-info font-medium mb-1">🔀 出口引导</div>
              <p>当某出口拥堵时，引导部分人群改走其他出口。注意出口容量和距离。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
