import { Link, useLocation } from 'react-router-dom'

const Navigation = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '游戏', icon: '🎮' },
    { path: '/review', label: '回看分析', icon: '📊' },
    { path: '/samples', label: '样例测试', icon: '🧪' }
  ]

  return (
    <nav className="glass sticky top-0 z-50 border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <h1 className="font-display text-xl font-bold text-cyan-400 text-shadow-glow">
              几何折纸闯关
            </h1>
          </div>
          
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${location.pathname === item.path 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
