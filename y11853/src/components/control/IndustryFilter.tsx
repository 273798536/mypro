import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { INDUSTRIES } from '../../types/asset';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

export function IndustryFilter() {
  const selectedIndustries = useUIStore(s => s.selectedIndustries);
  const toggleIndustry = useUIStore(s => s.toggleIndustry);
  const setSelectedIndustries = useUIStore(s => s.setSelectedIndustries);
  
  const isAllSelected = selectedIndustries.length === 0;
  
  const handleSelectAll = () => {
    setSelectedIndustries([]);
  };
  
  const handleClearAll = () => {
    setSelectedIndustries([...INDUSTRIES]);
  };
  
  return (
    <Panel title="行业筛选" icon={<Layers size={16} />} className="w-full">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isAllSelected ? 'primary' : 'ghost'}
            onClick={handleSelectAll}
            className="flex-1"
          >
            全部
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearAll}
            className="flex-1"
          >
            清空
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRIES.map((industry, index) => {
            const isSelected = selectedIndustries.length === 0 || selectedIndustries.includes(industry);
            
            return (
              <motion.button
                key={industry}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleIndustry(industry)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  'border',
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:bg-slate-700/50 hover:text-slate-400'
                )}
                style={{
                  animationDelay: `${index * 20}ms`,
                }}
              >
                {industry}
              </motion.button>
            );
          })}
        </div>
        
        <div className="text-xs text-slate-500 pt-1">
          已选择 {selectedIndustries.length === 0 ? '全部' : selectedIndustries.length} 个行业
        </div>
      </div>
    </Panel>
  );
}
