import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { FlaskConical, Database, ArrowRight } from 'lucide-react';

export function SampleDataInit() {
  const { initialized, checkInitStatus, initSampleData } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkInitStatus().finally(() => setChecking(false));
  }, [checkInitStatus]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">正在检查数据状态...</div>
      </div>
    );
  }

  if (initialized) {
    return null;
  }

  const handleInit = async () => {
    setLoading(true);
    try {
      await initSampleData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
            <FlaskConical className="w-8 h-8 text-sky-600" />
          </div>

          <h1 className="text-xl font-semibold text-slate-800 mb-2">
            薄膜镀层厚度估算系统
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            欢迎使用实验室管理系统。首次运行需要初始化示例数据。
          </p>

          <div className="w-full bg-slate-50 rounded-md p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">示例数据包含：</p>
                <ul className="text-sm text-slate-500 mt-2 space-y-1">
                  <li>• 6 条试剂台账记录</li>
                  <li>• 5 个测试批次</li>
                  <li>• 4 条厚度估算历史</li>
                  <li>• 4 条谱图记录</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleInit}
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '正在初始化...' : '加载示例数据并开始使用'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </button>

          <p className="text-xs text-slate-400 mt-4">
            也可以通过 API 导入自己的数据，详见文档
          </p>
        </div>
      </div>
    </div>
  );
}
