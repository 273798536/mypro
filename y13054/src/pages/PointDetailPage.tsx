import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, History, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import SpaceCard from '@/components/detail/SpaceCard';
import Timeline from '@/components/detail/Timeline';
import ExportButton from '@/components/detail/ExportButton';
import StatusBadge from '@/components/points/StatusBadge';

export default function PointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPointById, getEventsByPointId } = useAppStore();

  if (!id) {
    return <div className="p-8 text-center text-gray-500">未指定点位编号</div>;
  }

  const point = getPointById(id);
  if (!point) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-3">未找到点位 {id}</p>
        <Link to="/" className="text-deep-sea text-sm hover:underline">
          返回点位总览
        </Link>
      </div>
    );
  }

  const events = getEventsByPointId(id);
  const isAbnormal = point.status === 'suspended' || point.status === 'withdrawn';

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-5">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-sm hover:bg-white hover:border-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
            返回
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-cn text-xl font-semibold text-deep-sea flex items-center gap-2">
                <MapPin className="w-5 h-5" strokeWidth={1.8} />
                点位详情 · {point.id}
              </h2>
              <StatusBadge status={point.status} />
            </div>
            {isAbnormal && (
              <div className="flex items-center gap-2 mt-1 text-sm text-suspended-red">
                <AlertTriangle className="w-4 h-4" strokeWidth={1.8} />
                {point.status === 'suspended'
                  ? '该点位已挂起，不纳入方案结论计算，等待现场老师确认。'
                  : '该点位已撤回，需注意其对历史方案结论的影响。'}
              </div>
            )}
          </div>
        </div>
        <ExportButton point={point} events={events} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SpaceCard point={point} />
        </div>
        <div className="lg:col-span-3">
          <div className="bg-white border border-sea-mist-dark rounded-sm shadow-sm h-full flex flex-col">
            <div className="px-4 py-3 border-b border-sea-mist-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-deep-sea" strokeWidth={1.8} />
                <h3 className="font-serif-cn text-sm font-semibold text-deep-sea">
                  历史时间线
                </h3>
                <span className="text-xs text-gray-400 font-mono-data">
                  {events.length} 条记录
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-processed-green" />已处理
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-alert-orange" />待补
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-manual-purple" />改判
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-withdrawn-gray" />撤回
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-suspended-red" />挂起
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <Timeline events={events} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
