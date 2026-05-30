import { Light, ActorRoute, DetectionResult, Obstacle, StageModel } from '../types';

export function queryByObstacle(
  obstacleId: string,
  results: DetectionResult[],
  lights: Light[]
): { results: DetectionResult[]; relatedLights: Light[] } {
  const relatedResults = results.filter(r =>
    r.relatedObstacleIds?.includes(obstacleId)
  );
  
  const relatedLightIds = new Set<string>();
  relatedResults.forEach(r => {
    r.relatedLightIds?.forEach(id => relatedLightIds.add(id));
  });
  
  const relatedLights = lights.filter(l => relatedLightIds.has(l.id));
  
  return { results: relatedResults, relatedLights };
}

export function queryByLight(
  lightId: string,
  results: DetectionResult[],
  routes: ActorRoute[],
  obstacles: Obstacle[]
): {
  results: DetectionResult[];
  relatedRoutes: ActorRoute[];
  relatedObstacles: Obstacle[];
} {
  const relatedResults = results.filter(r =>
    r.relatedLightIds?.includes(lightId)
  );
  
  const relatedRouteIds = new Set<string>();
  const relatedObstacleIds = new Set<string>();
  
  relatedResults.forEach(r => {
    r.relatedRouteIds?.forEach(id => relatedRouteIds.add(id));
    r.relatedObstacleIds?.forEach(id => relatedObstacleIds.add(id));
  });
  
  return {
    results: relatedResults,
    relatedRoutes: routes.filter(r => relatedRouteIds.has(r.id)),
    relatedObstacles: obstacles.filter(o => relatedObstacleIds.has(o.id)),
  };
}

export function queryByResult(
  resultId: string,
  results: DetectionResult[],
  lights: Light[],
  routes: ActorRoute[],
  obstacles: Obstacle[]
): {
  result: DetectionResult | undefined;
  relatedLights: Light[];
  relatedRoutes: ActorRoute[];
  relatedObstacles: Obstacle[];
} {
  const result = results.find(r => r.id === resultId);
  
  if (!result) {
    return { result: undefined, relatedLights: [], relatedRoutes: [], relatedObstacles: [] };
  }
  
  return {
    result,
    relatedLights: lights.filter(l => result.relatedLightIds?.includes(l.id)),
    relatedRoutes: routes.filter(r => result.relatedRouteIds?.includes(r.id)),
    relatedObstacles: obstacles.filter(o => result.relatedObstacleIds?.includes(o.id)),
  };
}

export function queryByRoute(
  routeId: string,
  results: DetectionResult[],
  lights: Light[]
): { results: DetectionResult[]; relatedLights: Light[] } {
  const relatedResults = results.filter(r =>
    r.relatedRouteIds?.includes(routeId)
  );
  
  const relatedLightIds = new Set<string>();
  relatedResults.forEach(r => {
    r.relatedLightIds?.forEach(id => relatedLightIds.add(id));
  });
  
  return {
    results: relatedResults,
    relatedLights: lights.filter(l => relatedLightIds.has(l.id)),
  };
}
