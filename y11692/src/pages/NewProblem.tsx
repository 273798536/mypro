import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calculator, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useProblemStore } from '@/store/problemStore';
import { ProblemStatus, PointType } from '@/types';
import { validateExpression, getExpressionError, getDerivativeExpression, getSecondDerivativeExpression, parseExpression } from '@/utils/math/expressionParser';
import { findCriticalPoints, findInflectionPoints } from '@/utils/math/criticalPoints';
import { analyzeSignIntervals } from '@/utils/math/signAnalysis';
import { FunctionChart } from '@/components/chart/FunctionChart';

const NewProblem: React.FC = () => {
  const navigate = useNavigate();
  const { addProblem } = useProblemStore();
  
  const [title, setTitle] = useState('');
  const [expression, setExpression] = useState('');
  const [source, setSource] = useState('');
  const [domainStart, setDomainStart] = useState('-5');
  const [domainEnd, setDomainEnd] = useState('5');
  const [nonDiffPoints, setNonDiffPoints] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expressionError, setExpressionError] = useState<string | null>(null);
  const [calculatedData, setCalculatedData] = useState<{
    derivative: string;
    secondDerivative: string;
    criticalPoints: any[];
    signIntervals: any[];
    inflectionPoints: any[];
  } | null>(null);

  const domain = [{
    start: parseFloat(domainStart) || -5,
    end: parseFloat(domainEnd) || 5,
    startInclusive: true,
    endInclusive: true
  }];

  useEffect(() => {
    if (expression) {
      const valid = validateExpression(expression);
      setExpressionError(valid ? null : getExpressionError(expression));
    } else {
      setExpressionError(null);
    }
  }, [expression]);

  const handleCalculate = () => {
    if (!expression || expressionError) return;
    
    setIsCalculating(true);
    
    setTimeout(() => {
      try {
        const derivative = getDerivativeExpression(expression);
        const secondDerivative = getSecondDerivativeExpression(expression);
        
        const nonDifferentiablePoints = nonDiffPoints
          .split(',')
          .map(s => parseFloat(s.trim()))
          .filter(n => !isNaN(n));
        
        const criticalPoints = findCriticalPoints(expression, domain, nonDifferentiablePoints);
        const inflectionPoints = findInflectionPoints(expression, domain);
        const signIntervals = analyzeSignIntervals(
          expression,
          domain,
          criticalPoints.map(p => p.x),
          1
        );

        setCalculatedData({
          derivative,
          secondDerivative,
          criticalPoints,
          signIntervals,
          inflectionPoints
        });
      } catch (error) {
        console.error('计算失败:', error);
      } finally {
        setIsCalculating(false);
      }
    }, 300);
  };

  const handleSave = () => {
    if (!title || !expression) return;

    const nonDifferentiablePoints = nonDiffPoints
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));

    addProblem({
      title,
      expression,
      derivative: calculatedData?.derivative,
      secondDerivative: calculatedData?.secondDerivative,
      domain,
      nonDifferentiablePoints,
      criticalPoints: calculatedData?.criticalPoints || [],
      signIntervals: calculatedData?.signIntervals || [],
      inflectionPoints: calculatedData?.inflectionPoints || [],
      studentAnswers: [],
      errors: [],
      status: ProblemStatus.UNPROCESSED,
      correctionHistory: [],
      screenshotUrls: [],
      source
    });

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">录入新题目</h1>
            </div>
            <button
              onClick={handleSave}
              disabled={!title || !expression}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              保存题目
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    题目标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：三次函数极值分析"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    来源
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="例如：教材第五章习题、月考试卷"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">函数表达式</h2>
                <button
                  onClick={handleCalculate}
                  disabled={!expression || !!expressionError || isCalculating}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCalculating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4" />
                  )}
                  自动计算
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    原函数 f(x) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    placeholder="例如：x^3 - 3*x + 2, sin(x) + cos(x)"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                      expressionError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {expressionError && (
                    <p className="mt-1 text-sm text-red-600">{expressionError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    支持的运算符：+ - * / ^，函数：sin cos tan abs sqrt log exp，常量：pi e
                  </p>
                </div>

                {calculatedData && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        一阶导数 f'(x)
                      </label>
                      <input
                        type="text"
                        value={calculatedData.derivative}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-blue-50 text-blue-800 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        二阶导数 f''(x)
                      </label>
                      <input
                        type="text"
                        value={calculatedData.secondDerivative}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-indigo-50 text-indigo-800 font-mono text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">定义域与特殊点</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      起始值
                    </label>
                    <input
                      type="number"
                      value={domainStart}
                      onChange={(e) => setDomainStart(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      结束值
                    </label>
                    <input
                      type="number"
                      value={domainEnd}
                      onChange={(e) => setDomainEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    不可导点（用逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={nonDiffPoints}
                    onChange={(e) => setNonDiffPoints(e.target.value)}
                    placeholder="例如：-2, 2"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    提示：绝对值函数、分段函数等可能存在不可导点
                  </p>
                </div>
              </div>
            </div>

            {calculatedData && calculatedData.criticalPoints.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  计算结果 ({calculatedData.criticalPoints.length} 个关键点)
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {calculatedData.criticalPoints.map((point, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs mr-2 ${
                          point.type === PointType.MAXIMUM ? 'bg-red-100 text-red-700' :
                          point.type === PointType.MINIMUM ? 'bg-teal-100 text-teal-700' :
                          point.type === PointType.INFLECTION ? 'bg-amber-100 text-amber-700' :
                          point.type === PointType.NON_DIFFERENTIABLE ? 'bg-violet-100 text-violet-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {point.type === PointType.MAXIMUM ? '极大值点' :
                           point.type === PointType.MINIMUM ? '极小值点' :
                           point.type === PointType.INFLECTION ? '拐点' :
                           point.type === PointType.NON_DIFFERENTIABLE ? '不可导点' : '临界点'}
                        </span>
                        <span className="text-sm text-gray-600 font-mono">
                          x = {point.x.toFixed(4)}, y = {point.y.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-20">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">预览</h2>
              {expression && !expressionError ? (
                <FunctionChart
                  expression={expression}
                  domain={domain}
                  criticalPoints={calculatedData?.criticalPoints || []}
                  signIntervals={calculatedData?.signIntervals || []}
                  inflectionPoints={calculatedData?.inflectionPoints || []}
                  width={500}
                  height={400}
                  showSignRegions={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-80 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Calculator className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-center">
                    输入函数表达式后<br />点击"自动计算"预览曲线
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">💡 提示</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 确保定义域包含所有临界点</li>
                  <li>• 注意不可导点也可能是极值点</li>
                  <li>• 极值点看一阶导数变号，拐点看二阶导数变号</li>
                  <li>• 保存后可以在详情页继续编辑和标注错误</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewProblem;
