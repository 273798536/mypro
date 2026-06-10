import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  Save,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  User,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, TextArea, Select } from '@/components/ui/Input';
import { Timeline } from '@/components/features/Timeline';
import { useSampleStore } from '@/store/sampleStore';
import { groupOptions } from '@/data/samples';
import {
  boundaryTypeLabels,
  boundaryTypeTemplates,
  qualityStatusLabels,
  reviewStatusLabels,
  type BoundaryType,
  type QualityStatus,
} from '@/types';
import {
  formatDate,
  formatPercent,
  formatReads,
  getQualityStatusColor,
  getReviewStatusColor,
} from '@/utils/formatters';
import clsx from 'clsx';

const SampleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    getSampleById,
    getReviewRecordsBySampleId,
    getBoundaryNotesBySampleId,
    modifyGroup,
    modifyQualityStatus,
    addBoundaryNote,
    confirmSample,
    rejectSample,
  } = useSampleStore();

  const sample = getSampleById(id || '');
  const reviewRecords = getReviewRecordsBySampleId(id || '');
  const boundaryNotes = getBoundaryNotesBySampleId(id || '');

  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupReason, setGroupReason] = useState('');
  const [groupComment, setGroupComment] = useState('');
  const [showGroupEdit, setShowGroupEdit] = useState(false);

  const [selectedQualityStatus, setSelectedQualityStatus] = useState<QualityStatus>('pass');
  const [qualityReason, setQualityReason] = useState('');
  const [qualityComment, setQualityComment] = useState('');
  const [showQualityEdit, setShowQualityEdit] = useState(false);

  const [selectedBoundaryType, setSelectedBoundaryType] = useState<BoundaryType>('group_ambiguous');
  const [boundaryExplanation, setBoundaryExplanation] = useState('');
  const [showBoundaryForm, setShowBoundaryForm] = useState(false);

  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (sample) {
      setSelectedGroup(sample.groupName);
      setSelectedQualityStatus(sample.qualityStatus);
    }
  }, [sample]);

  const handleBoundaryTypeChange = (type: BoundaryType) => {
    setSelectedBoundaryType(type);
    setBoundaryExplanation(boundaryTypeTemplates[type]);
  };

  const handleModifyGroup = () => {
    if (!sample || !groupReason.trim()) return;
    modifyGroup(sample.id, selectedGroup, groupReason, groupComment);
    setShowGroupEdit(false);
    setGroupReason('');
    setGroupComment('');
  };

  const handleModifyQualityStatus = () => {
    if (!sample || !qualityReason.trim()) return;
    modifyQualityStatus(sample.id, selectedQualityStatus, qualityReason, qualityComment);
    setShowQualityEdit(false);
    setQualityReason('');
    setQualityComment('');
  };

  const handleAddBoundaryNote = () => {
    if (!sample || !boundaryExplanation.trim()) return;
    addBoundaryNote(sample.id, selectedBoundaryType, boundaryExplanation);
    setShowBoundaryForm(false);
    setBoundaryExplanation('');
  };

  const handleConfirmSample = () => {
    if (!sample) return;
    confirmSample(sample.id, reviewComment);
    setReviewComment('');
  };

  const handleRejectSample = () => {
    if (!sample || !reviewComment.trim()) return;
    rejectSample(sample.id, reviewComment);
    setReviewComment('');
  };

  if (!sample) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warm-orange-500 mx-auto mb-4" />
          <p className="text-paper-700">样本不存在或已被删除</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const qualityOptions = [
    { value: 'pass', label: qualityStatusLabels.pass },
    { value: 'low_quality', label: qualityStatusLabels.low_quality },
    { value: 'warning', label: qualityStatusLabels.warning },
    { value: 'fail', label: qualityStatusLabels.fail },
  ];

  const boundaryOptions = [
    { value: 'group_ambiguous', label: boundaryTypeLabels.group_ambiguous },
    { value: 'negative_control_abnormal', label: boundaryTypeLabels.negative_control_abnormal },
    { value: 'low_quality_edge', label: boundaryTypeLabels.low_quality_edge },
    { value: 'timepoint_cross', label: boundaryTypeLabels.timepoint_cross },
  ];

  const groupSelectOptions = groupOptions.map((g) => ({ value: g, label: g }));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/')}
          >
            返回列表
          </Button>
          <div>
            <h1 className="font-serif-sc text-2xl font-bold text-paper-900">
              样本复核详情
            </h1>
            <p className="text-sm text-paper-500 mt-1">
              对样本分组和质量状态进行复核确认
            </p>
          </div>
        </div>
        <Link to={`/sample/${sample.id}/history`}>
          <Button variant="secondary" icon={<History size={18} />}>
            查看历史对比
          </Button>
        </Link>
      </div>

      <Card bordered>
        <CardHeader>
          <CardTitle>样本基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-paper-500 mb-1">样本ID</p>
              <p className="font-mono text-lg font-semibold text-paper-900">
                {sample.sampleId}
              </p>
            </div>
            <div>
              <p className="text-sm text-paper-500 mb-1">批次</p>
              <p className="text-lg text-paper-900">{sample.batchId}</p>
            </div>
            <div>
              <p className="text-sm text-paper-500 mb-1">当前分组</p>
              <Badge variant="info" className="text-sm px-3 py-1">
                {sample.groupName}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-paper-500 mb-1">复核状态</p>
              <Badge
                className={clsx('text-sm px-3 py-1', getReviewStatusColor(sample.reviewStatus))}
              >
                {reviewStatusLabels[sample.reviewStatus]}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-paper-200">
            <div>
              <p className="text-sm text-paper-500 mb-1">Q20</p>
              <p className="text-xl font-semibold text-paper-900">
                {formatPercent(sample.q20)}
              </p>
            </div>
            <div>
              <p className="text-sm text-paper-500 mb-1">Q30</p>
              <p className="text-xl font-semibold text-paper-900">
                {formatPercent(sample.q30)}
              </p>
            </div>
            <div>
              <p className="text-sm text-paper-500 mb-1">总读段数</p>
              <p className="text-xl font-semibold text-paper-900">
                {formatReads(sample.totalReads)}
              </p>
            </div>
            <div>
              <p className="text-sm text-paper-500 mb-1">比对读段数</p>
              <p className="text-xl font-semibold text-paper-900">
                {formatReads(sample.mappedReads)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-paper-200">
            <div className="flex items-center gap-2">
              <User size={16} className="text-paper-400" />
              <span className="text-sm text-paper-600">
                当前复核人：<span className="font-medium text-paper-900">{sample.currentReviewer}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-paper-400" />
              <span className="text-sm text-paper-600">
                最后修改：<span className="font-medium text-paper-900">{formatDate(sample.lastModified)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-paper-600">
                修改人：<span className="font-medium text-paper-900">{sample.lastModifier}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card bordered>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>分组信息</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowGroupEdit(!showGroupEdit)}
            >
              {showGroupEdit ? '取消' : '修改分组'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-paper-600">当前分组</span>
              <Badge variant="info">{sample.groupName}</Badge>
            </div>

            {showGroupEdit && (
              <div className="space-y-4 pt-4 border-t border-paper-200">
                <Select
                  label="目标分组"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  options={groupSelectOptions}
                />
                <TextArea
                  label="修改原因（必填）"
                  value={groupReason}
                  onChange={(e) => setGroupReason(e.target.value)}
                  placeholder="请详细说明修改分组的原因..."
                  rows={3}
                />
                <TextArea
                  label="备注说明"
                  value={groupComment}
                  onChange={(e) => setGroupComment(e.target.value)}
                  placeholder="可选：添加其他说明信息..."
                  rows={2}
                />
                <Button
                  variant="primary"
                  icon={<Save size={16} />}
                  onClick={handleModifyGroup}
                  disabled={!groupReason.trim() || selectedGroup === sample.groupName}
                >
                  保存分组修改
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          bordered
          className={clsx(
            sample.qualityStatus === 'low_quality' &&
              'ring-2 ring-warm-orange-400 ring-offset-2'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>质量状态</CardTitle>
              {sample.qualityStatus === 'low_quality' && (
                <Badge variant="warning">
                  <AlertTriangle size={12} className="mr-1" />
                  低质量需特别处理
                </Badge>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQualityEdit(!showQualityEdit)}
            >
              {showQualityEdit ? '取消' : '修改状态'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-paper-600">当前状态</span>
                <Badge className={getQualityStatusColor(sample.qualityStatus)}>
                  {qualityStatusLabels[sample.qualityStatus]}
                </Badge>
              </div>
            </div>

            {showQualityEdit && (
              <div className="space-y-4 pt-4 border-t border-paper-200">
                <Select
                  label="质量状态"
                  value={selectedQualityStatus}
                  onChange={(e) => setSelectedQualityStatus(e.target.value as QualityStatus)}
                  options={qualityOptions}
                />
                <TextArea
                  label="修改原因（必填）"
                  value={qualityReason}
                  onChange={(e) => setQualityReason(e.target.value)}
                  placeholder="请详细说明修改质量状态的原因，包括具体指标分析..."
                  rows={3}
                />
                <TextArea
                  label="备注说明"
                  value={qualityComment}
                  onChange={(e) => setQualityComment(e.target.value)}
                  placeholder="可选：添加其他说明信息..."
                  rows={2}
                />
                <Button
                  variant="warning"
                  icon={<Save size={16} />}
                  onClick={handleModifyQualityStatus}
                  disabled={!qualityReason.trim() || selectedQualityStatus === sample.qualityStatus}
                >
                  保存状态修改
                </Button>
              </div>
            )}

            {sample.qualityStatus === 'low_quality' && !showQualityEdit && (
              <div className="bg-warm-orange-50 border border-warm-orange-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-warm-orange-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-warm-orange-800">低质量读段处理提示</p>
                    <p className="text-sm text-warm-orange-700 mt-1">
                      该样本Q20（{formatPercent(sample.q20)}）和Q30（{formatPercent(sample.q30)}）低于质量阈值。
                      请仔细评估是否可用于后续分析，或点击"修改状态"进行质量状态调整并填写详细原因。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        bordered
        className="bg-warm-orange-50/50 border-warm-orange-300 border-dashed"
      >
        <CardHeader className="flex flex-row items-center justify-between border-warm-orange-200">
          <div className="flex items-center gap-3">
            <CardTitle className="text-warm-orange-800">边界标注</CardTitle>
            <Badge variant="boundary">
              <AlertTriangle size={12} className="mr-1" />
              边界情况
            </Badge>
          </div>
          <Button
            variant="warning"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => {
              setShowBoundaryForm(!showBoundaryForm);
              if (!showBoundaryForm) {
                handleBoundaryTypeChange(selectedBoundaryType);
              }
            }}
          >
            {showBoundaryForm ? '取消' : '添加边界标注'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showBoundaryForm && (
            <div className="space-y-4 p-4 bg-white rounded-lg border border-warm-orange-200 mb-4">
              <Select
                label="边界类型"
                value={selectedBoundaryType}
                onChange={(e) => handleBoundaryTypeChange(e.target.value as BoundaryType)}
                options={boundaryOptions}
              />
              <TextArea
                label="解释说明"
                value={boundaryExplanation}
                onChange={(e) => setBoundaryExplanation(e.target.value)}
                placeholder="请详细说明该边界情况的原因和处理建议..."
                rows={5}
              />
              <div className="flex gap-2">
                <Button
                  variant="warning"
                  icon={<Save size={16} />}
                  onClick={handleAddBoundaryNote}
                  disabled={!boundaryExplanation.trim()}
                >
                  保存标注
                </Button>
                {boundaryTypeTemplates[selectedBoundaryType] && (
                  <Button
                    variant="ghost"
                    onClick={() => setBoundaryExplanation(boundaryTypeTemplates[selectedBoundaryType])}
                  >
                    应用模板
                  </Button>
                )}
              </div>
            </div>
          )}

          {boundaryNotes.length > 0 ? (
            <div className="space-y-3">
              {boundaryNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-lg border border-warm-orange-200 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="boundary">
                      {boundaryTypeLabels[note.boundaryType]}
                    </Badge>
                    <div className="text-xs text-paper-500">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {note.creator}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-paper-700 leading-relaxed">
                    {note.explanation}
                  </p>
                  <div className="text-xs text-paper-400 mt-3 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(note.createTime)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-paper-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无边界标注</p>
              <p className="text-sm">点击上方按钮添加边界情况说明</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card bordered>
        <CardHeader>
          <CardTitle>复核意见</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextArea
            label="复核意见"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="请填写复核意见，说明确认或驳回的理由..."
            rows={4}
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button
            variant="danger"
            icon={<XCircle size={18} />}
            onClick={handleRejectSample}
            disabled={!reviewComment.trim()}
          >
            驳回复核
          </Button>
          <Button
            variant="success"
            icon={<CheckCircle size={18} />}
            onClick={handleConfirmSample}
          >
            确认通过
          </Button>
        </CardFooter>
      </Card>

      <Card bordered>
        <CardHeader>
          <CardTitle>操作时间线</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewRecords.length > 0 ? (
            <Timeline records={reviewRecords} />
          ) : (
            <div className="text-center py-12 text-paper-400">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无操作记录</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SampleDetail;
