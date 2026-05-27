import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Minus, CircleSlash, Star, ArrowRight } from 'lucide-react';
import type { SlopeType } from '@/types';

export function ControlPanel() {
  const [extremumAnswer, setExtremumAnswer] = useState<boolean | null>(null);

  const {
    currentJudgementIndex,
    judgementPoints,
    isWaitingForJudgement,
    submitJudgement,
    currentFunction,
    feedbackMessage,
    feedbackType
  } = useGameStore();

  const currentJudgement = judgementPoints[currentJudgementIndex];

  const handleSlopeSubmit = (slope: SlopeType) => {
    if (!isWaitingForJudgement || !currentJudgement) return;
    submitJudgement(slope);
  };

  const handleExtremumSubmit = (isExtremum: boolean) => {
    setExtremumAnswer(isExtremum);
  };

  const confirmExtremum = () => {
    if (extremumAnswer === null || !isWaitingForJudgement) return;
    submitJudgement(extremumAnswer);
    setExtremumAnswer(null);
  };

  if (!currentJudgement) {
    return null;
  }

  const isSlopeJudgement = currentJudgement.type === 'slope';

  const feedbackColors = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400'
  };

  return (
    <div className="space-y-4">
      {currentFunction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">当前函数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl text-cyan-400 text-center py-2">
              {currentFunction.displayExpression}
            </div>
            {currentJudgement.isSpecial && (
              <div className="mt-2 text-sm text-yellow-400 text-center">
                ⚠️ 特殊点提示
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            判断点 {currentJudgementIndex + 1}/{judgementPoints.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <span className="text-slate-400">请判断此点的：</span>
            <span className="ml-2 text-cyan-400 font-bold">
              {isSlopeJudgement ? '斜率类型' : '是否为极值点'}
            </span>
          </div>

          {isSlopeJudgement ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleSlopeSubmit('positive')}
                disabled={!isWaitingForJudgement}
                className="flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                正斜率
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleSlopeSubmit('negative')}
                disabled={!isWaitingForJudgement}
                className="flex items-center justify-center gap-2"
              >
                <TrendingDown className="w-5 h-5" />
                负斜率
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleSlopeSubmit('zero')}
                disabled={!isWaitingForJudgement}
                className="flex items-center justify-center gap-2"
              >
                <Minus className="w-5 h-5" />
                零斜率
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => handleSlopeSubmit('undefined')}
                disabled={!isWaitingForJudgement}
                className="flex items-center justify-center gap-2"
              >
                <CircleSlash className="w-5 h-5" />
                不存在
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={extremumAnswer === true ? 'success' : 'secondary'}
                  size="lg"
                  onClick={() => handleExtremumSubmit(true)}
                  disabled={!isWaitingForJudgement}
                  className="flex items-center justify-center gap-2"
                >
                  <Star className="w-5 h-5" />
                  是极值点
                </Button>
                <Button
                  variant={extremumAnswer === false ? 'danger' : 'secondary'}
                  size="lg"
                  onClick={() => handleExtremumSubmit(false)}
                  disabled={!isWaitingForJudgement}
                  className="flex items-center justify-center gap-2"
                >
                  <CircleSlash className="w-5 h-5" />
                  不是极值点
                </Button>
              </div>
              {extremumAnswer !== null && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={confirmExtremum}
                  disabled={!isWaitingForJudgement}
                  className="w-full flex items-center justify-center gap-2"
                >
                  确认提交
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {feedbackMessage && feedbackType && (
        <div className={`p-4 rounded-lg border ${feedbackColors[feedbackType]} animate-pulse`}>
          {feedbackMessage}
        </div>
      )}
    </div>
  );
}
