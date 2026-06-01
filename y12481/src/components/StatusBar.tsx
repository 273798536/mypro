import { useGameStore } from '../store/gameStore';

export const StatusBar = () => {
  const { fuel, maxFuel, score, getPlanetById, currentPlanet } = useGameStore();
  const currentPlanetData = getPlanetById(currentPlanet);
  const fuelPercentage = (fuel / maxFuel) * 100;

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">燃料</span>
        <div className="fuel-bar">
          <div
            className={`fuel-fill ${fuelPercentage < 30 ? 'low' : ''}`}
            style={{ width: `${fuelPercentage}%` }}
          />
        </div>
        <span className="status-value">{fuel}/{maxFuel}</span>
      </div>
      <div className="status-item">
        <span className="status-label">分数</span>
        <span className="status-value" style={{ color: '#4ade80' }}>{score}</span>
      </div>
      <div className="status-item">
        <span className="status-label">当前位置</span>
        <span className="status-value" style={{ color: currentPlanetData?.color }}>
          {currentPlanetData?.name}
        </span>
      </div>
    </div>
  );
};
