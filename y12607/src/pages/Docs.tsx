import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Upload, Search, Download, FileText, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Docs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回看板
              </button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">使用说明</h1>
                  <p className="text-xs text-slate-500">康复动作轨迹看板操作指南</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-2">关于本系统</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            康复动作轨迹看板用于审核康复评分表数据，重点检测离线素材缺失、图层遮挡等异常。
            系统核心特点是图层管理与命中检测共用同一批处理记录，确保界面展示与导出报告数据完全一致。
            本页面仅说明核心操作步骤，不做功能宣传。
          </p>
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">1</span>
                启动系统
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  系统为纯前端应用，无需后端服务。在项目根目录执行以下命令启动开发服务器：
                </p>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm">
                  <p className="text-green-400"># 安装依赖（首次运行）</p>
                  <p>npm install</p>
                  <p className="text-green-400 mt-2"># 启动开发服务器</p>
                  <p>npm run dev</p>
                </div>
                <p className="text-sm text-slate-600">
                  启动后访问 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">http://localhost:5173</code> 即可进入系统。
                  系统启动后会自动加载示例数据，无需登录。
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-700 flex items-start gap-2">
                  <Play className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>演示环境已预置10条样例数据，包含旧格式表、补录备注、漏填单位等真实场景。
                  可直接进入下一步操作。</span>
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">2</span>
                导入评分表
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <ol className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">1</span>
                  <span>点击看板首页顶部的 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">导入评分表</span> 按钮</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">2</span>
                  <span>在文件选择器中选择评分表数据文件（支持 .json、.csv、.xlsx 格式）</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">3</span>
                  <span>系统自动解析数据并运行异常检测，检测内容包括：
                    <ul className="mt-2 ml-5 space-y-1 list-disc text-slate-500">
                      <li>离线素材是否缺失或损坏</li>
                      <li>图层是否存在遮挡</li>
                      <li>必填字段（如填写单位）是否完整</li>
                      <li>是否为旧格式数据</li>
                    </ul>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">4</span>
                  <span>导入完成后，记录列表自动刷新，异常记录以红色高亮显示</span>
                </li>
              </ol>

              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-xs text-amber-700 flex items-start gap-2">
                  <Upload className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>注意：</strong>截图素材晚到半天以上时，之前的图层遮挡判断可能失效。
                  收到新素材后请点击"重新检测"按钮，系统会基于最新素材重新判断。</span>
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">3</span>
                查看异常
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">筛选异常</h3>
                <p className="text-sm text-slate-600">
                  使用左侧筛选面板缩小范围：
                </p>
                <ul className="ml-5 space-y-1 list-disc text-sm text-slate-500">
                  <li><strong>搜索框：</strong>按患者姓名、编号或评分项目模糊搜索</li>
                  <li><strong>异常类型：</strong>选择"离线素材缺失"、"图层遮挡"等特定类型</li>
                  <li><strong>处理状态：</strong>筛选"待处理"或"已处理"记录</li>
                  <li><strong>日期范围：</strong>限定评分表填写时间范围</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">查看详情</h3>
                <ol className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">1</span>
                    <span>点击记录列表中任意一行（异常行已标红）进入详情页</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">2</span>
                    <span>详情页包含四个区域：
                      <ul className="mt-2 ml-5 space-y-1 text-slate-500">
                        <li><strong>评分表信息：</strong>患者信息、评分项目、得分、填写信息等原始数据</li>
                        <li><strong>异常说明：</strong>异常类型、具体原因、处理建议</li>
                        <li><strong>追溯时间线：</strong>从评分表创建到异常标记的完整时间线，可反向追溯</li>
                        <li><strong>图层与命中检测：</strong>两个标签页共用同一批处理记录，点击图层可查看关联的命中结果</li>
                      </ul>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center justify-center">3</span>
                    <span>在右侧"处理意见"区域可更新记录状态并添加备注</span>
                  </li>
                </ol>
              </div>

              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-xs text-red-700 flex items-start gap-2">
                  <Search className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>验收路径：</strong>从任意一条异常记录进入详情页，沿"追溯时间线"反向查询，
                  应能看到评分表原始数据 → 图层检测记录 → 命中检测结果 → 处理意见的完整链路，
                  且所有数据来源一致。</span>
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">4</span>
                导出结果
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                系统支持两种导出方式，均面向非技术人员设计，避免字段名和内部缩写：
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    批量导出（首页）
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• 导出当前筛选条件下的所有记录</li>
                    <li>• 格式：Excel (.xlsx)</li>
                    <li>• 列名全部使用中文全称</li>
                    <li>• 异常原因用自然语言描述</li>
                    <li>• 包含处理建议列</li>
                  </ul>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    单条导出（详情页）
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• 导出当前查看的单条记录详情</li>
                    <li>• 格式：纯文本 (.txt)</li>
                    <li>• 适合快速转交给他人处理</li>
                    <li>• 包含完整的异常追溯信息</li>
                    <li>• 不含任何技术术语</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700">导出文件列名对照（非技术人员阅读友好）</h4>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-600">
                        <th className="text-left py-1 pr-4">内部字段名</th>
                        <th className="text-left py-1">导出显示名</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr>
                        <td className="py-1 pr-4 font-mono text-slate-400">patientName</td>
                        <td>患者姓名</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 font-mono text-slate-400">anomalyType</td>
                        <td>异常类型（如"离线素材缺失"）</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 font-mono text-slate-400">anomalyReason</td>
                        <td>异常说明（自然语言描述）</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 font-mono text-slate-400">status</td>
                        <td>处理状态（如"待处理"）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-xs text-green-700 flex items-start gap-2">
                  <Download className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>示例说明：</strong>导出文件中不会出现"mat_stat"、"lay_occ"之类的缩写，
                  而是直接显示"截图素材第3组未上传"、"第2图层被上层遮挡"等可读描述，
                  方便转交给不懂代码的同事处理。</span>
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                常见问题
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">
                    Q: 为什么图层管理和命中检测看到的数据一致？
                  </h3>
                  <p className="text-sm text-slate-600">
                    系统设计了统一的处理记录池，两个模块从同一数据源读取数据，避免了"界面、报告各算各的"问题。
                    导入数据时一次性更新所有关联记录。
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">
                    Q: 素材晚到后需要做什么？
                  </h3>
                  <p className="text-sm text-slate-600">
                    收到缺失的截图素材后，重新导入数据或在详情页点击"重新检测"按钮。
                    系统会基于最新素材重新判断图层遮挡情况，之前的判断结果可能变化。
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">
                    Q: 如何验证追溯链路是否完整？
                  </h3>
                  <p className="text-sm text-slate-600">
                    进入任意一条异常记录的详情页，查看"追溯时间线"模块。
                    应能看到从评分表创建、图层检测、命中检测、异常标记到处理意见的完整步骤，
                    每一步都有时间戳和操作人信息。
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            开始使用
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            康复动作轨迹看板 · 使用说明文档
          </p>
        </div>
      </footer>
    </div>
  );
}
