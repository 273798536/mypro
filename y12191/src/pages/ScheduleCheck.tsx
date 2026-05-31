import { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { classifyCheckResults } from '../engine/scheduleEngine';
import { CheckResultCard } from '../components/CheckResultCard';
import { SampleTypeBadge, AssignmentStatusBadge } from '../components/StatusBadge';
import type { SampleType, AssignmentStatus } from '../types';

type FilterType = 'all' | SampleType;
type StatusFilter = 'all' | AssignmentStatus;

export function ScheduleCheck() {
  const { checkResults, isLoading, runScheduleCheck, currentPhase } = useScheduleStore();
  
  const [sampleFilter, setSampleFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({
    normal: true,
    boundary: true,
    bad: true
  });
  
  const classified = useMemo(() => classifyCheckResults(checkResults), [checkResults]);
  
  const filteredResults = useMemo(() => {
    return checkResults.filter(result => {
      const matchesSample = sampleFilter === 'all' || result.sampleType === sampleFilter;
      const matchesStatus = statusFilter === 'all' || result.assignment.status === statusFilter;
      const matchesSearch = searchQuery === '' || 
        result.volunteer.name.includes(searchQuery) ||
        result.position.name.includes(searchQuery) ||
        result.issues.some(i => i.message.includes(searchQuery));
      
      return matchesSample && matchesStatus && matchesSearch;
    });
  }, [checkResults, sampleFilter, statusFilter, searchQuery]);
  
  const filteredClassified = useMemo(() => {
    return {
      normal: filteredResults.filter(r => r.sampleType === 'normal'),
      boundary: filteredResults.filter(r => r.sampleType === 'boundary'),
      bad: filteredResults.filter(r => r.sampleType === 'bad')
    };
  }, [filteredResults]);
  
  const handleRefresh = async () => {
    if (currentPhase === 'idle') return;
    const phase = currentPhase === 'comparing' ? 'corrected' : currentPhase as 'phase1' | 'phase2';
    await runScheduleCheck(phase, '手动刷新检查');
  };
  
  const toggleSection = (section: string) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const sections = [
    { 
      key: 'bad', 
      label: '异常样本', 
      icon: XCircle, 
      color: 'text-wine-600',
      bgColor: 'bg-wine-50',
      borderColor: 'border-wine-200',
      results: filteredClassified.bad,
      originalCount: classified.bad.length
    },
    { 
      key: 'boundary', 
      label: '边界样本', 
      icon: AlertTriangle, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      results: filteredClassified.boundary,
      originalCount: classified.boundary.length
    },
    { 
      key: 'normal', 
      label: '正常样本', 
      icon: CheckCircle, 
      color: 'text-forest-600',
      bgColor: 'bg-forest-50',
      borderColor: 'border-forest-200',
      results: filteredClassified.normal,
      originalCount: classified.normal.length
    },
  ];
  
  if (checkResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-navy-600 mb-2">暂无检查结果</p>
          <p className="text-sm text-navy-500">请先在「数据导入」页面导入数据</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            排班检查结果
          </h1>
          <p className="text-navy-500 mt-1">
            查看所有排班分配的约束检查结果
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading || currentPhase === 'idle'}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            重新检查
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-navy-400" />
            <span className="text-sm text-navy-600">样本类型:</span>
          </div>
          {(['all', 'normal', 'boundary', 'bad'] as FilterType[]).map(type => (
            <button
              key={type}
              onClick={() => setSampleFilter(type)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                sampleFilter === type
                  ? 'bg-navy-800 text-white'
                  : 'bg-white text-navy-600 hover:bg-navy-50 border border-navy-200'
              }`}
            >
              {type === 'all' ? '全部' : type === 'normal' ? '正常' : type === 'boundary' ? '边界' : '异常'}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm text-navy-600">分配状态:</span>
          </div>
          {(['all', 'assigned', 'backup', 'rejected'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-navy-800 text-white'
                  : 'bg-white text-navy-600 hover:bg-navy-50 border border-navy-200'
              }`}
            >
              {status === 'all' ? '全部' : status === 'assigned' ? '已分配' : status === 'backup' ? '候补' : '已拒绝'}
            </button>
          ))}
        </div>
        
        <div className="flex-1 max-w-md ml-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索志愿者、岗位或问题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-50 rounded flex items-center justify-center">
              <span className="text-xl font-bold text-navy-600">{checkResults.length}</span>
            </div>
            <div>
              <p className="text-sm text-navy-500">总检查数</p>
              <p className="text-xs text-navy-400">
                筛选后: {filteredResults.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 border-l-4 border-l-forest-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forest-50 rounded flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-forest-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-forest-600">{classified.normal.length}</p>
              <p className="text-xs text-navy-500">正常样本</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{classified.boundary.length}</p>
              <p className="text-xs text-navy-500">边界样本</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 border-l-4 border-l-wine-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wine-50 rounded flex items-center justify-center">
              <XCircle className="w-5 h-5 text-wine-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-wine-600">{classified.bad.length}</p>
              <p className="text-xs text-navy-500">异常样本</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection[section.key];
          
          return (
            <div key={section.key} className="card">
              <div 
                className={`card-header flex items-center justify-between cursor-pointer ${section.bgColor} border-b ${section.borderColor}`}
                onClick={() => toggleSection(section.key)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${section.color}`} />
                  <span className="font-display text-lg font-semibold text-navy-900">
                    {section.label}
                  </span>
                  <span className="badge bg-white text-navy-700">
                    {section.results.length} / {section.originalCount}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-navy-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-navy-400" />
                )}
              </div>
              
              {isExpanded && (
                <div className="card-body">
                  {section.results.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-navy-500">
                        {searchQuery ? '没有匹配的搜索结果' : `暂无${section.label}`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {section.results.map((result) => (
                        <CheckResultCard 
                          key={result.id} 
                          result={result}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="card">
        <div className="card-header">
          检查规则说明
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-700 mb-2">错误级检查（导致异常样本）</p>
              <ul className="space-y-2 text-sm text-navy-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>岗位冲突:</strong> 同一志愿者同一时段分配多个岗位</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>培训缺失:</strong> 未完成岗位要求的必要培训</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>临时请假:</strong> 排班时段志愿者已请假</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-wine-500 mt-1.5"></span>
                  <span><strong>技能不匹配:</strong> 缺少岗位要求的必要技能</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-700 mb-2">警告级检查（导致边界样本）</p>
              <ul className="space-y-2 text-sm text-navy-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></span>
                  <span><strong>容量超限:</strong> 岗位分配人数超过容量上限</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></span>
                  <span><strong>时段不匹配:</strong> 排班时段不在志愿者可用时段内</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></span>
                  <span><strong>培训过期:</strong> 培训资质即将在30天内过期</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
