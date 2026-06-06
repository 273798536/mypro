import { useState } from 'react';
import { examples } from '../data/examples';
import { Example, GridCell, ScoreDetail } from '../types';
import { Link, useNavigate } from 'react-router-dom';

const getCellContent = (cell: GridCell): string => {
  if (cell.content) return cell.content;
  switch (cell.type) {
    case 'wall': return '🧱';
    case 'path': return '✅';
    case 'start': return '🚶';
    case 'end': return '🏁';
    case 'item': return '⭐';
    case 'obstacle': return '⚠️';
    default: return '';
  }
};

const getCellStyle = (cell: GridCell, highlight?: boolean) => {
  let base = '';
  switch (cell.type) {
    case 'wall': base = 'bg-gray-600 text-white'; break;
    case 'path': base = 'bg-green-200'; break;
    case 'start': base = 'bg-blue-300'; break;
    case 'end': base = 'bg-yellow-300'; break;
    case 'item': base = 'bg-purple-200'; break;
    case 'obstacle': base = 'bg-red-200'; break;
    default:
      if (cell.anomalyTag === 'missing') {
        base = 'bg-red-50 border-2 border-red-400 border-dashed';
      } else {
        base = 'bg-white';
      }
  }
  if (cell.anomalyTag === 'missing' && cell.type !== 'empty') {
    base += ' ring-2 ring-red-400';
  }
  if (cell.anomalyTag === 'fixed') {
    base += ' ring-2 ring-green-400';
  }
  if (highlight) {
    base += ' ring-4 ring-yellow-400 scale-110';
  }
  return base;
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return '简单';
    case 'medium': return '中等';
    case 'hard': return '困难';
    default: return '未知';
  }
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'import': return '📥';
    case 'edit': return '✏️';
    case 'error': return '❌';
    case 'correct': return '🔧';
    case 'restore': return '↩️';
    case 'annotate': return '📝';
    default: return '📝';
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'import': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'edit': return 'bg-gray-50 text-gray-600 border-gray-200';
    case 'error': return 'bg-red-50 text-red-600 border-red-200';
    case 'correct': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
    case 'restore': return 'bg-green-50 text-green-600 border-green-200';
    case 'annotate': return 'bg-pink-50 text-pink-600 border-pink-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'import': return '导入';
    case 'edit': return '编辑';
    case 'error': return '发现错误';
    case 'correct': return '修正';
    case 'restore': return '恢复对比';
    case 'annotate': return '加批注';
    default: return '操作';
  }
};

const calcDemoScore = (grid: GridCell[][]): { total: number; details: ScoreDetail[] } => {
  const details: ScoreDetail[] = [];
  let startCount = 0, endCount = 0, wallCount = 0, pathCount = 0, itemCount = 0;

  grid.forEach(row => row.forEach(cell => {
    switch (cell.type) {
      case 'start': startCount++; break;
      case 'end': endCount++; break;
      case 'wall': wallCount++; break;
      case 'path': pathCount++; break;
      case 'item': if (cell.layer === 0) itemCount++; break;
    }
  }));

  const totalCells = grid.length * grid[0].length;
  const pathRatio = pathCount / totalCells;

  details.push({
    category: '起点设置', score: startCount === 1 ? 20 : startCount === 0 ? 0 : 10, maxScore: 20,
    reason: startCount === 1 ? '正确' : startCount === 0 ? '缺少' : '多个', issueType: startCount === 1 ? 'info' : startCount === 0 ? 'error' : 'warning',
    humanReadableReason: startCount === 1 ? '起点没问题' : startCount === 0 ? '找不到起点🚶' : `有${startCount}个起点，小朋友会糊涂`,
  });

  details.push({
    category: '终点设置', score: endCount === 1 ? 20 : endCount === 0 ? 0 : 10, maxScore: 20,
    reason: endCount === 1 ? '正确' : endCount === 0 ? '缺少' : '多个', issueType: endCount === 1 ? 'info' : endCount === 0 ? 'error' : 'warning',
    humanReadableReason: endCount === 1 ? '终点没问题' : endCount === 0 ? '找不到终点🏁' : `有${endCount}个终点`,
  });

  details.push({
    category: '路径分布', score: pathRatio >= 0.2 && pathRatio <= 0.6 ? 20 : 10, maxScore: 20,
    reason: '路径比例', issueType: pathRatio >= 0.2 && pathRatio <= 0.6 ? 'info' : 'warning',
    humanReadableReason: `路径占${Math.round(pathRatio * 100)}%，${pathRatio >= 0.2 && pathRatio <= 0.6 ? '比例合适' : pathRatio < 0.2 ? '路径太少了' : '路径太多了'}`,
  });

  details.push({
    category: '墙壁数量', score: wallCount >= 5 ? 20 : wallCount * 4, maxScore: 20,
    reason: `${wallCount}堵墙`, issueType: wallCount >= 5 ? 'info' : 'warning',
    humanReadableReason: wallCount >= 5 ? `${wallCount}堵墙，迷宫够复杂` : `只有${wallCount}堵墙，建议至少5堵`,
  });

  details.push({
    category: '道具设置', score: itemCount >= 1 ? 20 : 10, maxScore: 20,
    reason: itemCount >= 1 ? `${itemCount}个道具` : '没道具', issueType: itemCount >= 1 ? 'info' : 'warning',
    humanReadableReason: itemCount >= 1 ? `有${itemCount}个⭐道具，更有趣` : '没放道具⭐，加几个会更好玩',
  });

  const total = Math.round(details.reduce((s, d) => s + d.score, 0) / details.length);
  return { total, details };
};

