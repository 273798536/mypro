import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import type { ResultCategory } from '../../types/analysis';
import { getCategoryStats } from '../../engine/classifier';
import { COLORS } from '../../utils/color';

const CATEGORIES: { key: ResultCategory; label: string; icon: any; color: string }[] = [
  { key: 'ready', label: '可直接用', icon: CheckCircle, color: COLORS.category.ready },
  { key: 'needReview', label: '需研究员确认', icon: AlertTriangle, color: COLORS.category.needReview },
  { key: 'filterFailed', label: '筛选失效', icon: XCircle, color: COLORS.category.filterFailed },
];

export function ResultCategories() {
  const activeRun = useUIStore(s => s.activeRun);
  const setSelectedAssetId = useUIStore(s => s.setSelectedAssetId);
  const result = useDataStore(s => 
    activeRun === 'first' || activeRun === 'comparison'
      ? s.firstRunResult
      : s.secondRunResult
  );
  
  const [expandedCategory, setExpandedCategory] = useState<ResultCategory | null>(null);
  
  if (!result || !result.categories) return null;
  
  const stats = getCategoryStats(result.categories);
  
  const handleAssetClick = (assetId: string) => {
    setSelectedAssetId(assetId);
  };
  
  const toggleCategory = (category: ResultCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="absolute bottom-24 left-4 right-4 z-10"
    >
      <div className="grid grid-cols-3 gap-3">
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
          const assets = result.categories[key];
          const isExpanded = expandedCategory === key;
          
          return (
            <Panel
              key={key}
              className="relative overflow-hidden"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: color }}
              />
              
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleCategory(key)}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color }} />
                  <span className="text-sm font-medium text-slate-200">{label}</span>
                  <Badge
                    variant="category"
                    category={key}
                  >
                    {assets.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-slate-400" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400" />
                )}
              </div>
              
              <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats[`${key}Percent`] * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
              
              <AnimatePresence>
                {isExpanded && assets.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 overflow-y-auto max-h-32"
                  >
                    <div className="space-y-1 pt-2 border-t border-slate-700/30">
                      {assets.slice(0, 10).map(asset => (
                        <motion.div
                          key={asset.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssetClick(asset.id);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-300">
                              {asset.code}
                            </span>
                            <span className="text-xs text-slate-500">
                              {asset.name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {asset.industry}
                          </span>
                        </motion.div>
                      ))}
                      {assets.length > 10 && (
                        <div className="text-xs text-slate-500 text-center py-1">
                          还有 {assets.length - 10} 个...
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          );
        })}
      </div>
    </motion.div>
  );
}
