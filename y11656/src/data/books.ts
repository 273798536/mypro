import type { BookItem, BookCategory, ItemType, TargetArea } from '@/types';

const bookTitles: Record<BookCategory, string[]> = {
  文学: ['追风筝的人', '百年孤独', '活着', '平凡的世界', '三体', '围城', '红楼梦', '白夜行', '解忧杂货店', '挪威的森林'],
  科技: ['代码大全', '深入理解计算机系统', '算法导论', '设计模式', '重构', '编程珠玑', '人月神话', '黑客与画家', '编码', '计算机程序的构造和解释'],
  艺术: ['艺术的故事', '美的历程', '凡高传', '艺术哲学', '认识电影', '图像与眼睛', '艺术的故事', '西方美术史', '中国美术史', '世界摄影史'],
  历史: ['史记', '资治通鉴', '万历十五年', '明朝那些事儿', '全球通史', '罗马人的故事', '枪炮、病菌与钢铁', '人类简史', '未来简史', '时间简史'],
  教育: ['爱的教育', '教育心理学', '民主主义与教育', '教育漫话', '爱弥儿', '普通教育学', '大教学论', '教育论', '给教师的建议', '学习的革命'],
};

const coverColors = ['#8B4513', '#2F4F4F', '#800000', '#191970', '#006400', '#4B0082', '#800080', '#C71585', '#B8860B', '#556B2F'];

const names = ['张先生', '李女士', '王同学', '赵老师', '刘先生', '陈女士', '杨先生', '黄女士'];

const damageDescriptions = ['封面破损', '书脊断裂', '内页涂鸦', '水渍', '书角折损', '页面脱落'];

const categories: BookCategory[] = ['文学', '科技', '艺术', '历史', '教育'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getShelfForCategory(category: BookCategory): TargetArea {
  if (category === '文学') return 'shelf-A';
  if (category === '科技') return 'shelf-B';
  return 'shelf-C';
}

export function generateBookItems(count: number): BookItem[] {
  const items: BookItem[] = [];
  const usedTitles = new Set<string>();

  const typeDistribution: ItemType[] = [];
  const normalCount = Math.floor(count * 0.4);
  const returnCount = Math.floor(count * 0.3);
  const reservedCount = Math.floor(count * 0.15);
  const damagedCount = count - normalCount - returnCount - reservedCount;

  for (let i = 0; i < normalCount; i++) typeDistribution.push('normal');
  for (let i = 0; i < returnCount; i++) typeDistribution.push('return');
  for (let i = 0; i < reservedCount; i++) typeDistribution.push('reserved');
  for (let i = 0; i < damagedCount; i++) typeDistribution.push('damaged');

  const shuffledTypes = typeDistribution.sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const type = shuffledTypes[i] || 'normal';
    const category = randomChoice(categories);
    const titles = bookTitles[category];
    let title = randomChoice(titles);
    
    while (usedTitles.has(`${title}-${i}`)) {
      title = randomChoice(titles);
    }
    usedTitles.add(`${title}-${i}`);

    const isDamaged = type === 'damaged';
    const isReserved = type === 'reserved';

    let correctTarget: TargetArea;
    if (type === 'return') {
      correctTarget = 'return';
    } else if (isDamaged) {
      correctTarget = 'damaged';
    } else if (isReserved) {
      correctTarget = 'reserved';
    } else {
      correctTarget = getShelfForCategory(category);
    }

    const item: BookItem = {
      id: `book-${Date.now()}-${i}`,
      title,
      type,
      category,
      isDamaged,
      isReserved,
      coverColor: coverColors[Math.floor(Math.random() * coverColors.length)],
      correctTarget,
    };

    if (isReserved) {
      item.reservedBy = randomChoice(names);
    }

    if (isDamaged) {
      item.damageDescription = randomChoice(damageDescriptions);
    }

    items.push(item);
  }

  return items;
}
