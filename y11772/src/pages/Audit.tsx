import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, FileText, GitBranch, ShieldCheck } from "lucide-react"
import { AuditLog } from "@/components/AuditLog"
import { SourceTrace } from "@/components/SourceTrace"
import { ConsistencyCheck } from "@/components/ConsistencyCheck"

type TabKey = "audit" | "trace" | "consistency"

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "audit", label: "审计日志", icon: FileText },
  { key: "trace", label: "来源追溯", icon: GitBranch },
  { key: "consistency", label: "一致性校验", icon: ShieldCheck },
]

export default function Audit() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("audit")

  return (
    <div className="min-h-screen bg-[#1a1f36] text-white/90">
      <header className="sticky top-0 z-20 bg-[#1a1f36]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-lg font-semibold text-white/90">数据审计与追溯</h1>
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-t-lg transition-colors ${
                  activeTab === key
                    ? "bg-white/10 text-[#4fc3f7] border-b-2 border-[#4fc3f7]"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "audit" && <AuditLog />}
        {activeTab === "trace" && <SourceTrace />}
        {activeTab === "consistency" && <ConsistencyCheck />}
      </main>
    </div>
  )
}
