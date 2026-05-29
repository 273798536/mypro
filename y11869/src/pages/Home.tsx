import { TopToolbar } from '@/components/layout/TopToolbar';
import { DataSourcePanel } from '@/components/layout/DataSourcePanel';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { SelectionInfo } from '@/components/layout/SelectionInfo';
import { YardScene } from '@/components/yard3d/YardScene';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-yard-darker overflow-hidden">
      <TopToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <DataSourcePanel />
        
        <div className="flex-1 relative">
          <YardScene />
          <SelectionInfo />
        </div>
        
        <RightSidebar />
      </div>
      
      <StatusBar />
    </div>
  );
}
