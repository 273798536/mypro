import { useParameterStore } from '../store/parameterStore';
import { StatusBadge } from '../components/StatusBadge';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { parameters, anomalies, interfaceResults } = useParameterStore();

  const stats = {
    total: parameters.length,
    anomaly: parameters.filter((p) => p.status === 'anomaly').length,
    pending: parameters.filter((p) => p.status === 'pending').length,
    confirmed: parameters.filter((p) => p.status === 'confirmed').length,
  };

  const pendingAnomalies = anomalies.filter((a) => a.status === 'pending');

  const recentParameters = parameters.slice(0, 5);

  const scanTypeChart = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      left: 'center',
    },
    series: [
      {
        name: '扫描类型分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 2, name: 'T1加权成像' },
          { value: 2, name: 'T2加权成像' },
          { value: 1, name: '弥散加权成像' },
        ],
      },
    ],
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  };

  const qualityChart = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: ['param-001', 'param-002', 'param-003', 'param-004', 'param-005'],
    },
    yAxis: {
      type: 'value',
      max: 100,
      name: '质量分数',
    },
    series: [
      {
        data: [88, 75, 72, 65, 58],
        type: 'bar',
        itemStyle: {
          color: '#3B82F6',
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">核磁信号参数调试概览</p>
        </div>
        <button
          onClick={() => navigate('/parameter-input')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <FileText className="w-4 h-4" />
          新建参数
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">总参数数</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">待确认</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">异常项</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.anomaly}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">已确认</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {pendingAnomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">有待处理的异常</h3>
              <p className="text-red-600 text-sm mt-1">
                当前有 {pendingAnomalies.length} 个异常待确认，请及时处理
              </p>
            </div>
            <button
              onClick={() => navigate('/anomalies')}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
            >
              查看异常
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">扫描类型分布</h3>
          <ReactECharts option={scanTypeChart} style={{ height: 250 }} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">质量分数趋势</h3>
          <ReactECharts option={qualityChart} style={{ height: 250 }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">最近参数</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  扫描类型
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  TR/TE
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  组织类型
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentParameters.map((param) => (
                <tr key={param.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-mono text-slate-600">{param.id}</td>
                  <td className="px-5 py-4 text-sm text-slate-800">{param.scanType}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {param.tr}ms / {param.te}ms
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {param.tissueType || '-'}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge type="scan" status={param.status} />
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => navigate('/comparison')}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
