import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Image, LayoutDashboard, ClipboardList, FileCheck } from 'lucide-react'
import AnnotationTimeline from '@/components/AnnotationTimeline'
import NoteEditor from '@/components/NoteEditor'
import ScreenshotCompare from '@/components/ScreenshotCompare'
import CoordChangeLog from '@/components/CoordChangeLog'

const navItems = [
  { path: '/', label: '工作区', icon: LayoutDashboard },
  { path: '/annotations', label: '批注与历史', icon: ClipboardList },
  { path: '/handover', label: '交接', icon: FileCheck },
]

export default function Annotations() {
  const location = useLocation()
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'notes' | 'screenshots'>('notes')

  return (
    <div className="h-screen flex flex-col bg-[#1a2332] text-slate-200">
      <nav className="flex items-center gap-1 px-4 py-2 bg-slate-900 border-b border-slate-700">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[60%] border-r border-slate-700 overflow-y-auto p-4">
          <h2 className="text-base font-medium text-slate-200 mb-4">批注时间线</h2>
          <AnnotationTimeline
            activeAnnotationId={activeAnnotationId}
            onSelect={setActiveAnnotationId}
          />
        </div>

        <div className="w-[40%] flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setRightTab('notes')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
                rightTab === 'notes'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={14} />
              备注
            </button>
            <button
              onClick={() => setRightTab('screenshots')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
                rightTab === 'screenshots'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Image size={14} />
              截图对比
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'notes' ? (
              <NoteEditor annotationId={activeAnnotationId} />
            ) : (
              <ScreenshotCompare annotationId={activeAnnotationId} />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 overflow-y-auto p-4 max-h-[30vh]">
        <CoordChangeLog />
      </div>
    </div>
  )
}
