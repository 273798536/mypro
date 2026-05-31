import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, DollarSign, AlertTriangle, Database, Save, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { UserRole, CabinClass, TaxRule, CabinPrice } from '../types';

const Settings: React.FC = () => {
  const { users, settings, updateSettings, cabinPrices, taxRules, addCabinPrice, updateCabinPrice, deleteCabinPrice, addTaxRule, updateTaxRule, deleteTaxRule, loadCabinPrices, loadTaxRules, loadUsers } = useStore();
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'cabin' | 'tax'>('general');
  const [localSettings, setLocalSettings] = useState({
    mileageRate: 0.01,
    anomalyThreshold: 500,
    autoDetectAnomalies: true,
    requireExplanationForWarnings: true,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadCabinPrices();
    loadTaxRules();
    loadUsers();
    if (settings) {
      setLocalSettings({
        mileageRate: settings.mileageRate,
        anomalyThreshold: settings.anomalyThreshold,
        autoDetectAnomalies: settings.autoDetectAnomalies,
        requireExplanationForWarnings: settings.requireExplanationForWarnings,
      });
    }
  }, [loadCabinPrices, loadTaxRules, loadUsers, settings]);

  const handleSaveSettings = async () => {
    await updateSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getRoleText = (role: UserRole): string => {
    const map: Record<UserRole, string> = {
      settlement: '结算员',
      reviewer: '复核员',
      admin: '管理员',
    };
    return map[role] || role;
  };

  const getCabinText = (cabin: CabinClass): string => {
    const map: Record<CabinClass, string> = {
      economy: '经济舱',
      premium_economy: '超级经济舱',
      business: '商务舱',
      first: '头等舱',
    };
    return map[cabin] || cabin;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-primary-600" />
            系统设置
          </h1>
          <p className="text-slate-500 mt-1">配置系统参数和基础数据</p>
        </div>

        <div className="flex gap-6">
          <div className="w-48 flex-shrink-0">
            <div className="card p-2">
              {[
                { id: 'general', label: '通用设置', icon: SettingsIcon },
                { id: 'users', label: '用户管理', icon: User },
                { id: 'cabin', label: '舱位价格', icon: DollarSign },
                { id: 'tax', label: '税费规则', icon: Database },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'general' && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">通用设置</h2>
                <div className="space-y-6 max-w-xl">
                  <div>
                    <label className="label">里程兑换汇率</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        value={localSettings.mileageRate}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, mileageRate: Number(e.target.value) }))}
                        className="input w-32"
                      />
                      <span className="text-slate-500 text-sm">元 / 里程</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">设置 1 里程可兑换的人民币金额</p>
                  </div>

                  <div>
                    <label className="label">异常金额阈值</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={localSettings.anomalyThreshold}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, anomalyThreshold: Number(e.target.value) }))}
                        className="input w-32"
                      />
                      <span className="text-slate-500 text-sm">元</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">差价超过此金额时标记为高风险异常</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.autoDetectAnomalies}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, autoDetectAnomalies: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-700">自动检测异常</div>
                        <div className="text-xs text-slate-500">计算差价时自动检测并标记异常项</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.requireExplanationForWarnings}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, requireExplanationForWarnings: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-700">警告异常需要解释</div>
                        <div className="text-xs text-slate-500">提交复核前需要为所有警告级异常添加解释</div>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSaveSettings}
                      className="btn btn-primary gap-2"
                    >
                      <Save className="w-4 h-4" />
                      保存设置
                    </button>
                    {saveSuccess && (
                      <span className="ml-3 text-accent-green-600 text-sm">✓ 保存成功</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">用户管理</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">用户名</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">姓名</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">角色</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">创建时间</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">最后登录</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-mono text-slate-700">{user.username}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.role === 'admin' ? 'bg-primary-100 text-primary-700' :
                              user.role === 'reviewer' ? 'bg-accent-green-100 text-accent-green-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {getRoleText(user.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('zh-CN') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'cabin' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">舱位价格基准</h2>
                  <button className="btn btn-primary text-sm gap-1">
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">航班号</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">舱位等级</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">基准价格</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">生效日期</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cabinPrices.map(price => (
                        <tr key={price.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{price.flightNo}</td>
                          <td className="px-4 py-3">{getCabinText(price.cabinClass)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">¥{price.basePrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(price.effectiveDate).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="p-1 text-accent-red-500 hover:bg-accent-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">税费规则</h2>
                  <button className="btn btn-primary text-sm gap-1">
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-3 font-medium text-slate-600">国家/地区</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">税种代码</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">税种名称</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">税率/固定额</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxRules.map(rule => (
                        <tr key={rule.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800">{rule.country}</span>
                            <span className="text-slate-500 ml-2">{rule.countryName}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{rule.taxCode}</td>
                          <td className="px-4 py-3 text-slate-700">{rule.taxName}</td>
                          <td className="px-4 py-3 text-right">
                            {rule.isFixed ? (
                              <span className="text-slate-700">固定 ¥{rule.fixedAmount}</span>
                            ) : (
                              <span className="text-slate-700">{(rule.rate * 100).toFixed(1)}%</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="p-1 text-accent-red-500 hover:bg-accent-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
