import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  AlertTriangle,
  ChevronRight,
  Home,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { GRID_SIZE, WARNING_LEVELS } from '@/data/mockData';
import type { RadarBlock, WarningLevel } from '@/types/game';

const SortableRadarBlock = ({ block }: { block: RadarBlock }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch (block.type) {
      case 'cloud':
        return <Cloud className="w-6 h-6" />;
      case 'rain':
        return <CloudRain className="w-6 h-6" />;
      case 'storm':
        return <CloudLightning className="w-6 h-6" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
        block.isCorrect === true
          ? 'bg-green-500/20 border-2 border-green-500'
          : block.isCorrect === false
          ? 'bg-red-500/20 border-2 border-red-500 animate-shake'
          : 'bg-white/5 border border-white/20 hover:border-radar-blue/50 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: block.color }}
        >
          {getIcon()}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{block.label}</div>
          <div className="text-xs text-gray-400">
            数据源: {block.dataSource === 'radar-a' ? '雷达A' : '雷达B'}
          </div>
        </div>
      </div>
    </div>
  );
};

const GridCell = ({
  x,
  y,
  block,
  isHighlighted,
}: {
  x: number;
  y: number;
  block?: RadarBlock;
  isHighlighted: boolean;
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'cloud':
        return <Cloud className="w-8 h-8" />;
      case 'rain':
        return <CloudRain className="w-8 h-8" />;
      case 'storm':
        return <CloudLightning className="w-8 h-8" />;
    }
  };

  return (
    <div
      className={`aspect-square rounded-xl border-2 transition-all duration-300 flex items-center justify-center ${
        isHighlighted
          ? 'border-radar-blue bg-radar-blue/20'
          : block
          ? block.isCorrect
            ? 'border-green-500 bg-green-500/20'
            : 'border-red-500 bg-red-500/20'
          : 'border-white/10 bg-white/5 hover:border-white/30'
      }`}
    >
      {block && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center gap-1"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: block.color }}
          >
            {getIcon(block.type)}
          </div>
          <span className="text-xs text-gray-300">{block.label}</span>
        </motion.div>
      )}
      {!block && (
        <span className="text-xs text-gray-600">
          ({x + 1}, {y + 1})
        </span>
      )}
    </div>
  );
};

