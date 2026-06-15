import { useState } from 'react';
import { MessageSquare, FileText, ChevronDown, ChevronRight, User } from 'lucide-react';
import type { Material, MaterialType } from '@/types';
import { cn } from '@/lib/utils';

interface MaterialTimelineProps {
  materials: Material[];
}

const typeLabels: Record<MaterialType, { label: string; color: string }> = {
  drainage_design: { label: '设计图纸', color: 'bg-primary-100 text-primary-600' },
  survey_report: { label: '检测报告', color: 'bg-success-100 text-success-600' },
  approval: { label: '审批文件', color: 'bg-warning-100 text-warning-600' },
  other: { label: '其他材料', color: 'bg-steel-100 text-steel-600' },
};

function ChatRecordItem({
  speaker,
  content,
  time,
  isLeader,
}: {
  speaker: string;
  content: string;
  time: string;
  isLeader: boolean;
}) {
  return (
    <div className={cn('flex gap-2', isLeader ? 'justify-end' : 'justify-start')}>
      {!isLeader && (
        <div className="w-7 h-7 rounded-full bg-steel-100 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-steel-500" />
        </div>
      )}
      <div className="max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          {!isLeader && (
            <span className="text-xs text-steel-500">{speaker}</span>
          )}
          <span className="text-xs text-steel-300">{time.split(' ')[1]}</span>
          {isLeader && (
            <span className="text-xs text-steel-500">{speaker}</span>
          )}
        </div>
        <div
          className={cn(
            'px-3 py-2 rounded-lg text-sm',
            isLeader
              ? 'bg-primary-500 text-white rounded-tr-sm'
              : 'bg-steel-50 text-steel-700 rounded-tl-sm'
          )}
        >
          {content}
          {isLeader && (
            <span className="inline-block ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
              领导
            </span>
          )}
        </div>
      </div>
      {isLeader && (
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-primary-600" />
        </div>
      )}
    </div>
  );
}

function MaterialItem({ material }: { material: Material }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = typeLabels[material.type];
  const hasChat = material.chatRecords.length > 0;

  return (
    <div className="relative pl-6 pb-4">
      <div className="absolute left-[7px] top-2 w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow-sm z-10" />
      <div className="absolute left-[11px] top-5 bottom-0 w-px bg-steel-100" />

      <div className="bg-white border border-steel-100 rounded-md p-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-primary-500" />
              <span className="text-sm font-medium text-steel-700">
                {material.name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-steel-400">
              <span className={cn('px-1.5 py-0.5 rounded', typeConfig.color)}>
                {typeConfig.label}
              </span>
              <span>第 {material.batchNo} 批</span>
              <span>{material.uploader} 上传</span>
            </div>
            <div className="text-xs text-steel-300 mt-1">
              {material.uploadTime}
            </div>
          </div>

          {hasChat && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-steel-400 hover:text-primary-500 transition-colors"
            >
              <MessageSquare size={14} />
              <span>{material.chatRecords.length} 条记录</span>
              {expanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          )}
        </div>

        {hasChat && expanded && (
          <div className="mt-3 pt-3 border-t border-steel-50 space-y-3 animate-fade-in">
            <div className="text-xs text-steel-400 flex items-center gap-1.5">
              <MessageSquare size={12} />
              相关聊天记录
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {material.chatRecords.map((chat) => (
                <ChatRecordItem
                  key={chat.id}
                  speaker={chat.speaker}
                  content={chat.content}
                  time={chat.time}
                  isLeader={chat.isLeader}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MaterialTimeline({ materials }: MaterialTimelineProps) {
  const batches: Record<number, Material[]> = {};

  materials.forEach((m) => {
    if (!batches[m.batchNo]) {
      batches[m.batchNo] = [];
    }
    batches[m.batchNo].push(m);
  });

  const batchNumbers = Object.keys(batches)
    .map(Number)
    .sort((a, b) => a - b);

  if (materials.length === 0) {
    return (
      <div className="text-center py-10 text-steel-400 text-sm">
        暂无审批台账材料
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batchNumbers.map((batchNo) => (
        <div key={batchNo}>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs font-medium rounded">
              第 {batchNo} 批材料
            </span>
            <span className="text-xs text-steel-400">
              共 {batches[batchNo].length} 份
            </span>
          </div>
          <div className="space-y-1">
            {batches[batchNo].map((material) => (
              <MaterialItem key={material.id} material={material} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
