import React from 'react';
import { useAppStore } from '../../store/appStore';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const FormulaPanel: React.FC = () => {
  const showFormulaPanel = useAppStore((state) => state.showFormulaPanel);
  const [expandedSection, setExpandedSection] = React.useState<string | null>('definition');

  if (!showFormulaPanel) return null;

  const sections = [
    {
      id: 'definition',
      title: '曲线积分定义',
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <BlockMath math="\int_C \vec{F} \cdot d\vec{r} = \int_a^b \vec{F}(\vec{r}(t)) \cdot \vec{r}'(t) \, dt" />
          </div>
          <p className="text-sm text-gray-600">
            曲线积分（也叫线积分）是积分在曲线上的推广。它计算的是向量场沿曲线方向的累积效应。
          </p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><span className="font-mono text-blue-600">C</span> - 积分路径（曲线）</li>
            <li><span className="font-mono text-blue-600">F</span> - 向量场函数</li>
            <li><span className="font-mono text-blue-600">r(t)</span> - 曲线的参数化表示</li>
            <li><span className="font-mono text-blue-600">·</span> - 点积运算</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'conservative',
      title: '保守场与路径无关性',
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <BlockMath math="\oint_C \vec{F} \cdot d\vec{r} = 0 \quad \text{(保守场)}" />
          </div>
          <p className="text-sm text-gray-600">
            保守场是指沿任意闭合路径的曲线积分等于零的向量场。在保守场中，积分结果只与起点和终点有关，与路径无关。
          </p>
          <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
            <strong>判断条件：</strong>二维向量场 F = (P, Q) 是保守场当且仅当
            <div className="text-center mt-2">
              <BlockMath math="\frac{\partial P}{\partial y} = \frac{\partial Q}{\partial x}" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'green',
      title: '格林公式',
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <BlockMath math="\oint_C P \, dx + Q \, dy = \iint_D \left( \frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} \right) dA" />
          </div>
          <p className="text-sm text-gray-600">
            格林公式将平面区域 D 上的二重积分与沿区域边界 C 的曲线积分联系起来。
          </p>
          <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
            <strong>注意：</strong>路径 C 必须是正向（逆时针）的简单闭合曲线，且 P、Q 在 D 内具有连续偏导数。
          </div>
        </div>
      ),
    },
    {
      id: 'numerical',
      title: '数值积分方法',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-800 mb-1">梯形法（二阶收敛）</h4>
              <div className="text-center">
                <BlockMath math="\int_a^b f(x) dx \approx \frac{h}{2} \left[ f(x_0) + 2f(x_1) + \cdots + 2f(x_{n-1}) + f(x_n) \right]" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-1">辛普森法（四阶收敛）</h4>
              <div className="text-center">
                <BlockMath math="\int_a^b f(x) dx \approx \frac{h}{3} \left[ f(x_0) + 4f(x_1) + 2f(x_2) + 4f(x_3) + \cdots + f(x_n) \right]" />
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <strong>收敛阶：</strong>辛普森法收敛更快（O(h⁴) vs O(h²)），但要求等间距且采样点数为奇数。
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-96 bg-white border-r border-gray-200 shadow-xl z-40 overflow-y-auto animate-slide-in">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
        <h2 className="text-lg font-bold text-gray-800">📐 数学公式参考</h2>
        <button
          onClick={() => useAppStore.setState({ showFormulaPanel: false })}
          className="p-1.5 rounded hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedSection(
                  expandedSection === section.id ? null : section.id
                )
              }
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <span className="font-medium text-gray-800 text-sm">
                {section.title}
              </span>
              {expandedSection === section.id ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSection === section.id && (
              <div className="p-4 bg-white">{section.content}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormulaPanel;
