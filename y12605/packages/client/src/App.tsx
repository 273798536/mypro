import { Routes, Route, Link } from 'react-router-dom';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import TaskSettlement from './pages/TaskSettlement';
import { useTaskStore } from './store/useTaskStore';
import StatusBadge from './components/StatusBadge';
import UsabilityBadge from './components/UsabilityBadge';
import ErrorAlert from './components/ErrorAlert';

function App() {
  const { error, setError } = useTaskStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">儿童几何拼图课堂</h1>
                <p className="text-sm text-slate-500">安全培训审核系统</p>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
              >
                任务列表
              </Link>
            </nav>
          </div>
          <div className="mt-4 flex items-center gap-3">
              <UsabilityBadge type="direct_use" />
              <UsabilityBadge type="needs_trainer_review" />
              <UsabilityBadge type="rejected" />
            </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <ErrorAlert 
            message={error} 
            onClose={() => setError(null)} 
          />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<TaskList />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/tasks/:id/settlement" element={<TaskSettlement />} />
        </Routes>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>儿童几何拼图课堂 · 安全培训审核系统 v1.0.0</p>
          <p className="mt-1">确保每一份审核都有迹可循、有据可依</p>
        </div>
      </footer>
      </div>
  );
}

export default App;
