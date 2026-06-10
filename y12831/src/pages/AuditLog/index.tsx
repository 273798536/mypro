import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, History, Eye, ChevronDown, ChevronUp, FileText, Edit3, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Input, Select } from '@/components/ui/Input';
import { operationTypeLabels, qualityStatusLabels, reviewStatusLabels, type OperationType } from '@/types';
import { formatDate, getOperationTypeColor } from '@/utils/formatters';

const AuditLog: React.FC = () => {
  const navigate = useNavigate();
  const { reviewRecords, historyVersions } = useSampleStore();

  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('');
  const [sampleIdFilter, setSampleIdFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const operators = useMemo(() => {
    const uniqueOperators = [...new Set(reviewRecords.map(r => r.operator))];
    return uniqueOperators.map(op => ({ value: op, label: op }));
  }, [reviewRecords]);

  const hasHistoryVersion = (sampleId: string) => {
    return historyVersions.some(v => v.sampleId === sampleId);
  };

  const filteredRecords = useMemo(() => {
    return reviewRecords.filter(record => {
      const matchesType = !operationTypeFilter || record.operationType === operationTypeFilter;
      const matchesOperator = !operatorFilter || record.operator === operatorFilter;
      const matchesSampleId = !sampleIdFilter || record.sampleId.toLowerCase().includes(sampleIdFilter.toLowerCase());
      
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && new Date(record.operateTime) >= new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(record.operateTime) <= end;
      }

      return matchesType && matchesOperator && matchesSampleId && matchesDate;
    }).sort((a, b) => new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime());
  }, [reviewRecords, operationTypeFilter, operatorFilter, sampleIdFilter, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      total: reviewRecords.length,
      modifyGroup: reviewRecords.filter(r => r.operationType === 'modify_group').length,
      modifyQuality: reviewRecords.filter(r => r.operationType === 'modify_quality').length,
      confirm: reviewRecords.filter(r => r.operationType === 'confirm').length,
    };
  }, [reviewRecords]);

  const getStatusLabel = (status: string) => {
    return qualityStatusLabels[status as keyof typeof qualityStatusLabels] || 
           reviewStatusLabels[status as keyof typeof reviewStatusLabels] || status;
  };

  const renderChangeContent = (record: typeof reviewRecords[0]) => {
    const changes: string[] = [];
    
    if (record.oldGroup && record.newGroup) {
      changes.push(`分组: ${record.oldGroup} → ${record.newGroup}`);
    }
    if (record.oldStatus && record.newStatus) {
      changes.push(`状态: ${getStatusLabel(record.oldStatus)} → ${getStatusLabel(record.newStatus)}`);
    }
    
    if (changes.length === 0) {
      return <span className="text-paper-500">-</span>;
    }
    
    return (
      <div className="space-y-1">
        {changes.map((change, idx) => (
        <div key={idx} className="text-sm">
          {change}
        </div>
      ))}
      </div>
    );
  };

  const toggleRowExpand = (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRowId(expandedRowId === recordId ? null : recordId);
  };

  const handleViewHistory = (sampleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/sample/${sampleId}/history`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-sc text-2xl font-bold text-paper-900">复核记录追溯</h1>
            <p className="text-paper-600 mt-1">查看所有样本的操作日志和版本历史</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-deep-sea-100 flex items-center justify-center">
                <FileText className="text-deep-sea-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-deep-sea-700 font-serif-sc">{stats.total}</p>
                <p className="text-xs text-paper-500">总操作数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warm-orange-100 flex items-center justify-center">
                <Edit3 className="text-warm-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-warm-orange-700 font-serif-sc">{stats.modifyGroup}</p>
                <p className="text-xs text-paper-500">修改分组数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rust-red-100 flex items-center justify-center">
                <AlertTriangle className="text-rust-red-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-rust-red-700 font-serif-sc">{stats.modifyQuality}</p>
                <p className="text-xs text-paper-500">修改质量数</p>
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
                <p className="text-2xl font-bold text-moss-green-700 font-serif-sc">{stats.confirm}</p>
                <p className="text-xs text-paper-500">确认通过数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>筛选条件</CardTitle>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-paper-500" />
              <span className="text-sm text-paper-600">按条件筛选操作记录</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              label="操作类型"
              value={operationTypeFilter}
              onChange={(e) => setOperationTypeFilter(e.target.value)}
              options={[
                { value: '', label: '全部类型' },
                ...Object.entries(operationTypeLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              label="操作人"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              options={[
                { value: '', label: '全部操作人' },
                ...operators,
              ]}
            />
            <Input
              label="样本ID"
              placeholder="输入样本ID..."
              icon={<Search size={16} />}
              value={sampleIdFilter}
              onChange={(e) => setSampleIdFilter(e.target.value)}
            />
            <Input
              label="开始日期"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="结束日期"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>操作日志</CardTitle>
            <div className="text-sm text-paper-500">
              共 {filteredRecords.length} 条记录
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-paper-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>操作类型</TableHead>
                  <TableHead>样本ID</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead>操作时间</TableHead>
                  <TableHead>修改原因</TableHead>
                  <TableHead>修改内容</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <React.Fragment key={record.id}>
                    <TableRow onClick={(e) => toggleRowExpand(record.id, e)}>
                      <TableCell className="w-10">
                        <div className="flex items-center justify-center">
                          {expandedRowId === record.id ? (
                            <ChevronUp size={16} className="text-paper-500" />
                          ) : (
                            <ChevronDown size={16} className="text-paper-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getOperationTypeColor(record.operationType)}>
                          {operationTypeLabels[record.operationType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-deep-sea-700">{record.sampleId}</span>
                      </TableCell>
                      <TableCell className="text-paper-800">{record.operator}</TableCell>
                      <TableCell className="text-paper-600">{formatDate(record.operateTime)}</TableCell>
                      <TableCell className="text-paper-800 max-w-xs truncate" title={record.reason}>
                        {record.reason || '-'}
                      </TableCell>
                      <TableCell>{renderChangeContent(record)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasHistoryVersion(record.sampleId) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<History size={14} />}
                              onClick={(e) => handleViewHistory(record.sampleId, e)}
                            >
                              查看版本
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Eye size={14} />}
                            onClick={(e) => handleViewHistory(record.sampleId, e)}
                          >
                            详情
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRowId === record.id && (
                      <TableRow hover={false} className="bg-paper-50">
                        <TableCell colSpan={8} className="py-4">
                          <div className="pl-10 pr-4">
                          <div className="text-sm text-paper-900 space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-paper-100 flex items-center justify-center mt-0.5">
                                <FileText size={16} className="text-paper-500" />
                              </div>
                              <div>
                                <p className="font-medium text-paper-800 mb-1">完整备注</p>
                                <p className="text-paper-600 leading-relaxed">
                                  {record.comment || '暂无备注信息'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {filteredRecords.length === 0 && (
              <div className="py-12 text-center">
              <FileText className="mx-auto text-paper-300 mb-3" size={48} />
              <p className="text-paper-500">没有找到匹配的操作记录</p>
            </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
