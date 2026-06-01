import { useEffect } from 'react';
import Scene3D from '@/components/Scene3D';
import FilterBar from '@/components/FilterBar';
import Sidebar from '@/components/Sidebar';
import DetailPanel from '@/components/DetailPanel';
import ReportModal from '@/components/ReportModal';
import { useMuseumStore } from '@/store/museum-store';
import { visitorRecords, halls, routes, stairways, dataSources } from '@/data/museum-data';
import { runAllValidations } from '@/data/validation';

export default function Home() {
  const setValidationIssues = useMuseumStore((s) => s.setValidationIssues);
  const setDataSources = useMuseumStore((s) => s.setDataSources);

  useEffect(() => {
    const issues = runAllValidations(visitorRecords, halls, routes, stairways);
    setValidationIssues(issues);
    setDataSources(dataSources);
  }, [setValidationIssues, setDataSources]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a1018] overflow-hidden">
      <FilterBar />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <Scene3D className="w-full h-full" />
          <DetailPanel />
        </div>
        <Sidebar />
      </div>
      <ReportModal />
    </div>
  );
}
