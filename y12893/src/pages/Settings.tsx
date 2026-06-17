import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  Palette,
  Info,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Save,
  Sliders,
  GitBranch,
  Waves
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { clearAllData, exportData, importDataFromFile, loadRecords, loadStats, stats } = useDataStore();
  const [activeTab, setActiveTab] = useState<'data' | 'quality' | 'appearance' | 'about'>('data');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [salinityUnit, setSalinityUnit] = useState<'PSU' | 'ppt' | 'auto'>('auto');
  const [depthThreshold, setDepthThreshold] = useState(0);
  const [iqrMultiplier, setIqrMultiplier] = useState(1.5);
  const [autoApprove, setAutoApprove] = useState(false);
  const [notifySound, setNotifySound] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const tabs = [
    { key: 'data' as const, label: '数据管理', icon: Database },
    { key: 'quality' as const, label: '质量规则', icon: Shield },
    { key: 'appearance' as const, label: '外观设置', icon: Palette },
    { key: 'about' as const, label: '关于系统', icon: Info },
  ];

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `岛礁供电数据_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        await importDataFromFile(data);
        alert('数据导入成功！');
      } catch (err) {
        alert('数据导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    await clearAllData();
    await loadRecords();
    await loadStats();
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
        <p className="text-white/70">
          配置质量检测规则、数据管理和系统偏好
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2',
              activeTab === tab.key
                ? 'bg-white text-gray-800'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0A2463]" />
              数据统计
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.totalRecords}</p>
                <p className="text-xs text-gray-500">总记录数</p>
              </div>
              <div className="bg-[#2A9D8F]/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#2A9D8F]">{stats.approvedCount}</p>
                <p className="text-xs text-gray-500">已通过</p>
              </div>
              <div className="bg-[#E9C46A]/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#E9C46A]">{stats.pendingCount}</p>
                <p className="text-xs text-gray-500">待确认</p>
              </div>
              <div className="bg-[#E63946]/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#E63946]">{stats.issuesCount}</p>
                <p className="text-xs text-gray-500">有异常</p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#3E92CC]" />
              数据操作
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#2A9D8F] transition-colors">
                <Upload className="w-8 h-8 text-[#2A9D8F] mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">导入数据</h3>
                <p className="text-xs text-gray-500 mb-3">从JSON文件恢复数据</p>
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <span className="inline-block w-full text-center py-2 bg-[#2A9D8F] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-[#238b7a] transition-colors">
                    选择文件
                  </span>
                </label>
              </div>

              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#3E92CC] transition-colors">
                <Download className="w-8 h-8 text-[#3E92CC] mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">导出数据</h3>
                <p className="text-xs text-gray-500 mb-3">备份所有数据到JSON</p>
                <button
                  onClick={handleExport}
                  className="w-full py-2 bg-[#3E92CC] text-white rounded-lg text-sm font-medium hover:bg-[#357fb0] transition-colors"
                >
                  下载备份
                </button>
              </div>

              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#E63946] transition-colors">
                <Trash2 className="w-8 h-8 text-[#E63946] mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">清空数据</h3>
                <p className="text-xs text-gray-500 mb-3">删除所有本地数据</p>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-2 bg-[#E63946] text-white rounded-lg text-sm font-medium hover:bg-[#cc323e] transition-colors"
                  >
                    清空数据
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[#E63946] font-medium text-center">确认要清空？</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleClearData}
                        className="flex-1 py-1.5 bg-[#E63946] text-white rounded-lg text-xs font-medium hover:bg-[#cc323e] transition-colors"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#E63946]" />
              质量检测规则
            </h2>

            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">盐度单位检测</h3>
                    <p className="text-xs text-gray-500">检测盐度单位混用情况（PSU/ppt/‰）</p>
                  </div>
                  <select
                    value={salinityUnit}
                    onChange={(e) => setSalinityUnit(e.target.value as 'PSU' | 'ppt' | 'auto')}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium bg-white"
                  >
                    <option value="auto">自动检测</option>
                    <option value="PSU">强制 PSU</option>
                    <option value="ppt">强制 ppt</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-[#E9C46A]" />
                  <span className="text-gray-500">当前检测到 {stats.unitMismatchCount} 条单位混用记录</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">深度阈值</h3>
                    <p className="text-xs text-gray-500">深度小于该值标记为异常</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.1"
                      value={depthThreshold}
                      onChange={(e) => setDepthThreshold(Number(e.target.value))}
                      className="w-32"
                    />
                    <span className="font-mono text-sm font-medium min-w-[50px] text-right">{depthThreshold} m</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-[#E63946]" />
                  <span className="text-gray-500">当前检测到 {stats.negativeDepthCount} 条深度为负记录</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">异常值灵敏度（IQR系数）</h3>
                    <p className="text-xs text-gray-500">值越大越不敏感，建议 1.5 ~ 3.0</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.1"
                      value={iqrMultiplier}
                      onChange={(e) => setIqrMultiplier(Number(e.target.value))}
                      className="w-32"
                    />
                    <span className="font-mono text-sm font-medium min-w-[40px] text-right">{iqrMultiplier.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-[#F4A261]" />
                  <span className="text-gray-500">当前检测到 {stats.outlierCount} 条异常值记录</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">自动复核通过</h3>
                    <p className="text-xs text-gray-500">无异常记录自动标记为通过</p>
                  </div>
                  <button
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      autoApprove ? 'bg-[#2A9D8F]' : 'bg-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow',
                        autoApprove ? 'left-7' : 'left-1'
                      )}
                    />
                  </button>
                </div>
                {autoApprove && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-[#2A9D8F]" />
                    <span className="text-[#2A9D8F]">已启用自动复核</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSaveSettings}
              className={cn(
                'px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-all',
                saveSuccess
                  ? 'bg-[#2A9D8F] text-white'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              )}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#E9C46A]" />
              外观与通知
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">通知提示音</h3>
                  <p className="text-xs text-gray-500">发现异常时播放提示音</p>
                </div>
                <button
                  onClick={() => setNotifySound(!notifySound)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    notifySound ? 'bg-[#2A9D8F]' : 'bg-gray-300'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow',
                      notifySound ? 'left-7' : 'left-1'
                    )}
                  />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-800 mb-3">主题色</h3>
                <div className="flex gap-3">
                  {[
                    { name: '海洋蓝', primary: '#0A2463', secondary: '#3E92CC' },
                    { name: '森林绿', primary: '#1B4332', secondary: '#2A9D8F' },
                    { name: '珊瑚红', primary: '#6B2737', secondary: '#E63946' },
                    { name: '沙漠橙', primary: '#8B4513', secondary: '#F4A261' },
                  ].map(theme => (
                    <button
                      key={theme.name}
                      className="group relative"
                    >
                      <div className="flex">
                        <div className="w-8 h-8 rounded-l-lg" style={{ backgroundColor: theme.primary }} />
                        <div className="w-8 h-8 rounded-r-lg" style={{ backgroundColor: theme.secondary }} />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 text-center">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-800 mb-3">3D场景默认设置</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">显示网格</span>
                    <div className="w-10 h-6 bg-[#2A9D8F] rounded-full relative">
                      <div className="absolute top-1 left-5 w-4 h-4 bg-white rounded-full shadow" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">自动旋转</span>
                    <div className="w-10 h-6 bg-gray-300 rounded-full relative">
                      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">后处理效果</span>
                    <div className="w-10 h-6 bg-[#2A9D8F] rounded-full relative">
                      <div className="absolute top-1 left-5 w-4 h-4 bg-white rounded-full shadow" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSaveSettings}
              className={cn(
                'px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-all',
                saveSuccess
                  ? 'bg-[#2A9D8F] text-white'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              )}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#0A2463] to-[#3E92CC] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sliders className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">岛礁供电负荷预测系统</h2>
            <p className="text-sm text-gray-500 mb-6">Island Reef Power Load Forecasting System</p>
            <div className="inline-block bg-gray-100 rounded-full px-4 py-1.5 mb-6">
              <span className="text-sm font-mono text-gray-600">v1.0.0</span>
            </div>
            <p className="text-sm text-gray-600 max-w-lg mx-auto">
              专为海事安全员设计的岛礁供电负荷预测与数据质量复核平台，
              集成船舶轨迹、养殖日志、盐度监测多源数据，
              提供3D可视化交互、智能质量检测、数据溯源留痕等功能。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">核心功能</h3>
              <div className="space-y-3">
                {[
                  { icon: AlertTriangle, text: '盐度单位混用检测' },
                  { icon: AlertTriangle, text: '深度为负记录倒查' },
                  { icon: Sliders, text: '3D交互可视化' },
                  { icon: GitBranch, text: '数据溯源留痕' },
                  { icon: RefreshCw, text: '防重复导入机制' },
                  { icon: Waves, text: '潮汐负荷关联分析' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#0A2463]/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-[#0A2463]" />
                    </div>
                    <span className="text-sm text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">技术栈</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'React 18',
                  'TypeScript',
                  'Three.js',
                  'Zustand',
                  'Tailwind CSS',
                  'IndexedDB',
                  'Vite',
                  'React Router',
                ].map((tech, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-lg px-3 py-2 text-center text-sm text-gray-700 font-medium"
                  >
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
