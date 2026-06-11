import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  ChevronRight,
  RefreshCw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore, selectCurrentBatch, selectLineageNodes, selectActions } from '../../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { LineageNode, CultureRecord } from '../../types';

export default function Lineage() {
  const batch = useAppStore(selectCurrentBatch);
  const nodes = useAppStore(selectLineageNodes);
  const { updateLineageNode, addReviewRecord, resolveAnomaly } = useAppStore(selectActions);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<CultureRecord>>({
    date: '',
    operator: '',
    operation: '',
    notes: '',
  });

  const rootNodes = useMemo(() => nodes.filter(n => n.parentId === null), [nodes]);
  
  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId), 
    [nodes, selectedNodeId]
  );

  const getNodeLevel = (node: LineageNode, level = 0): number => {
    if (!node.parentId) return level;
    const parent = nodes.find(n => n.id === node.parentId);
    return parent ? getNodeLevel(parent, level + 1) : level;
  };

  const getDescendants = (nodeId: string): LineageNode[] => {
    const children = nodes.filter(n => n.parentId === nodeId);
    return children.concat(children.flatMap(c => getDescendants(c.id)));
  };

  const handleAddRecord = () => {
    if (!selectedNode || !newRecord.date || !newRecord.operator || !newRecord.operation) return;

    const record: CultureRecord = {
      id: `record-${Date.now()}`,
      date: newRecord.date,
      operator: newRecord.operator,
      operation: newRecord.operation,
      notes: newRecord.notes || '',
      timestamp: new Date(),
    };

    updateLineageNode(selectedNode.id, {
      cultureRecords: [...selectedNode.cultureRecords, record],
      needsReview: true,
      reviewStatus: 'pending',
    });

    const descendants = getDescendants(selectedNode.id);
    descendants.forEach(desc => {
      updateLineageNode(desc.id, {
        needsReview: true,
        reviewStatus: 'pending',
      });
    });

    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'lineage',
      targetId: selectedNode.id,
      action: '补录培养记录',
      comment: `补录培养记录：${newRecord.operation}。系统已自动标记该节点及后代节点待复核。`,
      reviewer: newRecord.operator,
      timestamp: new Date(),
    });

    setNewRecord({ date: '', operator: '', operation: '', notes: '' });
    setShowAddRecord(false);
  };

  const handleApproveNode = (node: LineageNode) => {
    updateLineageNode(node.id, {
      needsReview: false,
      reviewStatus: 'approved',
      reviewedBy: '张育种',
      reviewedAt: new Date(),
    });

    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'lineage',
      targetId: node.id,
      action: '复核通过',
      comment: '经人工复核，谱系关系正确。',
      reviewer: '张育种',
      timestamp: new Date(),
    });
  };

  const handleRejectNode = (node: LineageNode) => {
    updateLineageNode(node.id, {
      needsReview: false,
      reviewStatus: 'rejected',
      reviewedBy: '张育种',
      reviewedAt: new Date(),
      requiresCorrection: true,
    });

    addReviewRecord({
      id: `review-${Date.now()}`,
      type: 'lineage',
      targetId: node.id,
      action: '复核驳回',
      comment: '谱系关系存疑，请核对后重新提交。',
      reviewer: '张育种',
      timestamp: new Date(),
    });
  };

  const renderNode = (node: LineageNode) => {
    const level = getNodeLevel(node);
    const children = nodes.filter(n => n.parentId === node.id);
    const isSelected = selectedNodeId === node.id;

    const statusColor = node.needsReview
      ? node.reviewStatus === 'rejected' ? 'danger' : 'warning'
      : node.reviewStatus === 'approved' ? 'success' : 'default';

    const statusLabel = node.needsReview
      ? node.reviewStatus === 'rejected' ? '已驳回' : '待复核'
      : node.reviewStatus === 'approved' ? '已确认' : '正常';

    return (
      <div key={node.id} className="mb-2">
        <motion.div
          whileHover={{ x: 4 }}
          onClick={() => setSelectedNodeId(node.id)}
          className={`
            flex items-center gap-2 p-2.5 rounded-[2px] cursor-pointer transition-all
            ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
            ${node.needsReview ? 'bg-yellow-50/50' : ''}
          `}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className={`
            w-8 h-8 rounded-[2px] flex items-center justify-center
            ${node.needsReview ? 'bg-yellow-100' : 'bg-gray-100'}
          `}>
            {node.needsReview ? (
              <Clock className="w-4 h-4 text-yellow-600" />
            ) : (
              <GitBranch className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">{node.sampleId}</span>
              <Badge variant={statusColor} size="sm">{statusLabel}</Badge>
            </div>
            <p className="text-xs text-gray-500 truncate">{node.generation}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </motion.div>
        {children.length > 0 && (
          <div className="mt-1">
            {children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-blue-600" />
            谱系追踪
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            补录培养记录后自动标记待复核，人工修正实时联动更新
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="warning" size="md">
            {nodes.filter(n => n.needsReview).length} 个待复核
          </Badge>
          <Badge variant="success" size="md">
            {nodes.filter(n => n.reviewStatus === 'approved').length} 个已确认
          </Badge>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-[2px] p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-[2px] flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800">动态更新机制</h3>
            <p className="text-sm text-blue-700 mt-1">
              谱系追踪支持非一次性判断。补录培养记录后，系统自动标记该节点及其所有后代节点为"待复核"状态。
              人工修正后，相关节点状态实时联动更新，确保谱系信息准确性。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 24rem)' }}>
        <Card className="col-span-5 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">谱系树结构</CardTitle>
            <Badge variant="info" size="sm">批次 {batch.id}</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
            <div className="p-3">
              {rootNodes.map(renderNode)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-7 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">节点详情</CardTitle>
            {selectedNode && (
              <Button size="sm" variant="primary" onClick={() => setShowAddRecord(true)}>
                <Plus className="w-4 h-4 mr-1" />
                补录记录
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto h-[calc(100%-60px)]">
            {selectedNode ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-[2px] p-3">
                    <p className="text-xs text-gray-500 mb-1">样本ID</p>
                    <p className="font-mono font-semibold text-gray-900">{selectedNode.sampleId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-[2px] p-3">
                    <p className="text-xs text-gray-500 mb-1">世代</p>
                    <p className="font-semibold text-gray-900">{selectedNode.generation}</p>
                  </div>
                  <div className="bg-gray-50 rounded-[2px] p-3">
                    <p className="text-xs text-gray-500 mb-1">谱系关系</p>
                    <p className="text-sm text-gray-900">
                      {selectedNode.relationToParent || '起始材料'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-[2px] p-3">
                    <p className="text-xs text-gray-500 mb-1">复核状态</p>
                    <Badge
                      variant={
                        selectedNode.needsReview
                          ? selectedNode.reviewStatus === 'rejected' ? 'danger' : 'warning'
                          : selectedNode.reviewStatus === 'approved' ? 'success' : 'default'
                      }
                    >
                      {selectedNode.needsReview
                        ? selectedNode.reviewStatus === 'rejected' ? '已驳回' : '待复核'
                        : selectedNode.reviewStatus === 'approved' ? '已确认' : '正常'}
                    </Badge>
                  </div>
                </div>

                {selectedNode.needsReview && (
                  <div className={`rounded-[2px] p-3 border-2 ${
                    selectedNode.reviewStatus === 'rejected'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        selectedNode.reviewStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <span className={`font-medium text-sm ${
                        selectedNode.reviewStatus === 'rejected' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {selectedNode.reviewStatus === 'rejected' ? '已驳回，需要修正' : '待人工复核'}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      selectedNode.reviewStatus === 'rejected' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      该节点有补录的培养记录，需要人工核对谱系关系。确认谱系关系无误后点击"复核通过"，有问题则点击"复核驳回"。
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApproveNode(selectedNode)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        复核通过
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRejectNode(selectedNode)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        复核驳回
                      </Button>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {showAddRecord && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 border border-gray-200 rounded-[2px] p-4"
                    >
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        补录培养记录
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">操作日期</label>
                          <input
                            type="date"
                            value={newRecord.date}
                            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                            className="w-full p-2 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">操作人员</label>
                          <input
                            type="text"
                            value={newRecord.operator}
                            onChange={(e) => setNewRecord({ ...newRecord, operator: e.target.value })}
                            placeholder="如：李实验员"
                            className="w-full p-2 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">操作内容</label>
                          <select
                            value={newRecord.operation}
                            onChange={(e) => setNewRecord({ ...newRecord, operation: e.target.value })}
                            className="w-full p-2 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          >
                            <option value="">请选择操作类型</option>
                            <option value="单株选择">单株选择</option>
                            <option value="混合收获">混合收获</option>
                            <option value="回交转育">回交转育</option>
                            <option value="加代繁殖">加代繁殖</option>
                            <option value="杂交组合配制">杂交组合配制</option>
                            <option value="抗病性鉴定">抗病性鉴定</option>
                            <option value="品质分析">品质分析</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">备注说明</label>
                          <textarea
                            value={newRecord.notes}
                            onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                            placeholder="记录特殊情况，如：该株行抗病性表现突出，入选重点观察..."
                            className="w-full p-2 text-sm border border-gray-300 rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none h-20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleAddRecord}
                          disabled={!newRecord.date || !newRecord.operator || !newRecord.operation}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          保存记录
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowAddRecord(false)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    培养记录历史
                    <span className="text-xs text-gray-500 font-normal">
                      共 {selectedNode.cultureRecords.length} 条
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {selectedNode.cultureRecords.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">暂无培养记录</p>
                        <p className="text-xs text-gray-400 mt-1">点击右上角"补录记录"添加</p>
                      </div>
                    ) : (
                      selectedNode.cultureRecords.map((record, index) => (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`border-l-2 pl-3 py-2 ${
                            index === selectedNode.cultureRecords.length - 1
                              ? 'border-blue-400 bg-blue-50/50'
                              : 'border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {record.date}
                              </span>
                              <span className="text-xs text-gray-500">
                                {record.operation}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs text-gray-600">{record.operator}</span>
                            </div>
                          </div>
                          {record.notes && (
                            <p className="text-xs text-gray-600">{record.notes}</p>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {selectedNode.mutations && selectedNode.mutations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      携带突变位点
                      <span className="text-xs text-gray-500 font-normal">
                        共 {selectedNode.mutations.length} 个
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNode.mutations.map((mutId) => {
                        const sample = batch.samples.find(s => s.id === selectedNode.sampleId);
                        const mutation = sample?.mutations.find(m => m.id === mutId);
                        if (!mutation) return null;
                        return (
                          <div key={mutId} className="bg-white border border-gray-200 rounded-[2px] p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                {mutation.gene}
                              </span>
                              <Badge
                                variant={
                                  mutation.functionalImpact === 'high' ? 'danger' :
                                  mutation.functionalImpact === 'medium' ? 'warning' : 'success'
                                }
                                size="sm"
                              >
                                {mutation.aminoAcidChange}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{mutation.mutationType}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <GitBranch className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm">请从左侧选择一个谱系节点查看详情</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
