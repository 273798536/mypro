import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Send, User, Clock, CheckCircle, XCircle, FileAudio, Link as LinkIcon } from 'lucide-react';
import { getAssignmentById } from '@/data/mockAssignments';
import { getSnapshotById } from '@/data/mockSnapshots';
import { getPresetVersionById } from '@/data/mockPresets';
import { getAnomaliesByEntityId } from '@/data/mockAnomalies';
import { calculateDifference, calculatePercentage } from '@/utils/parameterUtils';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Annotation } from '@/types';

const statusConfig: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: '待提交', variant: 'default' },
  submitted: { label: '已提交', variant: 'info' },
  reviewing: { label: '审核中', variant: 'warning' },
  approved: { label: '已通过', variant: 'success' },
  rejected: { label: '已拒绝', variant: 'danger' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assignment = getAssignmentById(id || '');
  const snapshot = assignment ? getSnapshotById(assignment.snapshotId) : undefined;
  const presetVersion = assignment ? getPresetVersionById(assignment.presetVersionId) : undefined;
  const anomalies = assignment ? [
    ...getAnomaliesByEntityId(assignment.id),
    ...(snapshot ? getAnomaliesByEntityId(snapshot.id) : [])
  ] : [];

  const [isPlaying, setIsPlaying] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>(assignment?.annotations || []);
  const [status, setStatus] = useState(assignment?.status || 'pending');
  const [feedback, setFeedback] = useState(assignment?.feedback || '');
  const [grade, setGrade] = useState(assignment?.grade?.toString() || '');

  if (!assignment || !snapshot || !presetVersion) {
    return (
      <EmptyState
        title="作业不存在"
        description="您访问的作业可能已被删除或不存在"
      />
    );
  }

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return;
    const annotation: Annotation = {
      id: `annot-${Date.now()}`,
      assignmentId: assignment.id,
      authorId: 'teacher-001',
      authorName: '张老师',
      authorRole: 'teacher',
      content: newAnnotation,
      createdAt: Date.now(),
      isResolved: false,
    };
    setAnnotations([...annotations, annotation]);
    setNewAnnotation('');
  };

  const handleStatusUpdate = () => {
    setStatus(status);
  };

  const mockAudio = assignment.audioFileId ? {
    name: '学生作品音频.wav',
    fileName: 'student_work.wav',
    fileSize: 4587520,
    duration: 147,
  } : null;

  const modifiedParams = snapshot.parameters.filter(p => p.isModified || p.isOutOfBounds).slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle>{assignment.title}</CardTitle>
                <Badge variant={statusConfig[assignment.status]?.variant || 'default'}>
                  {statusConfig[assignment.status]?.label || assignment.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
            </div>
            {assignment.grade !== undefined && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">成绩</p>
                <p className="text-2xl font-bold text-primary">{assignment.grade}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">学生</p>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground/70" />
                <span className="font-medium text-foreground">{assignment.studentName}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">教师</p>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground/70" />
                <span className="font-medium text-foreground">{assignment.teacherName}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">提交时间</p>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground/70" />
                <span className="font-medium text-foreground">
                  {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleString() : '未提交'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">状态</p>
              <div className="mt-1">
                <Badge variant={statusConfig[assignment.status]?.variant || 'default'}>
                  {statusConfig[assignment.status]?.label || assignment.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">关联预设版本</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/presets/${presetVersion.presetId}/versions/${presetVersion.id}`} className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                <LinkIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{presetVersion.name}</p>
                  <p className="text-sm text-muted-foreground">v{presetVersion.versionNumber}</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">关联参数快照</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/snapshots/${snapshot.id}`} className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                <LinkIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{snapshot.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {snapshot.comparisonResult?.modifiedCount || 0} 个参数已修改
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {mockAudio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">音频回放</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsPlaying(!isPlaying)}
                leftIcon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              >
                {isPlaying ? '暂停' : '播放'}
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-muted-foreground/70" />
                  <span className="font-medium text-foreground">{mockAudio.name}</span>
                  <span className="text-sm text-muted-foreground">({mockAudio.fileName})</span>
                </div>
                <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: isPlaying ? '45%' : '0%' }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{isPlaying ? formatDuration(mockAudio.duration * 0.45) : '0:00'}</span>
                  <span>{formatDuration(mockAudio.duration)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">文件大小</p>
                <p className="font-medium text-foreground">{formatFileSize(mockAudio.fileSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">参数对比（已修改参数）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {modifiedParams.length > 0 ? (
            modifiedParams.map((snapParam) => {
              const baselineParam = presetVersion.parameters.find(p => p.id === snapParam.parameterId);
              if (!baselineParam) return null;
              const diff = calculateDifference(baselineParam.value, snapParam.value);
              const percentage = calculatePercentage(baselineParam.value, snapParam.value);

              return (
                <div
                  key={snapParam.parameterId}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    snapParam.isOutOfBounds ? 'bg-destructive/10' : 'bg-warning/10'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{baselineParam.name}</span>
                      {snapParam.isOutOfBounds && (
                        <Badge variant="danger">越界</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{baselineParam.path}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">基线</p>
                      <p className="font-medium text-foreground">
                        {baselineParam.value.toFixed(2)} {baselineParam.unit}
                      </p>
                    </div>
                    <span className={cn(
                      'text-sm font-medium',
                      diff > 0 ? 'text-destructive' : 'text-success'
                    )}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)} ({percentage.toFixed(1)}%)
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">快照</p>
                      <p className={cn(
                        'font-medium',
                        snapParam.isOutOfBounds ? 'text-destructive' : 'text-warning'
                      )}>
                        {snapParam.value.toFixed(2)} {baselineParam.unit}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState title="无修改参数" description="该快照没有修改任何参数" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">异常告警</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {anomalies.length > 0 ? (
            anomalies.map((anomaly) => (
              <Alert key={anomaly.id} anomaly={anomaly} />
            ))
          ) : (
            <EmptyState title="无异常" description="该作业未检测到任何异常" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">批注</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {annotations.length > 0 ? (
            annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={cn(
                  'p-4 rounded-lg border',
                  annotation.authorRole === 'teacher'
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-muted border-border'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      annotation.authorRole === 'teacher' ? 'bg-primary/20' : 'bg-border'
                    )}>
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{annotation.authorName}</span>
                        <Badge variant={annotation.authorRole === 'teacher' ? 'primary' : 'default'}>
                          {annotation.authorRole === 'teacher' ? '教师' : '学生'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(annotation.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {annotation.isResolved ? (
                    <Badge variant="success">已解决</Badge>
                  ) : (
                    <Badge variant="warning">待处理</Badge>
                  )}
                </div>
                {annotation.parameterPath && (
                  <p className="mt-2 text-xs text-primary font-medium">
                    关于参数: {annotation.parameterPath}
                  </p>
                )}
                <p className="mt-2 text-foreground">{annotation.content}</p>
              </div>
            ))
          ) : (
            <EmptyState title="暂无批注" description="还没有任何批注" />
          )}

          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={newAnnotation}
              onChange={(e) => setNewAnnotation(e.target.value)}
              placeholder="添加新批注..."
              className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleAddAnnotation()}
            />
            <Button onClick={handleAddAnnotation} leftIcon={<Send className="h-4 w-4" />}>
              发送
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">状态更新</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">作业状态</label>
              <div className="flex gap-2">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={status === key ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(key)}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">反馈意见</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="输入反馈意见..."
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">成绩 (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="输入成绩"
                className="w-32 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" leftIcon={<XCircle className="h-4 w-4" />}>
                取消
              </Button>
              <Button onClick={handleStatusUpdate} leftIcon={<CheckCircle className="h-4 w-4" />}>
                保存更新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
