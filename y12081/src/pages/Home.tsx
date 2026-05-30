import { Viewport3D } from '@/components/Viewport3D';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      <div className="flex-1 relative">
        <Viewport3D />
        <Toolbar />
      </div>
      <Sidebar />
    </div>
  );
}