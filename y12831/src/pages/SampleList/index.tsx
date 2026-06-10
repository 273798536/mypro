import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Clock, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { batches } from '@/data/samples';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Input, Select } from '@/components/ui/Input';
import { qualityStatusLabels, reviewStatusLabels, type QualityStatus, type ReviewStatus } from '@/types';
import { formatDate, formatPercent, formatReads, getQualityStatusColor, getReviewStatusColor } from '@/utils/formatters';

const SampleList: React.FC = () => {
  const navigate = useNavigate();
  const { samples } = useSampleStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [qualityFilter, setQualityFilter] = useState<string>('');
  const [reviewFilter, setReviewFilter] = useState<string>('');
  const [modifierFilter, setModifierFilter] = useState<string>('');

  const filteredSamples = useMemo(() => {
    return samples.filter(sample => {
      const matchesSearch = sample.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.groupName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBatch = !batchFilter || sample.batchId === batchFilter;
      const matchesQuality = !qualityFilter || sample.qualityStatus === qualityFilter;
      const matchesReview = !reviewFilter || sample.reviewStatus === reviewFilter;
      const matchesModifier = !modifierFilter || sample.lastModifier.includes(modifierFilter);
      
      return matchesSearch && matchesBatch && matchesQuality && matchesReview && matchesModifier;
    });
  }, [samples, searchTerm, batchFilter, qualityFilter, reviewFilter, modifierFilter]);

  const stats = useMemo(() => {
    return {
      total: samples.length,
      pending: samples.filter(s => s.reviewStatus === 'pending').length,
      reviewing: samples.filter(s => s.reviewStatus === 'reviewing').length,
      confirmed: samples.filter(s => s.reviewStatus === 'confirmed').length,
      hasBoundary: samples.filter(s => s.hasBoundary).length,
    };
  }, [samples]);

  const getBatchName = (batchId: string) => {
    return batches.find(b => b.batchId === batchId)?.batchName || batchId;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif-sc text-2xl font-bold text-paper-900">样本列表</h1>
          <p className="text-paper-600 mt-1">管理和复核转录组样本分组信息</p>
        </div>
        <Button variant="primary" icon={<FileText size={18} />}>
          导入样本
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-deep-sea-100 flex items-center justify-center">
                <FileText className="text-deep-sea-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-deep-sea-700 font-serif-sc">{stats.total}</p>
                <p className="text-xs text-paper-500">总样本数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-paper-100 flex items-center justify-center">
                <Clock className="text-paper-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-paper-700 font-serif-sc">{stats.pending}</p>
                <p className="text-xs text-paper-500">待复核</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warm-orange-100 flex items-center justify-center">
                <AlertTriangle className="text-warm-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-orange-700 font-serif-sc">{stats.reviewing}</p>
                <p className="text-xs text-paper-500">复核中</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-moss-green-100 flex items-center justify-center">
                <CheckCircle className="text-moss-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-moss-green-700 font-serif-sc">{stats.confirmed}</p>
                <p className="text-xs text-paper-500">已确认</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warm-orange-50 flex items-center justify-center border border-warm-orange-200 border-dashed">
                <AlertTriangle className="text-warm-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-orange-700 font-serif-sc">{stats.hasBoundary}</p>
                <p className="text-xs text-paper-500">边界情况</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {batches.map(batch => (
          <Card key={batch.batchId} hover bordered>
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif-sc font-semibold text-paper-900">{batch.batchName}</h3>
                  <p className="text-xs text-paper-500 mt-0.5">{batch.batchId}</p>
                </div>
                <Badge variant="info">{batch.totalSamples} 个样本</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-warm-orange-500" />
                  <span className="text-paper-600">待复核 {batch.pendingCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-moss-green-500" />
                  <span className="text-paper-600">已确认 {batch.confirmedCount}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-paper-100">
                <p className="text-xs text-paper-500">
                  最近操作：{formatDate(batch.lastOperateTime)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>样本数据</CardTitle>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-paper-500" />
              <span className="text-sm text-paper-600">筛选条件</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Input
              placeholder="搜索样本ID或分组..."
              icon={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              placeholder="选择批次"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              options={[
                { value: '', label: '全部批次' },
                ...batches.map(b => ({ value: b.batchId, label: b.batchName })),
              ]}
            />
            <Select
              placeholder="质量状态"
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              options={[
                { value: '', label: '全部状态' },
                ...Object.entries(qualityStatusLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              placeholder="复核状态"
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              options={[
                { value: '', label: '全部状态' },
                ...Object.entries(reviewStatusLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Input
              placeholder="修改人"
              value={modifierFilter}
              onChange={(e) => setModifierFilter(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-paper-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>样本ID</TableHead>
                  <TableHead>批次</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>Q20</TableHead>
                  <TableHead>Q30</TableHead>
                  <TableHead>总读段</TableHead>
                  <TableHead>比对率</TableHead>
                  <TableHead>质量状态</TableHead>
                  <TableHead>复核状态</TableHead>
                  <TableHead>最后修改</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-deep-sea-700">{sample.sampleId}</span>
                        {sample.hasBoundary && (
                          <Badge variant="boundary">边界</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-paper-600 text-xs">
                      {getBatchName(sample.batchId)}
                    </TableCell>
                    <TableCell className="text-paper-800">{sample.groupName}</TableCell>
                    <TableCell>
                      <span className={sample.q20 < 20 ? 'text-rust-red-600 font-medium' : 'text-paper-800'}>
                        {formatPercent(sample.q20)}
                      </span>
                    </TableCell>
                    <TableCell className="text-paper-800">{formatPercent(sample.q30)}</TableCell>
                    <TableCell className="text-paper-800">{formatReads(sample.totalReads)}</TableCell>
                    <TableCell className="text-paper-800">
                      {formatPercent((sample.mappedReads / sample.totalReads) * 100)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getQualityStatusColor(sample.qualityStatus)}>
                        {qualityStatusLabels[sample.qualityStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getReviewStatusColor(sample.reviewStatus)}>
                        {reviewStatusLabels[sample.reviewStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-paper-800">{sample.lastModifier}</p>
                        <p className="text-xs text-paper-500">{formatDate(sample.lastModified)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Eye size={14} />}
                          onClick={() => navigate(`/sample/${sample.id}`)}
                        >
                          复核
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Clock size={14} />}
                          onClick={() => navigate(`/sample/${sample.id}/history`)}
                        >
                          历史
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSamples.length === 0 && (
              <div className="py-12 text-center">
                <XCircle className="mx-auto text-paper-300 mb-3" size={48} />
                <p className="text-paper-500">没有找到匹配的样本</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SampleList;
