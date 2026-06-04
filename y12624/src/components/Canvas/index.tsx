import React, { useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ArrowNode } from './ArrowNode';

export const Canvas: React.FC = () => {
  const { filteredRecords, selectedId, selectRecord, updateRecord } = useCanvasStore();

  const handleCanvasClick = useCallback(() => {
    selectRecord(null);
  }, [selectRecord]);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    updateRecord(id, { x, y });
  }, [updateRecord]);

  return (
    <div className="flex-1 bg-slate-900 p-4 overflow-auto">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-2 inline-block">
        <svg
          width="800"
          height="500"
          className="bg-slate-900/50 rounded"
          onClick={handleCanvasClick}
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#334155"
                strokeWidth="0.5"
              />
            </pattern>
            <pattern
              id="grid-bold"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse"
            >
              <rect
                width="200"
                height="200"
                fill="url(#grid)"
              />
              <path
                d="M 200 0 L 0 0 0 200"
                fill="none"
                stroke="#475569"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid-bold)" />

          <rect
            x="50"
            y="50"
            width="700"
            height="400"
            fill="none"
            stroke="#64748B"
            strokeWidth="2"
            strokeDasharray="10 5"
            rx="8"
          />
          
          <text x="60" y="75" fill="#64748B" fontSize="12">
            疏散区域示意
          </text>

          {filteredRecords.map((record) => (
            <ArrowNode
              key={record.id}
              record={record}
              isSelected={selectedId === record.id}
              onSelect={selectRecord}
              onDragEnd={handleDragEnd}
            />
          ))}

          {filteredRecords.length > 1 && (
            <g>
              {filteredRecords.slice(0, -1).map((record, index) => {
                const nextRecord = filteredRecords[index + 1];
                return (
                  <line
                    key={`line-${record.id}`}
                    x1={record.x}
                    y1={record.y}
                    x2={nextRecord.x}
                    y2={nextRecord.y}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    opacity="0.5"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>

      <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-fire-success" />
          <span>正常 - 可使用</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-fire-red animate-pulse" />
          <span>坐标翻转 - 不可使用</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-fire-warning" />
          <span>警告 - 需复核</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span>待复核</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span>💡 拖拽箭头可调整位置，点击选中查看详情</span>
        </div>
      </div>
    </div>
  );
};
