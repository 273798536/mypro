import { useState } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { ArrowRight, Microscope, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageCompare() {
  const { imageAnnotations, samples, selectedSampleId, setSelectedSample } = useReportStore();
  const [mode, setMode] = useState<'side' | 'before' | 'after'>('side');

  const currentAnnotation = selectedSampleId
    ? imageAnnotations.find(
        (a) => a.sampleBarcode === samples.find((s) => s.id === selectedSampleId)?.barcode
      )
    : imageAnnotations[0];

  const annotatedSamples = samples.filter((s) =>
    imageAnnotations.some((a) => a.sampleBarcode === s.barcode)
  );

  const currentSample = annotatedSamples.find(
    (s) => s.barcode === currentAnnotation?.sampleBarcode
  );

  const nav = (dir: 1 | -1) => {
    if (!currentSample) return;
    const idx = annotatedSamples.findIndex((s) => s.id === currentSample.id);
    const next = (idx + dir + annotatedSamples.length) % annotatedSamples.length;
    setSelectedSample(annotatedSamples[next].id);
  };

  if (!currentAnnotation || !currentSample) {
    return (
      <div className="card p-8 text-center text-warm-500">
        <Microscope size={40} className="mx-auto mb-3 text-warm-400" />
        <p>暂未找到图像标注记录</p>
      </div>
    );
  }

  const imgStyle = "w-full h-full object-cover";

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-warm-900">
            显微照片标注对比
          </h3>
          <p className="text-sm text-warm-500 mt-0.5">
            条码 <span className="font-mono">{currentAnnotation.sampleBarcode}</span>
            {' · '}
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {currentAnnotation.operator}
            </span>
            {' · '}
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {currentAnnotation.timestamp}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => nav(-1)}
            className="p-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex rounded-lg border border-warm-200 overflow-hidden">
            {(['before', 'side', 'after'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-teal-900 text-white'
                    : 'bg-white text-warm-700 hover:bg-warm-50'
                }`}
              >
                {m === 'before' ? '仅标注前' : m === 'after' ? '仅标注后' : '并排对比'}
              </button>
            ))}
          </div>
          <button
            onClick={() => nav(1)}
            className="p-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        className={`grid gap-3 ${
          mode === 'side' ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {(mode === 'before' || mode === 'side') && (
          <div className="card overflow-hidden">
            <div className="px-4 py-2 bg-warm-50 border-b border-warm-200/60 flex items-center justify-between">
              <span className="text-sm font-medium text-warm-700">标注前判断</span>
              <span className="badge badge-warning">{currentAnnotation.beforeMutationCall}</span>
            </div>
            <div className="relative aspect-[4/3] bg-gradient-to-br from-warm-100 via-warm-50 to-teal-900/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <Microscope size={48} className="mx-auto mb-2 text-warm-400" />
                  <p className="text-sm text-warm-600 max-w-xs mx-auto">
                    {currentAnnotation.beforeAnnotation}
                  </p>
                  <p className="text-xs text-warm-400 mt-2">
                    （显微照片占位示意 · 实际系统加载病理图像）
                  </p>
                </div>
              </div>
              <div className="absolute top-3 left-3 flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-rose-500/30"
                    style={{ opacity: 0.3 + i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {(mode === 'after' || mode === 'side') && (
          <div className="card overflow-hidden ring-1 ring-teal-900/20">
            <div className="px-4 py-2 bg-teal-900/5 border-b border-teal-900/10 flex items-center justify-between">
              <span className="text-sm font-medium text-teal-900">标注后判断</span>
              <span className="badge badge-danger">{currentAnnotation.afterMutationCall}</span>
            </div>
            <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-50 via-warm-50 to-rose-50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="relative inline-block">
                    <Microscope size={48} className="mx-auto mb-2 text-teal-800" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                      !
                    </span>
                  </div>
                  <p className="text-sm text-warm-800 max-w-xs mx-auto font-medium">
                    {currentAnnotation.afterAnnotation}
                  </p>
                  <p className="text-xs text-warm-500 mt-2">
                    （红色虚线框为人工标注修正区域）
                  </p>
                </div>
              </div>
              <div className="absolute top-4 left-6 right-6 bottom-8 border-2 border-dashed border-rose-500/60 rounded-lg" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${
                      i < 3 ? 'bg-rose-500' : 'bg-rose-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h4 className="font-serif text-base font-semibold text-warm-900 mb-3 flex items-center gap-2">
          <ArrowRight size={18} className="text-amber-600" />
          人工修正前后差别
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-warm-50 rounded-lg p-4 border border-warm-200/60">
            <p className="text-xs text-warm-500 mb-1">标注前突变判断</p>
            <p className="text-sm font-medium text-warm-800">
              {currentAnnotation.beforeMutationCall}
            </p>
            <p className="text-xs text-warm-600 mt-2 leading-relaxed">
              {currentAnnotation.beforeAnnotation}
            </p>
          </div>
          <div className="bg-teal-900/5 rounded-lg p-4 border border-teal-900/20">
            <p className="text-xs text-teal-800 mb-1">标注后突变判断</p>
            <p className="text-sm font-medium text-teal-900">
              {currentAnnotation.afterMutationCall}
            </p>
            <p className="text-xs text-warm-700 mt-2 leading-relaxed">
              {currentAnnotation.afterAnnotation}
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">差异说明</p>
          <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">
            {currentAnnotation.diffDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
