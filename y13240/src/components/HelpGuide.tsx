import { useState } from 'react';
import { HelpCircle, X, FileText, RotateCcw, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/store';

export default function HelpGuide() {
  const [isExpanded, setIsExpanded] = useState(false);
  const resetToMockData = useStore((state) => state.resetToMockData);

  const handleRerunExample = () => {
    if (window.confirm('确定要重置为示例数据吗？当前数据将被覆盖。')) {
      resetToMockData();
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-purple-50 rounded-xl border border-primary/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800">操作说明</h3>
            <p className="text-xs text-gray-500">三件事：放样例、重跑、查看截图说明</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium text-gray-800">1. 放样例</span>
              </div>
              <p className="text-sm text-gray-600">
                页面已预置3条示例数据，涵盖不同状态。查看摊位卡片了解各字段含义。
              </p>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>• A01：待复核，2个版本</p>
                <p>• B03：有批注，授权即将到期</p>
                <p>• C02：已撤回，授权过期</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="font-medium text-gray-800">2. 重跑</span>
              </div>
              <p className="text-sm text-gray-600">
                点击下方按钮可随时重置为示例数据，便于测试各种操作流程。
              </p>
              <button
                onClick={handleRerunExample}
                className="mt-3 w-full btn-secondary text-sm py-1.5"
              >
                重置为示例数据
              </button>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Image className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium text-gray-800">3. 查看截图说明</span>
              </div>
              <p className="text-sm text-gray-600">
                点击任意记录卡片打开详情面板，在「截图说明」标签页可上传和查看凭证。
              </p>
              <div className="mt-3 text-xs text-gray-500">
                <p>💡 小贴士：每张截图可添加文字说明，便于追溯审核依据。</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">材料入口与异常出口</h4>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-primary mb-2">✅ 正常流程（材料入口）</p>
                <ol className="space-y-1 text-gray-600">
                  <li>1. 拖拽或点击选择音频文件导入</li>
                  <li>2. 确认导入信息（新增/追加版本）</li>
                  <li>3. 点击记录卡片查看详情</li>
                  <li>4. 填写复核意见 → 确认通过</li>
                  <li>5. 筛选后导出交付清单</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-red-600 mb-2">⚠️ 异常处理（异常出口）</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• 授权过期：红色闪烁边框 + 导出警告</li>
                  <li>• 即将到期：橙红渐变边框提醒</li>
                  <li>• 撤回确认：需填写原因，原记录保留</li>
                  <li>• 批注覆盖：标记为"有批注"状态</li>
                  <li>• 数据不匹配：导入时显示差异对比</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
