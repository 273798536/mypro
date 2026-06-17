interface StatsPanelProps {
  stats: {
    total: number
    confirmed: number
    pending: number
    needMaterial: number
    manualReview: number
    withdrawn: number
    hasConflict: number
    needMerge: number
  }
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { key: 'all', label: '全部', field: 'total' as const },
  { key: 'pending', label: '待处理', field: 'pending' as const },
  { key: 'confirmed', label: '已处理', field: 'confirmed' as const },
  { key: 'need_material', label: '待补材料', field: 'needMaterial' as const },
  { key: 'manual_review', label: '人工改判', field: 'manualReview' as const },
  { key: 'withdrawn', label: '已撤回', field: 'withdrawn' as const },
]

export function StatsPanel({ stats, activeTab, onTabChange }: StatsPanelProps) {
  return (
    <div className="stats-panel">
      <div className="stats-cards">
        <div className="stat-card stat-total">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">总记录</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">待处理</div>
        </div>
        <div className="stat-card stat-confirmed">
          <div className="stat-number">{stats.confirmed}</div>
          <div className="stat-label">已处理</div>
        </div>
        <div className="stat-card stat-need-material">
          <div className="stat-number">{stats.needMaterial}</div>
          <div className="stat-label">待补材料</div>
        </div>
        <div className="stat-card stat-manual">
          <div className="stat-number">{stats.manualReview}</div>
          <div className="stat-label">人工改判</div>
        </div>
        {stats.hasConflict > 0 && (
          <div className="stat-card stat-conflict">
            <div className="stat-number">{stats.hasConflict}</div>
            <div className="stat-label">冲突待确认</div>
          </div>
        )}
        {stats.needMerge > 0 && (
          <div className="stat-card stat-merge">
            <div className="stat-number">{stats.needMerge}</div>
            <div className="stat-label">需归并</div>
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{stats[tab.field]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
