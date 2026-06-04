import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhysicsCanvas } from '../components/Canvas/PhysicsCanvas';
import { AnnotationList } from '../components/Annotation/AnnotationList';
import { AnnotationPanel } from '../components/Annotation/AnnotationPanel';
import { Timeline } from '../components/Timeline/Timeline';
import { Button } from '../components/ui/Button';
import { useLevelStore, useAnnotationStore, usePhysicsStore } from '../store';
import { ArrowLeft, FileText, Database, RefreshCw } from 'lucide-react';

const CollisionCanvasPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const [isAnnotating, setIsAnnotating] = useState(false);

  const { getLevelById, setCurrentLevel, completeLevel } = useLevelStore();
  const { annotations, loadMockAnnotations, clearLevelAnnotations } = useAnnotationStore();
  const { takeSnapshot } = usePhysicsStore();

  const level = getLevelById(levelId || '');

  useEffect(() => {
    if (levelId) {
      setCurrentLevel(levelId);
      loadMockAnnotations(levelId);
      takeSnapshot();
    }
    return () => {
      if (levelId) {
        clearLevelAnnotations(levelId);
      }
    };
  }, [levelId]);

  const handleGenerateReport = () => {
    if (!level) return;

    const anomalyTypes = ['boundary_error', 'collision_miss', 'missing_unit', 'duplicate', 'other'];
    const anomalyCount = annotations.filter(a => anomalyTypes.includes(a.type)).length;

    completeLevel(level.id, annotations.length, anomalyCount);
    navigate(`/report/${level.id}`);
  };

  const handleLoadMockData = () => {
    if (levelId) {
      loadMockAnnotations(levelId);
    }
  };

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">关卡不存在</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  const levelAnnotations = annotations.filter(a => a.levelId === levelId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
              <div>
                <h1 className="font-display text-lg font-bold text-neutral-800">
                  {level.name}
                </h1>
                <p className="text-xs text-neutral-500">{level.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-neutral-600">
                <Database className="w-4 h-4" />
                <span>标注：{levelAnnotations.length} / {level.targetAnnotations}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadMockData}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                加载示例数据
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerateReport}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                生成报告
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <aside className="w-80 bg-white border-r border-neutral-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="font-display font-semibold text-neutral-800">标注列表</h2>
            <p className="text-xs text-neutral-500 mt-1">
              共 {levelAnnotations.length} 条标注记录
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AnnotationList levelId={level.id} />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <PhysicsCanvas onAnnotatingChange={setIsAnnotating} />
          </div>
          <div className="bg-white border-t border-neutral-200 p-4">
            <Timeline
              duration={level.duration}
              annotations={levelAnnotations}
            />
          </div>
        </main>

        <aside className="w-96 bg-white border-l border-neutral-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="font-display font-semibold text-neutral-800">
              {isAnnotating ? '新建标注' : '标注面板'}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              {isAnnotating ? '请填写标注信息' : '点击画布中的球体开始标注'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AnnotationPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CollisionCanvasPage;
