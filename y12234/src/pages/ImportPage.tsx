import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Database, Trash2, Play, Info } from 'lucide-react';
import { useAppStore } from '../store';

export default function ImportPage() {
  const { scenarios, isDataLoaded, loadSampleData, loadScenario, clearData, activeScenario } = useAppStore();
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);

  const handleLoadSampleData = async () => {
    setLoadingScenario('full');
    await new Promise(resolve => setTimeout(resolve, 500));
    loadSampleData();
    setLoadingScenario(null);
  };

  const handleLoadScenario = async (scenarioId: string) => {
    setLoadingScenario(scenarioId);
    await new Promise(resolve => setTimeout(resolve, 500));
    loadScenario(scenarioId);
    setLoadingScenario(null);
  };

  const handleClearData = () => {
    if (window.confirm('确定要清除所有数据吗？')) {
      clearData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">数据导入</h2>
              <p className="text-sm text-slate-500">导入样例数据或上传自定义数据文件</p>
            </div>
          </div>
          {isDataLoaded && (
            <button
              onClick={handleClearData}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清除数据
            </button>
          )}
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-400 transition-colors bg-slate-50">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Upload className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">上传数据文件</h3>
          <p className="text-slate-500 mb-4">支持 Excel (.xlsx) 或 CSV 格式文件</p>
          <button className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
            选择文件
          </button>
          <p className="text-xs text-slate-400 mt-3">或拖拽文件到此处上传</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Play className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">快速加载样例数据</h2>
            <p className="text-sm text-slate-500">选择预设场景快速体验系统功能</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
              activeScenario === null && isDataLoaded
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
            onClick={handleLoadSampleData}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    推荐
                  </div>
                  {activeScenario === null && isDataLoaded && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">完整数据集</h3>
                <p className="text-sm text-slate-500 mb-3">包含所有测试场景的完整数据，适合全面了解系统功能</p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">5个车牌</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">7条流水</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">3个问题</span>
                </div>
              </div>
              {loadingScenario === 'full' && (
                <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
              )}
            </div>
          </div>

          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                activeScenario === scenario.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
              onClick={() => handleLoadScenario(scenario.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`text-white px-3 py-1 rounded-full text-xs font-medium ${
                      scenario.type === 'normal' ? 'bg-emerald-500' :
                      scenario.type === 'binding_failure' ? 'bg-red-500' :
                      scenario.type === 'deduction' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}>
                      {scenario.type === 'normal' ? '正常' :
                       scenario.type === 'binding_failure' ? '换绑失败' :
                       scenario.type === 'deduction' ? '抵扣' : '退款'}
                    </div>
                    {activeScenario === scenario.id && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{scenario.name}</h3>
                  <p className="text-sm text-slate-500">{scenario.description}</p>
                </div>
                {loadingScenario === scenario.id && (
                  <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 p-3 rounded-xl">
            <Info className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">数据格式说明</h2>
            <p className="text-sm text-slate-500">了解导入文件需要包含的数据字段</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-slate-800">车牌档案</h4>
            </div>
            <ul className="text-sm text-slate-500 space-y-1">
              <li>• 车牌号码</li>
              <li>• 车主姓名</li>
              <li>• 车辆类型</li>
              <li>• 生效/失效日期</li>
              <li>• 月费金额</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-purple-500" />
              <h4 className="font-medium text-slate-800">换绑记录</h4>
            </div>
            <ul className="text-sm text-slate-500 space-y-1">
              <li>• 旧车牌</li>
              <li>• 新车牌</li>
              <li>• 换绑时间</li>
              <li>• 操作人</li>
              <li>• 状态/失败原因</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-emerald-500" />
              <h4 className="font-medium text-slate-800">临停流水</h4>
            </div>
            <ul className="text-sm text-slate-500 space-y-1">
              <li>• 车牌号码</li>
              <li>• 入场/出场时间</li>
              <li>• 费用金额</li>
              <li>• 支付方式</li>
              <li>• 是否抵扣</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-amber-500" />
              <h4 className="font-medium text-slate-800">收入递延</h4>
            </div>
            <ul className="text-sm text-slate-500 space-y-1">
              <li>• 所属期间</li>
              <li>• 总金额</li>
              <li>• 已确认金额</li>
              <li>• 递延金额</li>
              <li>• 计算日期</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
