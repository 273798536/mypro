import { NavLink, Outlet } from "react-router-dom"
import { FlaskConical, ClipboardPlus, FileDown } from "lucide-react"
import { useTiterStore } from "@/store"

const navItems = [
  { to: "/", label: "复核看板", icon: FlaskConical },
  { to: "/supplement", label: "样本补录", icon: ClipboardPlus },
  { to: "/export", label: "导出报告", icon: FileDown },
]

export default function Layout() {
  const { currentBatch, batches, setCurrentBatch } = useTiterStore()

  return (
    <div className="flex min-h-screen">
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: "var(--color-indigo-deep)" }}
      >
        <div className="px-5 py-6 border-b" style={{ borderColor: "var(--color-indigo-light)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: "var(--color-amber-accent)" }}
            >
              <FlaskConical size={18} className="text-gray-900" />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                抗体滴度复核
              </h1>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Titer Review
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-indigo-light)" }}>
          <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-text-muted)" }}>
            试剂批号
          </label>
          <select
            value={currentBatch}
            onChange={(e) => setCurrentBatch(e.target.value)}
            className="w-full rounded px-3 py-2 text-sm font-mono outline-none"
            style={{
              background: "var(--color-indigo-mid)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-indigo-light)",
            }}
          >
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm mb-1 transition-colors ${
                  isActive ? "font-medium" : ""
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "var(--color-indigo-light)" : "transparent",
                color: isActive ? "var(--color-amber-accent)" : "var(--color-text-secondary)",
              })}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t" style={{ borderColor: "var(--color-indigo-light)" }}>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            当前批次
          </p>
          <p className="font-mono text-sm mt-1" style={{ color: "var(--color-amber-accent)" }}>
            {currentBatch}
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