export default function Examples() {
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null);
  const [highlightCell, setHighlightCell] = useState<{ row: number; col: number } | null>(null);
  const navigate = useNavigate();

  const handleLoadExample = (example: Example) => {
    localStorage.setItem('loadExampleId', example.id);
    navigate('/');
  };

  const handleDemoStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    const step = selectedExample?.demoSteps[stepIndex];
    if (!step) return;

    if (step.scoreChange) {
      setSimulatedScore(step.scoreChange.after);
    }

    if (step.action === 'error') {
      setHighlightCell({ row: 3, col: 5 });
      setTimeout(() => setHighlightCell(null), 2500);
    } else if (step.action === 'correct') {
      setHighlightCell(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📚</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">样例演示</h1>
                <p className="text-xs text-gray-500">包含日常作业里常见的小问题：漏填、旧表数据、图层遮挡</p>
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
        {!selectedExample ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-blue-800 mb-2">💡 这些样例里有什么</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>📝 <strong>真实场景：</strong>学生交的作业里常见的小问题，不是刻意构造的极端案例</li>
                <li>❌→🔧→↩️ <strong>完整流程：</strong>每个样例都有「导入 → 发现错误 → 修正 → 恢复对比」四步</li>
                <li>📊 <strong>分数变化：</strong>每一步操作后分数怎么变，涨了多少掉了多少都看得见</li>
                <li>🎭 <strong>图层遮挡：</strong>专门设计了2-3个图层遮挡的例子，每个都会真实影响评分</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {examples.map((example) => {
                const { total } = calcDemoScore(example.mazeData.grid);
                return (
                  <div
                    key={example.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border border-gray-100"
                    onClick={() => setSelectedExample(example)}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-base text-gray-800">{example.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(example.difficulty)}`}>
                          {getDifficultyLabel(example.difficulty)}
                        </span>
                      </div>
                      {example.tag && (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mb-2">
                          {example.tag}
                        </span>
                      )}
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{example.description}</p>

                      <div className="grid gap-0.5 mb-3 p-2 bg-gray-50 rounded-lg" style={{ gridTemplateColumns: `repeat(${example.mazeData.grid[0]?.length}, minmax(0, 1fr))` }}>
                        {example.mazeData.grid.slice(0, 5).map((row, rowIndex) =>
                          row.map((cell, colIndex) => (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className={`w-5 h-5 flex items-center justify-center text-[10px] border border-gray-200 rounded-sm ${getCellStyle(cell)}`}
                            >
                              {getCellContent(cell)}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>📊</span>
                          评分: <strong className={total >= 60 ? 'text-green-600' : 'text-red-600'}>{total}分</strong>
                        </span>
                        <span className="text-primary-600 font-medium">查看详情 →</span>
                      </div>
                      {example.source && (
                        <p className="text-xs text-gray-400 mt-1">来源: {example.source}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedExample(null);
                    setCurrentStep(0);
                    setSimulatedScore(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                >
                  ← 返回列表
                </button>
                <div className="flex items-center gap-2">
                  {selectedExample.tag && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{selectedExample.tag}</span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedExample.difficulty)}`}>
                    {getDifficultyLabel(selectedExample.difficulty)}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedExample.title}</h2>
              <p className="text-gray-600 text-sm mb-1">{selectedExample.description}</p>
              {selectedExample.source && (
                <p className="text-xs text-gray-400 mb-4">📋 {selectedExample.source}</p>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700 text-sm">🗺️ 迷宫预览</h4>
                  <div className="text-sm">
                    <span className="text-gray-500">当前分数: </span>
                    <strong className={`text-lg ${(simulatedScore ?? calcDemoScore(selectedExample.mazeData.grid).total) >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                      {simulatedScore ?? calcDemoScore(selectedExample.mazeData.grid).total}
                    </strong>
                    <span className="text-gray-500"> 分</span>
                  </div>
                </div>
                <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${selectedExample.mazeData.grid[0]?.length}, minmax(0, 1fr))`, maxWidth: '360px' }}>
                  {selectedExample.mazeData.grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-base border border-gray-300 rounded transition-all duration-300 ${getCellStyle(cell, highlightCell?.row === rowIndex && highlightCell?.col === colIndex)} ${cell.anomalyTag === 'missing' ? 'animate-pulse' : ''}`}
                      >
                        {getCellContent(cell)}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded"><span>🧱</span>墙壁</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded"><span>✅</span>路径</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded"><span>🚶</span>起点</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded"><span>🏁</span>终点</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded"><span>⭐</span>道具</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded"><span>⚠️</span>障碍</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded"><span>◻️</span>红边虚线=漏填</span>
                </div>
              </div>

              <button
                onClick={() => handleLoadExample(selectedExample)}
                className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>加载到编辑器（可以亲自修改试试）</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">🎬 演示流程</h3>
              <p className="text-xs text-gray-500 mb-4">点击每一步看效果，分数会变化，漏填的格子会闪动</p>

              <div className="space-y-3 mb-5">
                {selectedExample.demoSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                      currentStep === index
                        ? 'bg-primary-50 border-primary-400 shadow-md'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    }`}
                    onClick={() => handleDemoStep(index)}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 ${
                        currentStep >= index ? 'bg-primary-500' : 'bg-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs border ${getActionColor(step.action)}`}>
                            {getActionIcon(step.action)} {getActionLabel(step.action)}
                          </span>
                          {step.scoreChange && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              step.scoreChange.after > step.scoreChange.before
                                ? 'bg-green-100 text-green-700'
                                : step.scoreChange.after < step.scoreChange.before
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {step.scoreChange.before}分 → {step.scoreChange.after}分
                              {step.scoreChange.after > step.scoreChange.before && ` (↑${step.scoreChange.after - step.scoreChange.before})`}
                              {step.scoreChange.after < step.scoreChange.before && ` (↓${step.scoreChange.before - step.scoreChange.after})`}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{step.description}</p>
                        <p className="text-xs text-gray-500 mt-1">👉 {step.expectedResult}</p>
                        {step.hint && currentStep === index && (
                          <p className="text-xs text-primary-600 mt-2 p-2 bg-primary-50 rounded border border-primary-100">
                            💡 {step.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-medium text-yellow-700 mb-2 text-sm">🎯 这个样例包含的真实问题</h4>
                <ul className="text-xs text-yellow-600 space-y-1">
                  <li>• 旧表数据混进来（从上学期模板抄的格子）</li>
                  <li>• 老师补录的备注和学生原始数据混在一起</li>
                  <li>• 漏填单位（画了格子但没选类型）</li>
                  <li>• 图层遮挡问题（上层素材挡住下面的路径/道具）</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white shadow-inner mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="text-gray-500 text-sm">🎮 儿童编程迷宫编辑器 - 让编程学习更有趣！</p>
          <p className="text-xs text-gray-400 mt-1">每个样例都是日常教学中会真实遇到的情况</p>
        </div>
      </footer>
    </div>
  );
}
