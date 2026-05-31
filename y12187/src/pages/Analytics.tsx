import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { useFeedbackStore } from '../store/useFeedbackStore';

export function Analytics() {
  const { getAreaFeedbackStats, getSegmentFeedbackStats, feedbacks, seatAreas } = useFeedbackStore();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const areaStats = getAreaFeedbackStats();
  const segmentStats = getSegmentFeedbackStats();

  const qualityData = [
    { name: '完整', value: feedbacks.filter(f => f.qualityStatus === 'complete').length, color: '#22c55e' },
    { name: '不完整', value: feedbacks.filter(f => f.qualityStatus === 'incomplete').length, color: '#eab308' },
    { name: '无效', value: feedbacks.filter(f => f.qualityStatus === 'invalid').length, color: '#ef4444' },
  ];

  const radarData = segmentStats.map(s => ({
    subject: s.segmentName,
    反馈数: s.feedbackCount,
    满值: Math.max(...segmentStats.map(s => s.feedbackCount), 1),
  }));

  const issueTypes = [
    { type: '座位缺失', count: feedbacks.filter(f => f.qualityIssues.some(i => i.type === 'seat_missing')).length },
    { type: '段落缺失', count: feedbacks.filter(f => f.qualityIssues.some(i => i.type === 'segment_missing')).length },
    { type: '座位无效', count: feedbacks.filter(f => f.qualityIssues.some(i => i.type === 'seat_invalid')).length },
    { type: '疑似重复', count: feedbacks.filter(f => f.qualityIssues.some(i => i.type === 'duplicate')).length },
  ];

  const problemAreas = areaStats
    .filter(s => s.feedbackCount > 0)
    .sort((a, b) => b.feedbackCount - a.feedbackCount)
    .slice(0, 3);

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">数据分析</h1>
        <p className="text-slate-500 mt-1">区域对比、段落对比和问题定位分析</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总反馈数</p>
              <p className="text-2xl font-bold text-slate-800">{feedbacks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">待处理问题</p>
              <p className="text-2xl font-bold text-amber-600">
                {feedbacks.filter(f => f.qualityStatus !== 'complete').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">问题区域</p>
              <p className="text-2xl font-bold text-green-600">{problemAreas.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">区域反馈分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="areaName" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="feedbackCount" name="反馈数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">数据质量分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qualityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {qualityData.map((entry, index) => (
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">段落反馈分布雷达图</h2>
          <p className="text-sm text-slate-500">各曲目段落的反馈数量对比</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
              <Radar
                name="反馈数"
                dataKey="反馈数"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.5}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">问题类型统计</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueTypes} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="数量" fill="#64748b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">问题区域定位</h2>
          <div className="space-y-3">
            {problemAreas.map((area, index) => (
              <div key={area.areaId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{area.areaName}</p>
                    <p className="text-sm text-slate-500">{area.feedbackCount} 条反馈</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${(area.feedbackCount / Math.max(...areaStats.map(s => s.feedbackCount))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {problemAreas.length === 0 && (
              <p className="text-center text-slate-500 py-8">暂无问题区域</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">区域对比分析</h2>
        <p className="text-sm text-slate-500 mb-4">选择多个座位区域进行对比分析</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {seatAreas.map(area => (
            <button
              key={area.id}
              onClick={() => toggleArea(area.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAreas.includes(area.id)
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
        {selectedAreas.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={areaStats.filter(s => selectedAreas.includes(s.areaId))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="areaName" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="feedbackCount" name="反馈数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">请选择至少一个区域进行对比</p>
        )}
      </div>
    </div>
  );
}
