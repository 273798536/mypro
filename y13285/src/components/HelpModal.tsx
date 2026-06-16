import { X, Database, Play, AlertTriangle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="bg-primary-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">操作说明</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">1. 放样例</h3>
              <p className="text-sm text-gray-600">
                点击顶部「放样例」按钮，系统会自动载入贴近现场的测试数据，包含正常记录、旧方案覆盖新意见、同街口双投诉等场景，用于试跑验证。
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center">
              <Play size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">2. 重跑</h3>
              <p className="text-sm text-gray-600">
                导入新数据或修改后，点击「重跑」按钮重新执行归并逻辑。系统会重置所有状态，重新检测异常并生成处理记录。
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">3. 查看异常队列</h3>
              <p className="text-sm text-gray-600">
                切换到「异常队列」标签页，查看待确认的异常情况。每条异常都有详细的原因和影响范围说明，人工确认后点击「确认归并」或「跳过」。系统不会自动处理异常。
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong className="text-gray-800">提示：</strong>所有数据保存在浏览器本地，刷新页面不会丢失。可以在三个标签页间切换，分别展示给领导或同事看审批台账、处理记录和异常队列。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
