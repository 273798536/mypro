import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Save,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronRight,
  Zap,
  Gauge,
  FileText,
  History,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { useCorrectionStore } from '@/stores/useCorrectionStore';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { format } from 'date-fns';
import type { EfficiencyReport } from '@/types';

export const CorrectionPage: React.FC = () => {
  const {
    initialize,
    filters,
    filteredCorrections,
    selectedReport,
    draftSpeed,
    draftTorque,
    draftReason,
    previewResult,
    comparisonData,
    correctionLogs,
    isLoading,
    error,
    setFilters,
    selectReport,
    setDraftValues,
    submitCorrection,
    clearDraft,
  } = useCorrectionStore();

  const { initialize: initAnalysis, materials, testBenches, segments } = useAnalysisStore();

  const [activeTab, setActiveTab] = React.useState('pending');
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    initialize();
    initAnalysis();
  }, [initialize, initAnalysis]);

  const handleSelectReport = (report: EfficiencyReport) => {
    selectReport(report);
  };

  const handleSubmit = async () => {
    const success = await submitCorrection();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const getReportInfo = (report: EfficiencyReport) => {
    const tb = testBenches.find((t) => t.id === report.testBenchId);
    const material = materials.find((m) => m.id === report.materialId);
    const segment = segments.find((s) => s.id === report.segmentId);
    return { tb, material, segment };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-industrial-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-text">手动修正</h1>
          <p className="text-industrial-text-muted mt-1">
            修正转速扭矩后，新旧结果可并排对比查看
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="错误">
          {error}
        </Alert>
      )}

      {showSuccess && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Alert variant="success" title="修正提交成功">
            修正已提交，待审核通过后将生效。
          </Alert>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">筛选条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="测试台"
                placeholder="全部"
                value={filters.testBenchIds[0] || ''}
                onChange={(e) =>
                  setFilters({ testBenchIds: e.target.value ? [e.target.value] : [] })
                }
                options={testBenches.map((tb) => ({ value: tb.id, label: `${tb.code} - ${tb.name}` }))}
              />
              <Select
                label="材料"
                placeholder="全部"
                value={filters.materialIds[0] || ''}
                onChange={(e) =>
                  setFilters({ materialIds: e.target.value ? [e.target.value] : [] })
                }
                options={materials.map((m) => ({ value: m.id, label: `${m.code} - ${m.name}` }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                待修正报告 ({filteredCorrections.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-96 overflow-auto">
              {filteredCorrections.length > 0 ? (
                <div className="divide-y divide-industrial-border">
                  {filteredCorrections.slice(0, 20).map((report) => {
                    const { tb, material, segment } = getReportInfo(report);
                    const isSelected = selectedReport?.id === report.id;
                    return (
                      <div
                        key={report.id}
                        className={`p-3 cursor-pointer transition-colors hover:bg-industrial-bg-light ${
                          isSelected ? 'bg-industrial-bg-light border-l-2 border-blue-500' : ''
                        }`}
                        onClick={() => handleSelectReport(report)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-industrial-text">
                            {tb?.code} - {material?.code}
                          </span>
                          <Badge
                            variant={report.efficiency >= 85 ? 'green' : report.efficiency >= 80 ? 'yellow' : 'red'}
                          >
                            {report.efficiency.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-industrial-text-muted">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: segment?.color }}
                          />
                          <span>{segment?.name}</span>
                          <ChevronRight className="w-3 h-3" />
                          <span>{format(new Date(report.startTime), 'MM-dd HH:mm')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-industrial-text-muted">
                  暂无待修正报告
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedReport ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-orange-400" />
                      修正编辑
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X className="w-4 h-4" />}
                      onClick={() => selectReport(null)}
                    >
                      关闭
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(() => {
                    const { tb, material, segment } = getReportInfo(selectedReport);
                    const originalSpeed = selectedReport.originalData?.speed ?? selectedReport.efficiency;
                    const originalTorque = selectedReport.originalData?.torque ?? 0;

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-industrial-bg-dark rounded">
                            <p className="text-xs text-industrial-text-muted mb-1">测试台</p>
                            <p className="font-medium text-industrial-text">{tb?.code}</p>
                          </div>
                          <div className="p-3 bg-industrial-bg-dark rounded">
                            <p className="text-xs text-industrial-text-muted mb-1">材料</p>
                            <p className="font-medium text-industrial-text">{material?.code}</p>
                          </div>
                          <div className="p-3 bg-industrial-bg-dark rounded">
                            <p className="text-xs text-industrial-text-muted mb-1">工况</p>
                            <p className="font-medium text-industrial-text">{segment?.name}</p>
                          </div>
                          <div className="p-3 bg-industrial-bg-dark rounded">
                            <p className="text-xs text-industrial-text-muted mb-1">测试时间</p>
                            <p className="font-medium text-industrial-text">
                              {format(new Date(selectedReport.startTime), 'MM-dd HH:mm')}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-medium text-industrial-text flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              原始数据
                            </h4>
                            <div className="p-4 bg-industrial-bg-dark rounded-lg space-y-4">
                              <div>
                                <label className="block text-sm text-industrial-text-muted mb-1">
                                  转速 (rpm)
                                </label>
                                <div className="font-mono text-lg font-bold text-industrial-text">
                                  {originalSpeed.toFixed(1)}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-industrial-text-muted mb-1">
                                  扭矩 (N·m)
                                </label>
                                <div className="font-mono text-lg font-bold text-industrial-text">
                                  {originalTorque.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-industrial-text-muted mb-1">
                                  效率 (%)
                                </label>
                                <div className="font-mono text-lg font-bold text-blue-400">
                                  {selectedReport.originalData?.efficiency?.toFixed(2) ?? selectedReport.efficiency.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-medium text-industrial-text flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              修正数据
                            </h4>
                            <div className="p-4 bg-industrial-bg-dark rounded-lg space-y-4">
                              <Input
                                label="修正转速 (rpm)"
                                type="number"
                                value={draftSpeed ?? ''}
                                onChange={(e) =>
                                  setDraftValues(parseFloat(e.target.value), undefined, undefined)
                                }
                                placeholder="输入修正后转速"
                              />
                              <Input
                                label="修正扭矩 (N·m)"
                                type="number"
                                step="0.01"
                                value={draftTorque ?? ''}
                                onChange={(e) =>
                                  setDraftValues(undefined, parseFloat(e.target.value), undefined)
                                }
                                placeholder="输入修正后扭矩"
                              />
                              <Input
                                label="修正原因"
                                value={draftReason}
                                onChange={(e) =>
                                  setDraftValues(undefined, undefined, e.target.value)
                                }
                                placeholder="请输入修正原因"
                              />
                            </div>
                          </div>
                        </div>

                        {previewResult && (
                          <div className="space-y-4">
                            {previewResult.validation.warnings.length > 0 && (
                              <Alert variant="warning" title="校验警告">
                                <ul className="space-y-1">
                                  {previewResult.validation.warnings.map((w, i) => (
                                    <li key={i} className="text-sm">
                                      • {w}
                                    </li>
                                  ))}
                                </ul>
                              </Alert>
                            )}

                            {previewResult.validation.errors.length > 0 && (
                              <Alert variant="danger" title="校验错误">
                                <ul className="space-y-1">
                                  {previewResult.validation.errors.map((e, i) => (
                                    <li key={i} className="text-sm">
                                      • {e}
                                    </li>
                                  ))}
                                </ul>
                              </Alert>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-3 bg-industrial-bg-dark rounded text-center">
                                <p className="text-xs text-industrial-text-muted mb-1">新效率</p>
                                <p className="font-mono text-xl font-bold text-green-400">
                                  {previewResult.newEfficiency.toFixed(2)}%
                                </p>
                                <p className="text-xs text-industrial-text-muted mt-1">
                                  {previewResult.newEfficiency >
                                  (selectedReport.originalData?.efficiency ?? selectedReport.efficiency)
                                    ? '↑ 提升'
                                    : '↓ 下降'}
                                </p>
                              </div>
                              <div className="p-3 bg-industrial-bg-dark rounded text-center">
                                <p className="text-xs text-industrial-text-muted mb-1">新输出功率</p>
                                <p className="font-mono text-xl font-bold text-blue-400">
                                  {previewResult.newOutputPower.toFixed(2)}
                                </p>
                                <p className="text-xs text-industrial-text-muted mt-1">kW</p>
                              </div>
                              <div className="p-3 bg-industrial-bg-dark rounded text-center">
                                <p className="text-xs text-industrial-text-muted mb-1">变化量</p>
                                <p
                                  className={`font-mono text-xl font-bold ${
                                    previewResult.newEfficiency >
                                    (selectedReport.originalData?.efficiency ?? selectedReport.efficiency)
                                      ? 'text-green-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {(
                                    previewResult.newEfficiency -
                                    (selectedReport.originalData?.efficiency ?? selectedReport.efficiency)
                                  ).toFixed(2)}
                                  %
                                </p>
                                <p className="text-xs text-industrial-text-muted mt-1">效率差</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {comparisonData && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">新旧数据对比</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ComparisonChart data={comparisonData} height={280} />
                            </CardContent>
                          </Card>
                        )}

                        <div className="flex justify-end gap-3">
                          <Button variant="default" onClick={clearDraft}>
                            重置
                          </Button>
                          <Button
                            variant="primary"
                            icon={<Save className="w-4 h-4" />}
                            onClick={handleSubmit}
                            disabled={
                              !previewResult?.validation.valid ||
                              draftSpeed === null ||
                              draftTorque === null ||
                              !draftReason.trim()
                            }
                          >
                            提交修正
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center text-industrial-text-muted">
                <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请从左侧选择待修正的报告</p>
                <p className="text-sm mt-1">修正后可并排查看新旧结果对比</p>
              </div>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="px-4 pt-4">
                  <TabsTrigger value="pending">待审核 ({correctionLogs.filter((l) => l.status === 'pending').length})</TabsTrigger>
                  <TabsTrigger value="approved">已通过 ({correctionLogs.filter((l) => l.status === 'approved').length})</TabsTrigger>
                  <TabsTrigger value="history">全部记录</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="p-0">
                  <Table compact>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>申请人</TableHead>
                        <TableHead>原转速</TableHead>
                        <TableHead>新转速</TableHead>
                        <TableHead>原扭矩</TableHead>
                        <TableHead>新扭矩</TableHead>
                        <TableHead>原因</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {correctionLogs
                        .filter((l) => l.status === 'pending')
                        .map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {format(new Date(log.createdAt), 'MM-dd HH:mm')}
                            </TableCell>
                            <TableCell>{log.operatorName}</TableCell>
                            <TableCell className="font-mono">{log.originalSpeed.toFixed(1)}</TableCell>
                            <TableCell className="font-mono text-green-400">{log.correctedSpeed.toFixed(1)}</TableCell>
                            <TableCell className="font-mono">{log.originalTorque.toFixed(2)}</TableCell>
                            <TableCell className="font-mono text-green-400">{log.correctedTorque.toFixed(2)}</TableCell>
                            <TableCell className="max-w-xs truncate text-xs">{log.reason}</TableCell>
                            <TableCell>
                              <Badge variant="yellow">待审核</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="approved" className="p-0">
                  <Table compact>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>申请人</TableHead>
                        <TableHead>审核人</TableHead>
                        <TableHead>原效率</TableHead>
                        <TableHead>新效率</TableHead>
                        <TableHead>原因</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {correctionLogs
                        .filter((l) => l.status === 'approved')
                        .map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {format(new Date(log.createdAt), 'MM-dd HH:mm')}
                            </TableCell>
                            <TableCell>{log.operatorName}</TableCell>
                            <TableCell>{log.approver || '-'}</TableCell>
                            <TableCell className="font-mono">{log.originalEfficiency.toFixed(2)}%</TableCell>
                            <TableCell className="font-mono text-green-400">{log.correctedEfficiency.toFixed(2)}%</TableCell>
                            <TableCell className="max-w-xs truncate text-xs">{log.reason}</TableCell>
                            <TableCell>
                              <Badge variant="green">已通过</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="history" className="p-0">
                  <Table compact>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>申请人</TableHead>
                        <TableHead>审核人</TableHead>
                        <TableHead>效率变化</TableHead>
                        <TableHead>原因</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {correctionLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {format(new Date(log.createdAt), 'MM-dd HH:mm')}
                          </TableCell>
                          <TableCell>{log.operatorName}</TableCell>
                          <TableCell>{log.approver || '-'}</TableCell>
                          <TableCell className="font-mono">
                            <span
                              className={
                                log.correctedEfficiency > log.originalEfficiency
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }
                            >
                              {log.correctedEfficiency > log.originalEfficiency ? '+' : ''}
                              {(log.correctedEfficiency - log.originalEfficiency).toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs">{log.reason}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.status === 'approved'
                                  ? 'green'
                                  : log.status === 'rejected'
                                  ? 'red'
                                  : 'yellow'
                              }
                            >
                              {log.status === 'approved'
                                ? '已通过'
                                : log.status === 'rejected'
                                ? '已拒绝'
                                : '待审核'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
