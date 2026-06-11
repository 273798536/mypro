import { useRef, useState } from 'react'
import FilterBar from '@/components/workbench/FilterBar'
import MaterialList from '@/components/workbench/MaterialList'
import FloorPlanView from '@/components/workbench/FloorPlanView'
import ReviewDetail from '@/components/workbench/ReviewDetail'
import { exportElementAsImage, formatExportDate } from '@/utils/exportUtils'

function Workbench() {
  const floorPlanRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const handleExportScreenshot = async () => {
    try {
      setExporting(true)
      const element = floorPlanRef.current
      if (!element) return
      await exportElementAsImage(element, `空间复核-${formatExportDate()}.png`, {
        backgroundColor: '#F6F7F9',
      })
    } catch (error) {
      alert('导出截图失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#F6F7F9]">
      <FilterBar onExportScreenshot={handleExportScreenshot} exporting={exporting} />
      <div className="flex-1 flex overflow-hidden">
        <MaterialList />
        <div className="w-px bg-neutral-200 shrink-0" />
        <FloorPlanView ref={floorPlanRef} />
        <div className="w-px bg-neutral-200 shrink-0" />
        <ReviewDetail />
      </div>
    </div>
  )
}

export default Workbench
