import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  FileText,
  User,
  Clock,
  AlertTriangle,
  Link2,
  MessageSquare,
  Plus,
  ChevronRight,
} from 'lucide-react';
import {
  formatDateTime,
  getImpactLabel,
  getImpactColor,
  getStatusLabel,
  getStatusColor,
} from '@/utils/format';
import clsx from 'clsx';

export default function WithdrawalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getWithdrawalById, getSampleById, getNotesByTarget, addNote } = useAppStore();
  const [noteInput, setNoteInput] = useState('');

  const withdrawal = getWithdrawalById(id || '');
  const notes = getNotesByTarget('withdrawal', id || '');

  if (!withdrawal) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">撤回记录不存在</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/withdrawals')}
        >
          返回列表
        </Button>
      </div>
    );
  }

  const affectedSamples = withdrawal.affectedSampleIds
    .map((sid) => getSampleById(sid))
    .filter(Boolean);

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    addNote({
      content: noteInput,
      author: '小乔',
      targetType: 'withdrawal',
      targetId: withdrawal.id,
    });
    setNoteInput('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/withdrawals')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-serif-sc font-semibold text-deep-blue-500">
            {withdrawal.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            撤回记录详情 · 影响分析
          </p>
        </div>
        <span
          className={clsx(
            'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border',
            getStatusColor(withdrawal.status)
          )}
        >
          {getStatusLabel(withdrawal.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500 mb-4">
              撤回原因
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {withdrawal.reason}
            </p>

            {withdrawal.oralNotes && (
              <div className="mt-4 p-4 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-status-warning" />
                  <span className="text-sm font-medium text-status-warning">
                    临时口头说明
                  </span>
                </div>
                <p className="text-gray-700">{withdrawal.oralNotes}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500">
                结论影响链路
              </h3>
              <Badge variant={withdrawal.impactLevel === 'high' ? 'error' : withdrawal.impactLevel === 'medium' ? 'warning' : 'info'}>
                {getImpactLabel(withdrawal.impactLevel)}
              </Badge>
            </div>

            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>

              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-status-error border-4 border-white shadow-sm"></div>
                  <div className="bg-status-error/5 p-4 rounded-lg border border-status-error/10">
                    <p className="font-medium text-status-error">
                      触发：撤回操作
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {withdrawal.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTime(withdrawal.createdAt)} · {withdrawal.createdBy}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-status-warning border-4 border-white shadow-sm"></div>
                  <div className="bg-status-warning/5 p-4 rounded-lg border border-status-warning/10">
                    <p className="font-medium text-status-warning">
                      影响：{withdrawal.affectedSampleCount} 份样本重评
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      涉及多个班级，主要集中在写景类作文
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-accent-blue-500 border-4 border-white shadow-sm"></div>
                  <div className="bg-accent-blue-500/5 p-4 rounded-lg border border-accent-blue-500/10">
                    <p className="font-medium text-accent-blue-600">
                      结果：{withdrawal.conclusionChange}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      优秀率下降13个百分点，需补充教学分析
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-deep-blue-500 border-4 border-white shadow-sm"></div>
                  <div className="bg-deep-blue-500/5 p-4 rounded-lg border border-deep-blue-500/10">
                    <p className="font-medium text-deep-blue-500">
                      后续：生成回放报告
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      拆解样本、阈值、人工改判各自影响
                    </p>
                    <button
                      onClick={() => navigate('/report')}
                      className="mt-3 text-sm text-accent-blue-500 hover:text-accent-blue-600 flex items-center gap-1"
                    >
                      查看回放报告
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

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
                placeholder="添加备注（如口头说明等）..."
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
              <AlertTriangle size={16} className="text-gray-400" />
              基本信息
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">影响等级</span>
                <span
                  className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    getImpactColor(withdrawal.impactLevel)
                  )}
                >
                  {getImpactLabel(withdrawal.impactLevel)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span
                  className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-md border',
                    getStatusColor(withdrawal.status)
                  )}
                >
                  {getStatusLabel(withdrawal.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">发起人</span>
                <span className="text-gray-700">{withdrawal.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">发起时间</span>
                <span className="text-gray-700">
                  {formatDateTime(withdrawal.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">受影响样本</span>
                <span className="text-gray-700 font-medium">
                  {withdrawal.affectedSampleCount} 份
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-gray-400" />
              受影响样本
            </h3>
            <div className="space-y-2">
              {affectedSamples.map((sample) => (
                <button
                  key={sample!.id}
                  onClick={() => navigate(`/samples/${sample!.id}`)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-accent-blue-300 hover:bg-accent-blue-50/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-accent-blue-600">
                      {sample!.title}
                    </p>
                    <span className="text-xs font-mono text-deep-blue-500">
                      {sample!.versions[sample!.versions.length - 1].score}分
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {sample!.studentName} · {sample!.grade}
                  </p>
                </button>
              ))}
              {withdrawal.affectedSampleIds.length > affectedSamples.length && (
                <p className="text-xs text-gray-400 text-center pt-2">
                  还有 {withdrawal.affectedSampleIds.length - affectedSamples.length} 份未展示
                </p>
              )}
            </div>
          </Card>

          <div className="space-y-2">
            <Button variant="primary" className="w-full">
              <Link2 size={16} />
              生成回放报告
            </Button>
            <Button variant="outline" className="w-full">
              标记已解决
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
