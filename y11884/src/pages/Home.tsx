import React from 'react';
import Header from '../components/Layout/Header';
import VectorFieldCanvas from '../components/Canvas/VectorFieldCanvas';
import VectorFieldSelector from '../components/ControlPanel/VectorFieldSelector';
import PathEditor from '../components/ControlPanel/PathEditor';
import IntegrationResultPanel from '../components/Results/IntegrationResultPanel';
import FormulaPanel from '../components/Results/FormulaPanel';
import WarningAlert from '../components/Common/WarningAlert';
import { useAppStore } from '../store/appStore';

const Home: React.FC = () => {
  const showFormulaPanel = useAppStore((state) => state.showFormulaPanel);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <FormulaPanel />
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`w-72 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-6 transition-all ${
            showFormulaPanel ? 'ml-96' : ''
          }`}
        >
          <VectorFieldSelector />
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">✏️</span>
              路径编辑
            </h3>
            <div className="space-y-3">
              <PathEditor pathIndex={0} pathLabel="A" />
              <PathEditor pathIndex={1} pathLabel="B" />
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <VectorFieldCanvas />
        </div>

        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
          <IntegrationResultPanel />
        </div>
      </div>
      <WarningAlert />
    </div>
  );
};

export default Home;
