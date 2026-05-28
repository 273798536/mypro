import { Car, FileText, BarChart3, Wallet } from 'lucide-react';
import { CollapsiblePanel } from './CollapsiblePanel';
import { EditableField } from './EditableField';
import type { CalculationResult, VehicleRecord, LoanContract, ResidualTable } from 'shared/types';
import { SUBSIDY_TYPE_LABELS } from 'shared/constants';

interface ModifiedFields {
  vehicle: Partial<VehicleRecord>;
  contract: Partial<LoanContract>;
  residual: Partial<ResidualTable>;
}

interface DetailFormProps {
  result: CalculationResult;
  modifiedFields: ModifiedFields;
  onVehicleChange: (field: keyof VehicleRecord, value: string) => void;
  onContractChange: (field: keyof LoanContract, value: string) => void;
  onResidualChange: (field: keyof ResidualTable, value: string) => void;
}

export function DetailForm({
  result,
  modifiedFields,
  onVehicleChange,
  onContractChange,
  onResidualChange,
}: DetailFormProps) {
  return (
    <div className="space-y-4">
      <CollapsiblePanel title="车辆档案信息" icon={<Car className="h-5 w-5" />}>
        <div className="grid grid-cols-2 gap-4">
          <EditableField
            label="车辆品牌"
            value={result.vehicle.brand}
            onChange={(v) => onVehicleChange('brand', v)}
            isModified={!!modifiedFields.vehicle.brand}
          />
          <EditableField
            label="车辆型号"
            value={result.vehicle.model}
            onChange={(v) => onVehicleChange('model', v)}
            isModified={!!modifiedFields.vehicle.model}
          />
          <EditableField
            label="车牌号"
            value={result.vehicle.plateNumber}
            onChange={(v) => onVehicleChange('plateNumber', v)}
            isModified={!!modifiedFields.vehicle.plateNumber}
          />
          <EditableField
            label="VIN码"
            value={result.vehicle.vin}
            onChange={(v) => onVehicleChange('vin', v)}
            isModified={!!modifiedFields.vehicle.vin}
          />
          <EditableField
            label="门店收车价"
            value={result.vehicle.storePrice}
            onChange={(v) => onVehicleChange('storePrice', v)}
            isModified={!!modifiedFields.vehicle.storePrice}
            type="number"
            unit="元"
          />
          <EditableField
            label="采购价"
            value={result.vehicle.purchasePrice}
            onChange={(v) => onVehicleChange('purchasePrice', v)}
            isModified={!!modifiedFields.vehicle.purchasePrice}
            type="number"
            unit="元"
          />
          <div className="col-span-2">
            <div className="text-sm font-medium text-slate-600 mb-1">门店</div>
            <div className="text-sm text-slate-800">{result.vehicle.storeName}</div>
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="贷款合同信息" icon={<FileText className="h-5 w-5" />}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">合同编号</div>
            <div className="text-sm text-slate-800 font-mono">{result.contract.contractNo}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">客户姓名</div>
            <div className="text-sm text-slate-800">{result.contract.customerName}</div>
          </div>
          <EditableField
            label="剩余本金"
            value={result.contract.remainingPrincipal}
            onChange={(v) => onContractChange('remainingPrincipal', v)}
            isModified={!!modifiedFields.contract.remainingPrincipal}
            type="number"
            unit="元"
          />
          <EditableField
            label="剩余利息"
            value={result.contract.remainingInterest}
            onChange={(v) => onContractChange('remainingInterest', v)}
            isModified={!!modifiedFields.contract.remainingInterest}
            type="number"
            unit="元"
          />
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">贷款期限</div>
            <div className="text-sm text-slate-800">{result.contract.loanTerm} 期</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">月供</div>
            <div className="text-sm text-slate-800 font-mono">¥{result.contract.monthlyPayment.toLocaleString()}</div>
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="残值评估信息" icon={<BarChart3 className="h-5 w-5" />}>
        {result.residual ? (
          <div className="grid grid-cols-2 gap-4">
            <EditableField
              label="残值评估值"
              value={result.residual.residualValue}
              onChange={(v) => onResidualChange('residualValue', v)}
              isModified={!!modifiedFields.residual?.residualValue}
              type="number"
              unit="元"
            />
            <div>
              <div className="text-sm font-medium text-slate-600 mb-1">评估机构</div>
              <div className="text-sm text-slate-800">{result.residual.valuationCompany}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 mb-1">评估日期</div>
              <div className="text-sm text-slate-800">{result.residual.residualDate}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 mb-1">有效期至</div>
              <div className="text-sm text-slate-800">{result.residual.expiryDate}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p>暂无残值评估数据</p>
          </div>
        )}
      </CollapsiblePanel>

      <CollapsiblePanel title="补贴信息" icon={<Wallet className="h-5 w-5" />}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">补贴类型</div>
            <div className="text-sm text-slate-800">
              {SUBSIDY_TYPE_LABELS[result.contract.subsidyType] || result.contract.subsidyType}
            </div>
          </div>
          <EditableField
            label="补贴金额"
            value={result.contract.subsidyAmount}
            onChange={(v) => onContractChange('subsidyAmount', v)}
            isModified={!!modifiedFields.contract.subsidyAmount}
            type="number"
            unit="元"
          />
          <div>
            <div className="text-sm font-medium text-slate-600 mb-1">是否需追回</div>
            <div className={cn(
              'text-sm font-medium',
              result.contract.subsidyClawbackRequired ? 'text-red-600' : 'text-green-600'
            )}>
              {result.contract.subsidyClawbackRequired ? '是' : '否'}
            </div>
          </div>
          {result.contract.subsidyClawbackRequired && (
            <EditableField
              label="追回金额"
              value={result.contract.clawbackAmount || 0}
              onChange={(v) => onContractChange('clawbackAmount', v)}
              isModified={!!modifiedFields.contract.clawbackAmount}
              type="number"
              unit="元"
            />
          )}
        </div>
      </CollapsiblePanel>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
