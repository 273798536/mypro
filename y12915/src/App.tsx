import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import VersionBar from '@/components/layout/VersionBar';
import TraceModal from '@/components/common/TraceModal';
import useAppStore from '@/store/useAppStore';

export default function App() {
  const { traceModalOpen, traceSample, closeTrace, versions } = useAppStore();

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <VersionBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <TraceModal
        open={traceModalOpen}
        onClose={closeTrace}
        sample={traceSample}
        versions={versions}
      />
    </div>
  );
}
