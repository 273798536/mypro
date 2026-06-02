import React, { useEffect } from 'react';
import {
  Package,
  PackageOpen,
  Wrench,
  AlertTriangle,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    devices,
    records,
    anomalies,
    loading,
    fetchAllData,
    createBorrow,
    detectAnomalies,
    conclusions
  } = useStore();

  useEffect(() => {
    fetchAllData();
  }, []);

  const stats = [
    {
      label: '在库设备',
      value: devices.filter(d => d.status === 'in_stock').length,
      total: devices.length,
      icon: Package,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: '借出中',
      value: devices.filter(d => d.status === 'borrowed').length,
      total: devices.length,
      icon: PackageOpen,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: '损坏待修',
      value: devices.filter(d => d.status === 'damaged').length,
      total: devices.length,
      icon: Wrench,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50'
    },
    {
      label: '待处理异常',
      value: anomalies.filter(a => a.status === 'open').length,
      total: anomalies.length,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50'
    }
  ];

  const recentRecords = records.slice(0, 5);
  const openAnomalies = anomalies.filter(a => a.status === 'open').slice(0, 3);
  const inStockDevices = devices.filter(d => d.status === 'in_stock');

  const handleQuickBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const deviceId = formData.get('deviceId') as string;
    const borrower = formData.get('borrower') as string;
    const expectedReturnDate = formData.get('expectedReturnDate') as string;

    if (!deviceId || !borrower || !expectedReturnDate) return;

    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const success = await createBorrow({
      deviceId,
      deviceName: device.name,
      borrower,
      expectedReturnDate: new Date(expectedReturnDate).toISOString()
    });

    if (success) {
      form.reset();
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card-hover p-6 animate-stagger"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}
                    style={{ color: stat.color.includes('emerald') ? '#10b981' : stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('rose') ? '#f43f5e' : '#f59e0b' }}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>{Math.round((stat.value / stat.total) * 100)}%</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-serif font-bold text-slate-900 mt-1">
                  {stat.value}
                  <span className="text-lg font-normal text-slate-400">/{stat.total}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {conclusions.length > 0 && (
        <div className="card p-6 animate-stagger" style={{ animationDelay: '400ms' }}>
          <h3 className="font-serif font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            系统结论摘要
          </h3>
          <div className="space-y-2">
            {conclusions.map((c, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <p className="text-slate-700">{c}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {openAnomalies.length > 0 && (
            <div className="card animate-stagger" style={{ animationDelay: '500ms' }}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-serif font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  异常提醒
                </h3>
                <button
                  onClick={detectAnomalies}
                  disabled={loading}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  重新检测
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {openAnomalies.map((anomaly, index) => (
                  <div
                    key={anomaly.id}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => navigate('/anomalies')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 animate-pulse-slow ${
                          anomaly.severity === 'high' ? 'bg-rose-500' : anomaly.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <StatusBadge type="anomaly" value={anomaly.type} />
                            <StatusBadge type="severity" value={anomaly.severity} />
                          </div>
                          <p className="text-sm font-medium text-slate-900 mt-1">{anomaly.title}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{anomaly.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-slate-50 rounded-b-xl">
                <button
                  onClick={() => navigate('/anomalies')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  查看全部异常
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="card animate-stagger" style={{ animationDelay: '600ms' }}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-serif font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" />
                最近借还记录
              </h3>
              <button
                onClick={() => navigate('/records')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  暂无借还记录
                </div>
              ) : (
                recentRecords.map((record, index) => (
                  <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{record.deviceName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {record.borrower} · {formatDate(record.borrowDate)} 借出
                        </p>
                      </div>
                      <StatusBadge type="record" value={record.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 animate-stagger" style={{ animationDelay: '550ms' }}>
            <h3 className="font-serif font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-600" />
              快捷操作
            </h3>
            <form onSubmit={handleQuickBorrow} className="space-y-4">
              <div>
                <label className="label">选择设备</label>
                <select name="deviceId" className="input" required>
                  <option value="">请选择在库设备...</option>
                  {inStockDevices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">借用人</label>
                <input
                  type="text"
                  name="borrower"
                  className="input"
                  placeholder="请输入借用人姓名"
                  required
                />
              </div>
              <div>
                <label className="label">预计归还日期</label>
                <input
                  type="date"
                  name="expectedReturnDate"
                  className="input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || inStockDevices.length === 0}
                className="btn btn-primary w-full"
              >
                {loading ? '登记中...' : '登记借出'}
              </button>
            </form>
          </div>

          <div className="card p-6 animate-stagger" style={{ animationDelay: '650ms' }}>
            <h3 className="font-serif font-semibold text-slate-900 mb-4">快速导航</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/devices')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <Package className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-700">查看设备清单</span>
              </button>
              <button
                onClick={() => navigate('/inventory')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <FileText className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-700">开始库存盘点</span>
              </button>
              <button
                onClick={detectAnomalies}
                disabled={loading}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-700">执行异常检测</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
