import React from 'react';
import { Bike } from 'lucide-react';
import InputForm from '@/components/InputForm';
import ResultDisplay from '@/components/ResultDisplay';
import ValidationAlerts from '@/components/ValidationAlerts';
import PowerCharts from '@/components/PowerCharts';
import ActionButtons from '@/components/ActionButtons';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-xl">
                <Bike className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">骑行功率计算器</h1>
                <p className="text-sm text-dark-400">齿比 · 踏频 · 坡度 → 功率区间</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-success">实时计算</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <InputForm />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <ActionButtons />
            <ValidationAlerts />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ResultDisplay />
              <div className="space-y-6">
                <PowerCharts />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-dark-700 py-6 mt-12">
        <div className="container mx-auto px-6 text-center text-dark-500 text-sm">
          <p>基于物理学模型估算，仅供训练参考使用</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
