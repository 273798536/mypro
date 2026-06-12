import { useAppStore } from '@/store/useAppStore';
import { use3DSceneSync } from '@/hooks/use3DSceneSync';
import * as Tabs from '@radix-ui/react-tabs';
import { Filter, MapPin, ChevronRight, X, AlertCircle, Droplets, Fish, Camera } from 'lucide-react';
import { DEPTH_LEGEND, anomalyTypeToLabel } from '@/utils/colorScale';

export function RightPanel() {
  const rightPanelTab = useAppStore(s => s.rightPanelTab);
  const setRightPanelTab = useAppStore(s => s.setRightPanelTab);
  const { report, selection, setSelectedSections, setSelectedLines, setSelectedPoint } = use3DSceneSync();
  const selectedPoint = useAppStore(s => s.scene.selection.selectedPointId);
  const getPointById = useAppStore(s => s.getPointById);
  const waterRecords = useAppStore(s => s.waterRecords);
  const aquaLogs = useAppStore(s => s.aquaLogs);
  const photos = useAppStore(s => s.photos);

  const point = selectedPoint ? getPointById(selectedPoint) : null;
  const waterRec = point?.waterQualityId ? waterRecords.get(point.waterQualityId) : null;
  const aquaLog = point?.aquacultureId ? aquaLogs.get(point.aquacultureId) : null;
  const pointPhotos = point ? photos.filter(p => p.relatedPointId === point.pointId) : [];

  return (
    <div className="w-96 bg-channel-panel border-l border-channel-border flex flex-col flex-shrink-0 overflow-hidden">
      <Tabs.Root value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as any)} className="flex flex-col h-full">
        <Tabs.List className="flex border-b border-channel-border bg-channel-panel/80 backdrop-blur">
          <Tabs.Trigger
            value="filter"
            className="flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 border-transparent
              data-[state=active]:border-ocean-500 data-[state=active]:text-ocean-300 text-channel-muted hover:text-channel-text transition-colors"
          >
            <Filter className="w-4 h-4" /> 断面筛选
          </Tabs.Trigger>
          <Tabs.Trigger
            value="detail"
            className="flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 border-transparent
              data-[state=active]:border-ocean-500 data-[state=active]:text-ocean-300 text-channel-muted hover:text-channel-text transition-colors"
          >
            <MapPin className="w-4 h-4" /> 测点明细 {point && <span className="chip-blue">1</span>}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="filter" className="flex-1 overflow-auto scrollbar-thin p-4 space-y-4">
          {!report && <div className="text-center py-10 text-channel-muted">加载中…</div>}

          {report && (
            <>
              <div>
                <div className="label-muted mb-2">深度色标图例</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEPTH_LEGEND.map(d => (
                    <div key={d.label} className="flex items-center gap-2 text-xs p-1.5 rounded bg-channel-card/50">
                      <span className="w-3 h-3 rounded" style={{ background: d.color }} />
                      <span className="truncate text-channel-text">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="label-muted mb-2 flex items-center justify-between">
                  <span>航道断面 ({report.sections.length})</span>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedSections([])} className="text-[10px] text-ocean-400 hover:text-ocean-300">清空</button>
                    <button
                      onClick={() => setSelectedSections(report.sections.map(s => s.sectionId))}
                      className="text-[10px] text-ocean-400 hover:text-ocean-300"
                    >全选</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {report.sections.map(sec => {
                    const secSelected = selection.selectedSectionIds.includes(sec.sectionId);
                    const anomalyCount = sec.surveyLines.reduce((s, l) => s + l.points.filter(p => p.isAnomaly).length, 0);
                    return (
                      <div key={sec.sectionId} className="rounded border border-channel-border overflow-hidden">
                        <label
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                            ${secSelected ? 'bg-ocean-800/30' : 'bg-channel-card/50 hover:bg-channel-card'}`}
                        >
                          <input
                            type="checkbox"
                            checked={secSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSections([...selection.selectedSectionIds, sec.sectionId]);
                              } else {
                                setSelectedSections(selection.selectedSectionIds.filter(x => x !== sec.sectionId));
                              }
                            }}
                            className="accent-ocean-500"
                          />
                          <span className="text-sm flex-1 truncate">{sec.sectionName}</span>
                          {anomalyCount > 0 && <span className="chip-red">{anomalyCount} 异</span>}
                          <ChevronRight className={`w-3 h-3 text-channel-muted transition-transform ${secSelected ? 'rotate-90' : ''}`} />
                        </label>
                        {secSelected && (
                          <div className="border-t border-channel-border p-2 space-y-1 bg-ocean-950/30">
                            <div className="label-muted mb-1">测线</div>
                            {sec.surveyLines.map(line => {
                              const lineSelected = selection.selectedLineIds.includes(line.lineId);
                              const lineAnom = line.points.filter(p => p.isAnomaly).length;
                              return (
                                <label
                                  key={line.lineId}
                                  className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-ocean-900/40 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={lineSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedLines([...selection.selectedLineIds, line.lineId]);
                                      } else {
                                        setSelectedLines(selection.selectedLineIds.filter(x => x !== line.lineId));
                                      }
                                    }}
                                    className="accent-ocean-500"
                                  />
                                  <span className="flex-1 truncate">{line.lineName}</span>
                                  <span className="text-channel-muted">{line.points.length} 点</span>
                                  {lineAnom > 0 && <span className="chip-red text-[10px]">{lineAnom}</span>}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Tabs.Content>

        <Tabs.Content value="detail" className="flex-1 overflow-auto scrollbar-thin p-4 space-y-4">
          {!point && (
            <div className="text-center py-16 text-channel-muted">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="text-sm">点击 3D 场景中的测点</div>
              <div className="text-xs mt-1">查看深度、坐标、水质、养殖日志</div>
            </div>
          )}

          {point && (
            <div className="space-y-4">
              <div className={`card p-4 ${point.isAnomaly ? `severity-${point.anomalyType === 'negative_depth' ? 'red' : point.anomalyType === 'water_quality_mismatch' ? 'orange' : point.anomalyType === 'tide_delayed' ? 'orange' : 'yellow'}` : 'border-l-4 border-emerald-500'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold font-mono">{point.pointId}</div>
                    <div className="text-xs text-channel-muted mt-0.5">桩号 K{(point.mileage / 1000).toFixed(3)}</div>
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-channel-muted hover:text-channel-text p-1 rounded hover:bg-channel-border/30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-3xl font-bold font-mono ${point.correctedDepth < 0 ? 'text-red-400' : 'text-emerald-300'}`}>
                    {point.correctedDepth.toFixed(2)}
                  </span>
                  <span className="text-sm text-channel-muted">m（修正后深度）</span>
                </div>
                {point.isAnomaly && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="chip-red">{anomalyTypeToLabel(point.anomalyType || 'other')}</span>
                  </div>
                )}
              </div>

              <div className="card p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="label-muted">原始测深</div>
                  <div className="data-value mt-1">{point.rawDepth.toFixed(2)} m</div>
                </div>
                <div>
                  <div className="label-muted">潮汐修正</div>
                  <div className="data-value mt-1 text-ocean-300">{point.tideCorrection >= 0 ? '+' : ''}{point.tideCorrection.toFixed(3)} m</div>
                </div>
                <div>
                  <div className="label-muted">基准面换算</div>
                  <div className="data-value mt-1">{point.datumCorrection >= 0 ? '+' : ''}{point.datumCorrection.toFixed(3)} m</div>
                </div>
                <div>
                  <div className="label-muted">GPS 坐标</div>
                  <div className="data-value mt-1">{point.gpsX.toFixed(0)}, {point.gpsY.toFixed(0)}</div>
                </div>
                <div className="col-span-2">
                  <div className="label-muted">测量时间</div>
                  <div className="data-value mt-1">{point.measureTime}</div>
                </div>
              </div>

              {waterRec && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Droplets className="w-4 h-4 text-ocean-400" /> 水质记录
                    <span className="chip-blue ml-auto">{waterRec.source === 'sensor' ? '传感器' : '人工采样'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="label-muted">浊度 (NTU)</div><div className="data-value mt-1">{waterRec.turbidity}</div></div>
                    <div><div className="label-muted">盐度 (‰)</div><div className="data-value mt-1">{waterRec.salinity}</div></div>
                    <div><div className="label-muted">pH</div><div className="data-value mt-1">{waterRec.ph}</div></div>
                    <div><div className="label-muted">溶氧 (mg/L)</div><div className="data-value mt-1">{waterRec.do}</div></div>
                  </div>
                </div>
              )}

              {aquaLog && (
                <div className={`card p-4 ${aquaLog.remarks.startsWith('【日志缺失】') ? 'severity-yellow' : ''}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Fish className="w-4 h-4 text-emerald-400" /> 养殖日志
                    <span className="chip-gray ml-auto">网箱 {aquaLog.cageId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="label-muted">投饵量 (kg)</div><div className="data-value mt-1">{aquaLog.feedingAmount}</div></div>
                    <div><div className="label-muted">水体交换率</div><div className="data-value mt-1">{(aquaLog.waterExchangeRate * 100).toFixed(0)}%</div></div>
                    <div className="col-span-2">
                      <div className="label-muted">溶氧 (mg/L)</div>
                      <div className="data-value mt-1">{aquaLog.oxygenLevel}</div>
                    </div>
                  </div>
                  {aquaLog.remarks && (
                    <div className="mt-3 text-xs p-2 rounded bg-channel-bg/50 border border-channel-border">
                      {aquaLog.remarks}
                    </div>
                  )}
                </div>
              )}

              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Camera className="w-4 h-4 text-amber-400" /> 巡检照片
                  <span className="chip-gray ml-auto">{pointPhotos.length} / 张</span>
                </div>
                {pointPhotos.length === 0 ? (
                  <div className="text-xs text-channel-muted text-center py-4 border-2 border-dashed border-channel-border rounded">
                    暂无关联照片
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {pointPhotos.map(ph => (
                      <div key={ph.photoId} className="aspect-video rounded bg-gradient-to-br from-ocean-900 to-channel-card border border-channel-border flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.5),transparent)]" />
                        <div className="text-xs text-channel-muted text-center">
                          <div className="font-mono text-[10px] mb-1">{ph.photoTime.split(' ')[1]}</div>
                          <div className="text-[9px] opacity-60">点击查看</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
