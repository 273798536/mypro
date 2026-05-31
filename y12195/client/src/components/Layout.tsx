import React from 'react'
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const menuItems = [
    { path: '/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/students', label: '学员样本', icon: '👥' },
    { path: '/versions', label: '版本追踪', icon: '📋' },
    { path: '/corrections', label: '人工修正', icon: '✏️' },
    { path: '/groups', label: '分组指标', icon: '📈' },
    { path: '/makeup', label: '缺课补录', icon: '📝' },
    { path: '/import', label: '数据导入', icon: '📥' },
  ]

  const topTabs = [
    { path: '/students', label: '样本', param: 'studentId' },
    { path: '/versions', label: '版本', param: 'versionId' },
    { path: '/corrections', label: '修正', param: 'correctionId' },
    { path: '/groups', label: '分组', param: 'groupId' },
  ]

  const handleTabClick = (tabPath: string, paramKey: string) => {
    const currentParam = params[paramKey] || params['studentId'] || params['versionId'] || params['correctionId'] || params['groupId']
    if (currentParam) {
      navigate(`${tabPath}?id=${currentParam}`)
    } else {
      navigate(tabPath)
    }
  }

  const isTopTabActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  const isMenuActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-primary">教学管理系统</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                isMenuActive(item.path)
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200">
          <div className="h-12 flex items-center px-6 border-b border-slate-100">
            <div className="flex space-x-1">
              {topTabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => handleTabClick(tab.path, tab.param)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isTopTabActive(tab.path)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
