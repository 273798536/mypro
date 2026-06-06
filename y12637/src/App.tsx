import { Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation'
import LaunchPage from './pages/LaunchPage'
import EditorPage from './pages/EditorPage'
import AnomalyPage from './pages/AnomalyPage'
import SettlementPage from './pages/SettlementPage'
import DocumentationPage from './pages/DocumentationPage'
import { useApp } from './store/AppContext'

function RequireProfile({ children }: { children: JSX.Element }) {
  const { state } = useApp()
  if (!state.currentProfile) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-stratum-dark mb-2">尚未加载剖面数据</h2>
        <p className="text-sm text-stratum-mid mb-4">
          请先在启动页面加载培训样例、导入数据或新建空白剖面
        </p>
        <Navigate to="/" replace />
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-stratum-bg">
      <Navigation />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<LaunchPage />} />
          <Route
            path="/editor"
            element={
              <RequireProfile>
                <EditorPage />
              </RequireProfile>
            }
          />
          <Route
            path="/anomalies"
            element={
              <RequireProfile>
                <AnomalyPage />
              </RequireProfile>
            }
          />
          <Route
            path="/settlement"
            element={
              <RequireProfile>
                <SettlementPage />
              </RequireProfile>
            }
          />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="bg-white border-t border-gray-200 py-3 px-6 text-center text-xs text-stratum-mid">
        岩层剖面填色工具 v1.0 · 面向地质勘探与安全培训场景
      </footer>
    </div>
  )
}
