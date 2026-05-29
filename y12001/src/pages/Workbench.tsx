
import React, { useState } from 'react';
import { Layers, FileSpreadsheet, AlertTriangle, History, TestTube } from 'lucide-react';
import { useSettlementStore } from '../store/useSettlementStore';
import BalanceLayerCard from '../components/BalanceLayerCard';
import SettlementTable from '../components/SettlementTable';
import TransactionList from '../components/TransactionList';
import ExceptionPanel from '../components/ExceptionPanel';
import AuditTimeline from '../components/AuditTimeline';
import SampleComparison from '../components/SampleComparison';
import { sampleNormalTransaction, sampleStoreClosedTransaction } from '../data/mockData';
import { TabType } from '../types';

const Workbench: React.FC = () => {
  const { stores, balances, transactions, settlements, auditLogs } =
    useSettlementStore();
  const [activeTab, setActiveTab] = useState<TabType>('workbench');

  const tabs = [
    { id: 'workbench' as TabType, label: '清算工作台', icon: Layers },
    { id: 'audit' as TabType, label: '审计追踪', icon: History },
    { id: 'sample' as TabType, label: '样例验证', icon: TestTube },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">跨店储值卡余额清算系统</h1>
                <p className="text-sm text-gray-500">余额分层 · 门店分摊 · 异常复核</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">财务-当前用户</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'workbench' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                余额分层概览
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {balances.map((balance) => (
                  <BalanceLayerCard key={balance.cardId} balance={balance} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                门店分摊明细
              </h2>
              <SettlementTable settlements={settlements} />
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                异常复核
              </h2>
              <ExceptionPanel transactions={transactions} />
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                交易记录
              </h2>
              <TransactionList transactions={transactions} stores={stores} />
            </section>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                完整审计记录
              </h2>
              <AuditTimeline logs={auditLogs} />
            </section>
          </div>
        )}

        {activeTab === 'sample' && (
          <div className="space-y-8">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">样例验证说明</h2>
              <p className="text-sm text-blue-700">
                左侧为正常跨店消费样例（充值门店营业中），右侧为门店撤店异常样例。
                通过对比可以验证：赠金不可退规则、门店撤店时本金退回/赠金清零规则是否正确生效。
                连锁财务无需读代码即可确认分支生效。
              </p>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                场景对比：正常记录 vs 门店撤店
              </h2>
              <SampleComparison
                normalTransaction={sampleNormalTransaction}
                closedTransaction={sampleStoreClosedTransaction}
                stores={stores}
              />
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">业务规则验证清单</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">
                    <strong>余额分层：</strong>本金、赠金、冻结金额分开展示
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">
                    <strong>赠金不可退：</strong>退款时赠金部分自动扣除
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">
                    <strong>门店分摊：</strong>充值门店向消费门店划转本金 + 赠金成本
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">
                    <strong>门店撤店：</strong>未消费本金原路退回，赠金清零
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">
                    <strong>审计追踪：</strong>每次改动记录来源、操作人、前后变化
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">
                    <strong>数据溯源：</strong>每条判断可追溯到原始来源文件
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Workbench;
