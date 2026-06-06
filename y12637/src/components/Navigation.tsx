import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'

export default function Navigation() {
  const navigate = useNavigate()
  const { state, resetProfile } = useApp()
  const pendingAnomalies = state.currentProfile
    ? state.currentProfile.anomalies.filter(a => a.status === 'pending').length
    : 0

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-stratum-alert text-white'
        : 'text-stratum-mid hover:bg-gray-200 hover:text-stratum-dark'
    }`

  const handleReset = () => {
    if (confirm('确认重置当前剖面？所有岩层、边界和操作记录将被清空。')) {
      resetProfile()
      navigate('/')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stratum-dark rounded flex items-center justify-center text-white text-xs font-bold">
              岩
            </div>
            <span className="text-stratum-dark font-bold text-lg">岩层剖面填色工具</span>
            {state.currentProfile && (
              <span className="text-xs text-stratum-mid ml-4 truncate max-w-xs">
                当前：{state.currentProfile.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <NavLink to="/" className={navItemClass}>
              启动
            </NavLink>
            {state.currentProfile && (
              <>
                <NavLink to="/editor" className={navItemClass}>
                  编辑
                </NavLink>
                <NavLink to="/anomalies" className={({ isActive }) => navItemClass({ isActive })}>
                  异常
                  {pendingAnomalies > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {pendingAnomalies}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/settlement" className={navItemClass}>
                  结算
                </NavLink>
              </>
            )}
            <NavLink to="/docs" className={navItemClass}>
              说明
            </NavLink>
            {state.currentProfile && (
              <button
                onClick={handleReset}
                className="ml-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
                title="重置剖面（重开）"
              >
                重开
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
