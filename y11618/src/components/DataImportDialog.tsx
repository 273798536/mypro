import { useState, useCallback } from 'react';
import type {
  Contract,
  Invoice,
  Receipt,
  RuleVersion,
  PaymentRecord,
  Override,
} from '../types';
import {
  parseContracts,
  parseInvoices,
  parseReceipts,
  parseRuleVersions,
  parsePayments,
  parseOverrides,
  type ParseError,
  type ParseWarning,
} from '../engine/parser';

interface Props {
  onDataLoaded: (data: {
    contracts: Contract[];
    invoices: Invoice[];
    receipts: Receipt[];
    ruleVersions: RuleVersion[];
    payments: PaymentRecord[];
    overrides: Override[];
  }) => void;
  onClose: () => void;
}

interface ImportState {
  contracts: Contract[];
  invoices: Invoice[];
  receipts: Receipt[];
  ruleVersions: RuleVersion[];
  payments: PaymentRecord[];
  overrides: Override[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

export function DataImportDialog({ onDataLoaded, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [imported, setImported] = useState<ImportState>({
    contracts: [],
    invoices: [],
    receipts: [],
    ruleVersions: [],
    payments: [],
    overrides: [],
    errors: [],
    warnings: [],
  });

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const promises: Promise<void>[] = [];
      const state: ImportState = {
        contracts: [],
        invoices: [],
        receipts: [],
        ruleVersions: [],
        payments: [],
        overrides: [],
        errors: [],
        warnings: [],
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = file.name.toLowerCase();

        promises.push(
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const content = event.target?.result as string;

              if (name.includes('contract') || name.includes('合同')) {
                const result = parseContracts(content);
                state.contracts.push(...result.data);
                state.errors.push(...result.errors);
                state.warnings.push(...result.warnings);
              } else if (name.includes('invoice') || name.includes('发票')) {
                const result = parseInvoices(content);
                state.invoices.push(...result.data);
                state.errors.push(...result.errors);
                state.warnings.push(...result.warnings);
              } else if (name.includes('receipt') || name.includes('入库')) {
                const result = parseReceipts(content);
                state.receipts.push(...result.data);
                state.errors.push(...result.errors);
                state.warnings.push(...result.warnings);
              } else if (name.includes('rule') || name.includes('规则')) {
                const result = parseRuleVersions(content);
                state.ruleVersions.push(...result.data);
                state.errors.push(...result.errors);
                state.warnings.push(...result.warnings);
              } else if (name.includes('payment') || name.includes('付款')) {
                const result = parsePayments(content);
                state.payments.push(...result.data);
                state.errors.push(...result.errors);
                state.warnings.push(...result.warnings);
              } else if (name.includes('override') || name.includes('改判')) {
                const result = parseOverrides(content);
                state.overrides.push(...result.data);
                state.errors.push(...result.errors);
                state.warnings.push(...result.warnings);
              } else {
                state.warnings.push({
                  lineNumber: 0,
                  message: `未识别的文件: ${file.name}，已跳过`,
                  source: 'contract',
                });
              }
              resolve();
            };
            reader.readAsText(file);
          }),
        );
      }

      Promise.all(promises).then(() => {
        setImported(state);
        if (
          state.contracts.length > 0 ||
          state.invoices.length > 0
        ) {
          setStep('review');
        }
      });
    },
    [],
  );

  const handleConfirm = () => {
    onDataLoaded({
      contracts: imported.contracts,
      invoices: imported.invoices,
      receipts: imported.receipts,
      ruleVersions: imported.ruleVersions,
      payments: imported.payments,
      overrides: imported.overrides,
    });
    onClose();
  };

  const handleReset = () => {
    setStep('upload');
    setImported({
      contracts: [],
      invoices: [],
      receipts: [],
      ruleVersions: [],
      payments: [],
      overrides: [],
      errors: [],
      warnings: [],
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>数据导入</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 'upload' ? (
          <div className="upload-area">
            <div className="upload-icon">📁</div>
            <p>拖拽文件到此处或点击选择</p>
            <p className="upload-hint">
              支持 CSV 文件，文件名包含：合同/发票/入库单/规则版本/付款清单/改判记录
            </p>
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload" className="btn btn-primary">
              选择文件
            </label>
          </div>
        ) : (
          <div className="import-review">
            <h4>导入预览</h4>
            <div className="import-stats">
              <div className="stat-item">
            <span className="stat-value">{imported.contracts.length}</span>
            <span className="stat-label">合同</span>
              </div>
              <div className="stat-item">
            <span className="stat-value">{imported.invoices.length}</span>
            <span className="stat-label">发票</span>
              </div>
              <div className="stat-item">
            <span className="stat-value">{imported.receipts.length}</span>
            <span className="stat-label">入库单</span>
              </div>
              <div className="stat-item">
            <span className="stat-value">{imported.ruleVersions.length}</span>
            <span className="stat-label">规则版本</span>
              </div>
              <div className="stat-item">
            <span className="stat-value">{imported.payments.length}</span>
            <span className="stat-label">付款记录</span>
              </div>
              <div className="stat-item">
            <span className="stat-value">{imported.overrides.length}</span>
            <span className="stat-label">改判记录</span>
              </div>
            </div>

            {imported.errors.length > 0 && (
              <div className="import-errors">
                <h5>解析错误 ({imported.errors.length})</h5>
                <ul>
                  {imported.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>
                      <span className="error-src">
                        [{err.source}#{err.lineNumber}]
                      </span>
                      {err.message}
                    </li>
                  ))}
                  {imported.errors.length > 10 && (
                    <li>... 还有 {imported.errors.length - 10} 条错误</li>
                  )}
                </ul>
              </div>
            )}

            {imported.warnings.length > 0 && (
              <div className="import-warnings">
                <h5>警告 ({imported.warnings.length})</h5>
                <ul>
                  {imported.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>
                      <span className="warn-src">
                        [{w.source}#{w.lineNumber}]
                      </span>
                      {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleReset}>
            重新选择
          </button>
          {step === 'review' && (
            <button className="btn btn-primary" onClick={handleConfirm}>
              确认导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
