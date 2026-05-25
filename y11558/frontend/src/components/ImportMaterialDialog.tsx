import React, { useState } from 'react';
import { X, Upload, FileText, MapPin, ScrollText, FileStack, Mail } from 'lucide-react';
import { materialApi } from '../services/api';

const materialTypeOptions = [
  { value: 'ORDER', label: '门店订单', icon: FileText },
  { value: 'TRACK', label: '司机轨迹', icon: MapPin },
  { value: 'IOU', label: '签收欠条', icon: ScrollText },
  { value: 'STATEMENT', label: '供应商对账单', icon: FileStack },
  { value: 'EMAIL', label: '审批邮件', icon: Mail },
];

interface ImportMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportMaterialDialog: React.FC<ImportMaterialDialogProps> = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ORDER',
    storeName: '',
    supplierName: '',
    businessDate: new Date().toISOString().split('T')[0],
    handleMode: 'OVERWRITE',
    items: [{ productName: '', quantity: 0, unit: '袋', price: 0, amount: 0 }],
    driverName: '',
    vehiclePlate: '',
    trackPoints: '',
    customerName: '',
    iouAmount: '',
    iouNote: '',
    emailSubject: '',
    emailFrom: '',
    emailContent: '',
    statementItems: [{ productName: '', quantity: 0, unit: '袋', price: 0, amount: 0 }],
  });

  const addItem = () => {
    if (formData.type === 'STATEMENT') {
      setFormData({
        ...formData,
        statementItems: [...formData.statementItems, { productName: '', quantity: 0, unit: '袋', price: 0, amount: 0 }],
      });
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { productName: '', quantity: 0, unit: '袋', price: 0, amount: 0 }],
      });
    }
  };

  const updateItem = (index: number, field: string, value: any, key = 'items') => {
    const arr = key === 'statementItems' ? [...formData.statementItems] : [...formData.items];
    (arr as any)[index][field] = value;
    if (field === 'quantity' || field === 'price') {
      (arr as any)[index].amount = Number((arr as any)[index].quantity) * Number((arr as any)[index].price);
    }
    setFormData({ ...formData, [key]: arr } as any);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let parsedData: any = {};
      let rawContent: any = {};

      switch (formData.type) {
        case 'ORDER': {
          const orderItems = formData.items.filter(i => i.productName);
          const totalAmount = orderItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
          const orderNo = `DD${formData.businessDate.replace(/-/g, '')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          parsedData = {
            orderNo,
            storeName: formData.storeName,
            orderDate: formData.businessDate,
            items: orderItems,
            totalAmount,
          };
          rawContent = { ...parsedData, source: 'order_form' };
          break;
        }
        case 'TRACK':
          parsedData = {
            driverName: formData.driverName,
            vehiclePlate: formData.vehiclePlate,
            storeName: formData.storeName,
            trackPoints: formData.trackPoints.split('\n').filter(p => p).map(p => {
              const [ts, lat, lng] = p.split(',');
              return { timestamp: ts?.trim(), latitude: Number(lat?.trim()), longitude: Number(lng?.trim()) };
            }),
          };
          rawContent = { ...parsedData, source: 'track_form' };
          break;
        case 'IOU': {
          const iouNo = `QT${formData.businessDate.replace(/-/g, '')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          parsedData = {
            iouNo,
            storeName: formData.storeName,
            customerName: formData.customerName,
            iouAmount: Number(formData.iouAmount),
            totalAmount: Number(formData.iouAmount),
            signDate: formData.businessDate,
            iouNote: formData.iouNote,
            signature: `${formData.customerName}(签字)`,
          };
          rawContent = { ...parsedData, source: 'iou_form' };
          break;
        }
        case 'STATEMENT': {
          const stmtItems = formData.statementItems.filter(i => i.productName);
          const totalAmount = stmtItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
          const statementNo = `DZD${formData.businessDate.replace(/-/g, '')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          parsedData = {
            statementNo,
            supplierName: formData.supplierName,
            statementDate: formData.businessDate,
            items: stmtItems,
            totalAmount,
          };
          rawContent = { ...parsedData, source: 'statement_form' };
          break;
        }
        case 'EMAIL':
          parsedData = {
            emailSubject: formData.emailSubject,
            emailFrom: formData.emailFrom,
            emailContent: formData.emailContent,
            businessDate: formData.businessDate,
          };
          rawContent = { ...parsedData, source: 'email_form' };
          break;
      }

      await materialApi.import({
        type: formData.type,
        rawContent,
        parsedData,
        sourceFile: `manual-${formData.type}-${Date.now()}.json`,
        handleMode: formData.handleMode,
      });

      setStep('success');
      onSuccess();
    } catch (err: any) {
      alert('导入失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'success' ? '导入成功' : '导入材料'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">材料已成功导入</h3>
            <p className="mt-2 text-sm text-gray-500">
              系统已完成幂等校验和脏数据检测，可前往异常中心查看结果
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={() => { setStep('form'); onClose(); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setStep('form');
                  setFormData({
                    type: 'ORDER',
                    storeName: '',
                    supplierName: '',
                    businessDate: new Date().toISOString().split('T')[0],
                    handleMode: 'OVERWRITE',
                    items: [{ productName: '', quantity: 0, unit: '袋', price: 0, amount: 0 }],
                    driverName: '',
                    vehiclePlate: '',
                    trackPoints: '',
                    customerName: '',
                    iouAmount: '',
                    iouNote: '',
                    emailSubject: '',
                    emailFrom: '',
                    emailContent: '',
                    statementItems: [{ productName: '', quantity: 0, unit: '袋', price: 0, amount: 0 }],
                  });
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                继续导入
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">材料类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  {materialTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">处理模式</label>
                <select
                  value={formData.handleMode}
                  onChange={(e) => setFormData({ ...formData, handleMode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="OVERWRITE">覆盖旧版本</option>
                  <option value="IGNORE">忽略重复</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">业务日期</label>
              <input
                type="date"
                value={formData.businessDate}
                onChange={(e) => setFormData({ ...formData, businessDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {formData.type === 'ORDER' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">门店名称</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="如：丰收农资店"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">订单明细</span>
                    <button onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700">
                      + 添加商品
                    </button>
                  </div>
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="商品名称"
                        value={item.productName}
                        onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="数量"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="单位"
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="单价"
                        value={item.price || ''}
                        onChange={(e) => updateItem(idx, 'price', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="w-24 text-sm text-gray-600">¥{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {formData.type === 'TRACK' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">司机姓名</label>
                    <input
                      type="text"
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">车牌号</label>
                    <input
                      type="text"
                      value={formData.vehiclePlate}
                      onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">门店名称</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">轨迹点（每行一个，格式: 时间,纬度,经度）</label>
                  <textarea
                    value={formData.trackPoints}
                    onChange={(e) => setFormData({ ...formData, trackPoints: e.target.value })}
                    rows={4}
                    placeholder="2024-06-15 08:30:00,34.7466,113.6254&#10;2024-06-15 09:15:00,34.7500,113.6300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>
              </>
            )}

            {formData.type === 'IOU' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">门店名称</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">欠款人</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">欠款金额</label>
                    <input
                      type="number"
                      value={formData.iouAmount}
                      onChange={(e) => setFormData({ ...formData, iouAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <input
                      type="text"
                      value={formData.iouNote}
                      onChange={(e) => setFormData({ ...formData, iouNote: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.type === 'STATEMENT' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">对账明细</span>
                    <button onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700">
                      + 添加商品
                    </button>
                  </div>
                  {formData.statementItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="商品名称"
                        value={item.productName}
                        onChange={(e) => updateItem(idx, 'productName', e.target.value, 'statementItems')}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="数量"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value, 'statementItems')}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="单位"
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value, 'statementItems')}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="单价"
                        value={item.price || ''}
                        onChange={(e) => updateItem(idx, 'price', e.target.value, 'statementItems')}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="w-24 text-sm text-gray-600">¥{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {formData.type === 'EMAIL' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮件主题</label>
                  <input
                    type="text"
                    value={formData.emailSubject}
                    onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发件人</label>
                  <input
                    type="email"
                    value={formData.emailFrom}
                    onChange={(e) => setFormData({ ...formData, emailFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮件内容</label>
                  <textarea
                    value={formData.emailContent}
                    onChange={(e) => setFormData({ ...formData, emailContent: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {step === 'form' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {loading && <Upload className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? '导入中...' : '确认导入'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
