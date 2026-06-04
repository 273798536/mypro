import type { Sample } from '@/types';

export const mockSamples: Sample[] = [
  {
    id: 'sample-001',
    name: '顺利样例-苹果叶片健康检测',
    status: 'success',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=green%20apple%20leaf%20with%20small%20brown%20spot%20disease%20on%20white%20background&image_size=square_hd',
    baseCoordinates: {
      x: 100,
      y: 80,
      width: 600,
      height: 450
    },
    manualNote: '这个叶片的病斑很典型，边界清晰，颜色均匀。训练时可以作为正面教材。',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'sample-002',
    name: '待确认样例-桃树叶边缘病斑',
    status: 'pending',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=peach%20tree%20leaf%20with%20unclear%20brown%20disease%20spots%20near%20edge%20on%20white%20background&image_size=square_hd',
    baseCoordinates: {
      x: 80,
      y: 60,
      width: 580,
      height: 420
    },
    manualNote: '注意边界不太清楚，颜色渐变，容易和正常叶片混淆。需要仔细判断。',
    createdAt: new Date('2024-01-18')
  },
  {
    id: 'sample-003',
    name: '明显坏数据-模糊病斑混合污渍',
    status: 'bad',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blurry%20leaf%20image%20with%20multiple%20dark%20stains%20and%20artifacts%20on%20white%20background&image_size=square_hd',
    baseCoordinates: {
      x: 120,
      y: 100,
      width: 550,
      height: 400
    },
    manualNote: '图像严重模糊，有拍摄时的手指阴影。不能用于正式检测，只能用于识别坏数据训练。',
    createdAt: new Date('2024-01-20')
  }
];

export const getSampleById = (id: string): Sample | undefined => {
  return mockSamples.find(sample => sample.id === id);
};
