
import { useState } from 'react';
import { useAppStore } from '@/store';
import { batchValidate } from '@/services/validation';
import { calculateStatistics } from '@/services/outlier';
import { Task, SectionImage, ValidationResult } from '@/types';
import {
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ArrowLeftRight,
  GitCompare,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  BarChart3,
  FileText,
  User,
  Clock,
  Plus,
  Upload,
  X,
} from 'lucide-react';

const ComparePage = () => {
  const { getSelectedTask, addSectionImage, currentUser } = useAppStore();
  const task = getSelectedTask() as Task | undefined;
  const [zoom, setZoom] = useState(1);
  const [selectedVersions, setSelectedVersions] = useState<[number, number]>([0, 1]);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newConclusion, setNewConclusion] = useState('');

  if (!task) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">请先从数据仪表盘选择一个校验任务</p>
        </div>
      </div>
    );
  }

  if (!task.sectionImages || task.sectionImages.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">当前任务暂无剖面图数据</p>
          <p className="text-slate-400 text-sm mb-6">截图清单可能晚到，可稍后补录剖面图</p>
          <button
            onClick={() => setShowAddImageModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            补录剖面图
          </button>
        </div>

        {showAddImageModal && (
          <AddImageModal
            onClose={() => {
              setShowAddImageModal(false);
              setNewImageUrl('');
              setNewConclusion('');
            }}
            onSubmit={() => {
              if (!task || !newImageUrl.trim() || !newConclusion.trim()) return;
              const version = `v${task.sectionImages.length + 1}`;
              addSectionImage(task.id, {
                taskId: task.id,
                version,
                imageUrl: newImageUrl,
                conclusion: newConclusion,
                operator: currentUser,
                measurementData: task.dataPoints.slice(0, 5).map((dp) => dp.value),
              });
              setShowAddImageModal(false);
              setNewImageUrl('');
              setNewConclusion('');
            }}
            newImageUrl={newImageUrl}
            setNewImageUrl={setNewImageUrl}
            newConclusion={newConclusion}
            setNewConclusion={setNewConclusion}
          />
        )}
      </div>
    );
  }

  const images = task.sectionImages;
  const leftIdx = Math.min(selectedVersions[0], images.length - 1);
  const rightIdx = Math.min(
    selectedVersions[1] >= 0 ? selectedVersions[1] : 0,
    images.length - 1
  );
  const leftImage = images[leftIdx] as SectionImage;
  const rightImage = images[rightIdx] as SectionImage;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleSwap = () => setSelectedVersions([rightIdx, leftIdx]);

  const leftStats = leftImage.measurementData
    ? calculateStatistics(leftImage.measurementData)
    : null;
  const rightStats = rightImage.measurementData
    ? calculateStatistics(rightImage.measurementData)
    : null;
  const leftValidation = leftImage.measurementData
    ? batchValidate(leftImage.measurementData, task.nominalValue, task.tolerance)
    : [];
  const rightValidation = rightImage.measurementData
    ? batchValidate(rightImage.measurementData, task.nominalValue, task.tolerance)
    : [];

  const leftPassCount = leftValidation.filter((v) => v.isValid).length;
  const rightPassCount = rightValidation.filter((v) => v.isValid).length;

  const maxPoints = Math.max(
    leftImage.measurementData?.length || 0,
    rightImage.measurementData?.length || 0
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">剖面图版本对比</h1>
          <p className="text-slate-500">
            {task.name} · {task.robotModel} · 共 {images.length} 个版本
          </p>
        </div>
        <button
          onClick={() => setShowAddImageModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          补录剖面图
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <GitCompare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-800">双视图并排对比</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwap}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              title="交换左右视图"
            >
              <ArrowLeftRight className="w-4 h-4" />
              交换
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ZoomOut className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm text-slate-600 font-mono w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ZoomIn className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VersionPanel
            title="旧版本"
            image={leftImage}
            versionIndex={leftIdx}
            totalVersions={images.length}
            zoom={zoom}
            nominalValue={task.nominalValue}
            tolerance={task.tolerance}
            stats={leftStats}
            validation={leftValidation}
            passCount={leftPassCount}
            tagColor="bg-amber-100 text-amber-800 border-amber-200"
            onChangeIndex={(delta) => {
              const newIdx = Math.max(0, Math.min(images.length - 1, leftIdx + delta));
              setSelectedVersions([newIdx, rightIdx]);
            }}
          />
          <VersionPanel
            title="新版本"
            image={rightImage}
            versionIndex={rightIdx}
            totalVersions={images.length}
            zoom={zoom}
            nominalValue={task.nominalValue}
            tolerance={task.tolerance}
            stats={rightStats}
            validation={rightValidation}
            passCount={rightPassCount}
            tagColor="bg-green-100 text-green-800 border-green-200"
            onChangeIndex={(delta) => {
              const newIdx = Math.max(0, Math.min(images.length - 1, rightIdx + delta));
              setSelectedVersions([leftIdx, newIdx]);
            }}
          />
        </div>

        {(leftImage.measurementData || rightImage.measurementData) && (
          <div className="mt-8 border-t-2 border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              测量明细联动对比
              <span className="text-sm font-normal text-slate-500 ml-2">
                （允许范围 [{task.nominalValue - task.tolerance}, {task.nominalValue + task.tolerance}] mm）
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600 w-16">
                      点号
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-amber-700 bg-amber-50">
                      {leftImage.version} 版本值
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-amber-700 bg-amber-50">
                      {leftImage.version} 状态
                    </th>
                    <th className="text-center py-3 px-3 text-sm font-semibold text-slate-600">
                      差异
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-green-700 bg-green-50">
                      {rightImage.version} 版本值
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-green-700 bg-green-50">
                      {rightImage.version} 状态
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">
                      影响说明
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxPoints }).map((_, i) => {
                    const leftVal = leftImage.measurementData?.[i];
                    const rightVal = rightImage.measurementData?.[i];
                    const leftV = leftValidation[i];
                    const rightV = rightValidation[i];
                    const diff =
                      leftVal !== undefined && rightVal !== undefined
                        ? rightVal - leftVal
                        : null;
                    const changed = diff !== null && Math.abs(diff) > 0.001;
                    const statusChanged =
                      leftV && rightV && leftV.isValid !== rightV.isValid;

                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 transition-colors ${
                          statusChanged ? 'bg-yellow-50' : changed ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-700">#{i + 1}</td>
                        <td className="py-3 px-3 font-mono bg-amber-50/50">
                          {leftVal !== undefined ? `${leftVal.toFixed(1)} mm` : '—'}
                        </td>
                        <td className="py-3 px-3 bg-amber-50/50">
                          {leftV && <StatusBadge result={leftV} />}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {diff !== null ? (
                            <span
                              className={`font-mono font-bold ${
                                diff > 0
                                  ? 'text-green-600'
                                  : diff < 0
                                  ? 'text-red-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {diff > 0 ? '+' : ''}
                              {diff.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono bg-green-50/50">
                          {rightVal !== undefined ? `${rightVal.toFixed(1)} mm` : '—'}
                        </td>
                        <td className="py-3 px-3 bg-green-50/50">
                          {rightV && <StatusBadge result={rightV} />}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">
                          {statusChanged ? (
                            <span className="inline-flex items-center gap-1 text-yellow-700 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              判断结果变化：{leftV?.isValid ? '合格→越界' : '越界→合格'}
                            </span>
                          ) : changed ? (
                            <span className="text-slate-500">
                              数值变化 {diff! > 0 ? '+' : ''}
                              {diff!.toFixed(1)}mm，判断未变
                            </span>
                          ) : leftVal !== undefined && rightVal !== undefined ? (
                            <span className="text-slate-400">数据一致</span>
                          ) : (
                            <span className="text-slate-300">无对应数据</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">💡 物理老师提示：</span>
            使用左右版本切换按钮选择不同时间的剖面图进行对比。表格中黄色行表示该测量点的判定结果发生了变化（合格 ↔ 越界），需要重点关注变化原因和影响范围。
          </p>
        </div>
      </div>

      {showAddImageModal && (
        <AddImageModal
          onClose={() => {
            setShowAddImageModal(false);
            setNewImageUrl('');
            setNewConclusion('');
          }}
          onSubmit={() => {
            if (!task || !newImageUrl.trim() || !newConclusion.trim()) return;
            const version = `v${task.sectionImages.length + 1}`;
            addSectionImage(task.id, {
              taskId: task.id,
              version,
              imageUrl: newImageUrl,
              conclusion: newConclusion,
              operator: currentUser,
              measurementData: task.dataPoints.map((dp) => dp.value),
            });
            setShowAddImageModal(false);
            setNewImageUrl('');
            setNewConclusion('');
            setSelectedVersions([
              Math.max(0, task.sectionImages.length - 1),
              task.sectionImages.length,
            ]);
          }}
          newImageUrl={newImageUrl}
          setNewImageUrl={setNewImageUrl}
          newConclusion={newConclusion}
          setNewConclusion={setNewConclusion}
        />
      )}
    </div>
  );
};

interface VersionPanelProps {
  title: string;
  image: SectionImage;
  versionIndex: number;
  totalVersions: number;
  zoom: number;
  nominalValue: number;
  tolerance: number;
  stats: ReturnType<typeof calculateStatistics> | null;
  validation: ValidationResult[];
  passCount: number;
  tagColor: string;
  onChangeIndex: (delta: number) => void;
}

function VersionPanel({
  title,
  image,
  versionIndex,
  totalVersions,
  zoom,
  stats,
  validation,
  passCount,
  tagColor,
  onChangeIndex,
}: VersionPanelProps) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tagColor}`}>
                {title}
              </span>
              <h3 className="font-semibold text-slate-800">版本 {image.version}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {image.operator && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {image.operator}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(image.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onChangeIndex(-1)}
              disabled={versionIndex === 0}
              className="p-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="px-2 text-xs text-slate-500 flex items-center">
              {versionIndex + 1}/{totalVersions}
            </span>
            <button
              onClick={() => onChangeIndex(1)}
              disabled={versionIndex === totalVersions - 1}
              className="p-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-slate-500">结论: </span>
          <span className="font-medium text-slate-800">{image.conclusion}</span>
        </div>
      </div>
      <div
        className="bg-slate-900 flex items-center justify-center overflow-hidden"
        style={{ minHeight: '380px' }}
      >
        <img
          src={image.imageUrl}
          alt={`版本 ${image.version}`}
          style={{
            transform: `scale(${zoom})`,
            maxWidth: '100%',
            maxHeight: '480px',
            objectFit: 'contain',
          }}
          className="rounded"
        />
      </div>

      {stats && validation.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded">
              <p className="text-xs text-slate-500">合格数</p>
              <p className="font-bold text-green-600 text-lg">{passCount}</p>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <p className="text-xs text-slate-500">平均值</p>
              <p className="font-bold text-slate-800 font-mono text-lg">
                {stats.mean.toFixed(1)}
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <p className="text-xs text-slate-500">标准差</p>
              <p className="font-bold text-slate-700 font-mono text-lg">
                {stats.std.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {validation.map((v, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${
                  v.isValid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
                title={v.failureReason || '合格'}
              >
                #{i + 1} {v.value.toFixed(0)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ result }: { result: ValidationResult }) {
  if (result.isValid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircle className="w-3 h-3" />
        合格
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
      <AlertCircle className="w-3 h-3" />
      越界
    </span>
  );
}

interface AddImageModalProps {
  onClose: () => void;
  onSubmit: () => void;
  newImageUrl: string;
  setNewImageUrl: (v: string) => void;
  newConclusion: string;
  setNewConclusion: (v: string) => void;
}

function AddImageModal({
  onClose,
  onSubmit,
  newImageUrl,
  setNewImageUrl,
  newConclusion,
  setNewConclusion,
}: AddImageModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            补录剖面图
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          截图清单晚到不影响流程，数据可先补录。此操作将记录在历史中。
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              剖面图 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              剖切结论 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newConclusion}
              onChange={(e) => setNewConclusion(e.target.value)}
              rows={4}
              placeholder="描述剖切分析结论、是否越界、处理建议等"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={!newImageUrl.trim() || !newConclusion.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认补录
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComparePage;
