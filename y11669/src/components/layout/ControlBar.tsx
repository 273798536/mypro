import { useSceneStore } from '../../store/useSceneStore'
import { useDataStore } from '../../store/useDataStore'
import { Link, useLocation } from 'react-router-dom'

export function ControlBar() {
  const { layers, toggleLayer, resetCamera } = useSceneStore()
  const { refreshData, isLoading } = useDataStore()
  const location = useLocation()

  const layerButtons = [
    { key: 'racks', label: '机柜', icon: '🗄️' },
    { key: 'acUnits', label: '空调', icon: '❄️' },
    { key: 'temperatureCloud', label: '温度云', icon: '🌡️' },
    { key: 'alerts', label: '告警', icon: '⚠️' },
    { key: 'airflowParticles', label: '气流', icon: '💨' },
  ] as const

  const navItems = [
    { path: '/', label: '3D监控', icon: '🏠' },
    { path: '/alerts', label: '告警管理', icon: '📋' },
    { path: '/data-source', label: '数据来源', icon: '📊' },
    { path: '/reports', label: '报告导出', icon: '📄' },
  ]

  return (
    <div className="absolute top-4 left-4 right-96 flex items-center gap-4">
      <div className="glass-panel px-4 py-2 flex items-center gap-2">
        <div className="text-dc-primary font-bold text-lg mr-2">🏭 DC-Monitor</div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded text-sm transition-all ${
              location.pathname === item.path
                ? 'bg-dc-primary text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="glass-panel px-3 py-2 flex items-center gap-1">
        {layerButtons.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1 ${
              layers[key]
                ? 'bg-dc-primary/30 text-dc-accent border border-dc-primary/50'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={resetCamera}
          className="glass-panel px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          🎯 重置视角
        </button>
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="glass-panel px-3 py-2 text-sm text-dc-primary hover:text-dc-accent transition-colors disabled:opacity-50"
        >
          {isLoading ? '刷新中...' : '🔄 刷新数据'}
        </button>
      </div>
    </div>
  )
}
