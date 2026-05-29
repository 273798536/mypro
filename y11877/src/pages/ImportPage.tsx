import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import MirrorInput from '@/components/MirrorInput';
import RayInput from '@/components/RayInput';
import { parseMirrorSegments, parseIncidentRays } from '@/utils/parser';
import { sampleMirrorText, sampleRayText } from '@/utils/sampleData';

export default function ImportPage() {
  const navigate = useNavigate();
  const setMirrors = useAppStore((s) => s.setMirrors);
  const setRays = useAppStore((s) => s.setRays);
  const runGrading = useAppStore((s) => s.runGrading);
  const clearAll = useAppStore((s) => s.clearAll);

  const [mirrorText, setMirrorText] = useState('');
  const [rayText, setRayText] = useState('');

  const mirrorResult = useMemo(() => parseMirrorSegments(mirrorText), [mirrorText]);
  const rayResult = useMemo(() => parseIncidentRays(rayText), [rayText]);

  const handleLoadSample = () => {
    setMirrorText(sampleMirrorText);
    setRayText(sampleRayText);
  };

  const handleConfirm = () => {
    setMirrors(mirrorResult.data);
    setRays(rayResult.data);
    runGrading();
    navigate('/grading');
  };

  const handleClear = () => {
    setMirrorText('');
    setRayText('');
    clearAll();
  };

  const hasData = mirrorResult.data.length > 0 && rayResult.data.length > 0;
  const hasErrors = mirrorResult.errors.length > 0 || rayResult.errors.length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#2d2d44]">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#f0c040]" />
          <h1 className="text-xl font-bold text-gray-100">数据导入</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          批量粘贴镜面线段与入射光线数据，或加载内置样例进行试跑
        </p>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="grid grid-cols-2 gap-6 h-[420px]">
          <MirrorInput
            value={mirrorText}
            onChange={setMirrorText}
            result={mirrorResult}
            onLoadSample={() => setMirrorText(sampleMirrorText)}
          />
          <RayInput
            value={rayText}
            onChange={setRayText}
            result={rayResult}
            onLoadSample={() => setRayText(sampleRayText)}
          />
        </div>

        <div className="mt-6 p-4 rounded-xl border border-[#2d2d44] bg-[#13132a]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {hasData ? (
                <span>
                  已解析 <span className="text-[#f0c040] font-mono">{mirrorResult.data.length}</span> 条镜面线段、
                  <span className="text-cyan-400 font-mono">{rayResult.data.length}</span> 条入射光线
                  {hasErrors && (
                    <span className="text-red-400 ml-2">
                      （有 {mirrorResult.errors.length + rayResult.errors.length} 条格式错误被跳过）
                    </span>
                  )}
                </span>
              ) : (
                <span>请输入数据或加载样例</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#f0c040]/40 text-[#f0c040] hover:bg-[#f0c040]/10 transition-colors"
              >
                <Zap className="w-4 h-4" />
                一键加载样例
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 border border-[#2d2d44] hover:border-red-400/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hasData}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  hasData
                    ? 'bg-[#f0c040] text-[#1a1a2e] hover:bg-[#f0c040]/90 shadow-lg shadow-[#f0c040]/20'
                    : 'bg-[#2d2d44] text-gray-600 cursor-not-allowed'
                }`}
              >
                确认并批改
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl border border-[#2d2d44]/50 bg-[#0d0d1a]">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">输入格式说明</h3>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 font-mono">
            <div>
              <div className="text-gray-400 mb-1">镜面线段（每行一条）：</div>
              <div>startX, startY, endX, endY[, normalAngle]</div>
              <div className="mt-1 text-gray-600"># 注释行会被跳过</div>
              <div className="text-gray-600">2, 0, 2, 4, 180</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">入射光线（每行一条）：</div>
              <div>originX, originY, directionAngle[, deg|rad]</div>
              <div className="mt-1 text-gray-600"># 默认角度单位为 deg</div>
              <div className="text-gray-600">0, 2, 45, deg</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
