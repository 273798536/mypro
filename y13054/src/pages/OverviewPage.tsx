import PointTable from '@/components/points/PointTable';
import PointMap from '@/components/points/PointMap';

export default function OverviewPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-5">
      <div className="mb-4">
        <h2 className="font-serif-cn text-xl font-semibold text-deep-sea">
          点位总览
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          左侧查看点位数据与处理状态，右侧查看空间分布与相邻关系。支持搜索与状态筛选，点击点位查看详情。
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: 'calc(100vh - 170px)' }}>
        <div className="lg:col-span-3 min-h-[400px]">
          <PointTable />
        </div>
        <div className="lg:col-span-2 min-h-[400px]">
          <PointMap />
        </div>
      </div>
    </div>
  );
}
