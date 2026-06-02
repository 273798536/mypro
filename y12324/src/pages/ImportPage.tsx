import React, { useState } from 'react';
import { FileText, Database, Zap, Eye, EyeOff, Upload, Merge, Trash2, Plus, Grid, ListChecks, ScrollText, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';
import { mockDataSets } from '../data/mockData';
import { initializeCandidates, MaterialType, normalizeCandidates } from '../types';
import { parseBoardFromString } from '../engine/sudokuCore';

const materialTypeIcons: Record<MaterialType, React.ReactNode> = {
  board: <Grid size={14} />,
  candidates: <ListChecks size={14} />,
  steps: <ScrollText size={14} />,
  report: <FileSpreadsheet size={14} />,
};

const materialTypeNames: Record<MaterialType, string> = {
  board: '题盘',
  candidates: '候选数',
  steps: '步骤记录',
  report: '纠错报告',
};

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    puzzle,
    setCellValue,
    selectedCell,
    showCandidates,
    toggleCandidates,
    showHeatmap,
    toggleHeatmap,
    sourceMaterial,
    setSourceMaterial,
    loadMockData,
    loadEmptyPuzzle,
    runAnalysis,
    resetPuzzle,
    importMaterial,
    removeMaterial,
    importedMaterials,
    mergeMaterials,
    isMerging,
    createNewBatch,
    currentBatchId,
  } = usePuzzleStore();

  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'number' | 'candidate'>('number');
  const [importType, setImportType] = useState<MaterialType>('board');
  const [importName, setImportName] = useState('');
  const [importSource, setImportSource] = useState('');
  const [activeTab, setActiveTab] = useState<'input' | 'upload'>('input');

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
    if (!inputText.trim()) return;

    try {
      if (importType === 'board') {
        const board = parseBoardFromString(inputText);
        const candidates = initializeCandidates(board);
        importMaterial('board', importName || '导入题盘', importSource || '文本导入', {
          board,
          candidates,
          name: importName || '导入题盘',
          source: importSource || '文本导入',
        });
      } else if (importType === 'steps') {
        const steps = JSON.parse(inputText);
        if (Array.isArray(steps)) {
          importMaterial('steps', importName || '导入步骤', importSource || '文本导入', steps);
        }
      } else if (importType === 'candidates') {
        const raw = JSON.parse(inputText);
        const normalized = normalizeCandidates(raw);
        importMaterial('candidates', importName || '导入候选数', importSource || '文本导入', normalized);
      }
      setInputText('');
      setImportName('');
      setImportSource('');
    } catch (e) {
      alert('导入格式错误，请检查输入');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.board) {
          importMaterial('board', file.name.replace('.json', ''), file.name, data);
        } else if (importType === 'candidates') {
          const normalized = normalizeCandidates(data);
          importMaterial('candidates', file.name.replace('.json', ''), file.name, normalized);
        } else if (Array.isArray(data)) {
          importMaterial('steps', file.name.replace('.json', ''), file.name, data);
        } else {
          importMaterial(importType, file.name.replace('.json', ''), file.name, data);
        }
      } catch (err) {
        alert('文件解析失败，请确保是有效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadMockAndAnalyze = (datasetId: string) => {
    loadMockData(datasetId);
    setTimeout(() => {
      navigate('/analyze');
    }, 100);
  };

  const handleMergeAndAnalyze = () => {
    mergeMaterials();
    setTimeout(() => {
      navigate('/analyze');
    }, 1000);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
              数据导入与关联
            </h1>
            <p className="text-gray-600">
              上传题盘、候选数、步骤记录，系统将自动归并并关联到同一分析批次
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              批次: {currentBatchId.slice(0, 12)}...
            </span>
            <button
              onClick={createNewBatch}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus size={14} />
              <span>新批次</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText size={18} />
                <span>题盘预览</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleCandidates}
                  className={`flex items-center space-x-1 px-2 py-1 text-sm rounded transition-colors ${
                    showCandidates ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {showCandidates ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>候选数</span>
                </button>
                <button
                  onClick={toggleHeatmap}
                  className={`flex items-center space-x-1 px-2 py-1 text-sm rounded transition-colors ${
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
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setInputMode('number')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      inputMode === 'number'
                        ? 'bg-sudoku-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    填数模式
                  </button>
                  <button
                    onClick={() => setInputMode('candidate')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      inputMode === 'candidate'
                        ? 'bg-sudoku-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    候选数模式
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {inputMode === 'number' ? '数字输入' : '候选数输入'}
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
                    onClick={() => {
                      runAnalysis();
                      setTimeout(() => navigate('/analyze'), 600);
                    }}
                    className="btn-primary flex-1"
                  >
                    开始分析
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Upload size={18} />
                <span>材料导入</span>
              </span>
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    activeTab === 'input'
                      ? 'bg-white shadow text-sudoku-primary'
                      : 'text-gray-600'
                  }`}
                >
                  文本输入
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-white shadow text-sudoku-primary'
                      : 'text-gray-600'
                  }`}
                >
                  文件上传
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['board', 'candidates', 'steps', 'report'] as MaterialType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setImportType(type)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      importType === type
                        ? 'bg-sudoku-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {materialTypeIcons[type]}
                    <span>{materialTypeNames[type]}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    材料名称
                  </label>
                  <input
                    type="text"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    placeholder="例如：练习册第5页"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sudoku-secondary/30 focus:border-sudoku-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    来源标识
                  </label>
                  <input
                    type="text"
                    value={importSource}
                    onChange={(e) => setImportSource(e.target.value)}
                    placeholder="例如：学生A作业"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sudoku-secondary/30 focus:border-sudoku-secondary"
                  />
                </div>
              </div>

              {activeTab === 'input' ? (
                <>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      importType === 'board'
                        ? '输入81字符的数独字符串，例如：53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'
                        : importType === 'steps'
                        ? '粘贴步骤记录的 JSON 数组...'
                        : '粘贴候选数数据的 JSON...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono h-28 resize-none focus:outline-none focus:ring-2 focus:ring-sudoku-secondary/30 focus:border-sudoku-secondary"
                  />
                  <button
                    onClick={handleImportText}
                    className="w-full btn-secondary"
                  >
                    导入材料
                  </button>
                </>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-sudoku-secondary hover:bg-blue-50/50 transition-colors cursor-pointer">
                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      点击或拖拽文件到此处上传
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      支持 .json 格式
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
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
                  onClick={() => handleLoadMockAndAnalyze(dataset.id)}
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
                      {dataset.steps.length} 步 · {dataset.errors.length} 个问题
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Merge size={18} />
                <span>已导入材料</span>
              </span>
              <span className="text-xs text-gray-500">
                {importedMaterials.length} 份
              </span>
            </div>
            
            {importedMaterials.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无导入材料</p>
                <p className="text-xs mt-1">从左侧导入题盘、候选数或步骤</p>
              </div>
            ) : (
              <div className="space-y-2">
                {importedMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white rounded border text-gray-600">
                        {materialTypeIcons[material.type]}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {material.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {material.source}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMaterial(material.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={handleMergeAndAnalyze}
                  disabled={isMerging || importedMaterials.length === 0}
                  className="w-full btn-primary mt-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMerging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>归并中...</span>
                    </>
                  ) : (
                    <>
                      <Merge size={16} />
                      <span>归并材料并分析</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">关联信息</div>
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

          <div className="card bg-sudoku-light border-sudoku-secondary">
            <div className="font-serif-sc font-bold text-sudoku-primary mb-2">
              📋 使用流程
            </div>
            <ol className="text-xs text-sudoku-dark space-y-1.5 list-decimal list-inside">
              <li>选择示例数据或导入材料</li>
              <li>多份材料可点击"归并材料并分析"</li>
              <li>系统自动关联到同一批次</li>
              <li>在分析页可追溯各材料来源</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
