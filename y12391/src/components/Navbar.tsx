import { NavLink } from "react-router-dom"
import { Activity, AlertTriangle, GitCompareArrows, AudioWaveform } from "lucide-react"
import { useEnvelopeStore } from "@/store"

const links = [
  { to: "/", icon: AudioWaveform, label: "工作台" },
  { to: "/anomalies", icon: AlertTriangle, label: "异常待确认" },
  { to: "/compare", icon: GitCompareArrows, label: "版本对比" },
]

export default function Navbar() {
  const pendingCount = useEnvelopeStore((s) => s.anomalies.filter((a) => a.status === "pending").length)

  return (
    <nav className="h-12 bg-[#0d0d1a] border-b border-white/5 flex items-center px-6 gap-1 shrink-0">
      <div className="flex items-center gap-2 mr-8">
        <Activity size={20} className="text-[#00ff88]" />
        <span className="text-sm font-bold tracking-wider text-white/90 font-mono">
          SYNTH ENVELOPE
        </span>
      </div>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
              isActive
                ? "bg-[#00ff8815] text-[#00ff88] border border-[#00ff8833]"
                : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
            }`
          }
        >
          <Icon size={14} />
          {label}
          {label === "异常待确认" && pendingCount > 0 && (
            <span className="ml-1 min-w-[16px] h-4 flex items-center justify-center px-1 text-[10px] font-bold rounded-full bg-[#ff8800] text-black animate-pulse">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
