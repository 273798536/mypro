import { useEffect, useState } from 'react';
import { 
  Users, MapPin, CheckCircle, AlertTriangle, XCircle, TrendingUp, Clock, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useScheduleStore } from '../store/useScheduleStore';
import { 
  generateVolunteers, 
  generatePositions, 
  generateTrainingRecordsPhase1, 
  generateInitialAssignments 
} from '../data/mockData';
import { classifyCheckResults } from '../engine/scheduleEngine';
import { SampleTypeBadge } from '../components/StatusBadge';

const COLORS = {
  normal: '#3e885b',
  boundary: '#f4a261',
  bad: '#9e2b25',
};

export function Dashboard() {
  const { 
    volunteers, 
    positions, 
    checkResults, 
    snapshots,
    notifications,
    isLoading,
    setVolunteers,
    setPositions,
    setTrainingRecords,
    runScheduleCheck
  } = useScheduleStore();
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (volunteers.length === 0 && !isInitialized) {
      initializeData();
    }
  }, [volunteers.length, isInitialized]);
  
  async function initializeData() {
    setIsInitialized(true);
    
    const vols = generateVolunteers(20, 42);
    const pos = generatePositions(42);
    const training = generateTrainingRecordsPhase1(vols, 42);
    const { assignments } = generateInitialAssignments(vols, pos, 42);
    
    setVolunteers(vols);
    setPositions(pos);
    setTrainingRecords(training);
    
    const assignmentsWithIds = assignments.map((a, idx) => ({
      ...a,
      id: `assign-${String(idx + 1).padStart(3, '0')}`
    }));
    
    useScheduleStore.setState({ assignments: assignmentsWithIds });
    
    setTimeout(async () => {
      await runScheduleCheck('phase1', '初始排班检查');
    }, 100);
  }
  
  const classified = classifyCheckResults(checkResults);
  
  const pieData = [
    { name: '正常', value: classified.normal.length, color: COLORS.normal },
    { name: '边界', value: classified.boundary.length, color: COLORS.boundary },
    { name: '异常', value: classified.bad.length, color: COLORS.bad },
  ];
  
  const positionData = positions.map(pos => {
    const assigned = checkResults.filter(
      r => r.position.id === pos.id && r.assignment.status === 'assigned'
    ).length;
    return {
      name: pos.name,
      已分配: assigned,
      容量: pos.capacity,
    };
  });
  
  const stats = [
    { 
      label: '志愿者总数', 
      value: volunteers.length, 
      icon: Users, 
      color: 'text-navy-600',
      bgColor: 'bg-navy-50'
    },
    { 
      label: '岗位数量', 
      value: positions.length, 
      icon: MapPin, 
      color: 'text-forest-600',
      bgColor: 'bg-forest-50'
    },
    { 
      label: '正常样本', 
      value: classified.normal.length, 
      icon: CheckCircle, 
      color: 'text-forest-600',
      bgColor: 'bg-forest-50'
    },
    { 
      label: '边界样本', 
      value: classified.boundary.length, 
      icon: AlertTriangle, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: '异常样本', 
      value: classified.bad.length, 
      icon: XCircle, 
      color: 'text-wine-600',
      bgColor: 'bg-wine-50'
    },
    { 
      label: '快照数量', 
      value: snapshots.length, 
      icon: FileText, 
      color: 'text-navy-600',
      bgColor: 'bg-navy-50'
    },
  ];
  
  const recentNotifications = [...notifications].reverse().slice(0, 5);
  
  if (isLoading || volunteers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-600">正在初始化数据...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            音乐会志愿者排班概览
          </h1>
          <p className="text-navy-500 mt-1">
            实时监控排班状态和检查结果
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-navy-500">
          <Clock className="w-4 h-4" />
          <span>上次检查: {snapshots.length > 0 ? new Date(snapshots[snapshots.length - 1].timestamp).toLocaleString('zh-CN') : '-'}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-6 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bgColor} rounded flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
                  <p className="text-xs text-navy-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            样本分布
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="card col-span-2">
          <div className="card-header">
            岗位人员分配情况
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={positionData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="已分配" fill="#0A2463" />
                  <Bar dataKey="容量" fill="#9fb3c8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            最近通知
          </div>
          <div className="card-body">
            {recentNotifications.length === 0 ? (
              <p className="text-center text-navy-500 py-8">
              暂无通知
            </p>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 bg-navy-50 rounded">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  notification.type === 'backup_assigned' ? 'bg-forest-500' :
                  notification.type === 'schedule_change' ? 'bg-wine-500' :
                  'bg-amber-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-800">
                    {notification.volunteerName}
                  </p>
                  <p className="text-xs text-navy-500 truncate">
                    {notification.content}
                  </p>
                </div>
                <span className="text-xs text-navy-400">
                  {new Date(notification.sentAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            </div>
          )}
        </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            异常项快速查看
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SampleTypeBadge type="bad" />
                <span className="text-sm text-navy-600">需要立即处理</span>
              </div>
              <span className="text-2xl font-bold text-wine-600">
                {classified.bad.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SampleTypeBadge type="boundary" />
                <span className="text-sm text-navy-600">需要关注</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">
                {classified.boundary.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SampleTypeBadge type="normal" />
                <span className="text-sm text-navy-600">正常</span>
              </div>
              <span className="text-2xl font-bold text-forest-600">
                {classified.normal.length}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
