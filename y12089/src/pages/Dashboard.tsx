import { useEffect, useState } from 'react';
import {
  Plus,
  Upload,
  FolderOpen,
  Clock,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  User
} from 'lucide-react';
import { useAppStore } from '@/store';
import { DataPackage } from '@/types';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  const {
    packages,
    loadPackages,
    createPackage,
    deletePackage,
    runAnalysis,
    isLoading,
    setCurrentPackage
  } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [isComplexCase, setIsComplexCase] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleCreatePackage = async () => {
    if (!newPackageName.trim()) return;
    
    const id = await createPackage(
      newPackageName,
      newPatientName || '匿名患者'
    );
    setShowCreateModal(false);
    setNewPackageName('');
    setNewPatientName('');
    
    setAnalyzingId(id);
    await runAnalysis(id, isComplexCase);
    setAnalyzingId(null);
    
    await setCurrentPackage(id);
    navigate(`/analysis/${id}`);
  };

  const handleOpenPackage = async (pkg: DataPackage) => {
    await setCurrentPackage(pkg.id);
    navigate(`/analysis/${pkg.id}`);
  };

  const handleRunAnalysis = async (pkg: DataPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzingId(pkg.id);
    await runAnalysis(pkg.id, true);
    setAnalyzingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个数据包吗？')) {
      await deletePackage(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: DataPackage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'analyzing':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: DataPackage['status']) => {
    switch (status) {
      case 'completed': return '分析完成';
      case 'analyzing': return '分析中...';
      case 'error': return '分析失败';
      default: return '待分析';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">咬合接触图分析系统</h1>
              <p className="text-xs text-gray-500">Occlusal Contact Analysis</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            新建分析
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-500/20">
            <div className="text-3xl font-bold text-blue-400">{packages.length}</div>
            <div className="text-sm text-gray-400 mt-1">总数据包</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-green-900/30 to-green-800/10 border border-green-500/20">
            <div className="text-3xl font-bold text-green-400">
              {packages.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-400 mt-1">已完成分析</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-500/20">
            <div className="text-3xl font-bold text-purple-400">
              {packages.filter(p => p.status === 'completed').filter(p => p.files.length > 2).length}
            </div>
            <div className="text-sm text-gray-400 mt-1">复杂病例</div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">历史记录</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={14} />
            按创建时间排序
          </div>
        </div>

        {packages.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/50">
            <FolderOpen size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">暂无数据包</h3>
            <p className="text-sm text-gray-500 mb-6">
              点击"新建分析"按钮创建您的第一个分析案例
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              <Upload size={18} />
              开始使用
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map(pkg => (
              <div
                key={pkg.id}
                onClick={() => handleOpenPackage(pkg)}
                className="p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                      <FolderOpen size={20} className="text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {pkg.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <User size={12} />
                        <span>{pkg.patientName || '未命名患者'}</span>
                        <span className="mx-2">·</span>
                        <span>{formatDate(pkg.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(pkg.status)}
                          <span className="text-xs text-gray-400">
                            {getStatusText(pkg.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {pkg.files.length} 个文件
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {pkg.status === 'completed' ? (
                      <button
                        onClick={(e) => handleOpenPackage(pkg)}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        title="查看分析"
                      >
                        <FolderOpen size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleRunAnalysis(pkg, e)}
                        disabled={analyzingId === pkg.id}
                        className="p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                        title="运行分析"
                      >
                        {analyzingId === pkg.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(pkg.id, e)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-cyan-900/30 border border-gray-700">
          <h3 className="font-semibold text-white mb-2">测试脏样例</h3>
          <p className="text-sm text-gray-400 mb-4">
            系统预置了复杂病例样例，包含上下颌错位与磨改过量叠加的场景。
            创建新案例时勾选"复杂病例模式"即可测试冲突分离算法。
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-red-900/30 text-red-400 border border-red-500/30">
              错位检测
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-orange-900/30 text-orange-400 border border-orange-500/30">
              磨改分析
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-purple-900/30 text-purple-400 border border-purple-500/30">
              冲突分离
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-blue-900/30 text-blue-400 border border-blue-500/30">
              证据溯源
            </span>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">新建分析</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  案例名称
                </label>
                <input
                  type="text"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  placeholder="例如：病例 #2024-001"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  患者姓名
                </label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="可选"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="p-4 rounded-lg bg-gray-800/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isComplexCase}
                    onChange={(e) => setIsComplexCase(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-gray-200">复杂病例模式</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      包含错位与磨改叠加场景，启用冲突分离算法
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreatePackage}
                disabled={!newPackageName.trim() || isLoading}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    分析中...
                  </>
                ) : (
                  '创建并分析'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
