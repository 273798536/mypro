import { Sample, Track, License, TraceNode } from '@/types';

export const traceForward = (
  sampleId: string,
  samples: Sample[],
  tracks: Track[],
  licenses: License[]
): TraceNode => {
  const sample = samples.find((s) => s.id === sampleId);
  if (!sample) throw new Error('Sample not found');

  const sampleNode: TraceNode = {
    id: sample.id,
    type: 'sample',
    name: sample.name,
    status: sample.isDuplicate ? 'warning' : 'normal',
    children: [],
  };

  const relatedTracks = tracks.filter((t) => t.sampleIds.includes(sampleId));
  relatedTracks.forEach((track) => {
    const trackNode: TraceNode = {
      id: track.id,
      type: 'track',
      name: track.name,
      status: track.isMissingLicense ? 'danger' : 'normal',
      children: [],
      parent: sampleNode,
    };

    const relatedLicenses = licenses.filter((l) => l.trackIds.includes(track.id));
    relatedLicenses.forEach((license) => {
      const licenseStatus = license.status === 'active' ? 'normal' : license.status === 'expiring_soon' ? 'warning' : 'danger';
      const licenseNode: TraceNode = {
        id: license.id,
        type: 'license',
        name: license.name,
        status: licenseStatus,
        parent: trackNode,
      };
      trackNode.children!.push(licenseNode);
    });

    sampleNode.children!.push(trackNode);
  });

  return sampleNode;
};

export const traceBackward = (
  licenseId: string,
  licenses: License[],
  tracks: Track[],
  samples: Sample[]
): TraceNode => {
  const license = licenses.find((l) => l.id === licenseId);
  if (!license) throw new Error('License not found');

  const licenseStatus = license.status === 'active' ? 'normal' : license.status === 'expiring_soon' ? 'warning' : 'danger';
  const licenseNode: TraceNode = {
    id: license.id,
    type: 'license',
    name: license.name,
    status: licenseStatus,
    children: [],
  };

  const relatedTracks = tracks.filter((t) => license.trackIds.includes(t.id));
  relatedTracks.forEach((track) => {
    const trackNode: TraceNode = {
      id: track.id,
      type: 'track',
      name: track.name,
      status: track.isMissingLicense ? 'danger' : 'normal',
      children: [],
      parent: licenseNode,
    };

    const relatedSamples = samples.filter((s) => track.sampleIds.includes(s.id));
    relatedSamples.forEach((sample) => {
      const sampleNode: TraceNode = {
        id: sample.id,
        type: 'sample',
        name: sample.name,
        status: sample.isDuplicate ? 'warning' : 'normal',
        parent: trackNode,
      };
      trackNode.children!.push(sampleNode);
    });

    licenseNode.children!.push(trackNode);
  });

  return licenseNode;
};

export const flattenTraceTree = (node: TraceNode): TraceNode[] => {
  const result: TraceNode[] = [node];
  if (node.children) {
    node.children.forEach((child) => {
      result.push(...flattenTraceTree(child));
    });
  }
  return result;
};
