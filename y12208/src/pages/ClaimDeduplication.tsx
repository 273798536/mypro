import { useState } from 'react';
import { 
  FileSearch, 
  AlertTriangle, 
  FileX, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  User,
  Clock,
  FileText,
  Shield
} from 'lucide-react';
import { useReserveStore } from '../store/useReserveStore';
import { formatCurrency, formatDate } from '../utils/calculationEngine';
import { exportDuplicateClaimsToExcel, exportBatchMismatchesToExcel } from '../utils/exportUtils';
import type { DuplicateClaimGroup, BatchMismatch } from '../../shared/types';

type TabType = 'duplicates' | 'mismatches';

export default function ClaimDeduplication() {
  const {
    duplicateGroups,
    batchMismatches,
    auditTrails,
    orders,
    selectedRuleVersion,
    saveAuditTrail,
    updateDuplicateGroupStatus,
    updateMismatchStatus,
    runDuplicateDetection,
    runBatchMismatchCheck,
  } = useReserveStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('duplicates');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedMismatch, setExpandedMismatch] = useState<string | null>(null);
  const [auditComment, setAuditComment] = useState<Record<string, string>>({});
  
  const pendingDuplicates = duplicateGroups.filter(g => g.status === 'pending');
  const resolvedDuplicates = duplicateGroups.filter(g => g.status === 'resolved');
  const pendingMismatches = batchMismatches.filter(m => m.status === 'pending');
  const resolvedMismatches = batchMismatches.filter(m => m.status === 'resolved');
  
  const handleAudit = (
    groupId: string, 
    claimId: string, 
    result: 'confirmed' | 'rejected',
    type: 'duplicate' | 'mismatch'
  ) => {
    const comment = auditComment[claimId] || (result === 'confirmed' ? '经核实确认为重复索赔，予以驳回' : '经核实为正常索赔，予以通过');
    saveAuditTrail(claimId, result, comment);
    
    if (type === 'duplicate') {
      updateDuplicateGroupStatus(groupId, 'resolved');
    } else {
      updateMismatchStatus(groupId, 'resolved');
    }
    
    setAuditComment(prev => ({ ...prev, [claimId]: '' }));
  };
  
  const getAuditForClaim = (claimId: string) => {
    return auditTrails.find(a => a.claimId === claimId);
  };
  
  const renderDuplicateGroup = (group: DuplicateClaimGroup) => {
    const isExpanded = expandedGroup === group.id;
    const totalAmount = group.claims.reduce((sum, c) => sum + c.claimAmount, 0);
    
    return (
      <div key={group.id} className={`border rounded-lg overflow-hidden mb-4 transition-all ${group.status === 'resolved' ? 'opacity-60' : ''}`}>
        <div 
          className={`p-4 flex items-center justify-between cursor-pointer ${group.status === 'pending' ? 'bg-amber-50' : 'bg-slate-50'}`}
          onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
        >
          <div className="flex items-center gap-4">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            <div className="flex items-center gap-3">
              {group.status === 'pending' ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">设备: {group.serialNumber}</p>
                  <span className={`badge ${group.status === 'pending' ? 'badge-pending' : 'badge-success'}`}>
                    {group.status === 'pending' ? '待处理' : '已处理'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">故障类型: {group.faultType}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-slate-500">置信度</p>
              <p className={`font-bold ${group.confidenceScore >= 90 ? 'text-rose-600' : 'text-amber-600'}`}>
                {group.confidenceScore}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">索赔笔数</p>
              <p className="font-bold text-slate-800">{group.claims.length} 笔</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">涉及金额</p>
              <p className="font-bold text-rose-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 bg-white border-t">
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <Shield className="w-4 h-4 inline mr-2" />
                <span className="font-medium">检测依据:</span> {group.detectionBasis}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                <FileText className="w-3 h-3 inline mr-1" />
                规则版本: {selectedRuleVersion} | 检测日期: {formatDate(group.detectedDate)}
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 mb-2">索赔明细（共 {group.claims.length} 笔）</p>
              {group.claims.map((claim, idx) => {
                const audit = getAuditForClaim(claim.id);
                return (
                  <div key={claim.id} className={`p-4 rounded-lg border ${idx === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {idx === 0 && <span className="badge badge-success">首笔索赔</span>}
                          {idx > 0 && <span className="badge badge-danger">疑似重复</span>}
                          <span className="text-sm font-medium text-slate-700">{claim.id}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">批次:</span>
                            <span className="ml-2 font-medium">{claim.batchNo}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">索赔日期:</span>
                            <span className="ml-2 font-medium">{formatDate(claim.claimDate)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">索赔金额:</span>
                            <span className="ml-2 font-medium text-rose-600">{formatCurrency(claim.claimAmount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">维修单号:</span>
                            <span className="ml-2 font-medium font-mono">{claim.repairOrderNo}</span>
                          </div>
                        </div>
                        
                        {audit && (
                          <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                            <div className="flex items-center gap-2 text-sm mb-1">
                              <User className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-600">{audit.auditor}</span>
                              <Clock className="w-4 h-4 text-slate-500 ml-2" />
                              <span className="text-slate-600">{formatDate(audit.auditTime)}</span>
                              <span className={`ml-auto badge ${audit.auditResult === 'confirmed' ? 'badge-danger' : 'badge-success'}`}>
                                {audit.auditResult === 'confirmed' ? '已确认重复' : '予以通过'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">审核意见:</span> {audit.auditComment}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              <FileText className="w-3 h-3 inline mr-1" />
                              证据: {audit.evidence}
                            </p>
                          </div>
                        )}
                        
                        {!audit && group.status === 'pending' && idx > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                placeholder="输入审核意见（可选）"
                                value={auditComment[claim.id] || ''}
                                onChange={(e) => setAuditComment(prev => ({ ...prev, [claim.id]: e.target.value }))}
                                className="input-field flex-1 text-sm"
                              />
                              <button
                                onClick={() => handleAudit(group.id, claim.id, 'confirmed', 'duplicate')}
                                className="btn-danger text-sm flex items-center gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                确认重复
                              </button>
                              <button
                                onClick={() => handleAudit(group.id, claim.id, 'rejected', 'duplicate')}
                                className="btn-success text-sm flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                予以通过
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderBatchMismatch = (mismatch: BatchMismatch) => {
    const isExpanded = expandedMismatch === mismatch.id;
    const audit = getAuditForClaim(mismatch.maintenanceOrder.id);
    
    return (
      <div key={mismatch.id} className={`border rounded-lg overflow-hidden mb-4 transition-all ${mismatch.status === 'resolved' ? 'opacity-60' : ''}`}>
        <div 
          className={`p-4 flex items-center justify-between cursor-pointer ${mismatch.status === 'pending' ? 'bg-rose-50' : 'bg-slate-50'}`}
          onClick={() => setExpandedMismatch(isExpanded ? null : mismatch.id)}
        >
          <div className="flex items-center gap-4">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            <div className="flex items-center gap-3">
              {mismatch.status === 'pending' ? (
                <FileX className="w-5 h-5 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">设备: {mismatch.serialNumber}</p>
                  <span className={`badge ${mismatch.status === 'pending' ? 'badge-pending' : 'badge-success'}`}>
                    {mismatch.status === 'pending' ? '待处理' : '已处理'}
                  </span>
                  {!mismatch.withinWarranty && (
                    <span className="badge badge-danger">超质保期</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  出货批次: <span className="text-emerald-600 font-medium">{mismatch.shipmentBatch}</span>
                  {' → '}
                  索赔批次: <span className="text-rose-600 font-medium">{mismatch.claimBatch}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-slate-500">故障类型</p>
              <p className="font-medium text-slate-800">{mismatch.maintenanceOrder.faultType}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">索赔金额</p>
              <p className="font-bold text-rose-600">{formatCurrency(mismatch.maintenanceOrder.claimAmount)}</p>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 bg-white border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  出货记录
                </h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-emerald-600">批次:</span> {mismatch.shipmentRecord.batchNo}</p>
                  <p><span className="text-emerald-600">出货日期:</span> {formatDate(mismatch.shipmentRecord.shipmentDate)}</p>
                  <p><span className="text-emerald-600">数量:</span> {mismatch.shipmentRecord.quantity} 台</p>
                  <p><span className="text-emerald-600">单价:</span> {formatCurrency(mismatch.shipmentRecord.unitPrice)}</p>
                  <p><span className="text-emerald-600">质保期限:</span> {mismatch.shipmentRecord.warrantyMonths} 个月</p>
                </div>
              </div>
              
              <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                <h4 className="font-medium text-rose-800 mb-2 flex items-center gap-2">
                  <FileX className="w-4 h-4" />
                  索赔记录
                </h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-rose-600">批次:</span> {mismatch.maintenanceOrder.batchNo}</p>
                  <p><span className="text-rose-600">索赔日期:</span> {formatDate(mismatch.maintenanceOrder.claimDate)}</p>
                  <p><span className="text-rose-600">故障类型:</span> {mismatch.maintenanceOrder.faultType}</p>
                  <p><span className="text-rose-600">索赔金额:</span> {formatCurrency(mismatch.maintenanceOrder.claimAmount)}</p>
                  <p><span className="text-rose-600">维修单号:</span> {mismatch.maintenanceOrder.repairOrderNo}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm text-primary-800">
                <Shield className="w-4 h-4 inline mr-2" />
                <span className="font-medium">准备金规则作为补充证据:</span> 
                当出货记录与维修工单批次不一致时，以出货记录批次为准进行准备金计提。
                规则版本 {selectedRuleVersion} 明确规定：批次核对不一致需人工审核确认。
              </p>
            </div>
            
            {audit && (
              <div className="p-3 bg-slate-100 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">{audit.auditor}</span>
                  <Clock className="w-4 h-4 text-slate-500 ml-2" />
                  <span className="text-slate-600">{formatDate(audit.auditTime)}</span>
                  <span className={`ml-auto badge ${audit.auditResult === 'confirmed' ? 'badge-danger' : 'badge-success'}`}>
                    {audit.auditResult === 'confirmed' ? '批次错配确认' : '予以通过'}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">审核意见:</span> {audit.auditComment}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  <FileText className="w-3 h-3 inline mr-1" />
                  证据: {audit.evidence}
                </p>
              </div>
            )}
            
            {!audit && mismatch.status === 'pending' && (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="输入审核意见（可选）"
                  value={auditComment[mismatch.maintenanceOrder.id] || ''}
                  onChange={(e) => setAuditComment(prev => ({ ...prev, [mismatch.maintenanceOrder.id]: e.target.value }))}
                  className="input-field flex-1 text-sm"
                />
                <button
                  onClick={() => handleAudit(mismatch.id, mismatch.maintenanceOrder.id, 'confirmed', 'mismatch')}
                  className="btn-danger text-sm flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  确认错配
                </button>
                <button
                  onClick={() => handleAudit(mismatch.id, mismatch.maintenanceOrder.id, 'rejected', 'mismatch')}
                  className="btn-success text-sm flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  予以通过
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex gap-6 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
              activeTab === 'duplicates' 
                ? 'bg-primary-800 text-white border-primary-800' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            重复索赔检测
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'duplicates' ? 'bg-white/20' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingDuplicates.length} 待处理
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('mismatches')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
              activeTab === 'mismatches' 
                ? 'bg-primary-800 text-white border-primary-800' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
            }`}
          >
            <FileX className="w-5 h-5" />
            批次错配核对
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'mismatches' ? 'bg-white/20' : 'bg-rose-100 text-rose-800'
            }`}>
              {pendingMismatches.length} 待处理
            </span>
          </button>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={activeTab === 'duplicates' ? runDuplicateDetection : runBatchMismatchCheck}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            重新检测
          </button>
          <button
            onClick={() => activeTab === 'duplicates' 
              ? exportDuplicateClaimsToExcel(duplicateGroups, auditTrails)
              : exportBatchMismatchesToExcel(batchMismatches)
            }
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>
      
      {activeTab === 'duplicates' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <p className="text-slate-500 text-sm">检测到重复索赔组</p>
              <p className="text-3xl font-bold text-amber-600 font-serif mt-1">{duplicateGroups.length}</p>
            </div>
            <div className="card">
              <p className="text-slate-500 text-sm">待处理</p>
              <p className="text-3xl font-bold text-rose-600 font-serif mt-1">{pendingDuplicates.length}</p>
            </div>
            <div className="card">
              <p className="text-slate-500 text-sm">已处理</p>
              <p className="text-3xl font-bold text-emerald-600 font-serif mt-1">{resolvedDuplicates.length}</p>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-serif font-semibold text-slate-800 mb-4">
              待处理重复索赔
            </h3>
            {pendingDuplicates.length > 0 ? (
              pendingDuplicates.map(renderDuplicateGroup)
            ) : (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-lg">所有重复索赔已处理完毕</p>
              </div>
            )}
            
            {resolvedDuplicates.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-serif font-semibold text-slate-800 mb-4">
                  已处理重复索赔
                </h3>
                {resolvedDuplicates.map(renderDuplicateGroup)}
              </div>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'mismatches' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <p className="text-slate-500 text-sm">检测到批次错配</p>
              <p className="text-3xl font-bold text-rose-600 font-serif mt-1">{batchMismatches.length}</p>
            </div>
            <div className="card">
              <p className="text-slate-500 text-sm">待处理</p>
              <p className="text-3xl font-bold text-amber-600 font-serif mt-1">{pendingMismatches.length}</p>
            </div>
            <div className="card">
              <p className="text-slate-500 text-sm">已处理</p>
              <p className="text-3xl font-bold text-emerald-600 font-serif mt-1">{resolvedMismatches.length}</p>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-serif font-semibold text-slate-800 mb-4">
              待处理批次错配
            </h3>
            {pendingMismatches.length > 0 ? (
              pendingMismatches.map(renderBatchMismatch)
            ) : (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-lg">所有批次错配已处理完毕</p>
              </div>
            )}
            
            {resolvedMismatches.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-serif font-semibold text-slate-800 mb-4">
                  已处理批次错配
                </h3>
                {resolvedMismatches.map(renderBatchMismatch)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
