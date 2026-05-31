import { useState, useMemo } from 'react';
import { 
  History, 
  Bell, 
  User, 
  MapPin, 
  Clock, 
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { SampleTypeBadge, AssignmentStatusBadge, SeverityBadge, PhaseBadge } from '../components/StatusBadge';

export function DispatchHistory() {
  const { snapshots, notifications, runScheduleCheckWithBackup } = useScheduleStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  const snapshotHistory = useMemo(() => {
    return [...snapshots].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [snapshots]);
  
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => {
        const matchesSearch = n.recipientName.includes(searchQuery) ||
                             n.content.includes(searchQuery) ||
                             n.title.includes(searchQuery);
        const matchesType = filterType === 'all' || n.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [notifications, searchQuery, filterType]);
  
  const handleRescheduleWithBackup = async () => {
    setIsRescheduling(true);
    await runScheduleCheckWithBackup();
    setIsRescheduling(false);
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'schedule_change': return <RefreshCw className="w-5 h-5 text-amber-600" />;
      case 'backup_assigned': return <User className="w-5 h-5 text-forest-600" />;
      case 'training_missing': return <AlertCircle className="w-5 h-5 text-wine-600" />;
      case 'info': return <Info className="w-5 h-5 text-navy-600" />;
      default: return <Bell className="w-5 h-5 text-navy-600" />;
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'schedule_change': return '排班变更';
      case 'backup_assigned': return '候补调度';
      case 'training_missing': return '培训缺失';
      case 'info': return '系统通知';
      default: return type;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'schedule_change': return 'bg-amber-100 text-amber-700';
      case 'backup_assigned': return 'bg-forest-100 text-forest-700';
      case 'training_missing': return 'bg-wine-100 text-wine-700';
      case 'info': return 'bg-navy-100 text-navy-700';
      default: return 'bg-navy-100 text-navy-700';
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {
      schedule_change: 0,
      backup_assigned: 0,
      training_missing: 0,
      info: 0
    };
    notifications.forEach(n => {
      stats[n.type] = (stats[n.type] || 0) + 1;
    });
    return stats;
  }, [notifications]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            调度历史
          </h1>
          <p className="text-navy-500 mt-1">
            查看排班快照历史和通知记录，追踪所有变更
          </p>
        </div>
        <button
          onClick={handleRescheduleWithBackup}
          disabled={isRescheduling}
          className="btn btn-primary flex items-center gap-2"
        >
          {isRescheduling ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          重新调度候补
        </button>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
            <History className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-navy-900">{snapshotHistory.length}</p>
            <p className="text-sm text-navy-500">快照数</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-navy-900">{typeStats.schedule_change || 0}</p>
            <p className="text-sm text-navy-500">排班变更</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center">
            <User className="w-5 h-5 text-forest-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-navy-900">{typeStats.backup_assigned || 0}</p>
            <p className="text-sm text-navy-500">候补调度</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-wine-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-wine-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-navy-900">{typeStats.training_missing || 0}</p>
            <p className="text-sm text-navy-500">培训缺失</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <History className="w-5 h-5 text-navy-600" />
            快照历史
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {snapshotHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-navy-300 mx-auto mb-3" />
                  <p className="text-navy-500">暂无快照记录</p>
                </div>
              ) : (
                snapshotHistory.map((snapshot) => {
                  const isExpanded = expandedId === snapshot.id;
                  const normalCount = snapshot.checkResults.filter(
                    r => r.sampleType === 'normal'
                  ).length;
                  const boundaryCount = snapshot.checkResults.filter(
                    r => r.sampleType === 'boundary'
                  ).length;
                  const badCount = snapshot.checkResults.filter(
                    r => r.sampleType === 'bad'
                  ).length;
                  
                  return (
                    <div 
                      key={snapshot.id} 
                      className="border border-navy-200 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="p-4 bg-navy-50 cursor-pointer hover:bg-navy-100 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : snapshot.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <PhaseBadge phase={snapshot.phase} />
                            <span className="text-sm text-navy-500">
                              {formatDate(snapshot.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-forest-600">{normalCount}正常</span>
                              <span className="text-xs text-amber-600">{boundaryCount}边界</span>
                              <span className="text-xs text-wine-600">{badCount}异常</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-navy-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-navy-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-forest-50 rounded">
                              <p className="text-lg font-bold text-forest-600">{normalCount}</p>
                              <p className="text-xs text-forest-700">正常</p>
                            </div>
                            <div className="text-center p-2 bg-amber-50 rounded">
                              <p className="text-lg font-bold text-amber-600">{boundaryCount}</p>
                              <p className="text-xs text-amber-700">边界</p>
                            </div>
                            <div className="text-center p-2 bg-wine-50 rounded">
                              <p className="text-lg font-bold text-wine-600">{badCount}</p>
                              <p className="text-xs text-wine-700">异常</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-navy-500 mb-2">志愿者数: {snapshot.volunteers.length}</p>
                            <p className="text-xs text-navy-500 mb-2">岗位数: {snapshot.positions.length}</p>
                            <p className="text-xs text-navy-500">培训记录: {snapshot.trainingRecords.length}</p>
                          </div>
                          
                          {snapshot.idempotencyKey && (
                            <div className="p-2 bg-navy-50 rounded">
                              <p className="text-xs text-navy-500">幂等性Key:</p>
                              <p className="text-xs font-mono text-navy-600 break-all">
                                {snapshot.idempotencyKey}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Bell className="w-5 h-5 text-navy-600" />
            通知历史
          </div>
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  placeholder="搜索通知..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input pl-9 pr-8"
                >
                  <option value="all">全部</option>
                  <option value="schedule_change">排班变更</option>
                  <option value="backup_assigned">候补调度</option>
                  <option value="training_missing">培训缺失</option>
                  <option value="info">系统通知</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-navy-300 mx-auto mb-3" />
                  <p className="text-navy-500">暂无通知记录</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      notification.isRead 
                        ? 'bg-white border-navy-100' 
                        : 'bg-navy-50 border-navy-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge text-xs ${getTypeColor(notification.type)}`}>
                            {getTypeLabel(notification.type)}
                          </span>
                          <span className="text-xs text-navy-400">
                            {formatDate(notification.sentAt)}
                          </span>
                        </div>
                        <p className="font-medium text-navy-800 text-sm">
                          {notification.title}
                        </p>
                        <p className="text-sm text-navy-600 mt-1">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <User className="w-3 h-3 text-navy-400" />
                          <span className="text-xs text-navy-500">
                            收件人: {notification.recipientName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          调度流程说明
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 bg-navy-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-navy-600 text-white flex items-center justify-center font-bold mb-3">
                1
              </div>
              <p className="font-medium text-navy-800 mb-2">问题检测</p>
              <p className="text-sm text-navy-600">
                系统自动检测排班冲突、培训缺失、临时请假等问题，将不符合条件的排班标记为 rejected 状态。
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold mb-3">
                2
              </div>
              <p className="font-medium text-navy-800 mb-2">候补搜索</p>
              <p className="text-sm text-navy-600">
                根据技能匹配、培训资质、可用时段自动搜索符合条件的候补志愿者，按匹配度排序。
              </p>
            </div>
            <div className="p-4 bg-forest-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-forest-600 text-white flex items-center justify-center font-bold mb-3">
                3
              </div>
              <p className="font-medium text-navy-800 mb-2">通知发送</p>
              <p className="text-sm text-navy-600">
                为被取消排班的志愿者和新调度的候补志愿者发送通知，所有记录可在调度历史中追溯。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
