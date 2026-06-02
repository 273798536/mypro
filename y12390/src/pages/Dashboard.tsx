import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  GitBranch,
  Camera,
  AlertTriangle,
  Upload,
  PlusCircle,
  Briefcase,
  Play,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Alert from '@/components/ui/Alert';
import type { PresetVersion, Snapshot, Assignment } from '@/types';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  description: string;
  color: string;
}

function StatCard({ icon, value, label, description, color }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex h-8 items-end justify-center gap-px px-6 opacity-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="waveform-bar"
            style={{
              height: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    </Card>
  );
}

interface ActivityItem {
  id: string;
  type: 'version' | 'snapshot' | 'assignment';
  title: string;
  subtitle: string;
  time: number;
}

function TimelineItem({ item }: { item: ActivityItem }) {
  const getIcon = () => {
    switch (item.type) {
      case 'version':
        return <GitBranch className="h-4 w-4 text-primary" />;
      case 'snapshot':
        return <Camera className="h-4 w-4 text-success" />;
      case 'assignment':
        return <Briefcase className="h-4 w-4 text-warning" />;
    }
  };

  const getLabel = () => {
    switch (item.type) {
      case 'version':
        return '新版本';
      case 'snapshot':
        return '新快照';
      case 'assignment':
        return '新作业';
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/50">
          {getIcon()}
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{getLabel()}</span>
          <span className="text-xs text-muted-foreground/70">
            {new Date(item.time).toLocaleString()}
          </span>
        </div>
        <p className="mt-1 font-medium text-foreground">{item.title}</p>
        <p className="text-sm text-muted-foreground">{item.subtitle}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { presets, presetVersions, snapshots, assignments, anomalies } = useAppStore();

  const totalVersions = useMemo(() => {
    return Object.values(presetVersions).reduce((sum, versions) => sum + versions.length, 0);
  }, [presetVersions]);

  const openAnomalies = useMemo(() => {
    return anomalies.filter(a => a.status === 'open');
  }, [anomalies]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const activities: ActivityItem[] = [];

    Object.values(presetVersions).flat().forEach((v: PresetVersion) => {
      const preset = presets.find(p => p.id === v.presetId);
      activities.push({
        id: `version-${v.id}`,
        type: 'version',
        title: `${preset?.name || '未知预设'} - v${v.versionNumber}`,
        subtitle: v.name,
        time: v.createdAt,
      });
    });

    snapshots.forEach((s: Snapshot) => {
      activities.push({
        id: `snapshot-${s.id}`,
        type: 'snapshot',
        title: s.name,
        subtitle: `由 ${s.creatorName} 创建`,
        time: s.createdAt,
      });
    });

    assignments.forEach((a: Assignment) => {
      activities.push({
        id: `assignment-${a.id}`,
        type: 'assignment',
        title: a.title,
        subtitle: `${a.studentName} → ${a.teacherName}`,
        time: a.createdAt,
      });
    });

    return activities.sort((a, b) => b.time - a.time).slice(0, 5);
  }, [presetVersions, snapshots, assignments, presets]);

  const quickActions = [
    { label: '导入预设', icon: <Upload className="h-4 w-4" />, onClick: () => navigate('/presets') },
    { label: '提交快照', icon: <Camera className="h-4 w-4" />, onClick: () => {} },
    { label: '创建作业', icon: <PlusCircle className="h-4 w-4" />, onClick: () => {} },
    { label: '进入沙箱', icon: <Play className="h-4 w-4" />, onClick: () => {} },
  ];

  return (
    <PageContainer title="预设版本库" description="管理和监控所有预设版本、快照和异常">
      <div className="animate-stagger space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Layers className="h-6 w-6 text-white" />}
            value={presets.length}
            label="预设总数"
            description="已创建的预设数量"
            color="bg-indigo-500"
          />
          <StatCard
            icon={<GitBranch className="h-6 w-6 text-white" />}
            value={totalVersions}
            label="版本总数"
            description="所有预设的版本数量"
            color="bg-emerald-500"
          />
          <StatCard
            icon={<Camera className="h-6 w-6 text-white" />}
            value={snapshots.length}
            label="快照数"
            description="已提交的参数快照"
            color="bg-amber-500"
          />
          <StatCard
            icon={<AlertTriangle className="h-6 w-6 text-white" />}
            value={openAnomalies.length}
            label="待处理异常"
            description="需要关注的异常数量"
            color="bg-red-500"
          />
        </div>

        {openAnomalies.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">异常告警</h2>
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                查看全部
              </Button>
            </div>
            <div className="space-y-3">
              {openAnomalies.slice(0, 3).map(anomaly => (
                <Alert key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">最近活动</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>最近更新</span>
              </div>
            </div>
            <Card>
              <div className="p-6">
                {recentActivity.length > 0 ? (
                  <div>
                    {recentActivity.map((activity, index) => (
                      <TimelineItem key={activity.id} item={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    暂无活动记录
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">快速操作</h2>
            </div>
            <Card>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto flex-col gap-2 py-4"
                      onClick={action.onClick}
                    >
                      {action.icon}
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
