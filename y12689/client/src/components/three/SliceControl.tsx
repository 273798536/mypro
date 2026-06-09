interface SliceControlProps {
  sliceAxis: 'x' | 'y' | 'z'
  slicePosition: number
  onAxisChange: (axis: 'x' | 'y' | 'z') => void
  onPositionChange: (pos: number) => void
}

const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z']

function SliceControl({
  sliceAxis,
  slicePosition,
  onAxisChange,
  onPositionChange,
}: SliceControlProps) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-text-primary text-sm font-medium mb-3">剖切控制</h3>
        <div className="flex gap-2">
          {axes.map((axis) => (
          <button
            key={axis}
            onClick={() => onAxisChange(axis)}
            className={`px-4 py-2 rounded text-sm font-medium uppercase transition-colors ${
              sliceAxis === axis
                ? 'bg-primary text-white border border-primary'
                : 'bg-bg-hover text-text-secondary border border-border hover:border-border-hover'
            }`}
          >
            {axis}轴
          </button>
        ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary text-sm">剖切位置</span>
          <span className="text-primary text-sm font-mono">{slicePosition.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          step={0.5}
          value={slicePosition}
          onChange={(e) => onPositionChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-bg-hover rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>0</span>
          <span>200</span>
        </div>
      </div>
    </div>
  )
}

export default SliceControl
