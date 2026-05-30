import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Move3d, Info, ChevronRight, Layers } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { SimulationScene } from '@/components/three/SimulationScene';
import { PlaybackControls } from '@/components/PlaybackControls';
import { AnomalyCard } from '@/components/AnomalyCard';
import { formatTime, formatDuration } from '@/utils/reportGenerator';
import {
  getAnomalyTypeLabel,
  getAnomalyTypeColor,
  getSeverityLabel,
} from '@/utils/anomalyDetector';
import { formatPosition, formatHeight, formatSpeed } from '@/utils/pathUtils';
import { cn } from '@/lib/utils';

export default function Simulation() {
  const {
    chuteModels,
    luggageData,
    anomalies,
    selectedChuteId,
    selectedLuggageId,
    selectedAnomalyId,
    showLabels,
    showPath,
    isPlaying,
    simulationTime,
    playbackSpeed,
    setSelectedChuteId,
    setSelectedLuggageId,
    setSelectedAnomalyId,
    setShowLabels,
    setShowPath,
    setIsPlaying,
    setSimulationTime,
    setPlaybackSpeed,
    markAnomalyReviewed,
  } = useAppStore();

  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [selectedLuggage, setSelectedLuggage] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentChute = chuteModels.find((c) => c.id === selectedChuteId) || chuteModels[0];

  const minTime = luggageData.length > 0 ? Math.min(...luggageData.map((l) => l.timestamp)) : 0;
  const maxTime = luggageData.length > 0 ? Math.max(...luggageData.map((l) => l.timestamp)) : 100000;
  const totalDuration = maxTime - minTime;

  const currentTime = minTime + (simulationTime / 100) * totalDuration;

  const visibleLuggage = luggageData.filter(
    (l) => Math.abs(l.timestamp - currentTime) < 120000
  );

  const currentAnomalies = anomalies.filter(
    (a) => Math.abs(a.timestamp - currentTime) < 60000
  );

  const selectedLuggageData = luggageData.find((l) => l.id === selectedLuggage);
  const selectedAnomalyData = anomalies.find((a) => a.id === selectedAnomaly);

  const animate = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        setSimulationTime((prev) => {
          const next = prev + (delta / totalDuration) * 100 * playbackSpeed * 10;
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [isPlaying, playbackSpeed, totalDuration, setSimulationTime, setIsPlaying]
  );

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  const handlePlayPause = () => {
    if (simulationTime >= 100) {
      setSimulationTime(0);
    }
    setIsPlaying(!isPlaying);
    lastTimeRef.current = 0;
  };

  const handleSeek = (time: number) => {
    const progress = (time / (maxTime - minTime)) * 100;
    setSimulationTime(progress);
  };

  const handleReset = () => {
    setSimulationTime(0);
    setIsPlaying(false);
  };

  const handleFrameBack = () => {
    setSimulationTime((prev) => Math.max(0, prev - 0.5));
  };

  const handleFrameForward = () => {
    setSimulationTime((prev) => Math.min(100, prev + 0.5));
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  if (!currentChute) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <Layers size={48} className="text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">请先导入数据或加载示例数据</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">滑槽仿真</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 text-sm">{currentChute.name}</span>
                <span className="text-gray-600">|</span>
                <span className="text-green-400 text-sm">
                  当前时间: {formatTime(currentTime)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={selectedChuteId || ''}
              onChange={(e) => setSelectedChuteId(e.target.value)}
              className="bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              {chuteModels.map((chute) => (
                <option key={chute.id} value={chute.id}>
                  {chute.name}
                </option>
              ))}
            </select>

            {currentAnomalies.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg border border-red-500/30">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">
                  {currentAnomalies.length} 个异常事件
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <SimulationScene
            chute={currentChute}
            luggage={visibleLuggage}
            anomalies={currentAnomalies}
            selectedLuggageId={selectedLuggage}
            selectedAnomalyId={selectedAnomaly}
            showPath={showPath}
            showLabels={showLabels}
            onLuggageClick={(id) => {
              setSelectedLuggage(id === selectedLuggage ? null : id);
              setSelectedAnomaly(null);
            }}
            onAnomalyClick={(id) => {
              setSelectedAnomaly(id === selectedAnomaly ? null : id);
              setSelectedLuggage(null);
            }}
            simulationTime={simulationTime}
            playbackSpeed={playbackSpeed}
            className="w-full h-full"
          />

          <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">图例说明</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-300 text-xs">正常行李</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-gray-300 text-xs">高度错配</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-gray-300 text-xs">速度过快</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <span className="text-gray-300 text-xs">行李堆积</span>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">滑槽信息</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">长度</span>
                <span className="text-white font-mono">{currentChute.length}m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">标准高度</span>
                <span className="text-white font-mono">{currentChute.standardHeight}m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">最大速度</span>
                <span className="text-white font-mono">{currentChute.maxSpeed}m/s</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">分段数</span>
                <span className="text-white font-mono">{currentChute.segments.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 border-l border-gray-800 bg-gray-900/50 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Info size={18} className="text-blue-400" />
              详情面板
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedLuggageData && (
              <div className="bg-gray-800/80 rounded-lg p-4 border border-blue-500/30">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Move3d size={16} className="text-blue-400" />
                  行李详情
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID</span>
                    <span className="text-white font-mono">{selectedLuggageData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">位置</span>
                    <span className="text-white">{formatPosition(selectedLuggageData.position)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">高度</span>
                    <span
                      className={cn(
                        'font-mono',
                        selectedLuggageData.status === 'height_mismatch'
                          ? 'text-red-400'
                          : 'text-white'
                      )}
                    >
                      {formatHeight(selectedLuggageData.height)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">速度</span>
                    <span
                      className={cn(
                        'font-mono',
                        selectedLuggageData.status === 'speed_over'
                          ? 'text-orange-400'
                          : selectedLuggageData.status === 'stacked'
                          ? 'text-yellow-400'
                          : 'text-white'
                      )}
                    >
                      {formatSpeed(selectedLuggageData.speed)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">状态</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor:
                          selectedLuggageData.status === 'normal'
                            ? '#00B42A20'
                            : getAnomalyTypeColor(selectedLuggageData.status as any) + '20',
                        color:
                          selectedLuggageData.status === 'normal'
                            ? '#00B42A'
                            : getAnomalyTypeColor(selectedLuggageData.status as any),
                      }}
                    >
                      {selectedLuggageData.status === 'normal'
                        ? '正常'
                        : getAnomalyTypeLabel(selectedLuggageData.status as any)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedAnomalyData && (
              <div
                className="rounded-lg p-4 border-l-4"
                style={{
                  backgroundColor: getAnomalyTypeColor(selectedAnomalyData.type) + '10',
                  borderColor: getAnomalyTypeColor(selectedAnomalyData.type),
                }}
              >
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span
                    style={{ color: getAnomalyTypeColor(selectedAnomalyData.type) }}
                  >
                    {getAnomalyTypeLabel(selectedAnomalyData.type)}
                  </span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">位置</span>
                    <span className="text-white">{formatPosition(selectedAnomalyData.position)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">严重程度</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor:
                          selectedAnomalyData.severity === 'high'
                            ? '#F53F3F20'
                            : selectedAnomalyData.severity === 'medium'
                            ? '#FF7D0020'
                            : '#00B42A20',
                        color:
                          selectedAnomalyData.severity === 'high'
                            ? '#F53F3F'
                            : selectedAnomalyData.severity === 'medium'
                            ? '#FF7D00'
                            : '#00B42A',
                      }}
                    >
                      {getSeverityLabel(selectedAnomalyData.severity)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">标准值</span>
                    <span className="text-white font-mono">
                      {selectedAnomalyData.expectedValue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">实际值</span>
                    <span
                      className="font-mono"
                      style={{ color: getAnomalyTypeColor(selectedAnomalyData.type) }}
                    >
                      {selectedAnomalyData.actualValue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">影响行李</span>
                    <span className="text-white">{selectedAnomalyData.luggageIds.length}件</span>
                  </div>
                  <p className="text-gray-400 text-xs pt-2 border-t border-gray-700 mt-2">
                    {selectedAnomalyData.description}
                  </p>
                </div>
              </div>
            )}

            {!selectedLuggageData && !selectedAnomalyData && (
              <div className="text-center py-8">
                <Camera size={32} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">点击3D场景中的行李或异常标记查看详情</p>
              </div>
            )}

            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <ChevronRight size={16} className="text-blue-400" />
                当前时段异常
              </h4>
              {currentAnomalies.length > 0 ? (
                <div className="space-y-2">
                  {currentAnomalies.map((anomaly) => (
                    <AnomalyCard
                      key={anomaly.id}
                      anomaly={anomaly}
                      isSelected={selectedAnomaly === anomaly.id}
                      onSelect={() => {
                        setSelectedAnomaly(anomaly.id);
                        setSelectedLuggage(null);
                      }}
                      onReview={(reviewed) => markAnomalyReviewed(anomaly.id, reviewed)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">当前时段无异常事件</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PlaybackControls
        currentTime={simulationTime > 0 ? (simulationTime / 100) * totalDuration : 0}
        totalTime={totalDuration}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        showLabels={showLabels}
        showPath={showPath}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onSpeedChange={setPlaybackSpeed}
        onToggleLabels={() => setShowLabels(!showLabels)}
        onTogglePath={() => setShowPath(!showPath)}
        onReset={handleReset}
        onFrameBack={handleFrameBack}
        onFrameForward={handleFrameForward}
        onFullscreen={handleFullscreen}
      />
    </div>
  );
}
