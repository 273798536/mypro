import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Upload,
  AlertTriangle,
  FileDown,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Info,
  Zap,
  Shield,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserGuide() {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      icon: Play,
      title: '启动系统',
      description: '打开应用，系统自动加载已有数据',
      color: 'blue',
      content: (
        <div className="space-y-3">
          <p className="text-gray-600">
            系统启动后会自动从本地数据库（IndexedDB）加载已有的设备、图像和异常记录。
            首次使用时系统会自动生成演示数据供您熟悉操作。
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">💡 小提示</p>
            <p className="text-sm text-blue-700">
              所有数据保存在浏览器本地，不会上传到服务器。清除浏览器数据会丢失本地记录。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">离线可用</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">自动初始化</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">演示数据</span>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      icon: Upload,
      title: '导入图像',
      description: '选择设备和批次，拖拽或选择图像文件',
      color: 'purple',
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">操作步骤：</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>先选择<strong>关联设备</strong>（必填）</li>
              <li>确认或修改<strong>批次号</strong>（方便后续检索）</li>
              <li>拖拽图像到虚线区域，或点击选择文件</li>
              <li>在预览列表中检查：坐标、批次、设备是否正确</li>
              <li>点击「导入」按钮完成导入</li>
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium mb-2">⚠️ 防重复说明</p>
            <p className="text-sm text-amber-700">
              系统通过「图像内容哈希 + 坐标」联合识别重复。同一批底图坐标第二次导入时，
              会标记为「已存在」并自动跳过，不会产生重复结论。
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <p className="text-sm text-purple-800 font-medium mb-2">📍 坐标自动识别</p>
            <p className="text-sm text-purple-700">
              文件名中包含坐标信息会自动识别，如：<code className="bg-purple-100 px-1 rounded">image_123.45_678.90.jpg</code>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      icon: AlertTriangle,
      title: '查看异常',
      description: '缩放平移图像，标注和检查异常',
      color: 'amber',
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">操作方式：</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">🖱️ 鼠标滚轮</p>
                <p className="text-sm text-gray-600">缩放图像</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">🖐️ 拖拽</p>
                <p className="text-sm text-gray-600">平移图像</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">🔍 浏览模式</p>
                <p className="text-sm text-gray-600">查看已有标注</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">✏️ 标注模式</p>
                <p className="text-sm text-gray-600">点击图像添加新异常</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">🔗 数据一致性保证</p>
            <p className="text-sm text-blue-700">
              缩放平移和异常标注共用同一批处理记录。所有操作都会实时保存到处理记录中，
              确保界面显示和报告导出的数据完全一致。
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium mb-2">📝 标注信息</p>
            <p className="text-sm text-green-700">
              每条异常标注包含：位置坐标、严重程度、标记颜色、技术原因和通俗描述。
              通俗描述会自动从技术原因转换，也可以手动修改。
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      icon: FileDown,
      title: '导出结果',
      description: '筛选条件，导出Excel或HTML报告',
      color: 'green',
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">筛选条件：</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">📅 时间范围</p>
                <p className="text-sm text-gray-600">按异常发生时间筛选</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">🔬 关联设备</p>
                <p className="text-sm text-gray-600">按设备筛选</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm mb-1">⚠️ 严重程度</p>
                <p className="text-sm text-gray-600">按严重程度筛选</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">导出格式：</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileDown className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-gray-900">Excel (.xlsx)</p>
                </div>
                <p className="text-sm text-gray-600">
                  适合后续数据处理和分析，包含完整字段。
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileDown className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-gray-900">HTML (.html)</p>
                </div>
                <p className="text-sm text-gray-600">
                  适合打印和分享，样式美观，可直接用浏览器打开。
                </p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium mb-2">
              📢 面向非技术人员的友好设计
            </p>
            <p className="text-sm text-amber-700">
              导出文件中所有技术字段名和缩写都会自动转换为通俗语言。
              例如：<code className="bg-amber-100 px-1 rounded">COLOR_CHANNEL_OUTLIER_R</code>
              会显示为「红色通道数值超出正常范围」。
            </p>
          </div>
        </div>
      ),
    },
  ];

  const features = [
    {
      icon: Shield,
      title: '全链路追溯',
      description:
        '评审老师顺着任何一条异常，都能反向查到对应的设备清单、底图、处理记录和处理意见。',
    },
    {
      icon: Zap,
      title: '单一数据源',
      description:
        '图表、明细、下载结果来自同一批数据。缩放平移和异常标注共用同一批处理记录。',
    },
    {
      icon: CheckCircle,
      title: '导入幂等',
      description:
        '同一批底图坐标第二次导入时，自动识别并跳过，不会产生两份互相冲突的结论。',
    },
    {
      icon: Search,
      title: '验收路径',
      description:
        '异常 → 处理记录 → 底图 → 设备 → 处理意见 → 复核结论，链路完整可追溯。',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    amber: 'text-amber-600 bg-amber-100',
    green: 'text-green-600 bg-green-100',
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">使用指南</h1>
          <p className="text-sm text-gray-500">
            仅讲解核心操作：启动、导入、查看异常、导出结果
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-8 h-8" />
          <h2 className="text-2xl font-bold font-serif">设计理念</h2>
        </div>
        <p className="text-blue-100 text-lg leading-relaxed">
          传统工作方式依赖「表格颜色 + 口头约定」，结论无法追溯。
          <br />
          本系统以「设备清单」为主线，确保每一条结论都有完整的依据链。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20"
            >
              <feature.icon className="w-6 h-6 mb-2" />
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-blue-100">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 font-serif flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          四步核心流程
        </h2>

        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedStep(expandedStep === step.id ? null : step.id)
              }
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    colorMap[step.color]
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 font-serif">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
              {expandedStep === step.id ? (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {expandedStep === step.id && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                {step.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 font-serif mb-4">
          快速跳转
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/import')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <Upload className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">导入图像</span>
          </button>
          <button
            onClick={() => navigate('/equipment')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <Search className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">查看设备</span>
          </button>
          <button
            onClick={() => navigate('/charts')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <span className="text-sm font-medium text-gray-700">查看异常</span>
          </button>
          <button
            onClick={() => navigate('/export')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <FileDown className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-gray-700">导出报告</span>
          </button>
        </div>
      </div>
    </div>
  );
}
