import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsCanvas } from '@/components/PhysicsCanvas';
import { ControlPanel } from '@/components/ControlPanel';
import { DataTable } from '@/components/DataTable';
import { Alert, ResultDisplay } from '@/components/Alert';
import { usePhysics } from '@/hooks/usePhysics';
import { GROUND_MATERIALS, PIXELS_PER_METER, BALL_RADIUS, ExperimentResult, ExperimentParams } from '@/types';
import {
  validateAllParams,
  isAllValid,
  ExperimentParamsValidation,
} from '@/utils/validation';
import {
  getExperimentResults,
  deleteExperimentResult,
  clearAllExperimentResults,
} from '@/utils/storage';
import { downloadCSV, exportCanvasWithData, downloadScreenshot } from '@/utils/export';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 550;
const GROUND_OFFSET = 60;

const Home: React.FC = () => {
  const [ballMass, setBallMass] = useState(1);
  const [groundMaterial, setGroundMaterial] = useState('concrete');
  const [restitution, setRestitution] = useState(0.6);
  const [timeScale, setTimeScale] = useState(1);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [lastSavedResult, setLastSavedResult] = useState<ExperimentResult | null>(null);
  const [validation, setValidation] = useState<ExperimentParamsValidation>(
    validateAllParams({
      ballMass: 1,
      dropHeight: 2,
      groundMaterial: 'concrete',
      restitution: 0.6,
    })
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const physics = usePhysics(CANVAS_WIDTH / 2);

  const {
    ball,
    engine,
    isRunning,
    isPaused,
    bounceHeight,
    calculatedRestitution,
    anomalies,
    hasAnomalies,
    initEngine,
    startExperiment,
    pauseExperiment,
    resumeExperiment,
    resetExperiment,
    stepFrame,
    setBallPosition,
    setBallMass: setPhysicsBallMass,
    setRestitution: setPhysicsRestitution,
    setTimeScale: setPhysicsTimeScale,
    getDropHeight,
    saveResult,
    forceUpdate,
  } = physics;

  const groundY = CANVAS_HEIGHT - GROUND_OFFSET;
  const selectedMaterial = GROUND_MATERIALS.find((m) => m.id === groundMaterial);

  useEffect(() => {
    initEngine(CANVAS_HEIGHT, GROUND_OFFSET);
    setBallPosition(CANVAS_WIDTH / 2, groundY - 3 * PIXELS_PER_METER - BALL_RADIUS);
  }, [initEngine, setBallPosition, groundY]);

  useEffect(() => {
    setPhysicsBallMass(ballMass);
  }, [ballMass, setPhysicsBallMass]);

  useEffect(() => {
    setPhysicsRestitution(restitution);
  }, [restitution, setPhysicsRestitution]);

  useEffect(() => {
    setPhysicsTimeScale(timeScale);
  }, [timeScale, setPhysicsTimeScale]);

  useEffect(() => {
    const dropHeight = getDropHeight();
    setValidation(
      validateAllParams({
        ballMass,
        dropHeight,
        groundMaterial,
        restitution,
      })
    );
  }, [ballMass, groundMaterial, restitution, getDropHeight]);

  useEffect(() => {
    setResults(getExperimentResults());
  }, []);

  const refreshResults = useCallback(() => {
    setResults(getExperimentResults());
  }, []);

  const handleBallDrag = useCallback(
    (x: number, y: number) => {
      setBallPosition(x, y);
    },
    [setBallPosition]
  );

  const handleDragEnd = useCallback(() => {
    forceUpdate();
  }, [forceUpdate]);

  const handleStart = useCallback(() => {
    if (!isAllValid(validation)) {
      alert('请修正参数错误后再开始实验');
      return;
    }
    startExperiment();
  }, [validation, startExperiment]);

  const handleSave = useCallback(() => {
    const params: ExperimentParams = {
      ballMass,
      dropHeight: engine?.getDropHeight() || getDropHeight(),
      groundMaterial,
      restitution,
    };
    const result = saveResult(params);
    if (result) {
      setLastSavedResult(result);
      refreshResults();
    }
  }, [ballMass, groundMaterial, restitution, engine, getDropHeight, saveResult, refreshResults]);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas && lastSavedResult) {
      exportCanvasWithData(canvas, lastSavedResult);
    } else if (canvas) {
      downloadScreenshot(canvas);
    }
  }, [lastSavedResult]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteExperimentResult(id);
      refreshResults();
    },
    [refreshResults]
  );

  const handleClearAll = useCallback(() => {
    if (confirm('确定要清空所有实验记录吗？')) {
      clearAllExperimentResults();
      refreshResults();
    }
  }, [refreshResults]);

  const handleExportCSV = useCallback(() => {
    downloadCSV(results);
  }, [results]);

  const handleMaterialChange = useCallback((materialId: string) => {
    const material = GROUND_MATERIALS.find((m) => m.id === materialId);
    if (material) {
      setGroundMaterial(materialId);
      setRestitution(material.restitution);
    }
  }, []);

  return (
    <div className="min-h-screen text-white p-6">
      <Alert anomalies={anomalies} />

      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
            🔬 碰撞恢复系数实验
          </h1>
          <p className="text-slate-400">
            拖动小球调整高度，点击开始观察反弹，计算恢复系数
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-center">
              <PhysicsCanvas
                ball={ball}
                groundY={groundY}
                groundColor={selectedMaterial?.color || '#6b7280'}
                isRunning={isRunning}
                canDrag={!isRunning}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                onBallDrag={handleBallDrag}
                onDragEnd={handleDragEnd}
              />
            </div>

            <ResultDisplay
              dropHeight={engine?.getDropHeight() || 0}
              bounceHeight={bounceHeight}
              restitution={calculatedRestitution}
              hasAnomalies={hasAnomalies}
            />

            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-400 mb-2">💡 操作提示</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• 拖动蓝色小球调整下落高度</li>
                <li>• 点击"开始实验"释放小球</li>
                <li>• 使用慢放功能仔细观察碰撞过程</li>
                <li>• 不同材质的恢复系数不同，试试更换地面</li>
              </ul>
            </div>

            <DataTable
              results={results}
              onDelete={handleDelete}
              onClearAll={handleClearAll}
              onExportCSV={handleExportCSV}
            />
          </div>

          <div className="space-y-4">
            <ControlPanel
              ballMass={ballMass}
              setBallMass={setBallMass}
              groundMaterial={groundMaterial}
              setGroundMaterial={handleMaterialChange}
              restitution={restitution}
              setRestitution={setRestitution}
              timeScale={timeScale}
              setTimeScale={setTimeScale}
              isRunning={isRunning}
              isPaused={isPaused}
              hasResult={bounceHeight > 0 && !isRunning}
              onStart={handleStart}
              onPause={pauseExperiment}
              onResume={resumeExperiment}
              onReset={resetExperiment}
              onStep={stepFrame}
              onSave={handleSave}
              onScreenshot={handleScreenshot}
              validation={validation}
            />

            <div className="bg-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-lg font-bold text-cyan-400 border-b border-slate-700 pb-2 mb-4">
                📖 物理公式
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-slate-400 font-mono mb-1">恢复系数</div>
                  <div className="text-white font-mono bg-slate-900 p-2 rounded">
                    e = √(h₂ / h₁)
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono mb-1">重力势能</div>
                  <div className="text-white font-mono bg-slate-900 p-2 rounded">
                    E = m × g × h
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  <p>• h₁: 下落高度</p>
                  <p>• h₂: 反弹高度</p>
                  <p>• e ∈ [0, 1]，e=1 完全弹性碰撞</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-slate-600 text-sm">
          <p>物理社团 · 碰撞恢复系数实验工具 · 保留所有实验记录和修正痕迹</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
