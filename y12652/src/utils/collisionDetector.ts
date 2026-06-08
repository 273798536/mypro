import type { Block, CollisionRecord, Corridor, CollisionType, Severity } from "@/types";

function getBlockBounds(block: Block) {
  return {
    minX: block.position.x - block.size.width / 2,
    maxX: block.position.x + block.size.width / 2,
    minY: block.position.z - block.size.depth / 2,
    maxY: block.position.z + block.size.depth / 2,
    minZ: block.position.y,
    maxZ: block.position.y + block.size.height,
  };
}

function blocksOverlap(a: Block, b: Block): boolean {
  const ba = getBlockBounds(a);
  const bb = getBlockBounds(b);
  return (
    ba.minX < bb.maxX &&
    ba.maxX > bb.minX &&
    ba.minY < bb.maxY &&
    ba.maxY > bb.minY &&
    ba.minZ < bb.maxZ &&
    ba.maxZ > bb.minZ
  );
}

function distanceToCorridor(
  block: Block,
  corridor: Corridor
): { distance: number; closestPoint: { x: number; y: number } } {
  const bx = block.position.x;
  const by = block.position.z;
  const { startPoint, endPoint } = corridor;

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const lenSq = dx * dx + dy * dy;

  let t = lenSq === 0 ? 0 : ((bx - startPoint.x) * dx + (by - startPoint.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = startPoint.x + t * dx;
  const closestY = startPoint.y + t * dy;

  const distX = bx - closestX;
  const distY = by - closestY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  return {
    distance,
    closestPoint: { x: closestX, y: closestY },
  };
}

function blockIntersectsCorridor(block: Block, corridor: Corridor): boolean {
  const { distance } = distanceToCorridor(block, corridor);
  const halfWidth = (block.size.width + block.size.depth) / 4;
  return distance < corridor.width / 2 + halfWidth;
}

export function detectCollisions(
  blocks: Block[],
  corridors: Corridor[]
): CollisionRecord[] {
  const collisions: CollisionRecord[] = [];
  let collisionId = 0;

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocksOverlap(blocks[i], blocks[j])) {
        const mid = {
          x: (blocks[i].position.x + blocks[j].position.x) / 2,
          y: (blocks[i].position.y + blocks[j].position.y) / 2 +
             (blocks[i].size.height + blocks[j].size.height) / 4,
          z: (blocks[i].position.z + blocks[j].position.z) / 2,
        };

        collisions.push({
          id: `col_${++collisionId}`,
          blockA: blocks[i].id,
          blockB: blocks[j].id,
          collisionType: "overlap",
          severity: "high",
          coordinates: mid,
          description: `${blocks[i].name} 与 ${blocks[j].name} 发生体块重叠`,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  const SETBACK_THRESHOLD = 8;

  for (const block of blocks) {
    for (const corridor of corridors) {
      const { distance, closestPoint } = distanceToCorridor(block, corridor);
      const halfWidth = (block.size.width + block.size.depth) / 4;

      if (blockIntersectsCorridor(block, corridor)) {
        collisions.push({
          id: `col_${++collisionId}`,
          blockA: block.id,
          blockB: corridor.id,
          collisionType: "corridor_violation",
          severity: "high",
          coordinates: { x: closestPoint.x, y: block.position.y + block.size.height / 2, z: closestPoint.y },
          description: `${block.name} 侵入 ${corridor.name} 控制范围`,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      } else if (distance < corridor.width / 2 + halfWidth + SETBACK_THRESHOLD) {
        const shortfall = Math.round(
          corridor.width / 2 + halfWidth + SETBACK_THRESHOLD - distance
        );
        collisions.push({
          id: `col_${++collisionId}`,
          blockA: block.id,
          blockB: corridor.id,
          collisionType: "setback_insufficient",
          severity: "medium",
          coordinates: { x: closestPoint.x, y: block.position.y + block.size.height / 2, z: closestPoint.y },
          description: `${block.name} 距 ${corridor.name} 退距不足，缺 ${shortfall} 米`,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return collisions.sort((a, b) => {
    const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}
