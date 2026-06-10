import { Terminal, FolderOpen, FileDown, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { useState } from 'react';

export function CliGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeBlocks = {
    install: 'npm install',
    basic: 'npm run cli:thickness -- --input ./data/batches --output ./results',
    missing: 'npm run cli:thickness -- --input ./data --output ./results --only-blank-missing',
    full: `node dist/cli/index.js thickness \\\n  --input ./raw-data \\\n  --output ./processed \\\n  --algorithm degraded \\\n  --log-level info`,
    sample: `[\n  {\n    "batchNo": "COAT-2026-001",\n    "materialNo": "MAT-001",\n    "materialName": "SiO2薄膜",\n    "wavelength": 632.8,\n    "refractiveIndex": 1.457,\n    "reflectance": 0.185,\n    "blankControlComplete": false\n  }\n]`,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Terminal className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">CLI 工具使用指南</h1>
            <p className="text-sm text-slate-500 mt-1">
              命令行工具用于批量处理厚度估算，特别适用于空白对照缺失等特殊情况的降级处理
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-800">快速开始</h2>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">1. 安装依赖</h3>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 rounded-md p-4 text-sm font-mono overflow-x-auto">
                {codeBlocks.install}
              </pre>
              <button
                onClick={() => copyToClipboard(codeBlocks.install, 'install')}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white"
                title="复制"
              >
                {copied === 'install' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">2. 基本用法</h3>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 rounded-md p-4 text-sm font-mono overflow-x-auto">
                {codeBlocks.basic}
              </pre>
              <button
                onClick={() => copyToClipboard(codeBlocks.basic, 'basic')}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white"
              >
                {copied === 'basic' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">3. 仅处理空白对照缺失</h3>
            <p className="text-xs text-slate-500 mb-2">
              自动检测并只处理空白对照缺失的记录，使用降级算法估算
            </p>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 rounded-md p-4 text-sm font-mono overflow-x-auto">
                {codeBlocks.missing}
              </pre>
              <button
                onClick={() => copyToClipboard(codeBlocks.missing, 'missing')}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white"
              >
                {copied === 'missing' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-800">输入文件格式</h2>
        </div>

        <div className="p-5">
          <p className="text-sm text-slate-600 mb-3">
            输入目录下放置 JSON 数组文件，每条记录包含以下字段：
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 rounded-md p-4 text-sm font-mono overflow-x-auto">
              {codeBlocks.sample}
            </pre>
            <button
              onClick={() => copyToClipboard(codeBlocks.sample, 'sample')}
              className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white"
            >
              {copied === 'sample' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-md">
              <p className="font-medium text-slate-700">必需字段</p>
              <ul className="text-xs text-slate-500 mt-1 space-y-0.5">
                <li>• batchNo - 批次号</li>
                <li>• materialNo - 材料编号</li>
                <li>• wavelength - 波长</li>
                <li>• refractiveIndex - 折射率</li>
              </ul>
            </div>
            <div className="p-3 bg-slate-50 rounded-md">
              <p className="font-medium text-slate-700">可选字段</p>
              <ul className="text-xs text-slate-500 mt-1 space-y-0.5">
                <li>• reflectance - 反射率</li>
                <li>• transmittance - 透射率</li>
                <li>• blankControlComplete - 空白对照是否完整</li>
                <li>• operator - 操作员</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-800">命令行参数</h2>
        </div>

        <div className="p-5">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">参数</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">说明</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">默认值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2.5 font-mono text-slate-700">--input, -i</td>
                <td className="px-4 py-2.5 text-slate-600">输入目录路径</td>
                <td className="px-4 py-2.5 text-slate-500">./data</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-slate-700">--output, -o</td>
                <td className="px-4 py-2.5 text-slate-600">输出目录路径</td>
                <td className="px-4 py-2.5 text-slate-500">./results</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-slate-700">--algorithm</td>
                <td className="px-4 py-2.5 text-slate-600">算法: standard / degraded</td>
                <td className="px-4 py-2.5 text-slate-500">standard</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-slate-700">--only-blank-missing</td>
                <td className="px-4 py-2.5 text-slate-600">仅处理空白对照缺失的记录</td>
                <td className="px-4 py-2.5 text-slate-500">false</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-slate-700">--log-level</td>
                <td className="px-4 py-2.5 text-slate-600">日志级别: info / warn / error</td>
                <td className="px-4 py-2.5 text-slate-500">info</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-slate-700">--help, -h</td>
                <td className="px-4 py-2.5 text-slate-600">显示帮助信息</td>
                <td className="px-4 py-2.5 text-slate-500">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-800">输出说明</h2>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-md border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-800">输出文件</p>
              <p className="text-xs text-emerald-700 mt-1">
                处理完成后，输出目录会生成 <code className="bg-emerald-100 px-1 rounded">results.json</code> 和
                <code className="bg-emerald-100 px-1 rounded ml-1">summary.csv</code>，
                内容格式与 Web 界面导出完全一致，保证数据一致性。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-md border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">去重机制</p>
              <p className="text-xs text-amber-700 mt-1">
                同一批次（batchNo + materialNo）多次运行时，版本号自动递增，
                不会覆盖之前的结果，确保同一批材料重复跑不会越跑越乱。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="font-medium text-slate-800 mb-4">第一份样例位置</h2>
        <div className="p-4 bg-slate-50 rounded-md">
          <p className="text-sm text-slate-600 mb-2">
            项目内已预置样例数据，可以直接体验 CLI 功能：
          </p>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• 样例数据目录：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">./api/data/</code></li>
            <li>• 样例批次数据：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">batches.json</code></li>
            <li>• 样例试剂数据：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">reagents.json</code></li>
            <li>• 样例厚度记录：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">thicknessRecords.json</code></li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            首次运行 Web 应用时，点击「加载示例数据」按钮即可初始化样例数据。
          </p>
        </div>
      </div>
    </div>
  );
}
