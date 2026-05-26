import { useState, useEffect } from 'react';
import { Settings, Wallet, Shield } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';

export default function AccountSettings() {
  const currentScenario = useCashflowStore(state => state.currentScenario);
  const updateSettings = useCashflowStore(state => state.updateSettings);

  const [initialBalance, setInitialBalance] = useState(0);
  const [safetyLine, setSafetyLine] = useState(0);
  const [currency, setCurrency] = useState('¥');

  useEffect(() => {
    if (currentScenario) {
      setInitialBalance(currentScenario.settings.initialBalance);
      setSafetyLine(currentScenario.settings.safetyLine);
      setCurrency(currentScenario.settings.currency);
    }
  }, [currentScenario]);

  const handleSave = () => {
    updateSettings({
      initialBalance,
      safetyLine,
      currency
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={20} className="text-brand-primary" />
        <h3 className="font-semibold text-gray-800">账户设置</h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Wallet size={16} className="text-gray-400" />
            初始余额
          </label>
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="¥">¥</option>
              <option value="$">$</option>
              <option value="€">€</option>
            </select>
            <input
              type="number"
              value={initialBalance}
              onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">现金流计算的起始余额</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Shield size={16} className="text-gray-400" />
            余额安全线
          </label>
          <input
            type="number"
            value={safetyLine}
            onChange={e => setSafetyLine(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-400 mt-1">余额低于此值将触发危险警告</p>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors font-medium text-sm"
        >
          保存设置
        </button>
      </div>
    </div>
  );
}