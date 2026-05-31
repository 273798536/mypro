import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Save,
  X,
  FileCode,
  History,
  ArrowRight,
} from 'lucide-react';
import { useChartStore } from '../../store/useChartStore';
import { BadLine, ChartNote } from '../../types';
import { cn, formatTime, formatTimestamp } from '../../utils';
import { ProjectSidebar } from '../../components/ProjectSidebar/ProjectSidebar';

const badLineTypeLabels: Record<string, string> = {
  empty: '空行',
  comment: '注释',
  missing_column: '缺列',
  invalid_format: '格式错误',
};

const noteTypeLabels: Record<string, string> = {
  tap: '点击',
  hold: '长按',
  slide: '滑动',
  touch: '触摸',
};

export const ParsePage = () => {
  const navigate = useNavigate();
  const {
    getCurrentProject,
    parseCurrentProject,
    fixBadLine,
  } = useChartStore();
  const project = getCurrentProject();

  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedBadLine, setSelectedBadLine] = useState<BadLine | null>(null);
  const [selectedNote, setSelectedNote] = useState<ChartNote | null>(null);

  const handleParse = () => {
    parseCurrentProject();
  };

  const handleStartEdit = (line: BadLine) => {
    setEditingLine(line.lineNumber);
    setEditContent(line.content);
    setSelectedBadLine(line);
  };

  const handleSaveEdit = () => {
    if (editingLine !== null) {
      fixBadLine(editingLine, editContent, '独立游戏制作人');
      setEditingLine(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingLine(null);
    setEditContent('');
  };

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <ProjectSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileCode className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">请先选择或导入一个谱面项目</p>
          </div>
        </div>
      </div>
    );
  }

  const isParsed = project.notes.length > 0 || project.badLines.length > 0;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ProjectSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">数据解析</h1>
              <p className="text-slate-400 text-sm">解析谱面文件，处理异常行</p>
            </div>
            <div className="flex items-center gap-3">
              {!isParsed ? (
                <button
                  onClick={handleParse}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  开始解析
                </button>
              ) : (
                <button
                  onClick={() => navigate('/analysis')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  下一步：质检分析
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {isParsed && (
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">
                  有效Note: <span className="text-white font-medium">{project.notes.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">
                  异常行: <span className="text-white font-medium">{project.badLines.length}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {isParsed ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 border-r border-slate-700 flex flex-col">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  异常行列表 ({project.badLines.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {project.badLines.map(line => (
                  <div
                    key={line.lineNumber}
                    className={cn(
                      'p-3 rounded-lg border transition-all duration-200',
                      line.fixed
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-amber-500/5 border-amber-500/30',
                      selectedBadLine?.lineNumber === line.lineNumber && 'ring-2 ring-white/20'
                    )}
                    onClick={() => setSelectedBadLine(line)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                            Ln {line.lineNumber}
                          </span>
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                            {badLineTypeLabels[line.type]}
                          </span>
                          {line.fixed && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                              已修正
                            </span>
                          )}
                        </div>
                        {editingLine === line.lineNumber ? (
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-white font-mono"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="text-xs text-slate-400 font-mono truncate">
                            {line.content || '(空行)'}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">{line.reason}</p>
                      </div>
                      {editingLine === line.lineNumber ? (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(line);
                          }}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {line.fixHistory && line.fixHistory.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                          <History className="w-3 h-3" />
                          修正记录
                        </div>
                        {line.fixHistory.map(record => (
                          <div key={record.id} className="text-xs text-slate-400 mb-1">
                            <span className="text-slate-300">{record.operator}</span>
                            <span className="text-slate-600 mx-1">@</span>
                            <span>{formatTimestamp(record.timestamp)}</span>
                            <p className="text-slate-500 mt-0.5">
                              "{record.originalContent.slice(0, 30)}" → "{record.newContent.slice(0, 30)}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {project.badLines.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm">无异常行</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Note列表 ({project.notes.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-slate-400 text-xs">
                      <th className="text-left py-2 px-4">#</th>
                      <th className="text-left py-2 px-4">时间</th>
                      <th className="text-left py-2 px-4">类型</th>
                      <th className="text-left py-2 px-4">轨道</th>
                      <th className="text-left py-2 px-4">时长</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.notes.map((note, index) => (
                      <tr
                        key={note.id}
                        className={cn(
                          'border-t border-slate-800 cursor-pointer hover:bg-slate-800/50',
                          selectedNote?.id === note.id && 'bg-slate-800'
                        )}
                        onClick={() => setSelectedNote(note)}
                      >
                        <td className="py-2 px-4 text-slate-500">{index + 1}</td>
                        <td className="py-2 px-4 text-slate-300 font-mono">{formatTime(note.time)}</td>
                        <td className="py-2 px-4">
                          <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
                            {noteTypeLabels[note.type]}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-300">{note.column}</td>
                        <td className="py-2 px-4 text-slate-400">
                          {note.duration ? `${note.duration}ms` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                <Play className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-4">点击"开始解析"处理谱面文件</p>
              <p className="text-xs text-slate-600 max-w-sm">
                系统将自动识别空行、注释、缺列等异常情况，并将其单独列出供人工复核
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
