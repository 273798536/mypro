import {
  sampleBuildings,
  sampleSoundSources,
  sampleWindData,
  sampleComplaints,
  sampleTimeline,
  sampleHeatmap,
} from '../data/sampleData';

export const exportSampleData = () => {
  const data = {
    buildings: sampleBuildings,
    soundSources: sampleSoundSources,
    windData: sampleWindData,
    complaints: sampleComplaints,
    timeline: sampleTimeline,
    heatmap: sampleHeatmap,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-acoustic-data.json';
  a.click();
  URL.revokeObjectURL(url);
};
