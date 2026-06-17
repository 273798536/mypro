import { useState, useMemo } from 'react';
import { Trees, Play, RefreshCw, HelpCircle, Info } from 'lucide-react';
import { Material, ComplaintRecord, ReviewResult } from './types';
import { MaterialUpload } from './components/MaterialUpload';
import { LateAttachmentPanel } from './components/LateAttachmentPanel';
import { AnomalyPanel } from './components/AnomalyPanel';
import { MergePanel } from './components/MergePanel';
import { ComplaintList } from './components/ComplaintList';
import { VersionHistory } from './components/VersionHistory';
import { ReviewResultPanel } from './components/ReviewResultPanel';
import { generateReviewResult } from './services/reviewGenerator';
import { analyzeLateAttachmentImpact } from './services/lateAttachmentAnalyzer';
import { createVersion } from './services/versionTracker';
import { parseMaterialContent } from './services/dataParser';
import { Card, Button, Alert } from './components/ui';

function App() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [mergedRecordIds, setMergedRecordIds] = useState<Set<string>>(new Set());
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const parkName = useMemo(() => {
    if (materials.length > 0) {
      return materials[0].parkName;
    }
    return '';
  }, [materials]);

  const lateImpacts = useMemo(() => {
    return analyzeLateAttachmentImpact(materials, complaints);
  }, [materials, complaints]);

  const handleGenerateReview = async () => {
    setIsReviewing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result = generateReviewResult(
      parkName || '未知公园',
      materials,
      complaints,
      lateImpacts
    );
    
    setReviewResult(result);
    setIsReviewing(false);
  };

  const handleMaterialsChange = (newMaterials: Material[]) => {
    setMaterials(newMaterials);
    setReviewResult(null);
  };

  const handleComplaintsChange = (newComplaints: ComplaintRecord[]) => {
    setComplaints(newComplaints);
    setReviewResult(null);
  };

  const handleMerge = (_suggestionId: string, recordIds: string[]) => {
    setMergedRecordIds(prev => {
      const next = new Set(prev);
      recordIds.forEach(id => next.add(id));
      return next;
    });
    
    const mainRecordId = recordIds[0];
    setComplaints(prev => prev.map(c => {
      if (c.id === mainRecordId) {
        return { ...c, description: c.description + '（已合并同位置投诉）' };
      }
      return c;
    }));
  };

  const handleKeepSeparate = (_suggestionId: string) => {
    // 不做任何数据修改，只是记录已处理
  };

  const handleLoadDemoData = () => {
    const { material: feedbackMaterial, parsedData: feedbackData } = parseMaterialContent(
`街道：阳光路
路口：春风路口
类型：座椅不足
描述：下午5点后老人孩子多，座椅不够坐，需要增加
座椅数量：4
时间：2026-06-15 17:30
投诉人：张阿姨

街道：阳光路
路口：春风路口
类型：座椅不足
描述：傍晚遛弯的人多，找不到座位休息
座椅数量：4
时间：2026-06-15 18:00
投诉人：李婆婆

街道：阳光路
路口：夏雨路口
类型：座椅损坏
描述：有2个座椅木板断裂，无法使用
座椅数量：2
时间：2026-06-15 10:20
投诉人：李师傅

街道：阳光路
路口：夏雨路
类型：座椅不足
描述：晚饭后散步的人多，找不到座位
座椅数量：3
时间：2026-06-15 19:00
投诉人：王女士

街道：阳光路
路口：秋风路口
类型：座椅不足
描述：健身区旁边座椅太少，大家只能站着
座椅数量：5
时间：2026-06-14 08:30
投诉人：赵大爷`,
      'resident_feedback',
      '6月15日居民反馈汇总',
      '阳光小区口袋公园',
      '阿宁'
    );

    const { material: attachmentMaterial, parsedData: attachmentData } = parseMaterialContent(
`街道：阳光路
路口：春风路口
类型：座椅不足
描述：下午5点后老人孩子多，座椅不够坐
座椅数量：6
时间：2026-06-15 17:30
投诉人：张阿姨

街道：阳光路
路口：夏雨路口
类型：座椅损坏
描述：有2个座椅木板断裂，无法使用，另外还有1个螺丝松动
座椅数量：3
时间：2026-06-15 10:20
投诉人：李师傅

街道：阳光路
路口：冬雪路口
类型：座椅不足
描述：儿童游乐区旁边座椅太少
座椅数量：4
时间：2026-06-15 16:00
投诉人：孙女士`,
      'attachment',
      '现场勘察补充报告（晚到）',
      '阳光小区口袋公园',
      '阿宁'
    );

    const lateAttachment = createVersion(
      attachmentMaterial,
      attachmentMaterial.versions[0].content,
      '阿宁',
      true,
      '现场勘察后补充的修正数据，比原定时间晚到48小时'
    );

    const { material: verbalMaterial, parsedData: verbalData } = parseMaterialContent(
`街道：阳光路
路口：春风路口
类型：口头说明
描述：现场实际清点座椅数量为8个，比之前上报的多2个，是因为之前统计遗漏了树荫下的2个座椅
座椅数量：8
时间：2026-06-16 09:00
说明人：阿宁`,
      'verbal_note',
      '阿宁的口头补充说明',
      '阳光小区口袋公园',
      '阿宁'
    );

    setMaterials([feedbackMaterial, lateAttachment, verbalMaterial]);
    setComplaints([
      ...feedbackData.complaints,
      ...attachmentData.complaints.map(c => ({ ...c, versionId: lateAttachment.versions[1].id })),
      ...verbalData.complaints,
    ]);
    setReviewResult(null);
    setShowGuide(false);
  };

  const handleExport = () => {
    if (!reviewResult) return;
    
    const exportData = {
      title: `${reviewResult.parkName}座椅容量复核报告`,
      generatedAt: new Date().toISOString(),
      result: reviewResult,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reviewResult.parkName}_座椅容量复核报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-park-100 rounded-lg">
                <Trees className="w-6 h-6 text-park-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">口袋公园座椅容量复核</h1>
                <p className="text-sm text-gray-500">材料上传 → 异常检测 → 智能分析 → 可解释结论</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadDemoData}
              >
                加载演示数据
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerateReview}
                disabled={materials.length === 0 || isReviewing}
              >
                {isReviewing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    复核中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    开始复核
                  </>
                )}
              </Button>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="使用指南"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {showGuide && (
          <Alert severity="info" title="使用指南" className="mb-6">
            <div className="space-y-2 text-sm">
              <p><strong>材料入口说明：</strong>点击"添加材料"，可上传三种类型的材料：</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>居民反馈</strong>：微信群、电话等渠道的居民投诉</li>
                <li><strong>附件材料</strong>：现场照片、测量报告等，可标记为"晚到附件"</li>
                <li><strong>口头说明</strong>：临时沟通的补充说明</li>
              </ul>
              <p className="mt-2"><strong>异常出口说明：</strong>系统会自动识别以下异常并高亮提示：</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>晚到附件</strong>：标记为晚到的附件会展示完整影响链，说明为何改变结论</li>
                <li><strong>版本冲突</strong>：同一份材料多次上传口径不一致时会被识别</li>
                <li><strong>路口错误</strong>：相邻路口合错会被标记为异常，不会伪装成正常通过</li>
                <li><strong>重复投诉</strong>：同一街口两条投诉会提示归并，不会直接合并</li>
                <li><strong>坏数据</strong>：异常值、缺失字段等会被指出，引用原始行号</li>
              </ul>
              <p className="mt-2">
                点击"加载演示数据"可快速体验完整功能，或点击"添加材料"手动上传。
              </p>
            </div>
          </Alert>
        )}

        <div className="space-y-6">
          {materials.length === 0 && (
            <Card className="p-8 text-center">
              <Info className="w-12 h-12 mx-auto mb-4 text-park-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                欢迎使用口袋公园座椅容量复核系统
              </h3>
              <p className="text-gray-500 mb-6 max-w-2xl mx-auto">
                本系统解决了人工复核效率低、晚到附件说不清、异常数据容易漏过的问题。
                支持材料版本追踪、晚到附件影响链分析、异常数据检测、重复投诉归并提示等功能。
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="primary" onClick={handleLoadDemoData}>
                  加载演示数据快速体验
                </Button>
                <Button variant="secondary" onClick={() => setShowGuide(true)}>
                  查看使用指南
                </Button>
              </div>
            </Card>
          )}

          <MaterialUpload
            materials={materials}
            complaints={complaints}
            onMaterialsChange={handleMaterialsChange}
            onComplaintsChange={handleComplaintsChange}
          />

          {materials.length > 0 && (
            <>
              <VersionHistory materials={materials} />

              {lateImpacts.length > 0 && (
                <LateAttachmentPanel
                  impacts={lateImpacts}
                  materials={materials}
                  complaints={complaints}
                />
              )}

              {reviewResult && (
                <>
                  <ReviewResultPanel
                    result={reviewResult}
                    onRegenerate={handleGenerateReview}
                    onExport={handleExport}
                  />

                  {reviewResult.anomalies.length > 0 && (
                    <AnomalyPanel
                      anomalies={reviewResult.anomalies}
                      complaints={reviewResult.complaints}
                    />
                  )}

                  {reviewResult.mergeSuggestions.length > 0 && (
                    <MergePanel
                      suggestions={reviewResult.mergeSuggestions}
                      complaints={reviewResult.complaints}
                      onMerge={handleMerge}
                      onKeepSeparate={handleKeepSeparate}
                      mergedRecordIds={mergedRecordIds}
                    />
                  )}
                </>
              )}

              <ComplaintList
                complaints={complaints}
                materials={materials}
              />

              {!reviewResult && materials.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    已加载 {materials.length} 份材料，{complaints.length} 条投诉记录
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGenerateReview}
                    disabled={isReviewing}
                  >
                    <Play className="w-4 h-4" />
                    开始智能复核
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-12 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>口袋公园座椅容量复核系统 · 让每一条晚到附件的影响都能说清楚</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
