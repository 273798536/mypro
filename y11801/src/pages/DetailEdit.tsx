import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { DetailForm } from '../components/DetailForm';
import { AuditHistoryList } from '../components/AuditHistoryList';
import { RecalculateModal } from '../components/RecalculateModal';
import { RollbackModal } from '../components/RollbackModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculationService, vehicleService, contractService, auditService } from '../services';
import type { VehicleRecord, LoanContract, ResidualTable, CalculationResult } from 'shared/types';
import { cn } from '@/lib/utils';

interface ModifiedFields {
  vehicle: Partial<VehicleRecord>;
  contract: Partial<LoanContract>;
  residual: Partial<ResidualTable>;
}

export default function DetailEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modifiedFields, setModifiedFields] = useState<ModifiedFields>({
    vehicle: {},
    contract: {},
    residual: {},
  });

  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  const { data: resultData, isLoading: resultLoading } = useQuery({
    queryKey: ['calculationResult', id],
    queryFn: () => calculationService.getResultById(id!),
    enabled: !!id,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['auditHistory', id],
    queryFn: () => auditService.getHistory(id!),
    enabled: !!id,
  });

  const result = resultData?.data as CalculationResult | undefined;
  const history = Array.isArray(historyData?.data) ? historyData.data : [];

  const updateVehicleMutation = useMutation({
    mutationFn: (data: Partial<VehicleRecord>) => vehicleService.update(result!.vehicleId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calculationResult', id] }),
  });

  const updateContractMutation = useMutation({
    mutationFn: (data: Partial<LoanContract>) => contractService.update(result!.contractId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calculationResult', id] }),
  });

  useEffect(() => {
    setModifiedFields({ vehicle: {}, contract: {}, residual: {} });
  }, [result?.id]);

  const handleVehicleChange = (field: keyof VehicleRecord, value: string) => {
    const numValue = ['storePrice', 'purchasePrice'].includes(field) ? parseFloat(value) : value;
    setModifiedFields((prev) => ({ ...prev, vehicle: { ...prev.vehicle, [field]: numValue } }));
  };

  const handleContractChange = (field: keyof LoanContract, value: string) => {
    const numValue = ['remainingPrincipal', 'remainingInterest', 'subsidyAmount', 'clawbackAmount'].includes(field)
      ? parseFloat(value)
      : value;
    setModifiedFields((prev) => ({ ...prev, contract: { ...prev.contract, [field]: numValue } }));
  };

  const handleResidualChange = (field: keyof ResidualTable, value: string) => {
    const numValue = ['residualValue'].includes(field) ? parseFloat(value) : value;
    setModifiedFields((prev) => ({ ...prev, residual: { ...prev.residual, [field]: numValue } }));
  };

  const handleSave = () => {
    if (Object.keys(modifiedFields.vehicle).length > 0 && result) {
      updateVehicleMutation.mutate(modifiedFields.vehicle);
    }
    if (Object.keys(modifiedFields.contract).length > 0 && result) {
      updateContractMutation.mutate(modifiedFields.contract);
    }
  };

  const hasChanges =
    Object.keys(modifiedFields.vehicle).length > 0 ||
    Object.keys(modifiedFields.contract).length > 0 ||
    Object.keys(modifiedFields.residual).length > 0;

  const isSaving = updateVehicleMutation.isPending || updateContractMutation.isPending;

  if (resultLoading || !result) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-600">正在加载详情...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">详情编辑页</h1>
            <p className="text-blue-200 text-sm">
              {result.vehicle.brand} {result.vehicle.model} · {result.vehicle.plateNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DetailForm
              result={result}
              modifiedFields={modifiedFields}
              onVehicleChange={handleVehicleChange}
              onContractChange={handleContractChange}
              onResidualChange={handleResidualChange}
            />
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">变更历史</h3>
              <AuditHistoryList history={history} isLoading={historyLoading} />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-1 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                有未保存的修改
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRecalculateModal(true)}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-red-600 border-2 border-red-600 rounded hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              余额重算
            </button>
            <button
              onClick={() => setShowRollbackModal(true)}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-amber-500 border-2 border-amber-500 rounded hover:bg-amber-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              补贴回滚
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={cn(
                'flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-900 border-2 border-blue-900 rounded transition-colors',
                (!hasChanges || isSaving) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800'
              )}
            >
              <Save className="h-4 w-4" />
              保存修改
            </button>
          </div>
        </div>
      </div>

      <RecalculateModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
        recordId={id!}
      />
      <RollbackModal
        isOpen={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
        contractId={result.contractId}
      />
    </div>
  );
}
