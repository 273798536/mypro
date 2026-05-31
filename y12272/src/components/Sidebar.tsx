import { Filter, Scissors, AlertTriangle, ClipboardList } from "lucide-react"
import { useStore } from "@/store/useStore"
import FilterPanel from "./FilterPanel"
import CrossSectionView from "./CrossSectionView"
import ConflictList from "./ConflictList"
import CoordinationPanel from "./CoordinationPanel"

const TABS = [
  { key: "filter" as const, label: "筛选", icon: Filter },
  { key: "section" as const, label: "剖切", icon: Scissors },
  { key: "conflicts" as const, label: "冲突", icon: AlertTriangle },
  { key: "coordination" as const, label: "协调", icon: ClipboardList },
]

const TAB_CONTENT: Record<string, React.FC> = {
  filter: FilterPanel,
  section: CrossSectionView,
  conflicts: ConflictList,
  coordination: CoordinationPanel,
}

export default function Sidebar() {
  const sidebarTab = useStore((s) => s.sidebarTab)
  const setSidebarTab = useStore((s) => s.setSidebarTab)
  const Content = TAB_CONTENT[sidebarTab]

  return (
    <div className="flex h-full w-80 flex-col bg-[#1e2028] border-l border-[#2a2d36]">
      <div className="flex shrink-0 border-b border-[#2a2d36]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSidebarTab(key)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              sidebarTab === key
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <Content />
      </div>
    </div>
  )
}
