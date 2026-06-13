import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Upload,
  Calculator,
  AlertTriangle,
  History,
  FileText,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  AlertCircle,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useNavigate } from 'react-router-dom';

type SectionType = 'intro' | 'import' | 'calculator' | 'annotation' | 'exception' | 'history' | 'export';

export default function Guide() {
  const [expandedSection, setExpandedSection] = useState<SectionType | null>('intro');
  const navigate = useNavigate();

  const sections = [
    {
      id: 'intro' as SectionType,
      title: '系统介绍',
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
      content: (
        <div className="space-y-4">
          <p>
            <strong>"风洞烟线实验复算"</strong> 系统是为航空航天实验数据复算、校验和报告生成设计的专业工具。
            系统支持 Excel/CSV 数据导入，提供完整的风洞实验计算公式，确保实验结果的准确性和可追溯性。
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              核心特性
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 统一标注系统：场景标注、侧边说明、截图说明保持一致</li>
              <li>• 智能字段映射：自动识别"维修备注"等同义词变体</li>
              <li>• 方向符号校验：异常时自动挂起，避免假稳定结论</li>
              <li>• 参数档位调节：清晰展示公式、单位和边界样本影响</li>
              <li>• 完整历史记录：阿岑的临时修改完整保留</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">材料入口</h4>
              <p className="text-sm text-gray-600">
                点击左侧菜单"数据导入"，上传 Excel 或 CSV 文件，系统会自动解析并配置字段映射。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">异常出口</h4>
              <p className="text-sm text-gray-600">
                当检测到方向符号写反等异常时，系统会自动挂起并在"异常处理"页面提示，需项目经理确认后才能继续。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'import' as SectionType,
      title: '数据导入',
      icon: Upload,
      color: 'bg-green-50 text-green-600',
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">1</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">上传文件</h4>
              <p className="text-sm text-gray-600">支持 .xlsx、.xls、.csv 格式，拖拽或点击选择文件</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">2</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">字段映射</h4>
              <p className="text-sm text-gray-600">
                系统自动匹配字段名，支持"维修备注"、"维护记录"、"修备记录"等同义词。
                绿色表示已匹配，黄色表示需要手动确认。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">3</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">确认导入</h4>
              <p className="text-sm text-gray-600">
                所有字段映射完成后，点击"确认导入"，系统会保留字段来源和处理状态。
              </p>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="font-medium text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              注意事项
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              导入时请确保文件编码正确。CSV 文件建议使用 UTF-8 编码，避免中文乱码。
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'calculator' as SectionType,
      title: '复算工作台',
      icon: Calculator,
      color: 'bg-purple-50 text-purple-600',
      content: (
        <div className="space-y-4">
          <p>复算工作台是系统的核心功能区域，用于执行风洞实验数据的复算。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">参数调节</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 可通过档位快速切换参数配置（1-5档）</li>
                <li>• 支持滑动条精细调节每个参数</li>
                <li>• 可随时重置为默认参数</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">计算结果</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 升力系数、阻力系数、雷诺数等核心指标</li>
                <li>• 完整公式展示，点击可展开变量说明</li>
                <li>• 边界样本敏感性分析，说明结果变化原因</li>
              </ul>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">边界样本分析</h4>
            <p className="text-sm text-purple-800">
              系统自动分析各参数对结果的影响程度，用热力图展示。红色表示影响较大，绿色表示影响较小。
              这样可以清楚地看出"为什么结果变化"。
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">计算公式</h4>
            <div className="font-mono text-sm bg-white p-3 rounded border">
              <p>升力系数: Cl = 2L / (ρ × V² × A)</p>
              <p className="text-gray-500 mt-1">其中 L 为升力，ρ 为空气密度，V 为流速，A 为参考面积</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'annotation' as SectionType,
      title: '统一标注',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      content: (
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h4 className="font-medium text-indigo-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              设计理念
            </h4>
            <p className="text-sm text-indigo-800 mt-1">
              为了避免"场景标注、侧边说明和截图说明变成三套话"，系统提供统一标注面板，
              支持同步模式和独立模式。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                同步模式
              </h4>
              <p className="text-sm text-gray-600">
                修改任意一处标注，自动同步到另外两处。确保导出的报告中场景标注、侧边说明和截图说明完全一致。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                独立模式
              </h4>
              <p className="text-sm text-gray-600">
                三处标注可以分别编辑，但提供"同步到全部"按钮，一键将当前内容同步到其他两处。
              </p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">标注内容要求</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 场景标注：描述实验的背景、目的和环境条件</li>
              <li>• 侧边说明：对计算过程和参数选择的解释</li>
              <li>• 截图说明：配合图表展示的关键结论</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'exception' as SectionType,
      title: '异常处理',
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="font-medium text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              核心原则：宁可挂起让项目经理确认，也不要给假稳定结论
            </h4>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">方向符号校验规则</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600">物理量</th>
                    <th className="text-left py-2 text-gray-600">预期方向</th>
                    <th className="text-left py-2 text-gray-600">异常处理</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2">升力系数 (Cl)</td>
                    <td className="py-2 text-green-600">应为正</td>
                    <td className="py-2 text-red-600">负值时自动挂起</td>
                  </tr>
                  <tr>
                    <td className="py-2">压力系数 (Cp)</td>
                    <td className="py-2 text-red-600">应为负</td>
                    <td className="py-2 text-red-600">正值时自动挂起</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">拒绝</h4>
              <p className="text-sm text-gray-600">
                数据有误，驳回不使用。记录会标记为已拒绝，不参与后续计算。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">批准放行</h4>
              <p className="text-sm text-gray-600">
                确认数据正确，允许继续使用。需要项目经理填写审批备注。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">修正后确认</h4>
              <p className="text-sm text-gray-600">
                系统自动计算建议修正值（取反），确认后使用修正值继续计算。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'history' as SectionType,
      title: '历史记录',
      icon: History,
      color: 'bg-orange-50 text-orange-600',
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h4 className="font-medium text-orange-900 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              阿岑的修改记录
            </h4>
            <p className="text-sm text-orange-800 mt-1">
              维修师傅阿岑临时改过的判断会完整保留在历史中，下一班同事可以看到变更前后的数据对比，
              不会只看到最终结果。
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">操作类型</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">导入</div>
                <div className="text-xs text-gray-500">数据导入</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">复算</div>
                <div className="text-xs text-gray-500">执行计算</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">标注</div>
                <div className="text-xs text-gray-500">更新说明</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">异常</div>
                <div className="text-xs text-gray-500">处理异常</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">变更对比</h4>
            <p className="text-sm text-gray-600">
              点击展开任意一条历史记录，可以查看变更前后的数据对比。
              <span className="bg-red-100 text-red-700 px-1 rounded">红色背景</span> 表示变更前的值，
              <span className="bg-green-100 text-green-700 px-1 rounded">绿色背景</span> 表示变更后的值。
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'export' as SectionType,
      title: '报告导出',
      icon: FileText,
      color: 'bg-teal-50 text-teal-600',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">PDF 报告</h4>
                  <p className="text-xs text-gray-500">适合打印和复盘会议</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                包含完整的公式说明、单位标注、边界样本分析图表、统一的三处标注说明，
                以及异常处理和操作历史记录。
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Excel 表格</h4>
                  <p className="text-xs text-gray-500">适合数据归档和进一步分析</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                包含原始数据、计算结果、参数配置等结构化数据，支持后续在 Excel 中进行进一步分析。
              </p>
            </div>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <h4 className="font-medium text-teal-900 mb-2">报告内容清单</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-teal-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                实验基本信息
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                完整计算公式与单位
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                核心计算结果
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                边界样本敏感性分析
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                统一标注说明
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                字段来源追踪
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                异常处理记录
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                完整操作历史
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">小提示</h4>
            <p className="text-sm text-gray-600">
              导出前可以点击"预览报告"查看报告内容，确认无误后再导出。
              报告中的所有公式都会附带变量说明和单位，方便复盘时理解。
            </p>
          </div>
        </div>
      ),
    },
  ];

  const toggleSection = (id: SectionType) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用指南</h1>
          <p className="text-gray-500 mt-1">快速了解系统功能和操作流程</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/import')}>
            开始使用
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold mb-2">欢迎使用"风洞烟线实验复算"系统</h2>
          <p className="text-blue-100 mb-6">
            本指南将帮助您快速上手系统的各项功能。无论您是参与开发的团队成员，
            还是第一次使用的维修师傅或项目经理，都能在这里找到清晰的操作说明。
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => navigate('/import')}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              开始导入数据
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setExpandedSection('import')}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              查看导入教程
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;
          return (
            <Card key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-4"
                >
                  <div className="pt-4 border-t border-gray-100">
                    {section.content}
                  </div>
                </motion.div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">数据安全</h3>
            <p className="text-sm text-gray-500">
              所有数据存储在浏览器本地，不上传服务器，确保实验数据安全。
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">随时查看</h3>
            <p className="text-sm text-gray-500">
              任何页面都可以点击右上角的"使用指南"返回本页面查看帮助。
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">异常优先</h3>
            <p className="text-sm text-gray-500">
              检测到异常时会优先提示，确保不会忽略任何可能影响结果的问题。
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
