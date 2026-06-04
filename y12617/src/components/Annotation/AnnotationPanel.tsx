import React from 'react';
import { useAnnotation } from '../../hooks/useAnnotation';
import { useLevelStore, usePhysicsStore } from '../../store';
import { Button } from '../ui/Button';
import { AnnotationTypeBadge } from '../ui/Badge';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import type { AnnotationType, AnnotationStatus } from '../../types/annotation';
import { formatTime } from '../../utils/time';

const ANNOTATION_TYPES: { value: AnnotationType; label: string; description: string }[] = [
  { value: 'normal', label: '正常标注', description: '碰撞正常，无异常' },
  { value: 'boundary_error', label: '边界误判', description: '边界判定存在误差' },
  { value: 'collision_miss', label: '碰撞漏标', description: '之前漏掉的碰撞，补录' },
  { value: 'missing_unit', label: '单位缺失', description: '漏填速度/质量等单位' },
  { value: 'duplicate', label: '重复标注', description: '与其他标注重复' },
  { value: 'other', label: '其他问题', description: '其他异常情况' },
];

const ANNOTATION_STATUS: { value: AnnotationStatus; label: string }[] = [
  { value: 'draft', label: '保存为草稿' },
  { value: 'confirmed', label: '确认提交' },
  { value: 'pending_review', label: '提交审核' },
];

const SAMPLE_CONTENTS: Record<AnnotationType, string[]> = {
  boundary_error: [
    '旧表：红方出界，但画面显示球体还有约2厘米在线内',
    '高速运动下采样不足导致边界判定错误',
    '系统判定出界，但实际球体仍在线内',
  ],
  collision_miss: [
    '补录备注：刚才那个碰撞没标上，速度太快漏过去了',
    '回看发现这里有个碰撞，之前漏掉了，补上',
  ],
  missing_unit: [
    '漏填单位：速度写了320，应该是320 m/s',
    '质量单位缺失，应为 kg',
  ],
  duplicate: [
    '注意：这个标注和另一个是同一个事件，角度不同',
    '重复标注，已合并到主记录',
  ],
  normal: [
    '碰撞正常，无异常',
    '判定正确，无需处理',
  ],
  other: [
    '需要进一步核实',
    '情况特殊，标注待确认',
  ],
};

export const AnnotationPanel: React.FC = () => {
  const {
    isAnnotating,
    annotatingBallId,
    draftContent,
    draftType,
    setDraftContent,
    setDraftType,
    saveAnnotation,
    cancelAnnotation,
  } = useAnnotation();

  const { currentLevel } = useLevelStore();
  const { currentTime } = usePhysicsStore();
  const level = currentLevel;

  if (!isAnnotating) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h3 className="font-display text-lg font-semibold text-neutral-800">标注面板</h3>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <p className="text-neutral-500">点击画布中的球体开始标注</p>
          <p className="text-sm text-neutral-400 mt-2">系统会自动暂停并捕获当前状态</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-neutral-800">新建标注</h3>
          <p className="text-sm text-neutral-500 mt-1">
            球体 ID: <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs">{annotatingBallId}</code>
          </p>
        </div>
        <AnnotationTypeBadge type={draftType} />
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            标注类型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ANNOTATION_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setDraftType(type.value)}
                className={`p-3 rounded-lg text-left transition-all ${
                  draftType === type.value
                    ? 'bg-primary-50 border-2 border-primary-500 shadow-sm'
                    : 'bg-neutral-50 border-2 border-transparent hover:bg-neutral-100'
                }`}
              >
                <div className={`font-medium text-sm ${
                  draftType === type.value ? 'text-primary-700' : 'text-neutral-700'
                }`}>
                  {type.label}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {type.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            标注内容
          </label>
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            placeholder="请输入标注内容，描述具体情况..."
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-all"
            rows={4}
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-neutral-400">
              {draftContent.length}/500 字符
            </p>
          </div>
          
          {SAMPLE_CONTENTS[draftType] && (
            <div className="mt-3">
              <p className="text-xs text-neutral-500 mb-2">快捷填写：</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_CONTENTS[draftType].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDraftContent(sample)}
                    className="px-3 py-1.5 text-xs bg-neutral-100 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors text-neutral-600"
                  >
                    {sample.substring(0, 20)}...
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            标注信息
          </label>
          <div className="bg-neutral-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">时间点</span>
              <span className="font-mono font-medium text-neutral-700">
                {formatTime(level ? currentTime : 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">创建人</span>
              <span className="text-neutral-700">当前用户</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">关联关卡</span>
              <span className="text-neutral-700">{level?.name || '-'}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <div className="flex gap-2 w-full">
          {ANNOTATION_STATUS.map((status) => (
            <Button
              key={status.value}
              variant={status.value === 'confirmed' ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={() => {
                if (level && draftContent.trim()) {
                  saveAnnotation(level.id, status.value);
                }
              }}
              disabled={!draftContent.trim()}
            >
              {status.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full"
          onClick={cancelAnnotation}
        >
          取消
        </Button>
      </CardFooter>
    </Card>
  );
};
