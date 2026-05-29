import { useState } from 'react';
import { X, Upload, FileJson, AlertTriangle, CheckCircle, Info, Wrench } from 'lucide-react';
import { Order, Chef, MenuItem } from '../types/game';
import {
  validateOrders,
  validateChefs,
  validateMenu,
  autoFixOrders,
  autoFixChefs,
  autoFixMenu,
  ValidationResult,
} from '../utils/dataValidator';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (orders: Order[], chefs: Chef[], menu: MenuItem[]) => void;
}

type TabType = 'orders' | 'chefs' | 'menu';

export function DataImportModal({ isOpen, onClose, onImport }: DataImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [ordersData, setOrdersData] = useState<string>('');
  const [chefsData, setChefsData] = useState<string>('');
  const [menuData, setMenuData] = useState<string>('');
  const [ordersValidation, setOrdersValidation] = useState<ValidationResult | null>(null);
  const [chefsValidation, setChefsValidation] = useState<ValidationResult | null>(null);
  const [menuValidation, setMenuValidation] = useState<ValidationResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (data: string) => void,
    validator: (data: any) => ValidationResult,
    setValidation: (result: ValidationResult) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          setter(content);
          try {
            const data = JSON.parse(content);
            const result = validator(Array.isArray(data) ? data : [data]);
            setValidation(result);
          } catch {
            setImportError('JSON 格式错误，请检查文件格式');
          }
        } catch {
          setImportError('文件读取失败');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleValidate = () => {
    setImportError(null);
    try {
      if (ordersData) {
        const data = JSON.parse(ordersData);
        const result = validateOrders(Array.isArray(data) ? data : [data]);
        setOrdersValidation(result);
      }
      if (chefsData) {
        const data = JSON.parse(chefsData);
        const result = validateChefs(Array.isArray(data) ? data : [data]);
        setChefsValidation(result);
      }
      if (menuData) {
        const data = JSON.parse(menuData);
        const result = validateMenu(Array.isArray(data) ? data : [data]);
        setMenuValidation(result);
      }
    } catch {
      setImportError('JSON 格式错误，请检查数据格式');
    }
  };

  const handleAutoFix = () => {
    if (ordersValidation && !ordersValidation.valid === false && ordersData) {
      try {
        const data = JSON.parse(ordersData);
        const fixed = autoFixOrders(Array.isArray(data) ? data : [data]);
        setOrdersData(JSON.stringify(fixed, null, 2));
        setOrdersValidation(validateOrders(fixed));
      } catch {}
    }
    if (chefsValidation && !chefsValidation.valid === false && chefsData) {
      try {
        const data = JSON.parse(chefsData);
        const fixed = autoFixChefs(Array.isArray(data) ? data : [data]);
        setChefsData(JSON.stringify(fixed, null, 2));
        setChefsValidation(validateChefs(fixed));
      } catch {}
    }
    if (menuValidation && !menuValidation.valid === false && menuData) {
      try {
        const data = JSON.parse(menuData);
        const fixed = autoFixMenu(Array.isArray(data) ? data : [data]);
        setMenuData(JSON.stringify(fixed, null, 2));
        setMenuValidation(validateMenu(fixed));
      } catch {}
    }
  };

  const handleImport = () => {
    try {
      const orders = ordersData ? JSON.parse(ordersData) : [];
      const chefs = chefsData ? JSON.parse(chefsData) : [];
      const menu = menuData ? JSON.parse(menuData) : [];
      
      const fixedOrders = autoFixOrders(Array.isArray(orders) ? orders : [orders]);
      const fixedChefs = autoFixChefs(Array.isArray(chefs) ? chefs : [chefs]);
      const fixedMenu = autoFixMenu(Array.isArray(menu) ? menu : [menu]);
      
      onImport(fixedOrders, fixedChefs, fixedMenu);
      onClose();
    } catch {
      setImportError('导入失败，请检查数据格式');
    }
  };

  const hasErrors = 
    (ordersValidation && !ordersValidation.valid === false) ||
    (chefsValidation && !chefsValidation.valid === false) ||
    (menuValidation && !menuValidation.valid === false);

  const ValidationDisplay = (validation: ValidationResult | null, type: string) => {
    if (!validation) return null;
    
    return (
      <div className="space-y-3 mt-4">
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>错误 ({validation.errors.length})</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {validation.errors.slice(0, 3).map((error, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <div>
                  <span className="font-medium">{error.field}:</span> {error.message}
                  <div className="text-xs text-red-500 mt-0.5 ml-2">
                    <Wrench className="w-3 h-3 inline mr-1" />
                    {error.fixHint}
                  </div>
                </div>
              </li>
            ))}
            {validation.errors.length > 3 && (
                <li className="text-red-400 text-xs">还有 {validation.errors.length - 3} 个错误...</li>
            )}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
            <Info className="w-4 h-4" />
            <span>警告 ({validation.warnings.length})</span>
          </div>
          <ul className="text-sm text-yellow-600 space-y-1">
            {validation.warnings.slice(0, 2).map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <div>
                  <span className="font-medium">{warning.field}:</span> {warning.message}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
            <Info className="w-4 h-4" />
            <span>建议</span>
          </div>
          <ul className="text-sm text-blue-600 space-y-1">
            {validation.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.valid && validation.errors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">{type}数据验证通过</span>
          </div>
        </div>
      )}
    </div>
  );
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">数据导入</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {(['orders', 'chefs', 'menu'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'orders' ? '顾客订单' : tab === 'chefs' ? '厨师配置' : '菜单配置'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {importError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span>{importError}</span>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传订单JSON文件</label>
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">点击或拖拽文件到此处</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={(e) =>
                      handleFileUpload(e, setOrdersData, validateOrders, setOrdersValidation
                    )}
                  />
                </label>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  或粘贴JSON数据</label>
                <textarea
                  value={ordersData}
                  onChange={(e) => setOrdersData(e.target.value)}
                  placeholder='[{"id": "o1", "customerName": "顾客1", "items": [...]}]'
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-none"
                />
              </div>
              {ValidationDisplay(ordersValidation, '订单')}
            </div>
          )}

          {activeTab === 'chefs' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传厨师JSON文件</label>
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">点击或拖拽文件到此处</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={(e) =>
                      handleFileUpload(e, setChefsData, validateChefs, setChefsValidation
                    )}
                  />
                </label>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  或粘贴JSON数据</label>
                <textarea
                  value={chefsData}
                  onChange={(e) => setChefsData(e.target.value)}
                  placeholder='[{"id": "c1", "name": "张师傅", "efficiency": 1.0}]'
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-none"
                />
              </div>
              {ValidationDisplay(chefsValidation, '厨师')}
            </div>
          )}

          {activeTab === 'menu' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传菜单JSON文件</label>
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">点击或拖拽文件到此处</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={(e) =>
                      handleFileUpload(e, setMenuData, validateMenu, setMenuValidation
                    )}
                  />
                </label>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  或粘贴JSON数据</label>
                <textarea
                  value={menuData}
                  onChange={(e) => setMenuData(e.target.value)}
                  placeholder='[{"id": "m1", "name": "宫保鸡丁", "price": 38}]'
                  className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-none"
                />
              </div>
              {ValidationDisplay(menuValidation, '菜单')}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleAutoFix}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            <Wrench className="w-4 h-4" />
            自动修复
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              验证数据
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">
              <FileJson className="w-4 h-4" />
              导入数据
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
