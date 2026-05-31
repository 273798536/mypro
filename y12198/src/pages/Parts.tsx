import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Clock, XCircle, AlertCircle, GitBranch, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Part } from '../../shared/types';

export default function Parts() {
  const navigate = useNavigate();
  const { parts, issues, latestVersion, buildTrace } = useStore();
  const [filterSection, setFilterSection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const sectionLabels: Record<string, string> = {
    string: '弦乐',
    woodwind: '木管',
    brass: '铜管',
    percussion: '打击乐',
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    confirmed: { label: '已确认', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
    distributed: { label: '已发放', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    outdated: { label: '过时', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle },
    pending: { label: '待发放', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: AlertCircle },
  };

  const filteredParts = parts.filter(part => {
    const matchesSection = filterSection === 'all' || part.section === filterSection;
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const groupedParts = filteredParts.reduce((acc, part) => {
    if (!acc[part.section]) {
      acc[part.section] = [];
    }
    acc[part.section].push(part);
    return acc;
  }, {} as Record<string, Part[]>);

  const getPartIssues = (partId: string) => issues.filter(i => i.partId === partId && !i.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-slate-800">声部对账</h2>
          <p className="text-sm text-slate-500 mt-1">检查各声部曲谱版本和发放状态，确保所有声部持有最新版本</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索声部..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent w-48"
            />
          </div>
          <div className="relative">
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
            >
              <option value="all">全部声部</option>
              <option value="string">弦乐</option>
              <option value="woodwind">木管</option>
              <option value="brass">铜管</option>
              <option value="percussion">打击乐</option>
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {Object.entries(groupedParts).map(([section, sectionParts]) => (
        <div key={section} className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-1 h-5 bg-slate-800 rounded-full" />
            {sectionLabels[section]}
            <span className="text-sm font-normal text-slate-500">({sectionParts.length}个声部)</span>
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {sectionParts.map(part => {
              const config = statusConfig[part.status];
              const StatusIcon = config.icon;
              const partIssues = getPartIssues(part.id);
              
              return (
                <div
                  key={part.id}
                  className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-slate-800">{part.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${config.bg} ${config.color}`}>
                          <StatusIcon size={12} className="inline mr-1" />
                          {config.label}
                        </span>
                        {partIssues.length > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">
                          {partIssues.length} 问题
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-slate-700">
                        <span className={part.currentVersion === latestVersion ? 'text-emerald-600' : 'text-red-600'}>
                          {part.currentVersion}
                        </span>
                      </p>
                      {part.currentVersion !== latestVersion && (
                        <p className="text-xs text-red-500">最新: {latestVersion}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    {part.distributedAt && (
                      <p>发放: {new Date(part.distributedAt).toLocaleDateString('zh-CN')}</p>
                    )}
                    {part.confirmedAt && part.confirmedBy && (
                      <p>确认: {part.confirmedBy} · {new Date(part.confirmedAt).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        buildTrace(part.id);
                        navigate('/trace');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <GitBranch size={14} />
                      追溯
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredParts.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          没有找到匹配的声部
        </div>
      )}
    </div>
  );
}
