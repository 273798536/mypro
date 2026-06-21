import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  User, 
  FileText, 
  Image as ImageIcon, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  GitCompare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSnapshotStore } from '@/store/snapshotStore';
import type { CostSnapshot } from '@/types';
import { 
  formatDate, 
  formatCurrency, 
  getStatusLabel, 
  getDecisionLabel,
  getDecisionColor
} from '@/utils/formatters';

const statusColors = {
  normal: 'bg-emerald-500 border-emerald-400',
  warning: 'bg-amber-500 border-amber-400',
  error: 'bg-red-500 border-red-400',
};

export default function Timeline() {
  const navigate = useNavigate();
  const { 
    snapshots, 
    setCurrentSnapshot, 
    selectedForCompare, 
    toggleCompareSelection,
    addNote 
  } = useSnapshotStore();
  const [selectedSnapshot, setSelectedSnapshot] = useState<CostSnapshot | null>(snapshots[0]);
  const [activeTab, setActiveTab] = useState<'params' | 'notes' | 'screenshots' | 'judgment'>('params');
  const [newNote, setNewNote] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-snapshot-id');
          if (id) {
            if (entry.isIntersecting) {
              setVisibleNodes((prev) => new Set([...prev, id]));
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    const nodes = timelineRef.current?.querySelectorAll('[data-snapshot-id]');
    nodes?.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [snapshots]);

  const handleAddNote = () => {
    if (selectedSnapshot && newNote.trim()) {
      addNote(selectedSnapshot.id, {
        content: newNote,
        author: '许工',
        createdAt: new Date().toISOString(),
        isSupplement: true
      });
      setNewNote('');
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      navigate('/compare');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            历史时间线
          </motion.h1>
          <motion.p 
            className="text-slate-400"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            追溯每个版本的参数变更、备注和人工判断，保留完整历史记录
          </motion.p>
        </div>

        <div className="flex items-center gap-3">
          {selectedForCompare.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <span className="text-sm text-blue-400">
                已选择 {selectedForCompare.length}/2 个版本
              </span>
              {selectedForCompare.length === 2 && (
                <button onClick={handleCompare} className="btn btn-primary text-sm">
                  <GitCompare className="w-4 h-4" />
                  开始对比
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              版本历史
            </h3>
            <div 
              ref={timelineRef}
              className="relative pl-8 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin pr-4"
            >
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-700" />
              
              {snapshots.map((snapshot, index) => (
                <motion.div
                  key={snapshot.id}
                  data-snapshot-id={snapshot.id}
                  className={`relative cursor-pointer group ${
                    selectedSnapshot?.id === snapshot.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: visibleNodes.has(snapshot.id) ? 1 : 0.3,
                    x: visibleNodes.has(snapshot.id) ? 0 : -20
                  }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onClick={() => setSelectedSnapshot(snapshot)}
                >
                  <div className={`absolute -left-5 top-2 timeline-node ${statusColors[snapshot.status]}`}>
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
                  </div>

                  <div className={`p-4 rounded-xl border transition-all ${
                    selectedSnapshot?.id === snapshot.id
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-display text-white font-semibold">
                            {snapshot.version}
                          </span>
                          <span className={`badge badge-${snapshot.status} text-xs`}>
                            {getStatusLabel(snapshot.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono-display mt-1">
                          {snapshot.modelVersion}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompareSelection(snapshot.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          selectedForCompare.includes(snapshot.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                        title="选择对比"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {snapshot.operator}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(snapshot.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-white font-mono-display">
                        {formatCurrency(snapshot.totalCost)}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {snapshot.notes.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {snapshot.screenshots.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          {selectedSnapshot ? (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white font-mono-display">
                      {selectedSnapshot.version}
                    </h2>
                    <p className="text-slate-400 text-sm">{selectedSnapshot.modelVersion}</p>
                  </div>
                  <div className={`badge badge-${selectedSnapshot.status} px-3 py-1`}>
                    {getStatusLabel(selectedSnapshot.status)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">总成本</p>
                    <p className="text-2xl font-bold text-white font-mono-display">
                      {formatCurrency(selectedSnapshot.totalCost)}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">操作人</p>
                    <p className="text-lg text-white">{selectedSnapshot.operator}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">创建时间</p>
                    <p className="text-sm text-white">{formatDate(selectedSnapshot.createdAt)}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-6 border-b border-slate-700">
                  {[
                    { key: 'params', label: '参数详情', icon: FileText },
                    { key: 'notes', label: '备注历史', icon: MessageSquare },
                    { key: 'screenshots', label: '截图归档', icon: ImageIcon },
                    { key: 'judgment', label: '人工判断', icon: CheckCircle },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeTab === tab.key
                          ? 'text-blue-400 border-blue-400'
                          : 'text-slate-400 border-transparent hover:text-white'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="min-h-[400px]">
                  {activeTab === 'params' && (
                    <div className="space-y-3">
                      {selectedSnapshot.parameters.map((param) => (
                        <div
                          key={param.id}
                          className="p-4 bg-slate-900/30 rounded-lg border border-slate-700/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{param.name}</span>
                            <span className="font-mono-display text-lg text-white">
                              {param.value}
                              <span className="text-sm text-slate-500 ml-1">{param.unit}</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-slate-500">公式</p>
                              <code className="formula-node text-blue-300">{param.formula}</code>
                            </div>
                            <div>
                              <p className="text-slate-500">边界范围</p>
                              <p className="text-slate-300">
                                {param.minBoundary} - {param.maxBoundary} {param.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">数据来源</p>
                              <p className="text-slate-300">{param.source}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">说明</p>
                              <p className="text-slate-300">{param.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className="space-y-4">
                      {selectedSnapshot.notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 rounded-lg border ${
                            note.isSupplement
                              ? 'bg-amber-500/5 border-amber-500/30'
                              : 'bg-slate-900/30 border-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{note.author}</span>
                              {note.isSupplement && (
                                <span className="badge badge-warning text-xs">补充备注</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm">{note.content}</p>
                        </div>
                      ))}

                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="添加补充备注..."
                          className="w-full bg-transparent text-white text-sm placeholder-slate-500 resize-none focus:outline-none"
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim()}
                            className="btn btn-primary text-sm disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            添加备注
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'screenshots' && (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSnapshot.screenshots.map((screenshot) => (
                        <div
                          key={screenshot.id}
                          className="group relative"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden border border-slate-700/50">
                            <img
                              src={screenshot.url}
                              alt={screenshot.description}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-white">{screenshot.description}</p>
                            <p className="text-xs text-slate-500">{formatDate(screenshot.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'judgment' && (
                    <div>
                      {selectedSnapshot.manualJudgment ? (
                        <div className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                selectedSnapshot.manualJudgment.decision === 'approve'
                                  ? 'bg-emerald-500/20'
                                  : selectedSnapshot.manualJudgment.decision === 'reject'
                                  ? 'bg-red-500/20'
                                  : 'bg-amber-500/20'
                              }`}>
                                {selectedSnapshot.manualJudgment.decision === 'approve' ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                                ) : selectedSnapshot.manualJudgment.decision === 'reject' ? (
                                  <XCircle className="w-5 h-5 text-red-400" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-amber-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {selectedSnapshot.manualJudgment.author}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDate(selectedSnapshot.manualJudgment.createdAt)}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDecisionColor(selectedSnapshot.manualJudgment.decision)} bg-current/10`}>
                              {getDecisionLabel(selectedSnapshot.manualJudgment.decision)}
                            </span>
                          </div>
                          <div className="p-4 bg-slate-900/50 rounded-lg">
                            <p className="text-slate-300 leading-relaxed">
                              {selectedSnapshot.manualJudgment.content}
                            </p>
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            *人工判断记录永久保留，新版本判断不会覆盖历史记录
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-500">
                          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>暂无人工判断记录</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-20">
              <Clock className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">选择左侧版本查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
