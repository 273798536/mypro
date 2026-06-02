import { useState } from 'react';
import { useStore } from '../store/useStore';
import { FileText, Wrench, Table, Plus, X, Trash2 } from 'lucide-react';

type TabType = 'contract' | 'workOrder' | 'statement';

const DataEntry = () => {
  const [activeTab, setActiveTab] = useState<TabType>('contract');
  const { createContract, createWorkOrder, createStatement, contracts, loading } = useStore();

  const [contractForm, setContractForm] = useState({
    contractNo: '',
    instrumentNo: '',
    customerName: '',
    startDate: '',
    endDate: '',
    depositAmount: '',
    monthlyRent: '',
    actualDepositReceived: ''
  });

  const [workOrderForm, setWorkOrderForm] = useState({
    workOrderNo: '',
    contractId: '',
    instrumentNo: '',
    repairItems: [{ name: '', cost: '', isDisputed: false }],
    hasDispute: false,
    disputeNote: ''
  });

  const [statementForm, setStatementForm] = useState({
    period: '',
    contractNo: '',
    instrumentNo: '',
    rentAmount: '',
    repairCost: '',
    depositDeduction: '',
    actualReceived: ''
  });

  const tabs = [
    { id: 'contract', label: '租赁合同', icon: FileText },
    { id: 'workOrder', label: '维修工单', icon: Wrench },
    { id: 'statement', label: '对账表', icon: Table },
  ];

  const addRepairItem = () => {
    setWorkOrderForm({
      ...workOrderForm,
      repairItems: [...workOrderForm.repairItems, { name: '', cost: '', isDisputed: false }]
    });
  };

  const removeRepairItem = (index: number) => {
    if (workOrderForm.repairItems.length > 1) {
      const newItems = workOrderForm.repairItems.filter((_, i) => i !== index);
      const hasDispute = newItems.some(item => item.isDisputed);
      setWorkOrderForm({
        ...workOrderForm,
        repairItems: newItems,
        hasDispute
      });
    }
  };

  const updateRepairItem = (index: number, field: string, value: any) => {
    const newItems = [...workOrderForm.repairItems];
    (newItems[index] as any)[field] = value;
    const hasDispute = newItems.some(item => item.isDisputed);
    setWorkOrderForm({
      ...workOrderForm,
      repairItems: newItems,
      hasDispute
    });
  };

  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.contractNo || !contractForm.instrumentNo || !contractForm.customerName || !contractForm.startDate) {
      useStore.getState().showToast('error', '合同编号、乐器编号、客户名称、起租日期为必填项');
      return;
    }
    const data = {
      ...contractForm,
      depositAmount: parseFloat(contractForm.depositAmount) || 0,
      monthlyRent: parseFloat(contractForm.monthlyRent) || 0,
      actualDepositReceived: contractForm.actualDepositReceived ? parseFloat(contractForm.actualDepositReceived) : null,
      endDate: contractForm.endDate || null
    };
    const success = await createContract(data);
    if (success) {
      setContractForm({
        contractNo: '',
        instrumentNo: '',
        customerName: '',
        startDate: '',
        endDate: '',
        depositAmount: '',
        monthlyRent: '',
        actualDepositReceived: ''
      });
    }
  };

  const handleSubmitWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = workOrderForm.repairItems.filter(item => item.name && item.cost);
    if (!workOrderForm.workOrderNo || !workOrderForm.contractId || !workOrderForm.instrumentNo || validItems.length === 0) {
      useStore.getState().showToast('error', '工单编号、关联合同、乐器编号、至少一项维修项目为必填项');
      return;
    }
    const data = {
      ...workOrderForm,
      repairItems: validItems.map(item => ({
        name: item.name,
        cost: parseFloat(item.cost) || 0,
        isDisputed: item.isDisputed
      }))
    };
    const success = await createWorkOrder(data);
    if (success) {
      setWorkOrderForm({
        workOrderNo: '',
        contractId: '',
        instrumentNo: '',
        repairItems: [{ name: '', cost: '', isDisputed: false }],
        hasDispute: false,
        disputeNote: ''
      });
    }
  };

  const handleSubmitStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementForm.period || !statementForm.contractNo) {
      useStore.getState().showToast('error', '期间、合同号为必填项');
      return;
    }
    const data = {
      ...statementForm,
      rentAmount: parseFloat(statementForm.rentAmount) || 0,
      repairCost: parseFloat(statementForm.repairCost) || 0,
      depositDeduction: parseFloat(statementForm.depositDeduction) || 0,
      actualReceived: parseFloat(statementForm.actualReceived) || 0
    };
    const success = await createStatement(data);
    if (success) {
      setStatementForm({
        period: '',
        contractNo: '',
        instrumentNo: '',
        rentAmount: '',
        repairCost: '',
        depositDeduction: '',
        actualReceived: ''
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-primary-800 border-b-2 border-primary-800 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab.id as TabType)}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'contract' && (
            <form onSubmit={handleSubmitContract} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">合同编号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="如：HT202406001"
                    value={contractForm.contractNo}
                    onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">乐器编号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="如：YAMAHA-U1-001"
                    value={contractForm.instrumentNo}
                    onChange={(e) => setContractForm({ ...contractForm, instrumentNo: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">客户名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="请输入客户姓名"
                    value={contractForm.customerName}
                    onChange={(e) => setContractForm({ ...contractForm, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">起租日期 <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="input-field"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">预计退租日期</label>
                  <input
                    type="date"
                    className="input-field"
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">月租金 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={contractForm.monthlyRent}
                    onChange={(e) => setContractForm({ ...contractForm, monthlyRent: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">约定押金 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={contractForm.depositAmount}
                    onChange={(e) => setContractForm({ ...contractForm, depositAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">实际到账押金 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="未到账请留空"
                    value={contractForm.actualDepositReceived}
                    onChange={(e) => setContractForm({ ...contractForm, actualDepositReceived: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Plus className="inline w-4 h-4 mr-2" />
                  保存合同
                </button>
              </div>
            </form>
          )}

          {activeTab === 'workOrder' && (
            <form onSubmit={handleSubmitWorkOrder} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">工单编号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="如：WX202406001"
                    value={workOrderForm.workOrderNo}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, workOrderNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">关联合同 <span className="text-red-500">*</span></label>
                  <select
                    className="select-field"
                    value={workOrderForm.contractId}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, contractId: e.target.value })}
                  >
                    <option value="">请选择关联合同</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.contractNo} - {contract.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">维修乐器编号 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="请输入当前维修的乐器编号"
                  value={workOrderForm.instrumentNo}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, instrumentNo: e.target.value })}
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="form-label mb-0">维修项目 <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    className="text-primary-600 text-sm hover:text-primary-800"
                    onClick={addRepairItem}
                  >
                    <Plus className="inline w-4 h-4 mr-1" />
                    添加项目
                  </button>
                </div>
                <div className="space-y-3">
                  {workOrderForm.repairItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <input
                          type="text"
                          className="input-field"
                          placeholder="项目名称"
                          value={item.name}
                          onChange={(e) => updateRepairItem(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          className="input-field"
                          placeholder="费用"
                          value={item.cost}
                          onChange={(e) => updateRepairItem(index, 'cost', e.target.value)}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={item.isDisputed}
                          onChange={(e) => updateRepairItem(index, 'isDisputed', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        有争议
                      </label>
                      {workOrderForm.repairItems.length > 1 && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => removeRepairItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {workOrderForm.hasDispute && (
                <div>
                  <label className="form-label">争议备注 <span className="text-amber-600">*</span></label>
                  <textarea
                    className="input-field border-amber-300 focus:ring-amber-500 bg-amber-50"
                    rows={2}
                    placeholder="请具体说明争议点，涉及哪个项目、哪方有异议"
                    value={workOrderForm.disputeNote}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, disputeNote: e.target.value })}
                  />
                </div>
              )}

              <div className="pt-4">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Plus className="inline w-4 h-4 mr-2" />
                  保存工单
                </button>
              </div>
            </form>
          )}

          {activeTab === 'statement' && (
            <form onSubmit={handleSubmitStatement} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">对账期间 <span className="text-red-500">*</span></label>
                  <input
                    type="month"
                    className="input-field"
                    value={statementForm.period}
                    onChange={(e) => setStatementForm({ ...statementForm, period: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">合同号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="请输入合同编号"
                    value={statementForm.contractNo}
                    onChange={(e) => setStatementForm({ ...statementForm, contractNo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">乐器编号</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="请输入对账表上的乐器编号"
                  value={statementForm.instrumentNo}
                  onChange={(e) => setStatementForm({ ...statementForm, instrumentNo: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">本期租金 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={statementForm.rentAmount}
                    onChange={(e) => setStatementForm({ ...statementForm, rentAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">本期维修费 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={statementForm.repairCost}
                    onChange={(e) => setStatementForm({ ...statementForm, repairCost: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">押金扣除 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={statementForm.depositDeduction}
                    onChange={(e) => setStatementForm({ ...statementForm, depositDeduction: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">实际到账 (元)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={statementForm.actualReceived}
                    onChange={(e) => setStatementForm({ ...statementForm, actualReceived: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Plus className="inline w-4 h-4 mr-2" />
                  保存对账记录
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataEntry;
