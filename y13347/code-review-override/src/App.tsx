import { useState } from 'react'
import { useReviewStore } from './store'
import OperatorView from './components/OperatorView'
import AnalystView from './components/AnalystView'

type ViewMode = 'operator' | 'analyst'

export default function App() {
  const [mode, setMode] = useState<ViewMode>('operator')
  const { currentUser, setCurrentUser, resetToSeed, lastSavedAt } = useReviewStore()

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <h1>代码审查人工改判</h1>
          <span className="subtitle">彩排版 · 可持久化 · 历史追溯 · 漂移挂起</span>
        </div>
        <div className="header-right">
          <div className="view-switch">
            <button
              className={`switch-btn ${mode === 'operator' ? 'active' : ''}`}
              onClick={() => setMode('operator')}
            >
              排班同事视图
            </button>
            <button
              className={`switch-btn ${mode === 'analyst' ? 'active' : ''}`}
              onClick={() => setMode('analyst')}
            >
              算法工程师视图
            </button>
          </div>
          <div className="user-block">
            <label>当前用户：</label>
            <input
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="user-input"
            />
          </div>
          <button className="reset-btn" onClick={resetToSeed}>
            重置到种子数据
          </button>
        </div>
      </header>

      <div className="save-indicator">
        {lastSavedAt && (
          <span>
            💾 状态已保存至 LocalStorage，最近保存：
            {new Date(lastSavedAt).toLocaleString('zh-CN')}
            （刷新或重启浏览器后仍可恢复）
          </span>
        )}
      </div>

      <main className="app-main">
        {mode === 'operator' ? <OperatorView /> : <AnalystView />}
      </main>
    </div>
  )
}
