import React, { useState } from 'react';
import { useCollectionStore } from '../store/collectionStore';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  getStatusLabel,
  getStatusColor,
  getRecordTypeLabel,
  getRecordTypeColor,
  getVerificationResultLabel,
} from '../utils/format';
import type { CollectionRecord, Milestone, LicenseContract } from '../types';

interface DetailModalProps {
  record: CollectionRecord;
  onClose: () => void;
}

type TabType = 'overview' | 'contract' | 'milestone' | 'invoices' | 'supplements' | 'verification' | 'history' | 'evidence';

export const DetailModal: React.FC<DetailModalProps> = ({ record, onClose }) => {
  const { updateContract, updateMilestone, changeLogs } = useCollectionStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<LicenseContract | Milestone>>({});

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'contract', label: '许可合同' },
    { key: 'milestone', label: '里程碑' },
    { key: 'invoices', label: '开票记录' },
    { key: 'supplements', label: '销售补报' },
    { key: 'verification', label: '核验记录' },
    { key: 'history', label: '变更历史' },
    { key: 'evidence', label: '证据文件' },
  ];

  const recordChangeLogs = changeLogs.filter(
    (log) =>
      log.recordId === record.contractId ||
      log.recordId === record.milestoneId ||
      record.invoices.some((inv) => inv.id === log.recordId)
  );

  const handleEditContract = () => {
    setEditFormData({ ...record.contract });
    setIsEditingContract(true);
  };

  const handleSaveContract = () => {
    const reason = prompt('请输入变更原因：');
    if (reason) {
      updateContract(
        record.contractId,
        editFormData as Partial<LicenseContract>,
        '当前用户',
        reason
      );
      setIsEditingContract(false);
    }
  };

  const handleEditMilestone = () => {
    const { evidenceFiles, ...editableFields } = record.milestone;
    setEditFormData({ ...editableFields });
    setIsEditingMilestone(true);
  };

  const handleSaveMilestone = () => {
    const reason = prompt('请输入变更原因：');
    if (reason) {
      updateMilestone(
        record.milestoneId,
        editFormData as Partial<Milestone>,
        '当前用户',
        reason
      );
      setIsEditingMilestone(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">计划金额</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(record.plannedAmount)}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">实际金额</div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(record.actualAmount)}
          </div>
        </div>
        <div
          className={`rounded-lg p-4 ${record.difference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}
        >
          <div
            className={`text-sm mb-1 ${record.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            差异金额
          </div>
          <div
            className={`text-2xl font-bold ${record.difference >= 0 ? 'text-green-900' : 'text-red-900'}`}
          >
            {record.difference > 0 ? '+' : ''}
            {formatCurrency(record.difference)}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">状态</div>
          <div className="flex gap-2 mt-2">
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getRecordTypeColor(record.recordType)}`}
            >
              {getRecordTypeLabel(record.recordType)}
            </span>
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(record.status)}`}
            >
              {getStatusLabel(record.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">特殊标记</h4>
        <div className="flex flex-wrap gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${record.hasEvidenceMissing ? 'bg-orange-100' : 'bg-gray-100'}`}
          >
            <span
              className={`w-3 h-3 rounded-full ${record.hasEvidenceMissing ? 'bg-orange-500' : 'bg-gray-400'}`}
            />
            <span
              className={record.hasEvidenceMissing ? 'text-orange-800' : 'text-gray-500'}
            >
              证据缺失
            </span>
            {record.hasEvidenceMissing && (
              <span className="text-xs text-orange-600">
                ({record.missingEvidenceTypes.join(', ')})
              </span>
            )}
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${record.hasSalesSupplement ? 'bg-purple-100' : 'bg-gray-100'}`}
          >
            <span
              className={`w-3 h-3 rounded-full ${record.hasSalesSupplement ? 'bg-purple-500' : 'bg-gray-400'}`}
            />
            <span
              className={record.hasSalesSupplement ? 'text-purple-800' : 'text-gray-500'}
            >
              销售补报
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${record.hasInvoiceReversed ? 'bg-gray-200' : 'bg-gray-100'}`}
          >
            <span
              className={`w-3 h-3 rounded-full ${record.hasInvoiceReversed ? 'bg-gray-600' : 'bg-gray-400'}`}
            />
            <span
              className={record.hasInvoiceReversed ? 'text-gray-800' : 'text-gray-500'}
            >
              开票冲红
            </span>
          </div>
        </div>
      </div>

      {record.differenceReason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">差异说明</h4>
          <p className="text-yellow-700">{record.differenceReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">开票信息</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">发票数量</span>
              <span className="font-medium">{record.invoices.length} 张</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">已冲红</span>
              <span className="font-medium text-gray-500">
                {record.invoices.filter((i) => i.status === 'reversed').length} 张
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">核验信息</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">核验次数</span>
              <span className="font-medium">
                {record.verificationRecords.length} 次
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最近核验人</span>
              <span className="font-medium">
                {record.milestone.verifiedBy || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContract = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">许可合同详情</h3>
        {!isEditingContract ? (
          <button
            onClick={handleEditContract}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            编辑合同
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSaveContract}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              保存
            </button>
            <button
              onClick={() => setIsEditingContract(false)}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: '合同编号', key: 'contractNo' },
            { label: '合同名称', key: 'contractName' },
            { label: '被许可方', key: 'licensee' },
            { label: '许可方', key: 'licensor' },
            { label: '合同签订日期', key: 'contractDate' },
            { label: '生效日期', key: 'effectiveDate' },
            { label: '到期日期', key: 'expirationDate' },
            { label: '合同总金额', key: 'totalAmount', isCurrency: true },
          ].map((item) => (
            <div key={item.key}>
              <div className="text-sm text-gray-600 mb-1">{item.label}</div>
              {isEditingContract ? (
                <input
                  type="text"
                  value={
                    (editFormData as Partial<LicenseContract>)[
                      item.key as keyof LicenseContract
                    ] || ''
                  }
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      [item.key]: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <div className="font-medium text-gray-900">
                  {item.isCurrency
                    ? formatCurrency(
                        (record.contract[
                          item.key as keyof LicenseContract
                        ] as number) || 0
                      )
                    : (record.contract[
                        item.key as keyof LicenseContract
                      ] as string) || '-'}
                </div>
              )}
            </div>
          ))}
          <div>
            <div className="text-sm text-gray-600 mb-1">专利号</div>
            <div className="font-medium text-gray-900">
              {record.contract.patentNos.join(', ')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">付款条款</div>
            <div className="font-medium text-gray-900">
              {record.contract.paymentTerms}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMilestone = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">里程碑详情</h3>
        {!isEditingMilestone ? (
          <button
            onClick={handleEditMilestone}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            编辑里程碑
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSaveMilestone}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              保存
            </button>
            <button
              onClick={() => setIsEditingMilestone(false)}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: '里程碑编号', key: 'milestoneNo' },
            { label: '描述', key: 'description' },
            { label: '计划到期日', key: 'dueDate' },
            { label: '实际完成日', key: 'completionDate' },
            { label: '里程碑金额', key: 'amount', isCurrency: true },
          ].map((item) => (
            <div key={item.key}>
              <div className="text-sm text-gray-600 mb-1">{item.label}</div>
              {isEditingMilestone ? (
                <input
                  type="text"
                  value={String(
                    (editFormData as Record<string, unknown>)[item.key] || ''
                  )}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      [item.key]: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <div className="font-medium text-gray-900">
                  {item.isCurrency
                    ? formatCurrency(
                        (record.milestone[
                          item.key as keyof Milestone
                        ] as number) || 0
                      )
                    : (record.milestone[
                        item.key as keyof Milestone
                      ] as string) || '-'}
                </div>
              )}
            </div>
          ))}
          <div>
            <div className="text-sm text-gray-600 mb-1">状态</div>
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(record.milestone.status)}`}
            >
              {getStatusLabel(record.milestone.status)}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">核验结果</div>
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${record.milestone.verificationResult === 'pass' ? 'bg-green-100 text-green-800' : record.milestone.verificationResult === 'fail' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}
            >
              {getVerificationResultLabel(
                record.milestone.verificationResult || 'pending'
              )}
            </span>
          </div>
        </div>

        {record.milestone.verificationRemark && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-1">核验备注</div>
            <div className="font-medium text-gray-900">
              {record.milestone.verificationRemark}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">开票记录</h3>
      {record.invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无开票记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  发票号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  开票日期
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  金额
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  税额
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  价税合计
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  开票人
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {record.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {invoice.invoiceNo}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatCurrency(invoice.taxAmount)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}
                    >
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {invoice.issuedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {record.invoices.some((i) => i.status === 'reversed') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">冲红记录</h4>
          {record.invoices
            .filter((i) => i.status === 'reversed')
            .map((invoice) => (
              <div key={invoice.id} className="text-sm text-red-700">
                <div>
                  <span className="font-medium">发票号：</span>
                  {invoice.invoiceNo}
                </div>
                <div>
                  <span className="font-medium">冲红原因：</span>
                  {invoice.reverseReason}
                </div>
                <div>
                  <span className="font-medium">冲红时间：</span>
                  {formatDateTime(invoice.reversedAt || '')}
                </div>
                <div>
                  <span className="font-medium">操作人：</span>
                  {invoice.reversedBy}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderSupplements = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">销售补报记录</h3>
      {record.supplements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无销售补报记录</div>
      ) : (
        <div className="space-y-4">
          {record.supplements.map((supplement) => (
            <div
              key={supplement.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">补报日期</div>
                  <div className="font-medium">
                    {formatDate(supplement.reportDate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">补报人</div>
                  <div className="font-medium">{supplement.reportedBy}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">所属部门</div>
                  <div className="font-medium">{supplement.department}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">审批状态</div>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(supplement.approvalStatus)}`}
                  >
                    {getStatusLabel(supplement.approvalStatus)}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">原金额</div>
                  <div className="font-medium">
                    {formatCurrency(supplement.originalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">补报金额</div>
                  <div className="font-medium text-blue-600">
                    {formatCurrency(supplement.supplementaryAmount)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">补报原因</div>
                <div className="font-medium">{supplement.supplementReason}</div>
              </div>
              {supplement.approvalRemark && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">审批备注</div>
                  <div className="font-medium">{supplement.approvalRemark}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    审批人：{supplement.approver}，审批时间：
                    {formatDateTime(supplement.approvedAt || '')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">核验记录</h3>
      {record.verificationRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无核验记录</div>
      ) : (
        <div className="space-y-4">
          {record.verificationRecords.map((verification, index) => (
            <div
              key={verification.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-medium text-gray-900">
                    核验 #{index + 1}
                  </div>
                  <div className="text-sm text-gray-500">
                    核验人：{verification.verifier}
                  </div>
                  <div className="text-sm text-gray-500">
                    核验时间：{formatDateTime(verification.verificationDate)}
                  </div>
                </div>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${verification.result === 'pass' ? 'bg-green-100 text-green-800' : verification.result === 'fail' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}
                >
                  {getVerificationResultLabel(verification.result)}
                </span>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">核验备注</div>
                <div className="font-medium text-gray-900">
                  {verification.remark}
                </div>
              </div>

              {verification.evidenceChecked.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">已检查证据</div>
                  <div className="flex flex-wrap gap-2">
                    {verification.evidenceChecked.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {verification.discrepancies.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">差异项</div>
                  <div className="space-y-2">
                    {verification.discrepancies.map((discrepancy) => (
                      <div
                        key={discrepancy.id}
                        className={`p-3 rounded-lg ${discrepancy.resolution ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                      >
                        <div className="font-medium text-gray-900">
                          {discrepancy.description}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          字段：{discrepancy.field} | 预期：
                          {discrepancy.expected} | 实际：{discrepancy.actual}
                        </div>
                        {discrepancy.resolution && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="text-sm font-medium text-green-800">
                              解决方案：{discrepancy.resolution}
                            </div>
                            <div className="text-xs text-green-600">
                              处理人：{discrepancy.resolvedBy} | 处理时间：
                              {formatDateTime(discrepancy.resolvedAt || '')}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">变更历史</h3>
      {recordChangeLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无变更记录</div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {recordChangeLogs
              .sort(
                (a, b) =>
                  new Date(b.changedAt).getTime() -
                  new Date(a.changedAt).getTime()
              )
              .map((log) => (
                <div key={log.id} className="relative pl-10">
                  <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow" />
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-800 mr-2">
                          {log.recordType === 'contract'
                            ? '合同'
                            : log.recordType === 'milestone'
                            ? '里程碑'
                            : log.recordType === 'invoice'
                            ? '发票'
                            : '补报'}
                        </span>
                        <span className="font-medium text-gray-900">
                          {log.fieldName}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(log.changedAt)}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-red-600 line-through">
                        {log.oldValue || '(空)'}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-green-600 font-medium">
                        {log.newValue || '(空)'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">变更原因：</span>
                      {log.changeReason}
                    </div>
                    <div className="text-sm text-gray-500">
                      操作人：{log.changedBy}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderEvidence = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">证据文件</h3>
      {record.milestone.evidenceFiles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无上传的证据文件</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {record.milestone.evidenceFiles.map((file) => (
            <div
              key={file.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {file.fileName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(file.fileSize)} · 上传于{' '}
                    {formatDate(file.uploadDate)}
                  </div>
                  <div className="text-sm text-gray-500">
                    上传人：{file.uploadedBy}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {file.evidenceType === 'milestone_proof'
                        ? '里程碑证明'
                        : file.evidenceType === 'contract_attachment'
                        ? '合同附件'
                        : file.evidenceType === 'email'
                        ? '邮件'
                        : '其他'}
                    </span>
                  </div>
                  {file.description && (
                    <div className="mt-2 text-sm text-gray-600">
                      {file.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {record.contract.contractNo} - {record.milestone.milestoneNo}
            </h2>
            <p className="text-sm text-gray-500">
              {record.contract.contractName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'contract' && renderContract()}
          {activeTab === 'milestone' && renderMilestone()}
          {activeTab === 'invoices' && renderInvoices()}
          {activeTab === 'supplements' && renderSupplements()}
          {activeTab === 'verification' && renderVerification()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'evidence' && renderEvidence()}
        </div>
      </div>
    </div>
  );
};
