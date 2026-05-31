import { Link } from 'react-router-dom'
import ReportView from '@/components/ReportView'
import { ArrowLeft } from 'lucide-react'

export default function Report() {
  return (
    <div className="min-h-screen bg-navy-800 p-6">
      <Link to="/" className="inline-flex items-center gap-2 text-navy-200 hover:text-amber text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> 返回工作台
      </Link>
      <ReportView />
    </div>
  )
}
