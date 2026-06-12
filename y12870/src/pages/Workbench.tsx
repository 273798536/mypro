import { useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import WeatherUploader from '@/components/import/WeatherUploader';
import SalinityUploader from '@/components/import/SalinityUploader';
import SalinityUnitModal from '@/components/salinity/SalinityUnitModal';
import MapView from '@/components/map/MapView';
import HarmonicsForm from '@/components/tide/HarmonicsForm';
import TideChart from '@/components/tide/TideChart';
import DeviceForm from '@/components/device/DeviceForm';
import StatusSummaryBar from '@/components/result/StatusSummaryBar';
import ResultCardList from '@/components/result/ResultCardList';
import ExportButton from '@/components/report/ExportButton';
import { useCalcStore } from '@/store/useCalcStore';

export default function Workbench() {
  const screenshot = useCalcStore(s => s.screenshotMode);
  const [pickMode, setPickMode] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);

  function handlePick(lat: number, lng: number) {
    setPendingLat(lat); setPendingLng(lng); setPickMode(false);
  }

  return (
    <div className="h-screen flex flex-col bg-ocean-50">
      <TopNav />
      <div className={`flex-1 min-h-0 flex ${screenshot ? 'px-4 py-3 gap-4' : 'gap-3 p-3'}`}>
        {/* 左数据面板 */}
        {!screenshot && (
          <aside className="w-[22%] min-w-[300px] flex-shrink-0 overflow-y-auto workbench-scroll space-y-3 pr-1">
            <WeatherUploader />
            <SalinityUploader />
            <DeviceForm
              onPick={() => setPickMode(true)}
              pendingLat={pendingLat} pendingLng={pendingLng}
              cancelPick={() => { setPendingLat(null); setPendingLng(null); }}
            />
            <HarmonicsForm />
          </aside>
        )}

        {/* 中地图区 */}
        <section className={`flex-shrink-1 flex-1 flex flex-col min-w-0 ${screenshot ? '' : 'gap-3'}`}>
          <div className={`${screenshot ? 'flex-1 min-h-0' : 'h-[58%] min-h-[400px]'} flex-shrink-1`}>
            <MapView
              pickMode={pickMode}
              onPick={(lat, lng) => handlePick(lat, lng)}
            />
          </div>
          {!screenshot && <div className="flex-shrink-0"><TideChart /></div>}
        </section>

        {/* 右结果面板 */}
        <aside className={`${screenshot ? 'w-[28%]' : 'w-[22%]'} min-w-[320px] flex-shrink-0 flex flex-col min-h-0 gap-3 overflow-hidden`}>
          {!screenshot && (
            <div className="flex-shrink-0 flex items-center justify-between">
              <h2 className="font-serif text-base font-semibold text-ocean-900">试算结果</h2>
              <ExportButton size="sm" />
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto workbench-scroll space-y-3 pr-1">
            <StatusSummaryBar />
            <ResultCardList />
          </div>
        </aside>
      </div>
      <SalinityUnitModal />
    </div>
  );
}
