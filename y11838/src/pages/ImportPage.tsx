import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertTriangle, CheckCircle, FileText, Database, Users, Play, Trash2, Info } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import {
  completeIndustryCards,
  incompleteIndustryCards,
} from '@/data/sampleIndustryCards';
import {
  completePositions,
  incompletePositions,
} from '@/data/samplePositions';
import {
  completeNewsEvents,
  incompleteNewsEvents,
} from '@/data/sampleNewsEvents';
import type { ImportData, ValidationError, ValidationWarning } from '@/types';
import { cn } from '@/utils/cn';

export default function ImportPage() {
  const navigate = useNavigate();
  const { importData, validationResult, startGame, resetGame } = useGameStore();
  const [inputData, setInputData] = useState('');
  const [initialCash, setInitialCash] = useState(100000);
  const [totalRounds, setTotalRounds] = useState(6);
  const [feeRate, setFeeRate] = useState(0.003);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'complete' | 'incomplete' | 'custom'>('complete');

  const handleImport = useCallback(
    (data: ImportData) => {
      resetGame();
      importData(data);
    },
    [importData, resetGame]
  );

  const loadCompleteSample = () => {
    setActiveTab('complete');
    handleImport({
      industryCards: completeIndustryCards,
      positions: completePositions,
      newsEvents: completeNewsEvents,
    });
    setInputData(
      JSON.stringify(
        {
          industryCards: completeIndustryCards,
          positions: completePositions,
          newsEvents: completeNewsEvents,
        },
        null,
        2
      )
    );
  };

  const loadIncompleteSample = () => {
    setActiveTab('incomplete');
    handleImport({
      industryCards: incompleteIndustryCards,
      positions: incompletePositions,
      newsEvents: incompleteNewsEvents,
    });
    setInputData(
      JSON.stringify(
        {
          industryCards: incompleteIndustryCards,
          positions: incompletePositions,
          newsEvents: incompleteNewsEvents,
        },
        null,
        2
      )
    );
  };

  const handleCustomInput = () => {
    setActiveTab('custom');
    try {
      const data = JSON.parse(inputData) as ImportData;
      handleImport(data);
    } catch (e) {
      alert('JSON 格式错误，请检查输入');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string) as ImportData;
            setInputData(event.target?.result as string);
            handleImport(data);
            setActiveTab('custom');
          } catch {
            alert('文件格式错误，请上传有效的 JSON 文件');
          }
        };
        reader.readAsText(file);
      } else {
        alert('请上传 JSON 格式文件');
      }
    },
    [handleImport]
  );

  const handleStartGame = () => {
    if (!validationResult?.valid) {
      alert('请先修正数据错误后再开始游戏');
      return;
    }
    startGame(initialCash, totalRounds, feeRate);
    navigate('/game');
  };

  const getErrorIcon = (error: ValidationError) => {
    switch (error.entity) {
      case '行业卡':
        return <Database className="w-4 h-4" />;
      case '基金仓位':
        return <FileText className="w-4 h-4" />;
      case '新闻事件':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-grid py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-primary-600 mb-4 font-display">
            基金经理调仓局
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            在行业新闻和风险预算间做出选择，体验真实的基金调仓决策过程。
            你的每一个选择都会改变投资组合的命运。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="card p-6 animate-slide-up">
              <h2 className="text-xl font-bold text-primary-600 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                数据导入
              </h2>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={loadCompleteSample}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-medium transition-all text-sm',
                    activeTab === 'complete'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  完整样例
                </button>
                <button
                  onClick={loadIncompleteSample}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-medium transition-all text-sm',
                    activeTab === 'incomplete'
                      ? 'bg-accent-warning text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  缺字段样例
                </button>
                <button
                  onClick={() => {
                    setActiveTab('custom');
                    setInputData('');
                    resetGame();
                  }}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-medium transition-all text-sm',
                    activeTab === 'custom'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  自定义导入
                </button>
              </div>

              {activeTab === 'custom' && (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer mb-4',
                    isDragging
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">拖拽 JSON 文件到此处</p>
                  <p className="text-gray-400 text-sm">或点击选择文件</p>
                  <input
                    id="fileInput"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target?.result as string) as ImportData;
                            setInputData(event.target?.result as string);
                            handleImport(data);
                          } catch {
                            alert('文件格式错误');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    或粘贴 JSON 数据
                  </label>
                  <textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder={`{\n  "industryCards": [...],\n  "positions": [...],\n  "newsEvents": [...]\n}`}
                    className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-primary-400 focus:border-transparent scrollbar-thin"
                  />
                  <button
                    onClick={handleCustomInput}
                    className="mt-2 w-full btn-secondary"
                  >
                    解析数据
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    初始资金
                  </label>
                  <input
                    type="number"
                    value={initialCash}
                    onChange={(e) => setInitialCash(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    游戏回合
                  </label>
                  <input
                    type="number"
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    min="1"
                    max="12"
                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    手续费率
                  </label>
                  <input
                    type="number"
                    value={feeRate}
                    onChange={(e) => setFeeRate(Number(e.target.value))}
                    step="0.001"
                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              disabled={!validationResult?.valid}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
                validationResult?.valid
                  ? 'btn-primary shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Play className="w-5 h-5" />
              开始游戏
            </button>
          </div>

          <div className="space-y-6">
            <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-xl font-bold text-primary-600 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                数据校验结果
              </h2>

              {!validationResult ? (
                <div className="text-center py-12 text-gray-400">
                  <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>请先导入数据查看校验结果</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                  <div
                    className={cn(
                      'p-4 rounded-lg flex items-center gap-3',
                      validationResult.valid
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    )}
                  >
                    {validationResult.valid ? (
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={cn(
                          'font-medium',
                          validationResult.valid ? 'text-green-800' : 'text-red-800'
                        )}
                      >
                        {validationResult.valid
                          ? '数据校验通过'
                          : `发现 ${validationResult.errors.length} 个错误`}
                      </p>
                      {validationResult.warnings.length > 0 && (
                        <p className="text-sm text-amber-600">
                          另有 {validationResult.warnings.length} 个警告建议优化
                        </p>
                      )}
                    </div>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        必须修复的错误
                      </h3>
                      {validationResult.errors.map((error, idx) => (
                        <div
                          key={`err-${idx}`}
                          className="p-4 bg-red-50 border border-red-100 rounded-lg animate-slide-up"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-red-500 mt-0.5">
                              {getErrorIcon(error)}
                            </span>
                            <div className="flex-1">
                              <p className="text-red-800 text-sm font-medium">
                                {error.message}
                              </p>
                              <p className="text-red-600 text-sm mt-1">
                                💡 {error.fixSuggestion}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Users className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  负责人：{error.responsiblePerson}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-amber-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        建议优化的警告
                      </h3>
                      {validationResult.warnings.map((warn, idx) => (
                        <div
                          key={`warn-${idx}`}
                          className="p-4 bg-amber-50 border border-amber-100 rounded-lg animate-slide-up"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-amber-800 text-sm">
                                {warn.message}
                              </p>
                              <p className="text-amber-600 text-sm mt-1">
                                💡 {warn.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="font-bold text-primary-600 mb-3">数据字段说明</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">行业卡：</span>
                  name, riskLevel, sector, manager, contact 为必填
                </p>
                <p>
                  <span className="font-medium">基金仓位：</span>
                  industryCardId, weight, currentValue, shares 为必填
                </p>
                <p>
                  <span className="font-medium">新闻事件：</span>
                  industryCardId, title, content, impactType, round 为必填
                </p>
              </div>
              <button
                onClick={() => {
                  setInputData('');
                  resetGame();
                  setActiveTab('custom');
                }}
                className="mt-4 w-full btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                清空数据
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
