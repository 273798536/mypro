import { useAppStore } from './store/useAppStore'
import Header from './components/Header'
import TabBar from './components/TabBar'
import GrayCompareChart from './components/GrayCompareChart'
import RecordDetail from './components/RecordDetail'
import HistoryView from './components/HistoryView'
import ExceptionQueue from './components/ExceptionQueue'

export default function App() {
  const selectedTab = useAppStore((s) => s.selectedTab)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TabBar />
      <main className="flex-1 p-4 max-w-[1400px] mx-auto w-full">
        {selectedTab === 'chart' && <GrayCompareChart />}
        {selectedTab === 'detail' && <RecordDetail />}
        {selectedTab === 'history' && <HistoryView />}
        {selectedTab === 'exceptions' && <ExceptionQueue />}
      </main>
    </div>
  )
}
