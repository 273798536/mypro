import React from 'react';
import { useAnnotationStore, useLevelStore } from '../../store';
import { AnnotationCard } from './AnnotationCard';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface AnnotationListProps {
  levelId?: string;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ levelId: propLevelId }) => {
  const { annotations, selectedAnnotationId, selectAnnotation } = useAnnotationStore();
  const { currentLevel } = useLevelStore();
  const levelId = propLevelId || currentLevel?.id;

  const levelAnnotations = levelId
    ? annotations.filter((a) => a.levelId === levelId)
    : [];

  const anomalyCount = levelAnnotations.filter((a) => a.type !== 'normal').length;
  const confirmedCount = levelAnnotations.filter((a) => a.status === 'confirmed').length;
  const draftCount = levelAnnotations.filter((a) => a.status === 'draft').length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-neutral-800">标注列表</h3>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{levelAnnotations.length} 条</Badge>
            {anomalyCount > 0 && (
              <Badge variant="danger">{anomalyCount} 异常</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-neutral-500">已确认 {confirmedCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="text-neutral-500">草稿 {draftCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-neutral-500">目标 {currentLevel?.targetAnnotations || 0}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        {levelAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-neutral-500">暂无标注记录</p>
            <p className="text-sm text-neutral-400 mt-1">点击画布中的球体开始标注</p>
          </div>
        ) : (
          <div className="space-y-3">
            {levelAnnotations
              .sort((a, b) => a.timePoint - b.timePoint)
              .map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  isSelected={selectedAnnotationId === annotation.id}
                  onSelect={() => selectAnnotation(
                    selectedAnnotationId === annotation.id ? null : annotation.id
                  )}
                />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
