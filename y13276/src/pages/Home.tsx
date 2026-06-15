import Header from '@/components/Header';
import StatCards from '@/components/StatCards';
import MapView from '@/components/MapView';
import PointList from '@/components/PointList';
import PointDetail from '@/components/PointDetail';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 p-6">
        <StatCards />

        <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
          <div className="col-span-5">
            <MapView />
          </div>

          <div className="col-span-3">
            <PointList />
          </div>

          <div className="col-span-4">
            <PointDetail />
          </div>
        </div>
      </main>
    </div>
  );
}
