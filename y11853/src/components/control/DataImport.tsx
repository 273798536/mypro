import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { useAnalysisStore } from '../../store/analysisStore';
import { generateMockAssets, generateSecondRunAssets } from '../../utils/mock';
import type { Asset } from '../../types/asset';

export function DataImport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const setIsLoading = useDataStore(s => s.setIsLoading);
  const firstRunResult = useDataStore(s => s.firstRunResult);
  const secondRunResult = useDataStore(s => s.secondRunResult);
  const activeRun = useUIStore(s => s.activeRun);
  const runAnalysis = useAnalysisStore(s => s.runAnalysis);
  const setActiveRun = useUIStore(s => s.setActiveRun);
  const resetAll = useDataStore(s => s.resetAll);
  
  const handleGenerateFirstRun = async () => {
    setIsGenerating(true);
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockAssets = generateMockAssets(60);
    runAnalysis('first', mockAssets);
    
    setIsGenerating(false);
    setIsLoading(false);
  };
  
  const handleGenerateSecondRun = async () => {
    if (!firstRunResult) return;
    
    setIsGenerating(true);
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const secondRunAssets = generateSecondRunAssets(firstRunResult.assets);
    runAnalysis('second', secondRunAssets);
    setActiveRun('comparison');
    
    setIsGenerating(false);
    setIsLoading(false);
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          runAnalysis('first', data as Asset[]);
        }
      } catch (error) {
        console.error('Failed to parse file:', error);
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
  };
  
  const handleReset = () => {
    resetAll();
    useUIStore.getState().resetView();
  };
  
  return (
    <Panel title="数据导入" icon={<Upload size={16} />} className="w-full">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateFirstRun}
            disabled={isGenerating}
            className="w-full"
          >
            <Sparkles size={14} />
            生成样本数据
          </Button>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-full">
              <Button variant="secondary" size="sm" className="w-full">
                <Upload size={14} />
                导入数据
              </Button>
            </div>
          </label>
        </div>
        
        {firstRunResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 pt-2 border-t border-slate-700/30"
          >
            <div className="flex gap-2">
              <Button
                variant={activeRun === 'first' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveRun('first')}
                className="flex-1"
              >
                <Play size={12} />
                首次运行
              </Button>
              
              {secondRunResult && (
                <Button
                  variant={activeRun === 'second' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveRun('second')}
                  className="flex-1"
                >
                  <Play size={12} />
                  二次运行
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={activeRun === 'comparison' ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleGenerateSecondRun}
                disabled={isGenerating || !firstRunResult}
                className="flex-1"
              >
                <Sparkles size={12} />
                {secondRunResult ? '对比视图' : '补充回撤数据'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw size={12} />
              </Button>
            </div>
          </motion.div>
        )}
        
        {firstRunResult && (
          <div className="text-xs text-slate-500 pt-1">
            资产数量: {firstRunResult.assets.length}
            {secondRunResult && ` | 变化点: ${secondRunResult.changes?.length || 0}`}
          </div>
        )}
      </div>
    </Panel>
  );
}
