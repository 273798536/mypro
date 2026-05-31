import { X, MousePointer, Move, Layers, Camera, RefreshCw, Download } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">使用说明</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <MousePointer size={16} />
              基本操作
            </h3>
            <ul className="text-sm text-gray-300 space-y-2 ml-6">
              <li>• <strong>鼠标左键拖拽</strong>：旋转3D视角</li>
              <li>• <strong>鼠标滚轮</strong>：缩放场景</li>
              <li>• <strong>鼠标右键拖拽</strong>：平移场景</li>
              <li>• <strong>点击磁体</strong>：选中并查看详细信息</li>
              <li>• <strong>拖拽磁体</strong>：移动磁体位置，场线实时更新</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <Move size={16} />
              磁体位置准备
            </h3>
            <ul className="text-sm text-gray-300 space-y-2 ml-6">
              <li>• 点击左侧「+」按钮添加新磁体</li>
              <li>• 在3D场景中直接拖拽磁体到目标位置</li>
              <li>• 磁体位置坐标会实时显示在左侧列表</li>
              <li>• 可导出配置文件保存当前磁体布局</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <RefreshCw size={16} />
              磁极反向复现
            </h3>
            <ul className="text-sm text-gray-300 space-y-2 ml-6">
              <li>• 点击磁体卡片上的旋转图标即可反向磁极</li>
              <li>• 系统会自动检测磁极反向并发出警告</li>
              <li>• 反向的磁极会影响附近场线的走向和密度</li>
              <li>• 警告信息中会标注受影响的磁体和场线</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <Camera size={16} />
              截图导出
            </h3>
            <ul className="text-sm text-gray-300 space-y-2 ml-6">
              <li>• 调整到合适的视角和缩放比例</li>
              <li>• 点击顶部工具栏的相机图标</li>
              <li>• 截图会自动下载为PNG格式</li>
              <li>• 建议使用「导出配置」功能保存参数以便复现</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <Download size={16} />
              数据来源与版本
            </h3>
            <ul className="text-sm text-gray-300 space-y-2 ml-6">
              <li>• 每个磁体都包含来源和版本信息</li>
              <li>• 导出的JSON配置文件包含完整元数据</li>
              <li>• 可追踪磁体的创建时间和修改记录</li>
              <li>• 便于教学资料的版本管理和溯源</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
              <Layers size={16} />
              警告说明
            </h3>
            <ul className="text-sm text-gray-300 space-y-2 ml-6">
              <li>• <span className="text-orange-400">🔄 磁极反向</span>：相邻磁体磁极接近180°反向</li>
              <li>• <span className="text-orange-400">📊 采样过密</span>：采样点密度过高可能影响性能</li>
              <li>• <span className="text-orange-400">⚠️ 场强异常</span>：局部场强远高于平均值</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
