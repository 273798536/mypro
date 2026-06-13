import http from 'node:http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
      res.on('error', reject);
    });
  });
}

async function main() {
  for (const id of ['batch-001', 'batch-003']) {
    console.log('\n=== ' + id + ' ===');
    const r = await get('http://localhost:3001/api/batches/' + id);
    const d = r.data;
    console.log('batch:', d.batchNo, 'points:', d.points.length, 'collisions:', d.collisions.length);
    const overlap = d.collisions.filter((c) => c.type === 'overlap');
    console.log('overlap count:', overlap.length);
    if (overlap.length) {
      console.log('overlap:', overlap[0].objectA, '<->', overlap[0].objectB);
    }
    const withXyz = d.points.filter((p) => p.parsedX !== null && p.parsedY !== null && p.parsedZ !== null);
    console.log('points with parsed coords:', withXyz.length, '/', d.points.length);
    const dirty = d.points.filter((p) => p.isDirty);
    console.log('dirty:', dirty.length);
    if (dirty.length) {
      console.log('dirty sample:', dirty[0].objectName, 'rawX:', JSON.stringify(dirty[0].rawX), 'parsedX:', dirty[0].parsedX);
    }
  }
}

main().catch(console.error);
