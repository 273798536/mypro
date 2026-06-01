import { Thermometer, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFilterStore } from '../../store/useFilterStore';

const temperatureLegend = [
  { temp: '< 22°C', color: 'bg-cyan-400', label: '冷' },
  { temp: '22-26°C', color: 'bg-green-400', label: '正常' },
  { temp: '26-32°C', color: 'bg-orange-400', label: '偏高' },
  { temp: '> 32°C', color: 'bg-red-400', label: '过热' },
];

export function TempHeatmap() {
  const { showTemperatureField, setShowTemperatureField } = useFilterStore();

  return (
    <div className="border-b border-gray-700/50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-200">
            <Thermometer className="w-4 h-4" />
            <span className="text-sm font-medium">温场高亮</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTemperatureField(!showTemperatureField)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${
              showTemperatureField
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50'
            }`}
          >
            {showTemperatureField ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                开启
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                关闭
              </>
            )}
          </motion.button>
        </div>

        <div className="space-y-2">
          {temperatureLegend.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded ${item.color}`} />
              <span className="text-xs text-gray-400 w-16">{item.temp}</span>
              <span className="text-xs text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 h-2 rounded-full overflow-hidden bg-gray-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              background: 'linear-gradient(to right, #22d3ee, #4ade80, #f97316, #ef4444)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
