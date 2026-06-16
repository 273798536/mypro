import PointList from '@/components/PointList';
import MergeEditor from '@/components/MergeEditor';
import DataSourcePanel from '@/components/DataSourcePanel';
import AbnormalRecords from '@/components/AbnormalRecords';
import { useFirePointStore } from '@/store/useFirePointStore';

export default function Home() {
  const { getSelectedPoint, selectedPointId, getPointDataSources } = useFirePointStore();
  const point = getSelectedPoint();
  const dataSources = selectedPointId ? getPointDataSources(selectedPointId) : [];
  const hasAbnormal = dataSources.some((s) => s.isAbnormal);

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
      <div className="w-80 flex-shrink-0 border-r border-primary-100 overflow-hidden animate-fade-in">
        <PointList />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden gap-4 p-4">
          <div
            className={`flex flex-col gap-4 overflow-hidden ${
              hasAbnormal ? 'w-[55%]' : 'w-[60%]'
            }`}
          >
            <div className="flex-1 overflow-hidden opacity-0 animate-fade-in animation-delay-100" style={{ animationFillMode: 'forwards' }}>
              <MergeEditor />
            </div>
          </div>

          <div
            className={`flex flex-col gap-4 overflow-hidden ${
              hasAbnormal ? 'w-[45%]' : 'w-[40%]'
            }`}
          >
            {hasAbnormal && (
              <div className="opacity-0 animate-fade-in animation-delay-200" style={{ animationFillMode: 'forwards' }}>
                <AbnormalRecords />
              </div>
            )}
            <div
              className={`flex-1 overflow-hidden opacity-0 animate-fade-in ${
                hasAbnormal ? 'animation-delay-300' : 'animation-delay-200'
              }`}
              style={{ animationFillMode: 'forwards' }}
            >
              <DataSourcePanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
