import { useState } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import Viewport3D from '@/components/Viewport3D'
import Sidebar from '@/components/Sidebar'
import Toolbar from '@/components/Toolbar'

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="h-screen w-screen flex flex-col bg-med-dark">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <div className={`flex-1 min-w-0 p-2 ${sidebarOpen ? 'pr-0' : 'pr-2'}`}>
          <Viewport3D />
        </div>
        <div className="flex flex-col">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-med-text-dim hover:text-med-blue transition-colors self-end mb-1 mr-2"
            title={sidebarOpen ? '收起面板' : '展开面板'}
          >
            {sidebarOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
          {sidebarOpen && (
            <div className="w-[320px] h-full pb-2 pr-2">
              <Sidebar />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
