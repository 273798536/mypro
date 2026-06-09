import RecordPanel from './components/RecordPanel';
import Scene3D from './components/Scene3D';
import ParameterPanel from './components/ParameterPanel';
import TopBar from './components/TopBar';
import ValidationBanner from './components/ValidationBanner';

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-gray-100">
      <TopBar />
      <ValidationBanner />
      <div className="flex-1 flex min-h-0">
        <RecordPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <Scene3D />
        </div>
        <ParameterPanel />
      </div>
    </div>
  );
}
