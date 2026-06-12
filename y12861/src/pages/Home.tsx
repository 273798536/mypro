import { Scene3D } from '@/components/three/Scene3D';
import { Toolbar } from '@/components/ui/Toolbar';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { ReviewEntry } from '@/components/ui/ReviewEntry';
import { InfoCard } from '@/components/ui/InfoCard';

export default function Home() {
  return (
    <div className="flex-1 relative overflow-hidden">
      <Scene3D />
      <Toolbar />
      <DetailPanel />
      <ReviewEntry />
      <InfoCard />
    </div>
  );
}
