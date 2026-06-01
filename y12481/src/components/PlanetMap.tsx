import { useGameStore } from '../store/gameStore';

export const PlanetMap = () => {
  const {
    planets,
    currentPlanet,
    fuel,
    travelToPlanet,
    getPlanetById,
    selectSample,
  } = useGameStore();

  const currentPlanetData = getPlanetById(currentPlanet);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">星际地图</span>
      </div>
      <div className="planet-map">
        {planets.map((planet) => (
          <div
            key={planet.id}
            className={`planet ${planet.id === currentPlanet ? 'current' : ''}`}
            style={{
              left: planet.x - 30,
              top: planet.y - 30,
              backgroundColor: planet.color,
              color: planet.color,
            }}
            onClick={() => {
              if (planet.id !== currentPlanet && fuel >= planet.fuelCost) {
                travelToPlanet(planet.id);
                selectSample(null);
              }
            }}
            title={`${planet.name} - 燃料消耗: ${planet.fuelCost}`}
          >
            {planet.name.slice(0, 4)}
          </div>
        ))}
      </div>
      {currentPlanetData && (
        <div className="planet-info">
          <div style={{ marginBottom: '8px', fontWeight: 600 }}>
            {currentPlanetData.name}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }}>
            {currentPlanetData.description}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span>危险等级: {'⚠️'.repeat(currentPlanetData.dangerLevel)}</span>
            <span>可采集: {currentPlanetData.availableSamples.length} 个采样</span>
          </div>
        </div>
      )}
    </div>
  );
};