const WindCompass = ({
  direction,
  onChange,
}: {
  direction: number;
  onChange: (dir: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
      const normalizedAngle = ((angle % 360) + 360) % 360;
      onChange(Math.round(normalizedAngle));
    },
    [isDragging, onChange]
  );

  const getDirectionLabel = (deg: number) => {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-48 h-48 rounded-full border-2 border-radar-blue/50 bg-white/5 cursor-crosshair select-none"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
      >
        <div className="absolute inset-4 rounded-full border border-white/10" />
        <div className="absolute inset-8 rounded-full border border-white/10" />
        
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">北</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">南</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">西</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">东</div>

        <div
          className="absolute top-1/2 left-1/2 w-1 h-16 bg-gradient-to-t from-radar-blue to-cyan-300 origin-bottom rounded-full transition-transform duration-100"
          style={{ transform: `translateX(-50%) rotate(${direction}deg)` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-cyan-300" />
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-radar-blue" />
      </div>

      <div className="mt-4 text-center">
        <div className="font-orbitron text-2xl font-bold text-radar-blue">{direction}°</div>
        <div className="text-sm text-gray-400">{getDirectionLabel(direction)}风</div>
      </div>
    </div>
  );
};

const WarningSelector = ({
  level,
  time,
  onLevelChange,
  onTimeChange,
}: {
  level: WarningLevel;
  time: number;
  onLevelChange: (level: WarningLevel) => void;
  onTimeChange: (time: number) => void;
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">预警级别</label>
        <div className="flex gap-2 flex-wrap">
          {WARNING_LEVELS.map((item) => (
            <button
              key={item.level}
              onClick={() => onLevelChange(item.level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                level === item.level
                  ? 'text-white shadow-lg scale-105'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
              style={level === item.level ? { backgroundColor: item.color } : {}}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          发布时机（降雨前小时数）: {time}小时
        </label>
        <input
          type="range"
          min="0"
          max="12"
          value={time}
          onChange={(e) => onTimeChange(Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${(time / 12) * 100}%, rgba(255,255,255,0.1) ${(time / 12) * 100}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>立即</span>
          <span>6小时</span>
          <span>12小时</span>
        </div>
      </div>
    </div>
  );
};

const Game = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const {
    radarBlocks,
    windDirection,
    warningLevel,
    warningTime,
    score,
    errors,
    conflicts,
    operationHistory,
    placeRadarBlock,
    setWindDirection,
    setWarning,
    submitGame,
  } = useGameStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const unplacedBlocks = radarBlocks.filter((b) => !b.isPlaced);
  const placedBlocksMap = new Map(
    radarBlocks.filter((b) => b.isPlaced).map((b) => [`${b.position.x}-${b.position.y}`, b])
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const blockId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith('cell-')) {
      const [, x, y] = overId.split('-').map(Number);
      placeRadarBlock(blockId, { x, y });
    }
  };

  const activeBlock = activeId ? radarBlocks.find((b) => b.id === activeId) : null;

  const handleSubmit = () => {
    submitGame();
    navigate('/result');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>返回首页</span>
        </button>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-400">当前得分</div>
            <div className="font-orbitron text-2xl font-bold text-radar-blue">{score}</div>
          </div>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-medium text-white hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2"
          >
            提交拼图
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-radar-blue" />
              雷达块库
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={unplacedBlocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {unplacedBlocks.map((block) => (
                    <SortableRadarBlock key={block.id} block={block} />
                  ))}
                  {unplacedBlocks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      所有雷达块已放置
                    </div>
                  )}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeBlock && (
                  <div className="p-3 rounded-xl bg-white/20 backdrop-blur-lg border border-radar-blue">
                    <div className="text-white font-medium">{activeBlock.label}</div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-cyan-400" />
              雷达拼图区
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: GRID_SIZE }).map((_, y) =>
                  Array.from({ length: GRID_SIZE }).map((_, x) => {
                    const cellId = `cell-${x}-${y}`;
                    const block = placedBlocksMap.get(`${x}-${y}`);
                    return (
                      <div key={cellId} id={cellId}>
                        <GridCell x={x} y={y} block={block} isHighlighted={false} />
                      </div>
                    );
                  })
                )}
              </div>
            </DndContext>
          </div>

          <AnimatePresence>
            {conflicts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-500 mb-2">数据冲突提示</h4>
                    {conflicts.map((conflict) => (
                      <div key={conflict.id} className="text-sm text-gray-300 mb-2">
                        <span className="text-yellow-400">{conflict.sourceA}</span> vs{' '}
                        <span className="text-orange-400">{conflict.sourceB}</span>
                        <div className="text-gray-400 mt-1">{conflict.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
              <Wind className="w-5 h-5 text-teal-400" />
              风向调整
            </h3>
            <WindCompass direction={windDirection} onChange={setWindDirection} />
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              降雨预警
            </h3>
            <WarningSelector
              level={warningLevel}
              time={warningTime}
              onLevelChange={(level) => setWarning(level, warningTime)}
              onTimeChange={(time) => setWarning(warningLevel, time)}
            />
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 max-h-64 overflow-y-auto scrollbar-thin">
            <h3 className="font-orbitron font-bold text-white mb-4">实时反馈</h3>
            <div className="space-y-2">
              {errors.length === 0 && operationHistory.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">
                  开始操作后将显示实时反馈
                </div>
              )}
              {errors.slice(-5).map((error) => (
                <motion.div
                  key={error.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-red-400 font-medium">
                      {error.type === 'cloud-mismatch' && '云团错配'}
                      {error.type === 'wind-reverse' && '风向反判'}
                      {error.type === 'warning-early' && '预警过早'}
                      {error.type === 'warning-late' && '预警过晚'}
                    </div>
                    <div className="text-xs text-gray-400">{error.description}</div>
                  </div>
                </motion.div>
              ))}
              {operationHistory
                .filter((op) => op.triggeredMatch)
                .slice(-3)
                .map((op) => (
                  <motion.div
                    key={op.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-green-400 font-medium">匹配成功</div>
                      <div className="text-xs text-gray-400">
                        {op.type === 'drag' && '雷达块放置正确'}
                        {op.type === 'rotate' && '风向判断正确'}
                        {op.type === 'warning' && '预警设置正确'}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
