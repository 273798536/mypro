import { useAppStore } from '@/store';

const SensorSelector = () => {
  const { sensors, selectedSensors, toggleSensor } = useAppStore();

  const sensorColors = [
    '#38BDF8',
    '#34D399',
    '#F97316',
    '#A78BFA',
    '#F472B6',
  ];

  return (
    <div className="card p-4">
      <h4 className="text-sm font-medium text-dark-200 mb-3">传感器筛选</h4>
      <div className="flex flex-wrap gap-2">
        {sensors.map((sensor, index) => {
          const isSelected = selectedSensors.includes(sensor.sensorId);
          const color = sensorColors[index % sensorColors.length];

          return (
            <button
              key={sensor.sensorId}
              onClick={() => toggleSensor(sensor.sensorId)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isSelected
                  ? 'bg-dark-700/80 border border-dark-600'
                  : 'bg-dark-800/50 border border-dark-700/50 opacity-60 hover:opacity-100'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${isSelected ? 'animate-pulse-slow' : ''}`}
                style={{
                  backgroundColor: isSelected ? color : '#475569',
                  boxShadow: isSelected ? `0 0 8px ${color}` : 'none',
                }}
              />
              <span className={isSelected ? 'text-white' : 'text-dark-400'}>
                {sensor.name}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                sensor.status === 'online' ? 'bg-green-400' :
                sensor.status === 'warning' ? 'bg-alert-yellow animate-pulse-slow' :
                'bg-dark-500'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SensorSelector;
