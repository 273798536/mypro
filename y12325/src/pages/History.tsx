import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFractalStore } from '@/store/fractalStore';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Experiment } from '@/types';
import { 
  Trash2, 
  Eye, 
  GitCompare,
  X,
  Search,
  Filter,
  Calendar,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function History() {
  const navigate = useNavigate();
  const { 
    history, 
    deleteExperiment, 
    loadExperiment,
    selectedHistoryIds,
    toggleHistorySelection,
    clearSelection,
    compareMode,
    setCompareMode
  } = useFractalStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredHistory = history.filter((exp) => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadExperimentToWorkspace = (experiment: Experiment) => {
    loadExperiment(experiment.id);
    navigate('/');
  };

  const getStatusBadge = (status: Experiment['status'], errorType?: string) => {
    if (status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" /> 成功
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" /> {errorType === 'explosion' ? '爆炸' : '失败'}
        </span>
      );
    }
    if (status === 'running') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          运行中
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
        空闲
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索实验..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">全部状态</option>
                <option value="success">成功</option>
                <option value="failed">失败</option>
                <option value="running">运行中</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? 'primary' : 'secondary'}
              icon={<GitCompare className="w-4 h-4" />}
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode) clearSelection();
              }}
            >
              {compareMode ? '退出对比' : '对比模式'}
            </Button>
          </div>
        </div>
      </Card>

      {compareMode && selectedHistoryIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">
                已选择 {selectedHistoryIds.length} 个实验进行对比
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={clearSelection} icon={<X className="w-4 h-4" />}>
              清除选择
            </Button>
          </div>
        </Card>
      )}

      {filteredHistory.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">暂无历史记录</p>
            <Button onClick={() => navigate('/')}>去创建实验</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((experiment) => {
            const isSelected = selectedHistoryIds.includes(experiment.id);
            
            return (
              <Card
                key={experiment.id}
                className={`transition-all ${
                  compareMode && isSelected ? 'ring-2 ring-primary' : ''
                } ${compareMode ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : ''}`}
                onClick={() => compareMode && toggleHistorySelection(experiment.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {compareMode && (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                      )}
                      <h3 className="font-semibold text-lg text-neutral-dark">{experiment.name}</h3>
                      {getStatusBadge(experiment.status, experiment.errorType)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(experiment.createdAt).toLocaleString('zh-CN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        规则: <code className="font-mono bg-gray-100 px-1 rounded">{experiment.config.iterationRule}</code>
                      </span>
                      {experiment.fractalDimension && (
                        <span className="font-mono text-primary">
                          维度: {experiment.fractalDimension.toFixed(4)}
                        </span>
                      )}
                    </div>

                    {experiment.errorType && experiment.errorMessage && (
                      <div className="mb-3 max-w-lg">
                        <ErrorDisplay
                          errorType={experiment.errorType}
                          errorMessage={experiment.errorMessage}
                        />
                      </div>
                    )}

                    {experiment.config.note && (
                      <p className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
                        "{experiment.config.note}"
                      </p>
                    )}
                  </div>

                  {!compareMode && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="w-4 h-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          loadExperimentToWorkspace(experiment);
                        }}
                      >
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4 text-accent-danger" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteExperiment(experiment.id);
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">初始图形:</span>
                      <span className="ml-2 font-medium">{experiment.config.initialShape}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">迭代次数:</span>
                      <span className="ml-2 font-medium">{experiment.results.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">描边色:</span>
                      <span 
                        className="ml-2 inline-block w-4 h-4 rounded border"
                        style={{ backgroundColor: experiment.config.colorScheme.stroke }}
                      />
                    </div>
                    <div>
                      <span className="text-gray-500">填充色:</span>
                      <span 
                        className="ml-2 inline-block w-4 h-4 rounded border"
                        style={{ 
                          backgroundColor: experiment.config.colorScheme.fill.startsWith('#') 
                            ? experiment.config.colorScheme.fill 
                            : 'transparent' 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
