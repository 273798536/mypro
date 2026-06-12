import { useStore } from '@/store'
import Layout from '@/components/Layout'
import OverviewPage from '@/pages/OverviewPage'
import NameplatePage from '@/pages/NameplatePage'
import CalculationPage from '@/pages/CalculationPage'
import AnomalyPage from '@/pages/AnomalyPage'
import ChartPage from '@/pages/ChartPage'
import { useEffect } from 'react'

function App() {
  const { activeTab, loadMockData, isLoaded } = useStore()

  useEffect(() => {
    if (!isLoaded) {
      loadMockData()
    }
  }, [isLoaded, loadMockData])

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />
      case 'nameplate':
        return <NameplatePage />
      case 'calculation':
        return <CalculationPage />
      case 'anomaly':
        return <AnomalyPage />
      case 'chart':
        return <ChartPage />
      default:
        return <OverviewPage />
    }
  }

  return <Layout>{renderPage()}</Layout>
}

export default App
