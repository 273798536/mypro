import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileAudio, FileAudio2, User, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

type StatusFilter = 'all' | 'submitted' | 'reviewing' | 'approved' | 'rejected';

const statusLabels: Record<string, string> = {
  submitted: '已提交',
  reviewing: '审核中',
  approved: '已批准',
  rejected: '已拒绝',
};

const statusBadgeVariants: Record<string, 'primary' | 'warning' | 'success' | 'danger'> = {
  submitted: 'primary',
  reviewing: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function Assignments() {
  const navigate = useNavigate();
  const { assignments, audioFiles } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredAssignments = useMemo(() => {
    if (statusFilter === 'all') return assignments;
    return assignments.filter(a => a.status === statusFilter);
  }, [assignments, statusFilter]);

  const getAudioStatus = (assignmentId: string, audioFileId?: string) => {
    if (audioFileId) {
      const audio = audioFiles.find(f => f.id === audioFileId);
      return audio ? 'has' : 'missing';
    }
    const linked = audioFiles.find(f => f.assignmentId === assignmentId);
    return linked ? 'has' : 'missing';
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: assignments.length };
    assignments.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">作业管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看和管理学生提交的作业</p>
        </div>
        <Button leftIcon={<PlusCircle className="h-4 w-4" />}>
          创建作业
        </Button>
      </div>

      <div className="mb-6 flex gap-1">
        {([
          { value: 'all' as const, label: '全部' },
          { value: 'submitted' as const, label: '已提交' },
          { value: 'reviewing' as const, label: '审核中' },
          { value: 'approved' as const, label: '已批准' },
          { value: 'rejected' as const, label: '已拒绝' },
        ] as const).map(option => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === option.value
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {option.label}
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs">
              {statusCounts[option.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAssignments.map(assignment => {
            const audioStatus = getAudioStatus(assignment.id, assignment.audioFileId);

            return (
              <Card
                key={assignment.id}
                hover
                className="cursor-pointer"
                onClick={() => navigate(`/assignments/${assignment.id}`)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-semibold text-foreground">{assignment.title}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{assignment.studentName}</span>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariants[assignment.status] || 'default'}>
                      {statusLabels[assignment.status] || assignment.status}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {assignment.presetVersionId && (
                      <Badge variant="default">关联预设</Badge>
                    )}
                    {assignment.snapshotId && (
                      <Badge variant="info">关联快照</Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {assignment.submittedAt
                          ? new Date(assignment.submittedAt).toLocaleDateString()
                          : '未提交'}
                      </span>
                    </div>

                    {assignment.grade !== undefined && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">成绩：</span>
                        <span className="font-medium text-foreground">{assignment.grade}</span>
                      </div>
                    )}
                  </div>

                  {assignment.feedback && (
                    <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {assignment.feedback}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1.5">
                    {audioStatus === 'has' ? (
                      <div className="flex items-center gap-1 text-xs text-success">
                        <FileAudio className="h-3.5 w-3.5" />
                        <span>音频已上传</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <FileAudio2 className="h-3.5 w-3.5" />
                        <span>音频缺失</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="暂无作业数据" description="创建作业以开始管理学生提交" />
      )}
    </PageContainer>
  );
}
