import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Shield, LayoutDashboard, AlertTriangle, FileDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useReviewStore } from "@/store/useReviewStore"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "复核看板", end: true },
  { to: "/anomalies", icon: AlertTriangle, label: "异常溯源", end: false },
  { to: "/export", icon: FileDown, label: "导出报告", end: false },
]

export default function Layout() {
  const location = useLocation()
  const samples = useReviewStore((s) => s.samples)
  const anomalies = useReviewStore((s) => s.anomalies)
  const totalSamples = samples.length
  const pendingReview = samples.filter((s) => s.reviewStatus === "pending").length
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolvedAt).length

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex flex-col shrink-0 bg-[#0f1219] border-r border-[#1e2440]">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <Shield size={20} className="text-amber-500" />
          <h1
            className="text-[15px] font-semibold text-gray-100"
            style={{ fontFamily: "'Source Serif 4', serif" }}
          >
            概率抽样边界复核
          </h1>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm rounded-md transition-colors border-l-2 ${
                  isActive
                    ? "border-amber-500 text-amber-500 bg-amber-500/5"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-[#1e2440]">
          <p className="text-[11px] text-gray-500 mb-2.5 uppercase tracking-wider">数据入口</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">样本总量</span>
              <span className="text-gray-200 font-medium tabular-nums">{totalSamples}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">待复核</span>
              <span className="text-amber-500 font-medium tabular-nums">{pendingReview}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">异常</span>
              <span className="text-red-500 font-medium tabular-nums">{unresolvedAnomalies}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#1a1f36]">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
