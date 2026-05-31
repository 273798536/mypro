export const sampleCharts = {
  normal: {
    name: '正常谱面样例',
    fileName: 'normal_chart.txt',
    content: `// DIFFICULTY: NORMAL
// 难度标签: 普通
// 这是一个正常的谱面样例

[NOTES]
0,tap,1
250,tap,2
500,tap,3
750,tap,4
1000,hold,1,500
1250,tap,2
1500,tap,3
1750,tap,4
2000,tap,1
2000,tap,3
2250,tap,2
2250,tap,4
2500,tap,1
2750,tap,2
3000,hold,4,750
3250,tap,1
3500,tap,2
3750,tap,3
4000,tap,1
4000,tap,2
4000,tap,3
4250,tap,4
4500,tap,1
4750,tap,2
5000,tap,3
`,
  },
  timingOffset: {
    name: '音画偏移样例',
    fileName: 'timing_offset_chart.txt',
    content: `// DIFFICULTY: HARD
// 这个谱面包含音画偏移问题

[NOTES]
0,tap,1
250,tap,2
500,tap,3
750,tap,4
987,tap,1
1250,tap,2
1493,tap,3
1750,tap,4
2000,tap,1
2267,tap,2
2500,tap,3
2732,tap,4
3000,tap,1
3250,tap,2
3500,tap,3
3750,tap,4
4000,tap,1
4233,tap,2
4500,tap,3
4750,tap,4
5000,tap,1
`,
  },
  withBadLines: {
    name: '包含坏行的样例',
    fileName: 'bad_lines_chart.txt',
    content: `// DIFFICULTY: EXPERT
# 这是一个包含多种坏行的谱面
; 用于测试解析器的鲁棒性

[NOTES]
0,tap,1

250,tap,2
500,tap
750,tap,4
invalid line here
1000,hold,1,500
1250,tap,2

1500,tap,99
1750,tap,4
abc,tap,1
2000,tap,2
2250,tap,3
2500,hold,4
2750,tap,1
3000,tap,2
3250,tap,3
3500,tap,4
`,
  },
  denseChord: {
    name: '双押过密样例',
    fileName: 'dense_chord_chart.txt',
    content: `// DIFFICULTY: MASTER
// 这个谱面包含双押过密问题

[NOTES]
0,tap,1
0,tap,2
0,tap,3
250,tap,4
260,tap,1
270,tap,2
500,tap,1
500,tap,2
500,tap,3
500,tap,4
750,tap,1
755,tap,2
1000,tap,1
1010,tap,2
1020,tap,3
1250,tap,1
1250,tap,4
1500,tap,2
1500,tap,3
1750,tap,1
1750,tap,2
1750,tap,3
2000,tap,4
`,
  },
  holdMiss: {
    name: '长按漏判样例',
    fileName: 'hold_miss_chart.txt',
    content: `// DIFFICULTY: HARD
// 这个谱面包含长按漏判问题

[NOTES]
0,hold,1,1000
250,tap,2
500,hold,3,50
750,tap,4
1000,hold,1
1250,tap,2
1500,hold,3,0
1750,tap,4
2000,hold,1,2500
2250,tap,2
2500,hold,3,80
2750,tap,4
3000,tap,1
3250,tap,2
3500,tap,3
3750,tap,4
`,
  },
};

export const loadSampleChart = (key: keyof typeof sampleCharts) => {
  return sampleCharts[key];
};

export const getAllSampleNames = () => {
  return Object.keys(sampleCharts) as (keyof typeof sampleCharts)[];
};
