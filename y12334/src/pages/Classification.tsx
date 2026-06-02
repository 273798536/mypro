import { useState } from 'react';
import {
  FolderTree,
  Search,
  Link2,
  CheckCircle2,
  FileText,
  Package,
  Users,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../store';
import { autoClassifyRecords, findMatchingProject } from '../utils/classification';
import type { DefectRecord } from '../types';
import { cn } from '../lib/utils';

export default function Classification() {
  const {
    projects,
    defectRecords,
    currentProjectId,
    setCurrentProject
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const currentRecords = currentProjectId ? defectRecords.get(currentProjectId) || [] : [];
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedRecords = selectedProjectId ? defectRecords.get(selectedProjectId) || [] : [];

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAutoClassify = () => {
    if (!currentProjectId || currentRecords.length === 0) return;

    const projectRecordsMap = new Map<string, DefectRecord[]>();
    projects.forEach(p => {
      if (p.id !== currentProjectId) {
        projectRecordsMap.set(p.id, defectRecords.get(p.id) || []);
      }
    });

    const result = autoClassifyRecords(currentRecords, projects.filter(p => p.id !== currentProjectId), projectRecordsMap);
    
    if (result.projectId) {
      setSelectedProjectId(result.projectId);
    }
  };

  const getMatchInfo = (projectId: string) => {
    if (!currentProjectId || currentRecords.length === 0) return null;
    
    const projectRecordsMap = new Map<string, DefectRecord[]>();
    projectRecordsMap.set(projectId, defectRecords.get(projectId) || []);
    
    const targetProject = projects.filter(p => p.id === projectId);
    
    return findMatchingProject(currentRecords, targetProject, projectRecordsMap);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">智能归类中心</h1>
          <p className="text-slate-500 mt-1">基于缺陷记录、产品批次、抽检数量自动关联项目</p>
        </div>
        <button
          onClick={handleAutoClassify}
          disabled={currentRecords.length === 0}
          className={cn(
            'flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-all',
            currentRecords.length === 0
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 shadow-lg shadow-violet-600/30'
          )}
        >
          <Sparkles size={16} />
          智能归类
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{projects.length}</p>
              <p className="text-sm text-slate-500">项目总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {Array.from(defectRecords.values()).reduce((sum, r) => sum + r.length, 0)}
              </p>
              <p className="text-sm text-slate-500">缺陷记录</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Link2 size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {projects.filter(p => (defectRecords.get(p.id)?.length || 0) > 0).length}
              </p>
              <p className="text-sm text-slate-500">已关联项目</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {[...new Set(projects.map(p => p.teamInfo.teamName))].length}
              </p>
              <p className="text-sm text-slate-500">班组数量</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree size={18} className="text-slate-500" />
                <h3 className="font-semibold text-slate-800">项目列表</h3>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索项目..."
                  className="pl-8 pr-3 py-1.5 w-48 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FolderTree size={40} className="mx-auto mb-3 text-slate-300" />
                <p>暂无项目</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredProjects.map((project) => {
                  const projectRecords = defectRecords.get(project.id) || [];
                  const matchInfo = currentProjectId && project.id !== currentProjectId ? getMatchInfo(project.id) : null;
                  
                  return (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        'p-4 cursor-pointer transition-colors hover:bg-slate-50',
                        selectedProjectId === project.id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            project.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                          )} />
                          <div>
                            <p className="font-medium text-slate-800">{project.name}</p>
                            <p className="text-xs text-slate-500">{project.teamInfo.teamName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {matchInfo && matchInfo.confidence > 0.3 && (
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              matchInfo.confidence > 0.6
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            )}>
                              匹配度 {(matchInfo.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {projectRecords.length} 条记录
                          </span>
                        </div>
                      </div>
                      {matchInfo && matchInfo.matchedFields.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <ArrowRightLeft size={12} className="text-slate-400" />
                          {matchInfo.matchedFields.map((field, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">项目详情</h3>
          
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <FolderTree size={48} className="mb-3 text-slate-300" />
              <p>请选择一个项目查看详情</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">基本信息</h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">项目名称</span>
                    <span className="text-sm font-medium text-slate-800">{selectedProject.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">状态</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      selectedProject.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}>
                      {selectedProject.status === 'completed' ? '已完成' : '进行中'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">显著性水平</span>
                    <span className="text-sm font-mono text-slate-800">α = {selectedProject.significanceLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">记录数</span>
                    <span className="text-sm font-medium text-slate-800">{selectedRecords.length}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">班组信息</h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">班组名称</span>
                    <span className="text-sm font-medium text-slate-800">{selectedProject.teamInfo.teamName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">主管</span>
                    <span className="text-sm font-medium text-slate-800">{selectedProject.teamInfo.supervisor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">班次</span>
                    <span className="text-sm font-medium text-slate-800">{selectedProject.teamInfo.shift}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">成员</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedProject.teamInfo.members.map((member, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-white rounded text-slate-600 border border-slate-200">
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setCurrentProject(selectedProjectId);
                }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                切换到此项目
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles size={20} className="text-violet-600" />
          </div>
          <div>
            <h4 className="font-semibold text-violet-800">智能归类说明</h4>
            <p className="text-sm text-violet-600 mt-1">
              系统会基于以下线索自动归类缺陷记录到对应项目：产品批次号、材料来源、缺陷类型、生产线、班次等。
              归类算法会计算相似度，当匹配度超过 60% 时会推荐关联到对应项目。同一批数据多次归类结果一致。
            </p>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-violet-600">
                <CheckCircle2 size={12} />
                幂等性保证
              </div>
              <div className="flex items-center gap-1 text-xs text-violet-600">
                <CheckCircle2 size={12} />
                多维度匹配
              </div>
              <div className="flex items-center gap-1 text-xs text-violet-600">
                <CheckCircle2 size={12} />
                可追溯来源
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
