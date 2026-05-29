import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { usePartitionStore } from '../../store/usePartitionStore';
import type { PartitionConditions } from '../../types';

export function ConditionPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const { globalConditions, setGlobalConditions } = usePartitionStore();

  const updateCondition = <K extends keyof PartitionConditions>(
    key: K,
    value: PartitionConditions[K]
  ) => {
    setGlobalConditions({
      ...globalConditions,
      [key]: value
    });
  };

  const handleNumberInput = (
    key: 'minParts' | 'maxParts' | 'minValue' | 'maxValue',
    value: string
  ) => {
    if (value === '') {
      const newConditions = { ...globalConditions };
      delete newConditions[key];
      setGlobalConditions(newConditions);
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num > 0) {
        updateCondition(key, num);
      }
    }
  };

  const handleIncludeExclude = (
    key: 'includeNumbers' | 'excludeNumbers',
    value: string
  ) => {
    if (value === '') {
      const newConditions = { ...globalConditions };
      delete newConditions[key];
      setGlobalConditions(newConditions);
    } else {
      const numbers = value
        .split(/[,，]/)
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
      updateCondition(key, numbers);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card mt-4"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="card-header w-full flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-gray-800">全局限制条件</h2>
            <p className="text-xs text-gray-500">可被每行单独设置覆盖</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">允许重复数字</span>
                <button
                  onClick={() => updateCondition('allowDuplicate', !globalConditions.allowDuplicate)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    globalConditions.allowDuplicate
                      ? 'bg-primary-500'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      globalConditions.allowDuplicate
                        ? 'translate-x-7'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最少拆分数
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={globalConditions.minParts ?? ''}
                    onChange={(e) => handleNumberInput('minParts', e.target.value)}
                    className="input-field text-sm"
                    placeholder="不限"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最多拆分数
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={globalConditions.maxParts ?? ''}
                    onChange={(e) => handleNumberInput('maxParts', e.target.value)}
                    className="input-field text-sm"
                    placeholder="不限"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小数字
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={globalConditions.minValue ?? ''}
                    onChange={(e) => handleNumberInput('minValue', e.target.value)}
                    className="input-field text-sm"
                    placeholder="默认1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大数字
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={globalConditions.maxValue ?? ''}
                    onChange={(e) => handleNumberInput('maxValue', e.target.value)}
                    className="input-field text-sm"
                    placeholder="不限"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  必须包含的数字（逗号分隔）
                </label>
                <input
                  type="text"
                  value={globalConditions.includeNumbers?.join(',') ?? ''}
                  onChange={(e) => handleIncludeExclude('includeNumbers', e.target.value)}
                  className="input-field text-sm"
                  placeholder="例如：2,3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  必须排除的数字（逗号分隔）
                </label>
                <input
                  type="text"
                  value={globalConditions.excludeNumbers?.join(',') ?? ''}
                  onChange={(e) => handleIncludeExclude('excludeNumbers', e.target.value)}
                  className="input-field text-sm"
                  placeholder="例如：1,5"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
