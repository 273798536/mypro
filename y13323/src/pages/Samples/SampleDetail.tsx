import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Layers,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  MessageSquare,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from '@/utils/format';
import clsx from 'clsx';

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSampleById, getNotesByTarget, addNote } = useAppStore();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);

  const sample = getSampleById(id || '');
  const notes = getNotesByTarget('sample', id || '');

  if (!sample) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">样本不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/samples')}>
          返回样本列表
        </Button>
      </div>
    );
  }

  const currentVersion = sample.versions[sample.versions.length - 1];
  const versionsToShow = selectedVersion !== null
    ? sample.versions.filter((v) => v.version === selectedVersion)
    : [currentVersion];

  const displayedVersion = versionsToShow[0];

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    addNote({
      content: noteInput,
      author: '小乔',
      targetType: 'sample',
      targetId: sample.id,
    });
    setNoteInput('');
  };

  const renderDiffContent = (content: string) => {
    return content;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/samples')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-serif-sc font-semibold text-deep-blue-500">
            {sample.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sample.studentName} · {sample.grade} · {sample.studentId}
          </p>
        </div>
        <span
          className={clsx(
            'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border',
            getStatusColor(sample.status)
          )}
        >
          {getStatusLabel(sample.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500">
                作文内容
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={clsx(
                    'text-sm px-3 py-1.5 rounded-lg transition-colors',
                    compareMode
                      ? 'bg-accent-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Layers size={14} className="inline mr-1" />
                  版本对比
                </button>
              </div>
            </div>

            {compareMode ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="info">旧版本 v{sample.currentVersion - 1}</Badge>
                    <select
                      value={compareVersion || sample.currentVersion - 1}
                      onChange={(e) => setCompareVersion(Number(e.target.value))}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      {sample.versions.slice(0, -1).map((v) => (
                        <option key={v.version} value={v.version}>
                          v{v.version}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-48">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {sample.versions[0].content}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="success">当前版本 v{sample.currentVersion}</Badge>
                  </div>
                  <div className="p-4 bg-status-success/5 rounded-lg border border-status-success/20 min-h-48">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {renderDiffContent(currentVersion.content)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50/50 rounded-lg border border-gray-100">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {displayedVersion.content}
                </p>
              </div>
            )}

            {displayedVersion.diffHighlights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  变更要点
                </p>
                <div className="space-y-2">
                  {displayedVersion.diffHighlights.map((diff, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex items-start gap-2 text-sm p-2 rounded',
                        diff.type === 'added' && 'bg-status-success/5 text-status-success',
                        diff.type === 'removed' && 'bg-status-error/5 text-status-error',
                        diff.type === 'modified' && 'bg-status-warning/5 text-status-warning'
                      )}
                    >
                      <span className="font-medium">{diff.field}：</span>
                      {diff.type === 'modified' ? (
                        <span>
                          <span className="line-through">{diff.oldValue}</span>
                          {' → '}
                          <span className="font-medium">{diff.newValue}</span>
                        </span>
                      ) : diff.type === 'added' ? (
                        <span>新增 {diff.newValue}</span>
                      ) : (
                        <span>移除 {diff.oldValue}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {sample.isLeakSuspected && (
            <Card className="p-5 border-status-warning/30 bg-status-warning/5">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="text-status-warning flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-status-warning">
                    疑似样本泄漏
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {sample.leakReason}
                  </p>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      建议处理步骤：
                    </p>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>核对该样本的原始提交渠道和时间</li>
                      <li>与训练集做详细相似度比对</li>
                      <li>确认是否为常见范文导致的误判</li>
                      <li>根据核查结果决定保留或移除</li>
                    </ol>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline">
                      查看相似度报告
                    </Button>
                    <Button size="sm" variant="primary">
                      <CheckCircle size={14} />
                      标记为正常
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500">
                备注记录
              </h3>
              <Badge variant="info">{notes.length} 条</Badge>
            </div>

            <div className="space-y-4 mb-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {note.author}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  暂无备注
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="添加备注..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue-500/30 focus:border-accent-blue-500"
              />
              <Button onClick={handleAddNote}>
                <Plus size={16} />
                添加
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              评分信息
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">当前分数</span>
                <span className="text-2xl font-bold text-deep-blue-500 font-mono">
                  {currentVersion.score}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">等级</span>
                <Badge variant="success" size="md">
                  {currentVersion.gradeResult}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">变更来源</span>
                <span className="text-sm text-gray-700">
                  {currentVersion.changedBy === 'algorithm'
                    ? '算法评分'
                    : currentVersion.changedBy === 'human'
                    ? '人工改判'
                    : '阈值调整'}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">变更说明</p>
                <p className="text-sm text-gray-700">
                  {currentVersion.changeDescription}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Layers size={16} className="text-gray-400" />
              版本历史
            </h3>
            <div className="space-y-2">
              {sample.versions
                .slice()
                .reverse()
                .map((version, index) => (
                  <button
                    key={version.version}
                    onClick={() => {
                      setSelectedVersion(
                        selectedVersion === version.version
                          ? null
                          : version.version
                      );
                      setCompareMode(false);
                    }}
                    className={clsx(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      (selectedVersion === version.version ||
                        (selectedVersion === null &&
                          index === 0))
                        ? 'border-accent-blue-500 bg-accent-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="info">v{version.version}</Badge>
                      <span className="font-mono text-sm text-deep-blue-500 font-medium">
                        {version.score}分
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(version.createdAt)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {version.changeDescription}
                    </p>
                  </button>
                ))}
            </div>
          </Card>

          <div className="space-y-2">
            <Button variant="primary" className="w-full">
              <CheckCircle size={16} />
              放行此样本
            </Button>
            <Button variant="outline" className="w-full">
              <XCircle size={16} />
              驳回重写
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
