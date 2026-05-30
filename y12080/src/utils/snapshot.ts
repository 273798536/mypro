import { VersionRecord, Snapshot, StageModel, Light, ActorRoute, DetectionResult } from '../types';

export function createSnapshot(
  stage: StageModel,
  lights: Light[],
  routes: ActorRoute[],
  results: DetectionResult[]
): Snapshot {
  return {
    stage: JSON.parse(JSON.stringify(stage)),
    lights: JSON.parse(JSON.stringify(lights)),
    routes: JSON.parse(JSON.stringify(routes)),
    results: JSON.parse(JSON.stringify(results)),
  };
}

export function createVersionRecord(
  description: string,
  previousState: Snapshot,
  currentState: Snapshot,
  modifiedFields: string[]
): VersionRecord {
  const previousResultIds = new Set(previousState.results.map(r => r.id));
  const currentResultIds = new Set(currentState.results.map(r => r.id));
  
  const conclusionsOverturned: string[] = [];
  previousResultIds.forEach(id => {
    if (!currentResultIds.has(id)) {
      conclusionsOverturned.push(id);
    }
  });
  
  return {
    id: `v-${Date.now()}`,
    timestamp: Date.now(),
    description,
    modifiedFields,
    previousState,
    currentState,
    conclusionsOverturned,
  };
}

export function compareSnapshots(
  prev: Snapshot,
  curr: Snapshot
): string[] {
  const modifiedFields: string[] = [];
  
  if (JSON.stringify(prev.stage) !== JSON.stringify(curr.stage)) {
    modifiedFields.push('stage');
  }
  
  if (JSON.stringify(prev.lights) !== JSON.stringify(curr.lights)) {
    modifiedFields.push('lights');
  }
  
  if (JSON.stringify(prev.routes) !== JSON.stringify(curr.routes)) {
    modifiedFields.push('routes');
  }
  
  if (JSON.stringify(prev.results) !== JSON.stringify(curr.results)) {
    modifiedFields.push('results');
  }
  
  return modifiedFields;
}
