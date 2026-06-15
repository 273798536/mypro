import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Map as MapIcon,
  ScrollText,
  History,
  AlertTriangle,
  Camera,
  Download,
  Plus,
  Tag,
} from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import ReviewMap from '@/components/ReviewMap';
import SceneInfo from '@/components/SceneInfo';
import MaterialTimeline from '@/components/MaterialTimeline';
import JudgmentHistory from '@/components/JudgmentHistory';
import AnomalyPanel from '@/components/AnomalyPanel';
import PhotoGallery from '@/components/PhotoGallery';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types';

type TabType = 'scene' | 'materials' | 'judgments' | 'anomalies' | 'photos';

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('scene');
  const [showAddJudgment, setShowAddJudgment] = useState(false);
  const [newJudgmentContent, setNewJudgmentContent] = useState('');
  const [newJudgmentReason, setNewJudgmentReason] = useState('');

  const review = useReviewStore((state) => state.getReviewById(id || ''));
  const materials = useReviewStore((state) => state.getMaterials(id || ''));
  const judgments = useReviewStore((state) => state.getJudgments(id || ''));
  const photos = useReviewStore((state) => state.getPhotos(id || ''));
  const anomalies = useReviewStore((state) => state.getAnomalies(id || ''));
  const addJudgment = useReviewStore((state) => state.addJudgment);
  const addPhoto = useReviewStore((state) => state.addPhoto);
  const resolveAnomaly = useReviewStore((state) => state.resolveAnomaly);

  if (!review) {
    return (
      <div className="min-h-screen bg-steel-50 flex items-center justify-center">
        <div className="text-center text-steel-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>未找到该复核任务</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: typeof MapIcon; badge?: number }[] = [
    { key: 'scene', label: '场景信息', icon: MapIcon },
    { key: 'materials', label: '审批台账', icon: ScrollText, badge: materials.length },
    { key: 'judgments', label: '判断历史', icon: History, badge: judgments.length },
    { key: 'anomalies', label: '异常提醒', icon: AlertTriangle, badge: anomalies.filter(a => !a.resolved).length },
    { key: 'photos', label: '现场照片', icon: Camera, badge: photos.length },
  ];

  const handleAddJudgment = () => {
    if (!newJudgmentContent.trim() || !newJudgmentReason.trim()) return;

    addJudgment(id || '', {
      reviewId: id || '',
      content: newJudgmentContent,
      reason: newJudgmentReason,
      operator: '老何',
      createdAt: new Date().toLocaleString('zh-CN'),
    });

    setNewJudgmentContent('');
    setNewJudgmentReason('');
    setShowAddJudgment(false);
  };

  const handleAddPhoto = (photo: Omit<Photo, 'id'>) => {
    addPhoto(id || '', { ...photo, reviewId: id || '' });
  };

  const handleResolveAnomaly = (anomalyId: string) => {
    resolveAnomaly(id || '', anomalyId);
  };

  return (
    <div className="min-h-screen bg-steel-50">
      <div className="bg-white border-b border-steel-100 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-steel-500 hover:text-steel-700"
          >
            <ArrowLeft size={16} />
            返回列表
          </button>
          <div className="h-4 w-px bg-steel-200" />
          <h2 className="text-base font-medium text-steel-700 flex-1 truncate">
            {review.title}
          </h2>
          <StatusBadge status={review.status} hasAnomaly={review.hasAnomaly} />
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 transition-colors">
            <Download size={14} />
            导出
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        <div className="flex-1 p-5 overflow-auto">
          <div className="mb-5">
            <ReviewMap review={review} photos={photos} />
          </div>

          <div className="bg-white rounded-lg border border-steel-100 shadow-card">
            <div className="border-b border-steel-100 px-4">
              <div className="flex items-center gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors',
                        isActive
                          ? 'text-primary-600 border-primary-500 font-medium'
                          : 'text-steel-500 border-transparent hover:text-steel-700'
                      )}
                    >
                      <Icon size={16} />
                      {tab.label}
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span
                          className={cn(
                            'min-w-[18px] h-[18px] px-1 rounded-full text-xs flex items-center justify-center',
                            isActive
                              ? 'bg-primary-100 text-primary-600'
                              : 'bg-steel-100 text-steel-500'
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5">
              {activeTab === 'scene' && <SceneInfo reviewId={id || ''} />}

              {activeTab === 'materials' && (
                <MaterialTimeline materials={materials} />
              )}

              {activeTab === 'judgments' && (
                <div>
                  {showAddJudgment ? (
                    <div className="bg-primary-50/30 border border-primary-100 rounded-md p-4 mb-4 space-y-3">
                      <div className="text-sm font-medium text-steel-700">
                        添加新判断
                      </div>
                      <div>
                        <label className="text-xs text-steel-500 block mb-1">
                          判断内容
                        </label>
                        <textarea
                          value={newJudgmentContent}
                          onChange={(e) => setNewJudgmentContent(e.target.value)}
                          placeholder="请输入判断内容..."
                          className="w-full px-3 py-2 border border-steel-200 rounded-md text-sm focus:outline-none focus:border-primary-400 resize-none h-24"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-steel-500 block mb-1">
                          修改原因
                        </label>
                        <input
                          type="text"
                          value={newJudgmentReason}
                          onChange={(e) => setNewJudgmentReason(e.target.value)}
                          placeholder="为什么修改判断？"
                          className="w-full px-3 py-2 border border-steel-200 rounded-md text-sm focus:outline-none focus:border-primary-400"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddJudgment}
                          className="px-4 py-2 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 transition-colors"
                        >
                          确认添加
                        </button>
                        <button
                          onClick={() => setShowAddJudgment(false)}
                          className="px-4 py-2 text-steel-500 text-sm hover:text-steel-700 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                      <p className="text-xs text-steel-400">
                        ⚠️ 新判断将作为当前版本，旧版本保留在历史记录中
                      </p>
                    </div>
                  ) : null}

                  <JudgmentHistory
                    judgments={judgments}
                    onAddJudgment={() => setShowAddJudgment(true)}
                  />
                </div>
              )}

              {activeTab === 'anomalies' && (
                <AnomalyPanel
                  anomalies={anomalies}
                  onResolve={handleResolveAnomaly}
                />
              )}

              {activeTab === 'photos' && (
                <PhotoGallery photos={photos} onAddPhoto={handleAddPhoto} />
              )}
            </div>
          </div>
        </div>

        <div className="w-80 border-l border-steel-100 bg-white overflow-auto flex flex-col">
          <div className="p-4 border-b border-steel-100">
            <h3 className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-2">
              <FileText size={14} className="text-primary-500" />
              页面摘要
            </h3>
            <SceneInfo reviewId={id || ''} variant="summary" />
          </div>

          <div className="p-4 border-b border-steel-100">
            <h3 className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-2">
              <ScrollText size={14} className="text-primary-500" />
              侧边说明
            </h3>
            <SceneInfo reviewId={id || ''} variant="sideNote" />
          </div>

          <div className="p-4 flex-1">
            <h3 className="text-sm font-medium text-steel-700 mb-3 flex items-center gap-2">
              <Tag size={14} className="text-primary-500" />
              场景标签
            </h3>
            <SceneInfo reviewId={id || ''} variant="labels" />
          </div>

          <div className="p-4 border-t border-steel-100 bg-steel-50">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2">
                <div className="text-lg font-semibold text-primary-600">
                  {materials.length}
                </div>
                <div className="text-xs text-steel-400">份材料</div>
              </div>
              <div className="p-2">
                <div className="text-lg font-semibold text-success-600">
                  {judgments.length}
                </div>
                <div className="text-xs text-steel-400">版判断</div>
              </div>
              <div className="p-2">
                <div className="text-lg font-semibold text-warning-600">
                  {anomalies.filter(a => !a.resolved).length}
                </div>
                <div className="text-xs text-steel-400">项异常</div>
              </div>
              <div className="p-2">
                <div className="text-lg font-semibold text-steel-600">
                  {photos.length}
                </div>
                <div className="text-xs text-steel-400">张照片</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
