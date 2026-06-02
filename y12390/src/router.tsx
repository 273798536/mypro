import Dashboard from '@/pages/Dashboard'
import Presets from '@/pages/Presets'
import PresetDetail from '@/pages/PresetDetail'
import Snapshots from '@/pages/Snapshots'
import SnapshotDetail from '@/pages/SnapshotDetail'
import Assignments from '@/pages/Assignments'
import AssignmentDetail from '@/pages/AssignmentDetail'
import Compare from '@/pages/Compare'
import Sandbox from '@/pages/Sandbox'

export interface RouteConfig {
  path: string
  element: React.ReactNode
  title?: string
}

export const routes: RouteConfig[] = [
  { path: '/', element: <Dashboard />, title: '首页' },
  { path: '/presets', element: <Presets />, title: '预设管理' },
  { path: '/presets/:id', element: <PresetDetail />, title: '预设详情' },
  { path: '/snapshots', element: <Snapshots />, title: '参数快照' },
  { path: '/snapshots/:id', element: <SnapshotDetail />, title: '快照详情' },
  { path: '/assignments', element: <Assignments />, title: '作业管理' },
  { path: '/assignments/:id', element: <AssignmentDetail />, title: '作业详情' },
  { path: '/compare', element: <Compare />, title: '版本对比' },
  { path: '/sandbox', element: <Sandbox />, title: '测试沙箱' },
]

export const getTitleByPath = (pathname: string): string => {
  const route = routes.find(r => {
    if (r.path === pathname) return true
    const dynamicRoute = r.path.replace(/:[^/]+/g, '[^/]+')
    return new RegExp(`^${dynamicRoute}$`).test(pathname)
  })
  return route?.title || '音色预设库'
}
