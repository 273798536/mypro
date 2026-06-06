import { useMazeStore } from './hooks/useMazeStore';
import { EditorCanvas } from './components/EditorCanvas';
import { Toolbar } from './components/Toolbar';
import { ScorePanel } from './components/ScorePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { MaterialPanel } from './components/MaterialPanel';
import { ExportPanel } from './components/ExportPanel';
import { CellType } from './types';
import { Link } from 'react-router-dom';

function App() {
  const {
    maze,
    operations,
    selectedTool,
    setSelectedTool,
    updateCell,
    calculateScore,
    getTotalScore,
    restoreOperation,
    clearMaze,
    confirmMaze,
    annotateCell,
    getScoreHistory,
    getOcclusionIssues,
  } = useMazeStore();

  const handleCellClick = (row: number, col: number) => {
    const cellType: CellType = selectedTool === 'erase' ? 'empty' : selectedTool;

    const contentMap: Record<string, string> = {
      wall: '🧱',
      path: '✅',
      start: '🚶',
      end: '🏁',
      item: '⭐',
      obstacle: '⚠️',
      empty: '',
    };

    const existingCell = maze.grid[row][col];
    updateCell(row, col, {
      type: cellType,
      content: contentMap[selectedTool],
      anomalyTag: cellType === 'empty' ? existingCell.anomalyTag : 'none',
      layer: cellType === 'empty' ? 0 : existingCell.layer,
    });
  };

  const scoreDetails = calculateScore();
  const totalScore = getTotalScore();
  const scoreHistory = getScoreHistory();
  const occlusionIssues = getOcclusionIssues();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏰</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">儿童编程迷宫编辑器</h1>
                <p className="text-xs text-gray-500">每一次导入、修改、批改都会被记录，可以随时恢复</p>
              </div>
            </div>
            <nav className="flex items-center gap-3">
              <Link
                to="/"
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
              >
                🖥️ 编辑器
              </Link>
              <Link
                to="/examples"
                className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors text-sm"
              >
                📚 样例演示
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {maze.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    更新于 {new Date(maze.updatedAt).toLocaleString('zh-CN')}
                  </p>
                  {maze.remark && (
                    <p className="text-xs text-gray-400 mt-0.5">📝 {maze.remark}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    网格: {maze.grid.length}×{maze.grid[0]?.length || 0}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    图层: {maze.layers.length} 层
                  </span>
                </div>
              </div>
              <EditorCanvas
                grid={maze.grid}
                selectedTool={selectedTool}
                onCellClick={handleCellClick}
                onAnnotate={annotateCell}
              />
            </div>

            <Toolbar
              selectedTool={selectedTool}
              onToolSelect={setSelectedTool}
              onClear={clearMaze}
              onConfirm={confirmMaze}
              status={maze.status}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <ScorePanel
              scoreDetails={scoreDetails}
              totalScore={totalScore}
              occlusionIssues={occlusionIssues}
              scoreHistory={scoreHistory}
            />

            <HistoryPanel
              operations={operations}
              onRestore={restoreOperation}
            />

            <MaterialPanel />

            <ExportPanel
              mazeName={maze.name}
              scoreDetails={scoreDetails}
              operations={operations}
              totalScore={totalScore}
              scoreHistory={scoreHistory}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-inner mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-gray-500 text-sm">
          <p>🎮 儿童编程迷宫编辑器 - 让编程学习更有趣！</p>
          <p className="text-xs text-gray-400 mt-1">每次操作都有记录，批改前后分数对比，素材问题大白话说明</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
