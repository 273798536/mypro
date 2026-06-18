import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Clock,
  FileText,
  RotateCcw,
  MessageSquare,
  ArrowRightLeft,
  FileBarChart,
  Filter,
  Plus,
  User,
} from 'lucide-react';
import {
  formatDateTime,
  getEventTypeLabel,
  getEventTypeColor,
} from '@/utils/format';
import clsx from 'clsx';

const eventTypeIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
  sample_version: FileText,
  withdrawal: RotateCcw,
  note: MessageSquare,
  status_change: ArrowRightLeft,
  report: FileBarChart,
};

export default function Timeline() {
  const { timeline, addNote } = useAppStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [noteInput, setNoteInput] = useState('');

  const filteredTimeline =
    filterType === 'all'
      ? timeline
      : timeline.filter((event) => event.type === filterType);

  const eventTypes = [
    { value: 'all', label: '全部' },
    { value: 'sample_version', label: '样本版本' },
    { value: 'withdrawal', label: '撤回记录' },
    { value: 'note', label: '备注' },
    { value: 'status_change', label: '状态变更' },
    { value: 'report', label: '报告' },
  ];

  const groupedByDate = filteredTimeline.reduce(
    (acc, event) => {
      const date = new Date(event.timestamp).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    },
    {} as Record<string, typeof filteredTimeline>
  );

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    addNote({
      content: noteInput,
      author: '小乔',
      targetType: 'report',
      targetId: 'global',
    });
    setNoteInput('');
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusMap: Record<string, { variant: string; label: string }> = {
      success: { variant: 'success', label: '成功' },
      warning: { variant: 'warning', label: '警告' },
      error: { variant: 'error', label: '错误' },
      info: { variant: 'info', label: '信息' },
    };
    const s = statusMap[status] || statusMap.info;
    return <Badge variant={s.variant as any}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif-sc font-semibold text-deep-blue-500">
            历史时间线
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            所有版本变更、撤回记录、备注和状态流转记录
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue-500/30 focus:border-accent-blue-500 bg-white"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-blue-500/10 rounded-lg">
            <Clock size={18} className="text-accent-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">快速备注</p>
            <p className="text-xs text-gray-400">添加全局备注，会记录在时间线上</p>
          </div>
          <div className="flex gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="输入备注内容..."
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
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([date, events]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-200"></div>
                <h3 className="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                  {date}
                </h3>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-100"></div>

                <div className="space-y-4">
                  {events.map((event, index) => {
                    const IconComponent = eventTypeIcons[event.type] || FileText;
                    return (
                      <div
                        key={event.id}
                        className="relative flex gap-4 group"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div
                          className={clsx(
                            'absolute -left-6 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10',
                            getEventTypeColor(event.type)
                          )}
                        ></div>

                        <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 group-hover:border-accent-blue-200 group-hover:bg-accent-blue-50/30 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div
                                className={clsx(
                                  'p-2 rounded-lg',
                                  event.type === 'withdrawal'
                                    ? 'bg-status-error/10'
                                    : event.type === 'note'
                                    ? 'bg-status-info/10'
                                    : event.type === 'status_change'
                                    ? 'bg-status-warning/10'
                                    : event.type === 'report'
                                    ? 'bg-deep-blue-500/10'
                                    : 'bg-accent-blue-500/10'
                                )}
                              >
                                <IconComponent
                                  size={16}
                                  className={
                                    event.type === 'withdrawal'
                                      ? 'text-status-error'
                                      : event.type === 'note'
                                      ? 'text-status-info'
                                      : event.type === 'status_change'
                                      ? 'text-status-warning'
                                      : event.type === 'report'
                                      ? 'text-deep-blue-500'
                                      : 'text-accent-blue-500'
                                  }
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-800">
                                    {event.title}
                                  </p>
                                  <Badge variant="info">
                                    {getEventTypeLabel(event.type)}
                                  </Badge>
                                  {event.status && getStatusBadge(event.status)}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">
                                {formatDateTime(event.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTimeline.length === 0 && (
          <div className="text-center py-16">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400">暂无时间线记录</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500 mb-4">
          事件类型图例
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {eventTypes
            .filter((t) => t.value !== 'all')
            .map((type) => {
              const IconComponent = eventTypeIcons[type.value] || FileText;
              return (
                <div
                  key={type.value}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={clsx(
                      'w-3 h-3 rounded-full',
                      getEventTypeColor(type.value)
                    )}
                  ></div>
                  <span className="text-sm text-gray-700">{type.label}</span>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
