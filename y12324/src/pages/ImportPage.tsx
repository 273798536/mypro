import React, { useState } from 'react';
import { FileText, Database, Zap, Eye, EyeOff } from 'lucide-react';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';
import { mockDataSets } from '../data/mockData';
import { initializeCandidates } from '../types';
import { parseBoardFromString } from '../engine/sudokuCore';

export const ImportPage: React.FC = () => {
  const {
    puzzle,
    setCellValue,
    selectedCell,
    showCandidates,
    toggleCandidates,
    showHeatmap,
    toggleHeatmap,
    setSourceMaterial,
    sourceMaterial,
    loadMockData,
    loadEmptyPuzzle,
    runAnalysis,
    resetPuzzle,
  } = usePuzzleStore();

  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'number' | 'candidate'>('number');

  const handleNumberInput = (num: number) => {
    if (selectedCell) {
      setCellValue(selectedCell.row, selectedCell.col, num);
    }
  };

  const handleClearCell = () => {
    if (selectedCell) {
      setCellValue(selectedCell.row, selectedCell.col, null);
    }
  };

  const handleImportText = () => {
    if (inputText.trim()) {
      const board = parseBoardFromString(inputText);
      const candidates = initializeCandidates(board);
      loadEmptyPuzzle();
      setTimeout(() => {
        usePuzzleStore.setState((state) => ({
          puzzle: {
            ...state.puzzle,
            board,
            initialBoard: board.map((row) => [...row]),
            candidates,
          },
        }));
      }, 0);
    }
  };

  const difficultyLabels: Record<string, string> = {
    easy: '入门级',
    medium: '中级',
    hard: '高级',
    expert: '专家级',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
          数据导入与关联
        </h1>
        <p className="text-gray-600">
          上传题盘数据，录入候选数，系统将自动关联并进行智能分析
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText size={18} />
                <span>题盘数据</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleCandidates}
                  className="flex items-center space-x-1 px-2 py-1 text-sm rounded hover:bg-gray-100"
                >
                  {showCandidates ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>候选数</span>
                </button>
                <button
                  onClick={toggleHeatmap}
                  className={`flex items-center space-x-1 px-2 py-1 text-sm rounded ${
                    showHeatmap ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Zap size={14} />
                  <span>热力图</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <SudokuGrid />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数字输入
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleNumberInput(num)}
                        className="w-12 h-12 rounded-lg border-2 border-gray-200 hover:border-sudoku-secondary hover:bg-blue-50 font-mono-num text-xl font-semibold text-sudoku-primary transition-all"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleClearCell}
                    className="mt-2 w-full max-w-xs py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    清除选中格
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选中格子
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    {selectedCell
                      ? `第 ${selectedCell.row + 1} 行，第 ${selectedCell.col + 1} 列`
                      : '点击格子选择'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={resetPuzzle}
                    className="btn-secondary flex-1"
                  >
                    重置
                  </button>
                  <button
                    onClick={runAnalysis}
                    className="btn-primary flex-1"
                  >
                    开始分析
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header flex items-center space-x-2">
              <Database size={18} />
              <span>示例数据</span>
            </div>
            <div className="space-y-2">
              {mockDataSets.map((dataset) => (
                <button
                  key={dataset.id}
                  onClick={() => loadMockData(dataset.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sudoku-secondary hover:bg-blue-50 transition-all group"
                >
                  <div className="font-medium text-sudoku-primary group-hover:text-sudoku-secondary">
                    {dataset.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dataset.description}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                      {difficultyLabels[dataset.difficulty]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {dataset.steps.length} 步
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">材料来源关联</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前题目
                </label>
                <div className="text-sm text-gray-900 font-medium">
                  {puzzle.name}
                </div>
                <div className="text-xs text-gray-500">
                  {difficultyLabels[puzzle.difficulty]}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  材料来源
                </label>
                <input
                  type="text"
                  value={sourceMaterial}
                  onChange={(e) => setSourceMaterial(e.target.value)}
                  placeholder="例如：练习册第5页第3题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sudoku-secondary/30 focus:border-sudoku-secondary"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">文本导入</div>
            <div className="space-y-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="输入81字符的数独字符串，例如：53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono h-24 resize-none focus:outline-none focus:ring-2 focus:ring-sudoku-secondary/30 focus:border-sudoku-secondary"
              />
              <button
                onClick={handleImportText}
                className="w-full btn-secondary text-sm"
              >
                导入题盘
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
