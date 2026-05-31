import { NavLink } from "react-router-dom"
import { Upload, BarChart3, AlertTriangle } from "lucide-react"
import { useStore } from "@/store/useStore"

const navItems = [
  { to: "/", label: "数据导入", icon: Upload },
  { to: "/dashboard", label: "分析看板", icon: BarChart3 },
  { to: "/review", label: "异常复核", icon: AlertTriangle },
]

export default function Sidebar() {
  const { fileLoaded, fileName } = useStore()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-navy-800 flex flex-col border-r border-navy-700">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-serif text-lg text-amber-500">声乐换气点标注器</h1>
        <p className="text-xs text-navy-300 mt-1">Vocal Breathing Annotator</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-l text-sm transition-colors ${
                isActive
                  ? "border-l-[3px] border-amber-500 text-amber-500 bg-navy-900/40"
                  : "text-navy-300 hover:text-navy-100 hover:bg-navy-700/40"
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-navy-700">
        {fileLoaded ? (
          <p className="text-xs text-sage-500 truncate">{fileName}</p>
        ) : (
          <p className="text-xs text-coral-500">未加载数据</p>
        )}
      </div>
    </aside>
  )
}
