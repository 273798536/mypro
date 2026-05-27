import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Play,
  FileSpreadsheet,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import { useSplitStore } from '@/store/useSplitStore';
import {
  parseExcelFile,
  parsePaymentData,
  parseInvoiceData,
  parseSellerData,
  parseContractData,
  parseFeeData,
} from '@/utils/excelHandler';
import { batchProcessPayments } from '@/utils/splitEngine';
import {
  samplePayments,
  sampleInvoices,
  sampleSellers,
  sampleContracts,
  sampleFees,
} from '@/mock/sampleData';
import type {
  DataSourceType,
  PaymentReceipt,
  Invoice,
  SellerAccount,
  FactoringContract,
  FeeConfig,
} from '@/types';

interface PreviewData {
  type: DataSourceType;
  data: unknown[];
  errors: { row: number; message: string }[];
}

export default function ImportPage() {
  const navigate = useNavigate();
  const {
    setImportedData,
    setSplits,
    setExceptions,
    clearAllData,
  } = useSplitStore();

  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedData, setLocalImportedData] = useState<{
    payments: PaymentReceipt[];
    invoices: Invoice[];
    sellers: SellerAccount[];
    contracts: FactoringContract[];
    fees: FeeConfig[];
  }>({
    payments: [],
    invoices: [],
    sellers: [],
    contracts: [],
    fees: [],
  });

  const handleFileUpload = async (file: File, type: DataSourceType) => {
    try {
      const sheets = await parseExcelFile(file);
      const sheetData = sheets[0] || [];

      let result: {
        valid: unknown[];
        errors: { row: number; message: string }[];
      } = { valid: [], errors: [] };

      switch (type) {
        case 'payment':
          result = parsePaymentData(sheetData);
          setLocalImportedData((prev) => ({
            ...prev,
            payments: result.valid as PaymentReceipt[],
          }));
          break;
        case 'invoice':
          result = parseInvoiceData(sheetData);
          setLocalImportedData((prev) => ({
            ...prev,
            invoices: result.valid as Invoice[],
          }));
          break;
        case 'seller':
          result = parseSellerData(sheetData);
          setLocalImportedData((prev) => ({
            ...prev,
            sellers: result.valid as SellerAccount[],
          }));
          break;
        case 'contract':
          result = parseContractData(sheetData);
          setLocalImportedData((prev) => ({
            ...prev,
            contracts: result.valid as FactoringContract[],
          }));
          break;
        case 'fee':
          result = parseFeeData(sheetData);
          setLocalImportedData((prev) => ({
            ...prev,
            fees: result.valid as FeeConfig[],
          }));
          break;
      }

      setPreviews((prev) => [
        ...prev.filter((p) => p.type !== type),
        { type, data: result.valid, errors: result.errors },
      ]);
    } catch (error) {
      console.error('文件解析失败:', error);
    }
  };

  const handleLoadSampleData = () => {
    setLocalImportedData({
      payments: samplePayments,
      invoices: sampleInvoices,
      sellers: sampleSellers,
      contracts: sampleContracts,
      fees: sampleFees,
    });

    setPreviews([
      { type: 'payment', data: samplePayments, errors: [] },
      { type: 'invoice', data: sampleInvoices, errors: [] },
      { type: 'seller', data: sampleSellers, errors: [] },
      { type: 'contract', data: sampleContracts, errors: [] },
      { type: 'fee', data: sampleFees, errors: [] },
    ]);
  };

  const handleProcessData = async () => {
    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      setImportedData(importedData);

      const result = batchProcessPayments(importedData.payments, {
        invoices: importedData.invoices,
        contracts: importedData.contracts,
        fees: importedData.fees,
      });

      setSplits(result.allSplits);
      setExceptions(result.allExceptions);

      navigate('/workspace');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasData =
    importedData.payments.length > 0 &&
    importedData.invoices.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  保理回款拆分系统
                </h1>
                <p className="text-sm text-slate-500">数据导入与校验</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">步骤 1/3</span>
              <div className="flex gap-1">
                <div className="w-8 h-2 rounded-full bg-slate-700" />
                <div className="w-8 h-2 rounded-full bg-slate-200" />
                <div className="w-8 h-2 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-slate-500" />
                  导入业务数据
                </h2>
                <button
                  onClick={handleLoadSampleData}
                  className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  加载样例数据
                </button>
              </div>

              <FileUpload onFileUpload={handleFileUpload} />
            </div>

            {previews.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800">
                  数据预览
                </h3>
                {previews.map((preview) => (
                  <div
                    key={preview.type}
                    className="bg-white rounded-xl border border-slate-200 p-6"
                  >
                    <DataPreview
                      type={preview.type}
                      data={preview.data as Record<string, unknown>[]}
                      errors={preview.errors}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">导入状态</h3>
              <div className="space-y-3">
                {[
                  { type: 'payment', label: '回款流水', data: importedData.payments },
                  { type: 'invoice', label: '发票池', data: importedData.invoices },
                  { type: 'seller', label: '卖方账号', data: importedData.sellers },
                  { type: 'contract', label: '保理合同', data: importedData.contracts },
                  { type: 'fee', label: '手续费配置', data: importedData.fees },
                ].map((item) => {
                  const count = (item.data as unknown[]).length;
                  const isImported = count > 0;
                  return (
                    <div
                      key={item.type}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span
                        className={`text-sm font-medium ${isImported ? 'text-green-600' : 'text-slate-400'}`}
                      >
                        {isImported ? `${count} 条` : '未导入'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="font-medium text-amber-800 mb-2">导入说明</h4>
              <ul className="text-sm text-amber-700 space-y-1.5">
                <li>• 必填：回款流水、发票池</li>
                <li>• 可选：卖方账号、保理合同、手续费</li>
                <li>• 支持 Excel (.xlsx/.xls) 和 CSV 格式</li>
                <li>• 系统自动识别文件类型和数据字段</li>
              </ul>
            </div>

            <button
              onClick={handleProcessData}
              disabled={!hasData || isProcessing}
              className={`w-full py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${hasData && !isProcessing ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  正在处理...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  开始拆分计算
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>

            {!hasData && previews.length === 0 && (
              <p className="text-center text-sm text-slate-400">
                请先导入回款流水和发票池数据
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
