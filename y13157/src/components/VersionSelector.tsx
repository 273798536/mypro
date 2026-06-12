import { useReplayStore } from '@/store/useReplayStore'
import { RefreshCw } from 'lucide-react'

export default function VersionSelector() {
  const { paramVersions, currentVersionId, setVersion } = useReplayStore()
  return (
    <div className="flex items-center gap-2">
      {paramVersions.map((v) => (
        <button
          key={v.id}
          onClick={() => setVersion(v.id)}
          className={[
            'px-3 py-1.5 rounded-md text-sm font-medium border transition-all flex items-center gap-2',
            currentVersionId === v.id
              ? 'bg-industrial-blue border-industrial-blue text-white shadow-md shadow-industrial-blue/30'
              : 'bg-industrial-panel border-industrial-border text-industrial-muted hover:text-white hover:border-industrial-blue/50',
          ].join(' ')}
        >
          <RefreshCw size={14} />
          {v.name}
        </button>
      ))}
    </div>
  )
}
