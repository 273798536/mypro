import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  GripVertical,
  MapPin,
  User,
  ChevronDown,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { checkOverCapacity, formatCapacity, getSourceLabel } from '@/utils';
import type { PointStatus, Point } from '@/types';

interface ColumnConfig {
  id: PointStatus;
  title: string;
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  borderColor: string;
}

const columns: ColumnConfig[] = [
  {
    id: 'processed',
    title: '已处理',
    icon: CheckCircle,
    color: 'text-status-success',
    bgColor: 'bg-green-50',
    borderColor: 'border-status-success',
  },
  {
    id: 'pending_field',
    title: '待现场看',
    icon: Clock,
    color: 'text-status-warning',
    bgColor: 'bg-amber-50',
    borderColor: 'border-status-warning',
  },
  {
    id: 'conflict',
    title: '冲突记录',
    icon: XCircle,
    color: 'text-status-danger',
    bgColor: 'bg-red-50',
    borderColor: 'border-status-danger',
  },
];

interface SortablePointCardProps {
  point: Point;
  onOpenDetail: (pointId: string) => void;
}

function SortablePointCard({ point, onOpenDetail }: SortablePointCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: point.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const capacityCheck = checkOverCapacity(point);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-sm p-3 mb-2 cursor-pointer hover:shadow-sm transition-shadow ${
        isDragging ? 'shadow-lg' : ''
      }`}
      onClick={() => onOpenDetail(point.id)}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-800 truncate">
            {point.name}
          </h4>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{point.community}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-gray-500">容量：</span>
              <span
                className={`font-mono font-medium ${
                  capacityCheck.isOver ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {formatCapacity(point.capacity)}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {getSourceLabel(point.source)}
            </span>
          </div>
          {capacityCheck.isOver && (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-sm">
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span>超 {capacityCheck.exceedRatio.toFixed(1)}%</span>
              </div>
            </div>
          )}
          {point.assignee && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>{point.assignee}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: ColumnConfig;
  points: Point[];
  onOpenDetail: (pointId: string) => void;
}

function KanbanColumn({ column, points, onOpenDetail }: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <div className={`${column.bgColor} rounded-sm flex flex-col min-h-0`}>
      <div
        className={`px-4 py-3 border-b-2 ${column.borderColor} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${column.color}`} />
          <span className="font-semibold text-sm text-gray-800">
            {column.title}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${column.bgColor} ${column.color}`}
        >
          {points.length}
        </span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin min-h-64">
        <SortableContext items={points.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {points.map((point) => (
            <SortablePointCard
              key={point.id}
              point={point}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </SortableContext>
        {points.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">暂无点位</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Review() {
  const { points, updatePointStatus, openDetailDrawer } = useAppStore();
  const [expandedOverCapacity, setExpandedOverCapacity] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const processedPoints = points.filter((p) => p.status === 'processed');
  const pendingPoints = points.filter((p) => p.status === 'pending_field');
  const conflictPoints = points.filter((p) => p.status === 'conflict');
  const overCapacityPoints = points.filter(
    (p) => checkOverCapacity(p).isOver && p.status !== 'conflict'
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activePoint = points.find((p) => p.id === activeId);
    const overPoint = points.find((p) => p.id === overId);

    if (activePoint && overPoint && activePoint.status !== overPoint.status) {
      updatePointStatus(activeId, overPoint.status, '拖拽调整状态');
    }
  };

  const mostSeverePoint = overCapacityPoints.reduce<Point | null>((max, p) => {
    if (!max) return p;
    const maxRatio = (max.capacity - max.limit) / max.limit;
    const pRatio = (p.capacity - p.limit) / p.limit;
    return pRatio > maxRatio ? p : max;
  }, null);

  const severeCheck = mostSeverePoint ? checkOverCapacity(mostSeverePoint) : null;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {overCapacityPoints.length > 0 && (
        <div className="card overflow-hidden">
          <button
            className="w-full px-5 py-3 flex items-center justify-between bg-amber-50 hover:bg-amber-100/50 transition-colors"
            onClick={() => setExpandedOverCapacity(!expandedOverCapacity)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-amber-800">
                  容量超限提示
                </h3>
                <p className="text-xs text-amber-600 mt-0.5">
                  共 {overCapacityPoints.length} 个点位容量超限，
                  {mostSeverePoint && severeCheck
                    ? `最严重点位：${mostSeverePoint.name}（超${severeCheck.exceedRatio.toFixed(1)}%）`
                    : ''}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-amber-600 transition-transform ${
                expandedOverCapacity ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedOverCapacity && (
            <div className="px-5 py-4 bg-amber-50/50 border-t border-amber-200">
              {mostSeverePoint && severeCheck && (
                <div className="bg-white rounded-sm border border-amber-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-800">
                        {mostSeverePoint.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {mostSeverePoint.community} · {mostSeverePoint.address}
                      </p>
                    </div>
                    <span className="status-badge-danger status-badge">
                      超 {severeCheck.exceedRatio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-gray-50 p-2 rounded-sm">
                      <p className="text-xs text-gray-500">设计容量</p>
                      <p className="text-sm font-mono font-semibold text-gray-800">
                        {formatCapacity(mostSeverePoint.capacity)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-sm">
                      <p className="text-xs text-gray-500">容量上限</p>
                      <p className="text-sm font-mono font-semibold text-gray-800">
                        {formatCapacity(mostSeverePoint.limit)}
                      </p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-sm">
                      <p className="text-xs text-red-500">超限值</p>
                      <p className="text-sm font-mono font-semibold text-red-600">
                        +{formatCapacity(severeCheck.exceedValue)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-sm p-3">
                    <p className="text-sm font-medium text-red-700 mb-2">
                      下一步操作：
                    </p>
                    <ol className="text-sm text-red-600 space-y-1.5 list-decimal list-inside">
                      {severeCheck.nextSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  className="btn-primary text-xs"
                  onClick={() => mostSeverePoint && openDetailDrawer(mostSeverePoint.id)}
                >
                  查看详情
                </button>
                <button className="btn-secondary text-xs">
                  全部超限点位
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <KanbanColumn
            column={columns[0]}
            points={processedPoints}
            onOpenDetail={openDetailDrawer}
          />
          <KanbanColumn
            column={columns[1]}
            points={pendingPoints}
            onOpenDetail={openDetailDrawer}
          />
          <KanbanColumn
            column={columns[2]}
            points={conflictPoints}
            onOpenDetail={openDetailDrawer}
          />
        </DndContext>
      </div>

      <div className="text-center text-xs text-gray-400">
        提示：拖拽点位卡片可在状态间流转；点击卡片查看原始台账与计算口径
      </div>
    </div>
  );
}
