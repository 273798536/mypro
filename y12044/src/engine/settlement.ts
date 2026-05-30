import { NetworkNode, PipeConnection, Resources, AnomalyEvent, RoundData } from '../types/game';

export function calculateResourceChanges(
  nodes: NetworkNode[],
  pipes: PipeConnection[],
  currentResources: Resources,
  anomalies: AnomalyEvent[]
): { resources: Resources; scoreDelta: number } {
  const resources = { ...currentResources };
  let scoreDelta = 0;
  
  const iceMines = nodes.filter(n => n.type === 'ice_mine' && n.status !== 'disconnected');
  const iceProduced = iceMines.reduce((sum, mine) => {
    return sum + Math.floor(mine.currentLoad * (mine.health / 100));
  }, 0);
  resources.ice += iceProduced;
  
  const iceMelted = Math.floor(iceProduced * 0.6);
  resources.water += iceMelted;
  resources.ice -= iceMelted;
  
  const baseConsumption = resources.baseUsage;
  const connectedPipes = pipes.filter(p => 
    p.status === 'connected' && 
    nodes.find(n => n.id === p.from)?.status !== 'disconnected' &&
    nodes.find(n => n.id === p.to)?.status !== 'disconnected'
  );
  const totalFlow = connectedPipes.reduce((sum, p) => sum + p.flowRate, 0);
  const actualSupply = Math.min(totalFlow * 0.5, baseConsumption);
  resources.water -= actualSupply;
  
  const greenhouse = nodes.find(n => n.type === 'greenhouse');
  if (greenhouse && greenhouse.status !== 'disconnected') {
    const greenhousePipe = pipes.find(p => p.to === 'greenhouse' && p.status === 'connected');
    if (greenhousePipe) {
      resources.greenhouseHumidity = Math.min(100, Math.max(0, 
        resources.greenhouseHumidity + (greenhousePipe.flowRate * 0.3 - 5)
      ));
    } else {
      resources.greenhouseHumidity = Math.max(0, resources.greenhouseHumidity - 15);
    }
  }
  
  scoreDelta += iceProduced * 2;
  scoreDelta += actualSupply * 1;
  
  anomalies.forEach(anomaly => {
    if (anomaly.severity === 'critical') {
      scoreDelta -= 50;
    } else {
      scoreDelta -= 20;
    }
  });
  
  if (resources.greenhouseHumidity < 30) {
    scoreDelta -= 30;
  } else if (resources.greenhouseHumidity > 60) {
    scoreDelta += 15;
  }
  
  if (resources.water < 100) {
    scoreDelta -= 25;
  }
  
  return { resources, scoreDelta };
}

export function naturalDecay(nodes: NetworkNode[]): NetworkNode[] {
  return nodes.map(node => {
    const decayRate = node.type === 'pump' ? 3 : node.type === 'recycler' ? 4 : 2;
    return {
      ...node,
      health: Math.max(0, node.health - decayRate),
    };
  });
}

export function createRoundSnapshot(
  roundNumber: number,
  actions: any[],
  conflicts: any[],
  anomalies: AnomalyEvent[],
  resources: Resources,
  score: number,
  nodes: NetworkNode[],
  pipes: PipeConnection[]
): RoundData {
  return {
    roundNumber,
    actions: JSON.parse(JSON.stringify(actions)),
    conflicts: JSON.parse(JSON.stringify(conflicts)),
    anomalies: JSON.parse(JSON.stringify(anomalies)),
    resources: JSON.parse(JSON.stringify(resources)),
    score,
    networkState: {
      nodes: JSON.parse(JSON.stringify(nodes)),
      pipes: JSON.parse(JSON.stringify(pipes)),
    },
  };
}
