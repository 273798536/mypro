import { useApp } from '../context/AppContext';

export default function ParameterPanel() {
  const {
    collisionThreshold,
    boundaryMargin,
    showCollisions,
    showBoundaries,
    setCollisionThreshold,
    setBoundaryMargin,
    setShowCollisions,
    setShowBoundaries,
    activeRecord,
    restoreViewpoint,
    saveViewpoint,
    selectCollision,
    selectedCollisionId,
    getValidationIssues,
  } = useApp();

  const issues = activeRecord ? getValidationIssues(activeRecord.id) : [];

  return (
    <aside className="w-80 bg-tech-gray border-l border-gray-700 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200 mb-3">参数控制</h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">碰撞检测阈值</label>
              <span className="text-xs font-mono text-blue-300">{collisionThreshold} mm</span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              value={collisionThreshold}
              onChange={(e) => setCollisionThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">工作区边界</label>
              <span className="text-xs font-mono text-amber-300">{boundaryMargin} mm</span>
            </div>
            <input
              type="range"
              min={1000}
              max={30000}
              step={500}
              value={boundaryMargin}
              onChange={(e) => setBoundaryMargin(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCollisions}
                onChange={(e) => setShowCollisions(e.target.checked)}
                className="accent-red-500 w-3.5 h-3.5"
              />
              显示碰撞点
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showBoundaries}
                onChange={(e) => setShowBoundaries(e.target.checked)}
                className="accent-amber-500 w-3.5 h-3.5"
              />
              显示边界
            </label>
          </div>
        </div>
      </div>

      {activeRecord && (
        <>
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">碰撞结果</h3>
              <span className="text-xs text-gray-500">{activeRecord.collisions.length} 处</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {activeRecord.collisions.length === 0 && (
                <div className="text-xs text-gray-500 py-3 text-center">暂无碰撞</div>
              )}
              {activeRecord.collisions.map((col) => (
                <div
                  key={col.id}
                  onClick={() => selectCollision(col.id)}
                  className={`p-2 rounded text-xs border cursor-pointer transition-colors ${
                    selectedCollisionId === col.id
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-slate-800/60 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.colorCode }}
                    />
                    <span className="font-medium text-gray-200 truncate">
                      {col.type === 'collision' ? '碰撞' : col.type === 'boundary' ? '越界' : '警告'}
                      {col.isCritical && <span className="text-red-400 ml-1">· 严重</span>}
                    </span>
                  </div>
                  <div className="text-gray-500 truncate pl-3.5">{col.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">已保存视角</h3>
              <span className="text-xs text-gray-500">{activeRecord.viewpoints.length} 个</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {activeRecord.viewpoints.length === 0 && (
                <div className="text-xs text-gray-500 py-3 text-center">暂无保存视角</div>
              )}
              {activeRecord.viewpoints.map((vp) => (
                <button
                  key={vp.id}
                  onClick={() => restoreViewpoint(vp)}
                  className="w-full p-2 rounded text-xs bg-slate-800/60 border border-gray-700 hover:border-blue-500 hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span>📷</span>
                    <span className="font-medium text-gray-200">{vp.name}</span>
                  </div>
                  {vp.description && (
                    <div className="text-gray-500 truncate mt-0.5 pl-5">{vp.description}</div>
                  )}
                  <div className="text-[10px] text-gray-600 mt-0.5 pl-5">
                    {new Date(vp.createdAt).toLocaleString('zh-CN')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 flex-1 overflow-y-auto scrollbar-thin">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">时间与复核信息</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">设计时间</span>
                <span className="text-gray-300 font-mono">{new Date(activeRecord.timeParams.designTime).toLocaleDateString('zh-CN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">导入时间</span>
                <span className="text-gray-300 font-mono">{new Date(activeRecord.timeParams.importTime).toLocaleString('zh-CN')}</span>
              </div>
              {activeRecord.timeParams.exportTime && (
                <div className="flex justify-between">
                  <span className="text-gray-500">导出时间</span>
                  <span className="text-gray-300 font-mono">{new Date(activeRecord.timeParams.exportTime).toLocaleString('zh-CN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">时间轴同步</span>
                <span className={activeRecord.timeParams.timelineSync ? 'text-emerald-400' : 'text-red-400'}>
                  {activeRecord.timeParams.timelineSync ? '✓ 已同步' : '✗ 不同步'}
                </span>
              </div>
              {activeRecord.reviewer && (
                <div className="flex justify-between">
                  <span className="text-gray-500">复核人</span>
                  <span className="text-gray-300">{activeRecord.reviewer}</span>
                </div>
              )}
              {activeRecord.reviewNotes && (
                <div className="pt-2 border-t border-gray-700 mt-2">
                  <span className="text-gray-500 block mb-1">复核备注</span>
                  <div className="text-gray-300 bg-slate-800/50 p-2 rounded">{activeRecord.reviewNotes}</div>
                </div>
              )}
              {issues.length > 0 && (
                <div className="pt-2 border-t border-gray-700 mt-2">
                  <span className="text-gray-500 block mb-1.5">问题构件数</span>
                  <div className="space-y-1">
                    {issues.map((i, idx) => (
                      <div key={idx} className={`flex justify-between px-2 py-1 rounded ${
                        i.severity === 'critical' ? 'bg-red-900/30' : 'bg-amber-900/30'
                      }`}>
                        <span className={i.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}>
                          {i.type === 'duplicate' ? '重复' : i.type === 'empty' ? '空值' : i.type === 'coordinate' ? '坐标系' : i.type === 'unit' ? '单位' : '备注混写'}
                        </span>
                        <span className="font-mono text-gray-300">{i.elementIds.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
