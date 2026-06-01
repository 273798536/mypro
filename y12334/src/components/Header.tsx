import { useState } from 'react';
import {
  Bell,
  Search,
  User,
  ChevronDown,
  Plus,
  FolderOpen
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';

export function Header() {
  const {
    projects,
    currentProjectId,
    setCurrentProject,
    createProject
  } = useAppStore();
  
  const currentProject = projects.find(p => p.id === currentProjectId);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName, newProjectDesc, {
        teamName: '质检一组',
        shift: '早班',
        supervisor: '张主管',
        members: ['李工', '王工', '赵工']
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setShowNewProjectModal(false);
      setShowProjectMenu(false);
    }
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <FolderOpen size={18} className="text-slate-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-slate-800">
                {currentProject?.name || '选择项目'}
              </div>
              <div className="text-xs text-slate-500">
                {currentProject ? `状态: ${currentProject.status === 'completed' ? '已完成' : '草稿'}` : '请选择或创建项目'}
              </div>
            </div>
            <ChevronDown size={16} className={cn(
              'text-slate-400 transition-transform',
              showProjectMenu && 'rotate-180'
            )} />
          </button>

          {showProjectMenu && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100">
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Plus size={16} />
                  <span className="text-sm font-medium">创建新项目</span>
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    暂无项目，请创建新项目
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setCurrentProject(project.id);
                        setShowProjectMenu(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0',
                        currentProjectId === project.id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{project.name}</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          project.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        )}>
                          {project.status === 'completed' ? '已完成' : '草稿'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {project.description || '无描述'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索..."
            className="pl-10 pr-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-sm font-medium text-slate-800">质量工程师</div>
            <div className="text-xs text-slate-500">质检部门</div>
          </div>
        </div>
      </div>

      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">创建新项目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  项目名称
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="例如：2024年Q1产品质检"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  项目描述
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="可选：简要描述项目内容"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
