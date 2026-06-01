import type { ProductArchive, ProductNode3D, RiskIssue } from '../../shared/types';
import { PRODUCT_TYPE_COLORS, RISK_LEVEL_COLORS } from '../../shared/types';

export function calculate3DPositions(
  products: ProductArchive[],
  risks: RiskIssue[],
  colorBy: 'type' | 'risk' = 'risk'
): ProductNode3D[] {
  const nodes: ProductNode3D[] = [];
  const typeGroups: Record<string, ProductArchive[]> = {};

  products.forEach((product) => {
    if (!typeGroups[product.type]) {
      typeGroups[product.type] = [];
    }
    typeGroups[product.type].push(product);
  });

  const typeKeys = Object.keys(typeGroups);
  const angleStep = (2 * Math.PI) / Math.max(typeKeys.length, 1);
  const layerHeight = 8;

  typeKeys.forEach((type, typeIndex) => {
    const groupProducts = typeGroups[type];
    const groupAngle = typeIndex * angleStep;
    const groupRadius = 12 + typeIndex * 2;

    groupProducts.forEach((product, productIndex) => {
      const hasRisk = risks.some(
        (r) => r.productId === product.id && r.severity === 'critical'
      );
      const hasWarning = risks.some(
        (r) => r.productId === product.id && r.severity === 'warning'
      );

      const spiralAngle = groupAngle + (productIndex * 0.8) / (groupProducts.length + 1);
      const spiralRadius = groupRadius + (productIndex % 3) * 2;
      const heightOffset = (productIndex - groupProducts.length / 2) * 2;
      const riskElevation = hasRisk ? 3 : hasWarning ? 1.5 : 0;

      const position: [number, number, number] = [
        Math.cos(spiralAngle) * spiralRadius,
        heightOffset + riskElevation,
        Math.sin(spiralAngle) * spiralRadius,
      ];

      let color: string;
      if (colorBy === 'risk') {
        color = RISK_LEVEL_COLORS[product.riskLevel];
      } else {
        color = PRODUCT_TYPE_COLORS[product.type as keyof typeof PRODUCT_TYPE_COLORS];
      }

      if (hasRisk) {
        color = '#FF4757';
      } else if (hasWarning) {
        color = '#FFA502';
      }

      const scale = hasRisk ? 1.5 : hasWarning ? 1.25 : 1.0;

      nodes.push({
        productId: product.id,
        position,
        color,
        scale,
        riskHighlight: hasRisk || hasWarning,
      });
    });
  });

  return nodes;
}

export function generateConnections(nodes: ProductNode3D[]): Array<{
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  opacity: number;
}> {
  const connections: Array<{
    start: [number, number, number];
    end: [number, number, number];
    color: string;
    opacity: number;
  }> = [];

  const nodeMap = new Map(nodes.map((n) => [n.productId, n]));
  const positions = nodes.map((n) => n.position);

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.sqrt(
        Math.pow(positions[i][0] - positions[j][0], 2) +
          Math.pow(positions[i][1] - positions[j][1], 2) +
          Math.pow(positions[i][2] - positions[j][2], 2)
      );

      if (dist < 10) {
        const bothRisk = nodes[i].riskHighlight && nodes[j].riskHighlight;
        const oneRisk = nodes[i].riskHighlight || nodes[j].riskHighlight;

        connections.push({
          start: positions[i],
          end: positions[j],
          color: bothRisk ? '#FF4757' : oneRisk ? '#FFA502' : '#00D4FF',
          opacity: bothRisk ? 0.6 : oneRisk ? 0.4 : 0.15,
        });
      }
    }
  }

  return connections;
}

export function generateStarParticles(count: number): Array<{
  position: [number, number, number];
  size: number;
  opacity: number;
}> {
  const particles: Array<{
    position: [number, number, number];
    size: number;
    opacity: number;
  }> = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 40 + Math.random() * 20;

    particles.push({
      position: [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      ],
      size: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.5 + 0.3,
    });
  }

  return particles;
}
