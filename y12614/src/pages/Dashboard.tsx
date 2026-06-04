import { StatCards } from '@/components/dashboard/StatCards';
import { Charts } from '@/components/dashboard/Charts';
import { DataTable } from '@/components/dashboard/DataTable';
import { mockDevices, getDeviceStats } from '@/data/mockDevices';

export default function Dashboard() {
  const stats = getDeviceStats();
  
  const passRateData = [85, 88, 82, 90, 87, 92, 89];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">设备看板</h1>
          <p className="text-gray-500 mt-1">实时监控设备状态和检测数据统计</p>
        </div>

        <div className="space-y-6">
          <StatCards
            totalDevices={stats.total}
            activeDevices={stats.active}
            avgPassRate={stats.avgPassRate}
            totalDetections={156}
          />

          <Charts
            passRateData={passRateData}
            errorDistribution={stats.errorDistribution}
          />

          <DataTable devices={mockDevices} />
        </div>
      </div>
    </div>
  );
}
