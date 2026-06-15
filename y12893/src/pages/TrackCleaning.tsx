import { useState } from 'react';
import {
  Upload,
  FileText,
  Ship,
  Fish,
  Droplets,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Database
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { generateMockDataset } from '@/services/mockData';
import { cn } from '@/lib/utils';
import { DATA_TYPE_LABELS } from '@/types';

export default function TrackCleaning() {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [importStep, setImportStep] = useState(0);
  const { importData, importBatches, loadImportBatches, importResult, clearImportResult } = useDataStore();

  const importTypes = [
    { type: 'ship_track', icon: Ship, label: '船舶轨迹', desc: 'AIS船舶航行数据' },
    { type: 'aquaculture_log', icon: Fish, label: '养殖日志', desc: '养殖场用电记录' },
    { type: 'salinity', icon: Droplets, label: '盐度监测', desc: '海洋盐度监测数据' },
  ];

  const handleImport = async (type: string) => {
    setImportStep(1);
    const data = generateMockDataset(30);
    let records;
    switch (type) {
      case 'ship_track':
        records = data.shipTracks;
        break;
      case 'aquaculture_log':
        records = data.aquacultureLogs;
        break;
      case 'salinity':
        records = data.salinityData;
        break;
      default:
        records = [...data.shipTracks, ...data.aquacultureLogs, ...data.salinityData];
    }
    await importData(records);
    await loadImportBatches();
    setImportStep(2);
  };

  const handleImportAll = async () => {
    setImportStep(1);
    const data = generateMockDataset(40);
    const allRecords = [...data.shipTracks, ...data.aquacultureLogs, ...data.salinityData];
    await importData(allRecords);
    await loadImportBatches();
    setImportStep(2);
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">轨迹清洗（日常入口）</h1>
        <p className="text-white/70">
          日常数据入口，导入船舶轨迹、养殖日志和盐度监测数据，系统自动检测质量问题
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('import'); setImportStep(0); clearImportResult(); }}
          className={cn(
            'px-6 py-2 rounded-xl font-medium transition-all',
            activeTab === 'import'
              ? 'bg-white text-[#0A2463]'
              : 'bg-white/10 text-white hover:bg-white/20'
          )}
        >
          数据导入
        </button>
        <button
          onClick={() => { setActiveTab('history'); loadImportBatches(); }}
          className={cn(
            'px-6 py-2 rounded-xl font-medium transition-all',
            activeTab === 'history'
              ? 'bg-white text-[#0A2463]'
              : 'bg-white/10 text-white hover:bg-white/20'
          )}
        >
          导入历史
        </button>
      </div>

      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {importStep === 0 && (
              <>
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Upload className="w-6 h-6 text-[#0A2463]" />
                    选择数据类型
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {importTypes.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => handleImport(item.type)}
                        className="p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-2xl hover:border-[#3E92CC] hover:shadow-xl transition-all group text-left"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A2463]/10 to-[#3E92CC]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <item.icon className="w-7 h-7 text-[#0A2463]" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">{item.label}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                        <div className="mt-4 flex items-center text-[#3E92CC] text-sm font-medium">
                          开始导入 <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-6 bg-gradient-to-r from-[#0A2463]/5 to-[#3E92CC]/5 rounded-2xl border-2 border-dashed border-[#0A2463]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">一键导入全部类型</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          同时导入船舶轨迹、养殖日志和盐度监测数据，进行同一轮复核
                        </p>
                      </div>
                      <button
                        onClick={handleImportAll}
                        className="px-6 py-3 bg-gradient-to-r from-[#0A2463] to-[#3E92CC] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        全部导入
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#E9C46A]" />
                    导入前须知
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#2A9D8F] flex-shrink-0 mt-0.5" />
                      <span>系统会自动检测<strong>盐度单位混用</strong>，统一以ppt为标准单位</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#2A9D8F] flex-shrink-0 mt-0.5" />
                      <span>自动识别<strong>深度为负</strong>的异常记录，标记为需重新采集</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#2A9D8F] flex-shrink-0 mt-0.5" />
                      <span>基于时间、位置和数据源<strong>防重复检测</strong>，避免同一件事出现两份结论</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#2A9D8F] flex-shrink-0 mt-0.5" />
                      <span>所有操作<strong>留痕记录</strong>，可追溯从结果到来源的完整链路</span>
                    </li>
                  </ul>
                </div>
              </>
            )}

            {importStep === 1 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 shadow-xl text-center">
                <div className="w-20 h-20 rounded-full bg-[#3E92CC]/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Upload className="w-10 h-10 text-[#3E92CC]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">正在处理数据...</h3>
                <p className="text-gray-500">正在进行质量检测、去重和格式标准化</p>
                <div className="mt-8 max-w-md mx-auto">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0A2463] to-[#3E92CC] rounded-full animate-progress" />
                  </div>
                </div>
              </div>
            )}

            {importStep === 2 && importResult && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center mx-auto mb-4">
                    {importResult.errors.length > 0 ? (
                      <XCircle className="w-10 h-10 text-[#E63946]" />
                    ) : (
                      <CheckCircle className="w-10 h-10 text-[#2A9D8F]" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {importResult.errors.length > 0 ? '导入完成，存在问题' : '导入成功'}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-[#2A9D8F]/5 rounded-xl">
                    <p className="text-3xl font-bold text-[#2A9D8F]">{importResult.success.length}</p>
                    <p className="text-sm text-gray-500">成功导入</p>
                  </div>
                  <div className="text-center p-4 bg-[#E9C46A]/5 rounded-xl">
                    <p className="text-3xl font-bold text-[#E9C46A]">{importResult.duplicates.length}</p>
                    <p className="text-sm text-gray-500">重复过滤</p>
                  </div>
                  <div className="text-center p-4 bg-[#E63946]/5 rounded-xl">
                    <p className="text-3xl font-bold text-[#E63946]">{importResult.errors.length}</p>
                    <p className="text-sm text-gray-500">错误</p>
                  </div>
                </div>

                {importResult.duplicates.length > 0 && (
                  <div className="mb-6 p-4 bg-[#E9C46A]/10 rounded-xl border border-[#E9C46A]/20">
                    <h4 className="font-semibold text-[#E9C46A] mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      检测到重复记录（已自动过滤）
                    </h4>
                    <div className="space-y-2">
                      {importResult.duplicates.slice(0, 5).map((r, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <Database className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{DATA_TYPE_LABELS[r.type]}</span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-500">{r.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setImportStep(0); clearImportResult(); }}
                    className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all"
                  >
                    继续导入
                  </button>
                  <button
                    onClick={() => setImportStep(0)}
                    className="flex-1 py-3 bg-gradient-to-r from-[#0A2463] to-[#3E92CC] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    前往3D复核
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0A2463]" />
                清洗规则
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700">盐度单位统一</p>
                  <p className="text-xs text-gray-500 mt-1">psu、‰ → ppt</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700">异常值检测</p>
                  <p className="text-xs text-gray-500 mt-1">IQR四分位法，1.5倍IQR范围外</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700">重复检测</p>
                  <p className="text-xs text-gray-500 mt-1">SHA-256哈希，时间+位置+来源</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700">格式标准化</p>
                  <p className="text-xs text-gray-500 mt-1">时间戳、坐标精度统一</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0A2463] to-[#051439] rounded-2xl p-6 shadow-xl text-white">
              <h3 className="font-bold mb-4">💡 复核流程</h3>
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>日常入口：轨迹清洗导入数据</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>3D交互复核：旋转、剖切、筛选</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>复核工作台：多源数据联动</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>月底检查：潮汐计算分析</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">导入历史</h2>
          {importBatches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无导入记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {importBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-4 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      batch.status === 'completed' ? 'bg-[#2A9D8F]/10' :
                      batch.status === 'failed' ? 'bg-[#E63946]/10' : 'bg-[#E9C46A]/10'
                    )}>
                      {batch.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-[#2A9D8F]" />
                      ) : batch.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-[#E63946]" />
                      ) : (
                        <Upload className="w-5 h-5 text-[#E9C46A] animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{batch.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(batch.timestamp).toLocaleString('zh-CN')} · {batch.recordCount} 条记录
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-3 py-1 rounded-full',
                    batch.status === 'completed' ? 'bg-[#2A9D8F]/10 text-[#2A9D8F]' :
                    batch.status === 'failed' ? 'bg-[#E63946]/10 text-[#E63946]' : 'bg-[#E9C46A]/10 text-[#E9C46A]'
                  )}>
                    {batch.status === 'completed' ? '成功' : batch.status === 'failed' ? '失败' : '处理中'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
