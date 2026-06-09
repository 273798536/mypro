import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { collisionFormulaInfo } from '@/utils/formulas';
import PointCloudScene from '@/components/PointCloudScene';
import {
  ShieldAlert, Play, Pause, Clock, Camera, FileImage,
  Calculator, AlertTriangle, CheckCircle2, ArrowRight, Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function CollisionPage() {
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const {
    collisionFrames, currentCollisionTime, setCollisionTime,
    updateCollisionDuration, recomputeCollisionFrames, pointCloud
  } = useAppStore();
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(
    collisionFrames.length > 0 ? collisionFrames[collisionFrames.length - 1].timeSecond : 10
  );
  const [screenshots, setScreenshots] = useState<{ time: number; dataUrl: string }[]>([]);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [newTimeMark, setNewTimeMark] = useState('');

  const currentFrame = collisionFrames.reduce((prev, curr) =>
    Math.abs(curr.timeSecond - currentCollisionTime) < Math.abs(prev.timeSecond - currentCollisionTime) ? curr : prev
  );

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const start = Date.now();
    const startTime = currentCollisionTime;
    const maxTime = collisionFrames.length > 0 ? collisionFrames[collisionFrames.length - 1].timeSecond : 10;
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const t = Math.min(startTime + elapsed, maxTime);
      setCollisionTime(t);
      if (t < maxTime) {
        requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    requestAnimationFrame(tick);
  };

  const captureScreenshot = () => {
    setScreenshots(prev => [
      { time: currentCollisionTime, dataUrl: `frame-${currentCollisionTime.toFixed(1)}s` },
      ...prev,
    ]);
  };

  const applyDuration = () => {
    updateCollisionDuration(duration);
    setShowTimeInput(false);
  };

  const addTimeMark = () => {
    const t = parseFloat(newTimeMark);
    if (!isNaN(t) && t >= 0) {
      setCollisionTime(t);
      setNewTimeMark('');
    }
  };

  const chartData = collisionFrames.map(f => ({
    time: f.timeSecond.toFixed(1),
    distance: +f.minDistance_mm.toFixed(2),
    collision: f.hasCollision ? 1 : 0,
  }));

  const riskFrames = collisionFrames.filter(f => f.hasCollision).length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-industrial-600 flex items-center justify-between bg-industrial-800/40">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">连续碰撞检测视图</span>
              <span className="text-xs text-slate-500">逐帧检测，非一次性判断。拖动或播放时间轴查看各帧状态</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="industrial-btn flex items-center gap-2"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing ? '暂停' : '播放'}
              </button>
              <button
                onClick={captureScreenshot}
                className="industrial-btn flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                截当前帧
              </button>
              <button
                onClick={() => setShowTimeInput(v => !v)}
                className="industrial-btn flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                补录时间参数
              </button>
            </div>
          </div>

          {showTimeInput && (
            <div className="px-5 py-3 bg-alert-orange/10 border-b border-alert-orange/30 flex items-center gap-3">
              <span className="text-xs text-slate-400">总检测时长</span>
              <input
                type="number"
                className="industrial-input w-32"
                value={duration}
                min={1}
                max={60}
                step={0.5}
                onChange={e => setDuration(parseFloat(e.target.value) || 10)}
              />
              <span className="text-xs text-slate-400">秒</span>
              <button onClick={applyDuration} className="industrial-btn-primary text-xs px-3 py-1.5">
                应用并重新逐帧计算
              </button>
              <button onClick={() => setShowTimeInput(false)} className="text-xs text-slate-400 hover:text-slate-200">
                取消
              </button>
              <span className="text-xs text-slate-500 ml-4">
                公式要求：时间步长Δt ≤ 机械臂最小运动周期/5，当前步长0.5s
              </span>
            </div>
          )}

          <div ref={viewportRef} className="flex-1 relative">
            <PointCloudScene showArm showOutliers />

            <div className="absolute top-4 left-4 w-80 industrial-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-slate-100">当前帧 t = {currentCollisionTime.toFixed(2)} s</span>
              </div>
              <div className={`text-sm mb-1 flex items-center gap-2 ${
                currentFrame.hasCollision ? 'text-alert-orange' : 'text-pass-green'
              }`}>
                {currentFrame.hasCollision
                  ? <><AlertTriangle className="w-4 h-4" /> 存在碰撞风险</>
                  : <><CheckCircle2 className="w-4 h-4" /> 无碰撞</>
                }
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">{currentFrame.collisionDetail}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="detail-label">最近距离</div>
                  <div className="detail-value">{currentFrame.minDistance_mm.toFixed(2)} mm</div>
                </div>
                <div>
                  <div className="detail-label">安全阈值</div>
                  <div className="detail-value">5.00 mm</div>
                </div>
              </div>
            </div>

            <div className="absolute top-4 right-4 w-64 industrial-card p-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300 font-medium">碰撞检测公式</span>
              </div>
              <code className="text-slate-400 font-mono block">{collisionFormulaInfo.formula}</code>
              <div className="mt-2 text-slate-500">{collisionFormulaInfo.range}</div>
              <div className="mt-2 text-slate-500">单位：{collisionFormulaInfo.units}</div>
            </div>
          </div>
        </div>

        <div className="w-[300px] border-l border-industrial-600 bg-industrial-800/40 overflow-auto">
          <div className="p-4 border-b border-industrial-600">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <FileImage className="w-4 h-4 text-slate-400" />
              本帧截图（随时间更新）
            </h3>
            <div className="space-y-2">
              <div className="p-2 bg-industrial-900 rounded-industrial border border-industrial-600">
                <div className="aspect-video bg-gradient-to-br from-industrial-900 to-industrial-700 rounded flex items-center justify-center text-xs text-slate-500 mb-2">
                  t = {currentCollisionTime.toFixed(2)}s 场景快照
                </div>
                <div className="flex justify-between text-xs">
                  <span className={currentFrame.hasCollision ? 'text-alert-orange' : 'text-pass-green'}>
                    {currentFrame.hasCollision ? '碰撞风险' : '安全'}
                  </span>
                  <span className="text-slate-500">距离 {currentFrame.minDistance_mm.toFixed(2)}mm</span>
                </div>
              </div>
              {screenshots.length > 0 && (
                <div className="text-xs text-slate-400 pt-2 border-t border-industrial-600">
                  已保存截图 {screenshots.length} 张，将包含在导出报告中
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-b border-industrial-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-wide">快速定位</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                className="industrial-input flex-1 text-xs"
                placeholder="输入时间(秒)"
                value={newTimeMark}
                step={0.1}
                onChange={e => setNewTimeMark(e.target.value)}
              />
              <button onClick={addTimeMark} className="industrial-btn text-xs px-2 py-1">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5].map(t => (
                <button
                  key={t}
                  onClick={() => setCollisionTime(t)}
                  className={`px-2 py-1 text-xs font-mono rounded-industrial border transition-all ${
                    Math.abs(currentCollisionTime - t) < 0.3
                      ? 'bg-slate-600 border-slate-400 text-white'
                      : 'bg-industrial-700 border-industrial-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-alert-orange" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">失败原因</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {collisionFormulaInfo.failureCases.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-alert-orange font-mono">{c.charAt(0)}</span>
                  <span>{c.slice(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="h-[260px] border-t border-industrial-600 bg-industrial-800/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wide">时间轴与距离趋势图</span>
            <span className="text-xs text-slate-400 ml-3">
              碰撞风险帧: <span className="text-alert-orange font-mono">{riskFrames}</span> / {collisionFrames.length}
            </span>
          </div>
          <button
            onClick={() => navigate('/anomaly')}
            className="industrial-btn-primary flex items-center gap-2 text-xs"
          >
            前往异常处理
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3A5C" />
              <XAxis dataKey="time" tick={{ fill: '#7F8C8D', fontSize: 10 }} stroke="#2C3E50" />
              <YAxis tick={{ fill: '#7F8C8D', fontSize: 10 }} stroke="#2C3E50" domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ background: '#0F2B46', border: '1px solid #2C3E50', borderRadius: 2, fontSize: 12 }}
                labelStyle={{ color: '#BDC3C7' }}
                formatter={(value: number) => [`${value} mm`, '最近距离']}
              />
              <ReferenceLine y={5} stroke="#C0392B" strokeDasharray="5 5" label={{ value: '安全阈值 5mm', fill: '#C0392B', fontSize: 10, position: 'right' }} />
              <Line type="monotone" dataKey="distance" stroke="#3498DB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">0s</span>
          <input
            type="range"
            className="flex-1 accent-blue-500"
            min={0}
            max={collisionFrames.length > 0 ? collisionFrames[collisionFrames.length - 1].timeSecond : 10}
            step={0.1}
            value={currentCollisionTime}
            onChange={e => setCollisionTime(parseFloat(e.target.value))}
          />
          <span className="text-xs text-slate-500">
            {collisionFrames.length > 0 ? collisionFrames[collisionFrames.length - 1].timeSecond : 10}s
          </span>
          <span className="text-xs font-mono text-slate-300 ml-4 w-20 text-right">
            t = {currentCollisionTime.toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
}
