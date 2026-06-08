import {
  Rocket,
  Upload,
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  Camera,
  GitBranch,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Terminal,
  FileText,
  History,
  User,
} from 'lucide-react';

const steps = [
  {
    number: 1,
    title: '启动工作台',
    icon: Rocket,
    content: (
      <div className="space-y-3 text-sm text-graphite leading-relaxed">
        <p>在项目根目录执行以下命令启动本地开发服务器：</p>
        <div className="bg-graphite text-cream p-3 rounded-sm-2 font-mono text-xs overflow-x-auto">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-success" />
            <span>npm run dev</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="flex items-start gap-2">
            <span className="text-brand font-semibold flex-shrink-0">前端：</span>
            <span>启动后访问 <code className="font-mono bg-brand-50 px-1.5 py-0.5 rounded text-brand">http://localhost:5173</code></span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-brand font-semibold flex-shrink-0">后端：</span>
            <span>API 服务运行在 <code className="font-mono bg-brand-50 px-1.5 py-0.5 rounded text-brand">http://localhost:3001</code>，前端已配置自动代理</span>
          </p>
        </div>
        <p className="text-xs text-slate bg-slate/5 p-2.5 rounded-sm-2">
          <FileText className="w-3.5 h-3.5 inline mr-1 text-slate" />
          执行 <code className="font-mono bg-white px-1 rounded">npm run build</code> 可构建生产版本。
        </p>
      </div>
    ),
  },
  {
    number: 2,
    title: '导入测量记录',
    icon: Upload,
    content: (
      <div className="space-y-3 text-sm text-graphite leading-relaxed">
        <p>在检查记录列表页点击「导入测量记录」按钮，支持以下格式：</p>

        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 bg-brand-50/50 rounded-sm-2 border border-brand-100">
            <FileJson className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-brand">JSON 格式</div>
              <div className="text-xs text-slate mt-0.5">
                推荐使用，包含项目信息、参数、测量点数组
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-brand-50/50 rounded-sm-2 border border-brand-100">
            <FileSpreadsheet className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-brand">CSV 格式</div>
              <div className="text-xs text-slate mt-0.5">
                纯测点数据，首行为表头：code,x,y,z,measured_value,screenshot
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="font-medium text-graphite mb-1.5">字段说明</div>
          <ul className="space-y-1 text-xs">
            <li className="flex gap-2">
              <span className="font-mono text-brand min-w-[90px]">code</span>
              <span className="text-slate">测点编号，如 MP-001</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand min-w-[90px]">x, y, z</span>
              <span className="text-slate">三维坐标（单位：米）</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand min-w-[90px]">measured_value</span>
              <span className="text-slate">实测值（单位：毫米）</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-brand min-w-[90px]">screenshot</span>
              <span className="text-slate">截图文件名（可选）</span>
            </li>
          </ul>
        </div>

        <div className="pt-2">
          <div className="font-medium text-graphite mb-1.5 flex items-center gap-1.5">
            <Camera className="w-4 h-4" /> 截图清单要求
          </div>
          <ul className="space-y-1 text-xs text-slate list-disc list-inside">
            <li>异常测点建议附上现场照片作为佐证</li>
            <li>文件名建议与测点编号对应，如 screenshot_MP-003.jpg</li>
            <li>支持 JPG、PNG 格式，建议单张不超过 5MB</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    number: 3,
    title: '查看异常',
    icon: AlertTriangle,
    content: (
      <div className="space-y-3 text-sm text-graphite leading-relaxed">
        <p>进入检查详情页，从多维度定位和处理异常测点：</p>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">剖切图定位</div>
              <p className="text-xs text-slate mt-0.5">
                左侧剖切图以红色圆点标注异常测点，点击可查看该点详情。虚线为最小净空要求线，低于此线即为异常。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <GitBranch className="w-5 h-5 text-alert flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">参数联动计算</div>
              <p className="text-xs text-slate mt-0.5">
                右侧参数面板可编辑梁高、管线直径、吊顶厚度等参数。修正参数需填写原因，修改后所有测点的计算净空会自动重新计算。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">截图清单与处理意见</div>
              <p className="text-xs text-slate mt-0.5">
                下方表格列出所有测点，可展开每行填写处理意见。异常测点需明确整改建议，如调整管线、局部降板等。
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: 4,
    title: '导出结果',
    icon: Download,
    content: (
      <div className="space-y-3 text-sm text-graphite leading-relaxed">
        <p>详情页右上角「导出」按钮支持以下报告格式：</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-success-50 rounded-sm-2 border border-success/20">
            <FileSpreadsheet className="w-6 h-6 text-success mb-1" />
            <div className="font-medium text-success">Excel 报告</div>
            <div className="text-xs text-slate mt-0.5">
              包含参数表、测点清单、异常统计，便于数据整理和二次分析
            </div>
          </div>
          <div className="p-3 bg-brand-50 rounded-sm-2 border border-brand/20">
            <FileText className="w-6 h-6 text-brand mb-1" />
            <div className="font-medium text-brand">PDF 报告</div>
            <div className="text-xs text-slate mt-0.5">
              正式报告文件，包含剖切图、异常详情、处理意见汇总
            </div>
          </div>
        </div>

        <p className="text-xs text-alert bg-alert-50 p-2.5 rounded-sm-2 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>注意：</strong>导出报告与剖切图共用同一批次数据。如需某历史版本，请在「历史追溯」中先切换到对应批次再导出。
          </span>
        </p>
      </div>
    ),
  },
];

export default function Docs() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-graphite">使用说明</h1>
        <p className="text-sm text-slate mt-1">
          地下车库净空检查工作台 · 四步快速上手
        </p>
      </div>

      <div className="space-y-5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="card p-5 card-hover">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center shadow-md">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-alert text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-white">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl font-bold text-graphite mb-3 flex items-center gap-2">
                    {step.title}
                    {idx < steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate/30 ml-2" />
                    )}
                  </h2>
                  {step.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5 border-l-4 border-l-brand">
        <h2 className="font-display text-lg font-bold text-graphite mb-3 flex items-center gap-2">
          <History className="w-5 h-5 text-brand" />
          追溯说明
        </h2>
        <div className="space-y-3 text-sm text-graphite leading-relaxed">
          <p>
            本系统支持完整的变更追溯能力。当发现净空异常或数据存疑时，可按以下路径回溯：
          </p>

          <ol className="space-y-2 pl-2">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand flex items-center justify-center flex-shrink-0 text-sm font-bold">
                1
              </span>
              <div>
                <strong>从异常定位截图清单</strong>
                <p className="text-xs text-slate mt-0.5">
                  在详情页剖切图点击异常测点，或直接展开截图清单中对应行，查看现场照片和已填写的处理意见。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand flex items-center justify-center flex-shrink-0 text-sm font-bold">
                2
              </span>
              <div>
                <strong>顺着历史时间线查变更</strong>
                <p className="text-xs text-slate mt-0.5">
                  进入「历史」页，左侧时间线按时间倒序展示所有操作：参数更新、测点修正、复核通过/驳回等。节点颜色区分操作类型。
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand flex items-center justify-center flex-shrink-0 text-sm font-bold">
                3
              </span>
              <div>
                <strong>查看前后值 Diff 定位责任人</strong>
                <p className="text-xs text-slate mt-0.5 flex items-start gap-1">
                  <User className="w-3.5 h-3.5 mt-0.5 text-slate" />
                  选中任一历史节点，右侧面板显示操作人、操作时间、变更原因，以及字段级别的前后值对比（红色删除线为旧值，绿色加粗为新值）。
                </p>
              </div>
            </li>
          </ol>

          <p className="text-xs text-slate bg-slate/5 p-2.5 rounded-sm-2 pt-2">
            所有修改均会生成新的批次号，保证任何时刻的数据都可回溯、可审计、可复现。
          </p>
        </div>
      </div>
    </div>
  );
}
