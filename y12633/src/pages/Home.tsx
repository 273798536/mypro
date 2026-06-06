import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  PlayCircle,
  FileText,
  RotateCcw,
  Upload,
  Sparkles,
  Droplets,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useInspectionStore } from '../store/inspectionStore';
import { importFromJSON } from '../utils/exportUtils';
import { calculateInspectionProgress, formatDate, buildExportReport } from '../utils/helpers';
import { useState, useRef } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const {
    inspection,
    loadSampleData,
    createNewInspection,
    mergeImportedData,
    past,
    future,
  } = useInspectionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const report = buildExportReport(inspection);
  const progress = calculateInspectionProgress(inspection.drainPoints);
  const inspectedCount = report.inspectedCount;
  const pendingCount = report.pendingCount;
  const failedCount = report.failedCount;

  const handleStartSample = () => {
    loadSampleData();
    navigate('/level');
  };

  const handleStartNew = () => {
    createNewInspection();
    navigate('/level');
  };

  const handleContinue = () => {
    navigate('/level');
  };

  const handleViewSettlement = () => {
    navigate('/settlement');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    try {
      const imported = await importFromJSON(file);
      mergeImportedData(imported);
      navigate('/level');
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : '导入失败，请检查文件格式',
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 animate-fade-in">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-3xl shadow-lg shadow-primary-200 mb-6">
            <Droplets className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            城市雨水口巡检图
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            赛事运营巡检标注工具，草稿整理、过程回溯、结果导出一站完成
          </p>
        </header>

        <section className="mb-12 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {inspection.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    最近更新：{formatDate(inspection.updatedAt)}
                  </p>
                </div>
              </div>
              <span
                className={`chip ${inspection.status === 'completed' ? 'chip-inspected' : 'chip-pending'}`}
              >
                {inspection.status === 'completed' ? '已完成' : '进行中'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">雨水口总数</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {inspection.drainPoints.length}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-500">已通过</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {inspectedCount}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-500">待巡检</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {pendingCount}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-500">需整改</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {failedCount}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 font-medium">巡检进度</span>
                <span className="text-sm font-semibold text-primary-600">
                  {progress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleContinue}
                className="btn-primary flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                继续当前巡检
              </button>
              <button
                onClick={handleViewSettlement}
                className="btn-secondary flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                查看结算页
              </button>
            </div>
          </div>
        </section>

        <section className="mb-12 animate-slide-up" style={{ animationDelay: '160ms' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">日常入口</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleStartSample}
              className="card p-6 text-left hover:border-primary-300 border-2 border-transparent transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <Sparkles className="w-6 h-6 text-primary-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">加载示例数据</h4>
              <p className="text-sm text-gray-500">
                首次使用？用预置样例快速上手，无需先造表
              </p>
            </button>

            <button
              onClick={handleStartNew}
              className="card p-6 text-left hover:border-primary-300 border-2 border-transparent transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <RotateCcw className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">新建巡检</h4>
              <p className="text-sm text-gray-500">
                从空目录开始，创建全新的巡检任务
              </p>
            </button>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleImportClick}
                className="card p-6 text-left w-full hover:border-primary-300 border-2 border-transparent transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                  <Upload className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">导入草稿</h4>
                <p className="text-sm text-gray-500">
                  补录或续传已导出的 JSON 数据
                </p>
              </button>
              {importError && (
                <p className="text-sm text-red-600 mt-2 px-1">{importError}</p>
              )}
            </div>
          </div>
        </section>

        <section className="animate-slide-up" style={{ animationDelay: '240ms' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">使用流程</h3>
          <div className="card p-6">
            <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  title: '打开入口',
                  desc: '日常从撤销重做入口进入巡检',
                },
                {
                  step: '02',
                  title: '标注草稿',
                  desc: '地图上点选、更新雨水口状态',
                },
                {
                  step: '03',
                  title: '边界演练',
                  desc: '触发一次边界失败 + 一次撤销',
                },
                {
                  step: '04',
                  title: '结算导出',
                  desc: '界面摘要与导出文件完全一致',
                },
              ].map((item, i) => (
                <li key={i} className="relative">
                  <div className="text-3xl font-bold text-primary-100 mb-2">
                    {item.step}
                  </div>
                  <h5 className="font-semibold text-gray-900 mb-1">
                    {item.title}
                  </h5>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 text-xs text-gray-400 text-center">
            撤销历史：{past.length} 步 &nbsp;|&nbsp; 重做队列：{future.length} 步
          </div>
        </section>
      </div>
    </div>
  );
}
