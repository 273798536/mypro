import StatusBar from "../components/StatusBar";
import ImportPanel from "../components/ImportPanel";
import FilterBar from "../components/FilterBar";
import RecordList from "../components/RecordList";
import RecordDetail from "../components/RecordDetail";
import AnomalyQueue from "../components/AnomalyQueue";

export default function Home() {
  return (
    <div className="h-full flex flex-col bg-zinc-50">
      <StatusBar />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[320px] flex-shrink-0">
          <ImportPanel />
        </aside>
        <main className="flex-1 flex flex-col min-w-0 border-x border-zinc-200 bg-white">
          <FilterBar />
          <RecordList />
        </main>
        <aside className="w-[380px] flex-shrink-0">
          <RecordDetail />
        </aside>
      </div>
      <AnomalyQueue />
    </div>
  );
}
