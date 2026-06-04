import { useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Layers, PenTool, List, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "inspector" | "student"

const NAV_ITEMS = [
  { label: "图层管理", icon: Layers, path: "/", roles: ["inspector", "student"] },
  { label: "画布编辑", icon: PenTool, path: "/canvas", roles: ["inspector"] },
  { label: "缺陷列表", icon: List, path: "/defects", roles: ["inspector", "student"] },
]

export default function Layout() {
  const [role, setRole] = useState<Role>("inspector")
  const location = useLocation()
  const navigate = useNavigate()

  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  const handleNavClick = (path: string) => {
    if (path === "/") {
      navigate("/")
      return
    }
    const workshopId = "demo"
    if (path === "/canvas") {
      navigate(`/canvas/${workshopId}`)
    } else if (path === "/defects") {
      navigate(`/defects/${workshopId}`)
    }
  }

  const handleRoleSwitch = () => {
    const newRole: Role = role === "inspector" ? "student" : "inspector"
    setRole(newRole)
    if (newRole === "student") {
      navigate("/student/demo")
    } else {
      navigate("/")
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 items-center justify-between bg-iron px-4 text-white">
        <span className="text-base font-semibold tracking-wide">车间缺陷圈选</span>
        <button
          onClick={handleRoleSwitch}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
            role === "inspector"
              ? "bg-warn/90 hover:bg-warn"
              : "bg-pass/90 hover:bg-pass"
          )}
        >
          <GraduationCap size={14} />
          {role === "inspector" ? "巡检员" : "学生"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-60 flex-col bg-iron/95 text-gray-300">
          <nav className="flex flex-col gap-1 p-3">
            {visibleNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive(item.path)
                    ? "bg-white/10 text-white"
                    : "hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto bg-[var(--color-bg-main)] p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
