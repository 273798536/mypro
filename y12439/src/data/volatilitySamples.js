const volatilitySamples = {
  sample1_volatility_spike: {
    id: 'VOL_SAMPLE_001',
    name: '隐波跳升 - 央行意外加息',
    description: '央行意外宣布加息25bp，市场恐慌导致隐波从20%跳升至40%',
    category: 'volatility_jump',
    difficulty: 'medium',
    materials: [
      {
        id: 'MAT_001_01',
        round: 1,
        type: 'news',
        title: '市场平稳，预计本周数据清淡',
        content: '本周无重大经济数据公布，市场预计维持震荡',
        strikePrice: 100,
        optionPrice: 3.5,
        underlyingPrice: 100,
        volatility: 0.20,
        expectedDirection: null,
        volatilityJump: false
      },
      {
        id: 'MAT_001_02',
        round: 2,
        type: 'news',
        title: '【突发】央行意外加息25bp',
        content: '央行意外宣布加息25个基点，超出市场预期！国债期货暴跌',
        strikePrice: 100,
        optionPrice: 8.0,
        underlyingPrice: 95,
        volatility: 0.40,
        expectedDirection: 'down',
        volatilityJump: true
      },
      {
        id: 'MAT_001_03',
        round: 3,
        type: 'analysis',
        title: '加息影响持续发酵',
        content: '市场情绪恐慌，VIX指数飙升30%，投资者纷纷寻求避险',
        strikePrice: 95,
        optionPrice: 7.5,
        underlyingPrice: 93,
        volatility: 0.38,
        expectedDirection: 'down',
        volatilityJump: false
      }
    ],
    expectedOutcome: {
      shouldRecognizeVolatilityJump: true,
      optimalAction: 'buy_put',
      volatilityAwareRequired: true
    }
  },

  sample2_volatility_collapse: {
    id: 'VOL_SAMPLE_002',
    name: '隐波骤降 - 风险事件落地',
    description: '美联储加息落地，符合预期，隐波从35%骤降至18%',
    category: 'volatility_jump',
    difficulty: 'hard',
    materials: [
      {
        id: 'MAT_002_01',
        round: 1,
        type: 'news',
        title: '议息会议前，市场高度紧张',
        content: '美联储议息会议今晚召开，市场高度关注加息幅度',
        strikePrice: 100,
        optionPrice: 6.5,
        underlyingPrice: 100,
        volatility: 0.35,
        expectedDirection: null,
        volatilityJump: false
      },
      {
        id: 'MAT_002_02',
        round: 2,
        type: 'news',
        title: '【落地】美联储加息50bp，符合预期',
        content: '美联储加息50bp，完全符合市场预期！不确定性消除',
        strikePrice: 100,
        optionPrice: 3.0,
        underlyingPrice: 103,
        volatility: 0.18,
        expectedDirection: 'up',
        volatilityJump: true
      },
      {
        id: 'MAT_002_03',
        round: 3,
        type: 'analysis',
        title: '风险偏好回升，股市大涨',
        content: '不确定性消除，风险资产普涨，波动率快速回落',
        strikePrice: 103,
        optionPrice: 2.8,
        underlyingPrice: 105,
        volatility: 0.17,
        expectedDirection: 'up',
        volatilityJump: false
      }
    ],
    expectedOutcome: {
      shouldRecognizeVolatilityJump: true,
      optimalAction: 'sell_put',
      volatilityAwareRequired: true
    }
  },

  sample3_volatility_double_jump: {
    id: 'VOL_SAMPLE_003',
    name: '隐波双向跳变 - 过山车行情',
    description: '先因贸易战升级隐波跳升，后因和解消息隐波骤降',
    category: 'volatility_jump',
    difficulty: 'extreme',
    materials: [
      {
        id: 'MAT_003_01',
        round: 1,
        type: 'news',
        title: '贸易谈判进展顺利',
        content: '双方谈判代表表示取得积极进展，市场乐观',
        strikePrice: 100,
        optionPrice: 3.0,
        underlyingPrice: 100,
        volatility: 0.18,
        expectedDirection: 'up',
        volatilityJump: false
      },
      {
        id: 'MAT_003_02',
        round: 2,
        type: 'news',
        title: '【突发】贸易战升级，加征关税',
        content: '谈判破裂！一方宣布对另一方商品加征25%关税',
        strikePrice: 100,
        optionPrice: 9.0,
        underlyingPrice: 92,
        volatility: 0.42,
        expectedDirection: 'down',
        volatilityJump: true
      },
      {
        id: 'MAT_003_03',
        round: 3,
        type: 'news',
        title: '【反转】双方同意重回谈判桌',
        content: '紧急通话后，双方同意暂停关税措施，重回谈判',
        strikePrice: 92,
        optionPrice: 4.0,
        underlyingPrice: 98,
        volatility: 0.22,
        expectedDirection: 'up',
        volatilityJump: true
      },
      {
        id: 'MAT_003_04',
        round: 4,
        type: 'analysis',
        title: '市场情绪修复，但仍存不确定性',
        content: '市场反弹，但投资者谨慎，波动率维持中等水平',
        strikePrice: 98,
        optionPrice: 4.2,
        underlyingPrice: 99,
        volatility: 0.24,
        expectedDirection: 'up',
        volatilityJump: false
      }
    ],
    expectedOutcome: {
      shouldRecognizeVolatilityJump: true,
      optimalActions: ['buy_put', 'buy_call'],
      volatilityAwareRequired: true
    }
  },

  sample4_volatility_gradual_rise: {
    id: 'VOL_SAMPLE_004',
    name: '隐波缓慢抬升 - 注意区分跳变',
    description: '隐波缓慢抬升，非跳变场景，测试是否误判',
    category: 'volatility_normal',
    difficulty: 'medium',
    materials: [
      {
        id: 'MAT_004_01',
        round: 1,
        type: 'news',
        title: '数据公布前，市场观望',
        content: '重要经济数据下周公布，市场观望情绪浓厚',
        strikePrice: 100,
        optionPrice: 3.0,
        underlyingPrice: 100,
        volatility: 0.18,
        expectedDirection: null,
        volatilityJump: false
      },
      {
        id: 'MAT_004_02',
        round: 2,
        type: 'news',
        title: '数据临近，隐波温和抬升',
        content: '数据公布临近，隐波从18%抬升至22%',
        strikePrice: 100,
        optionPrice: 3.8,
        underlyingPrice: 100,
        volatility: 0.22,
        expectedDirection: null,
        volatilityJump: false
      },
      {
        id: 'MAT_004_03',
        round: 3,
        type: 'news',
        title: '数据公布前最后一天',
        content: '明日数据公布，隐波维持23%',
        strikePrice: 100,
        optionPrice: 4.0,
        underlyingPrice: 100,
        volatility: 0.23,
        expectedDirection: null,
        volatilityJump: false
      }
    ],
    expectedOutcome: {
      shouldRecognizeVolatilityJump: false,
      optimalAction: 'hold',
      volatilityAwareRequired: false
    }
  },

  sample5_margin_insufficient_test: {
    id: 'VOL_SAMPLE_005',
    name: '保证金不足测试 - 极端亏损场景',
    description: '连续错误判断导致保证金快速消耗，测试补保证金入口',
    category: 'margin_test',
    difficulty: 'extreme',
    materials: [
      {
        id: 'MAT_005_01',
        round: 1,
        type: 'news',
        title: '市场平稳',
        content: '市场平稳运行',
        strikePrice: 100,
        optionPrice: 5.0,
        underlyingPrice: 100,
        volatility: 0.20,
        expectedDirection: 'up',
        volatilityJump: false
      },
      {
        id: 'MAT_005_02',
        round: 2,
        type: 'news',
        title: '黑天鹅事件',
        content: '突发黑天鹅事件，市场暴跌',
        strikePrice: 100,
        optionPrice: 15.0,
        underlyingPrice: 80,
        volatility: 0.60,
        expectedDirection: 'down',
        volatilityJump: true
      },
      {
        id: 'MAT_005_03',
        round: 3,
        type: 'news',
        title: '继续暴跌',
        content: '恐慌情绪蔓延，继续暴跌',
        strikePrice: 80,
        optionPrice: 12.0,
        underlyingPrice: 70,
        volatility: 0.55,
        expectedDirection: 'down',
        volatilityJump: false
      },
      {
        id: 'MAT_005_04',
        round: 4,
        type: 'news',
        title: '熔断触发',
        content: '指数触发熔断，交易暂停',
        strikePrice: 70,
        optionPrice: 20.0,
        underlyingPrice: 60,
        volatility: 0.70,
        expectedDirection: 'down',
        volatilityJump: true
      }
    ],
    expectedOutcome: {
      shouldRecognizeVolatilityJump: true,
      shouldTriggerMarginCall: true,
      volatilityAwareRequired: true
    }
  }
};

const smoothTestMaterials = [
  {
    id: 'SMOOTH_001',
    round: 1,
    type: 'news',
    title: '经济数据向好',
    content: 'GDP数据超预期，市场情绪乐观',
    strikePrice: 100,
    optionPrice: 3.0,
    underlyingPrice: 100,
    volatility: 0.18,
    expectedDirection: 'up',
    volatilityJump: false
  },
  {
    id: 'SMOOTH_002',
    round: 2,
    type: 'analysis',
    title: '技术面突破',
    content: '指数突破关键阻力位，上行空间打开',
    strikePrice: 102,
    optionPrice: 3.2,
    underlyingPrice: 102,
    volatility: 0.19,
    expectedDirection: 'up',
    volatilityJump: false
  },
  {
    id: 'SMOOTH_003',
    round: 3,
    type: 'news',
    title: '政策利好',
    content: '政府出台刺激政策，市场大涨',
    strikePrice: 105,
    optionPrice: 3.5,
    underlyingPrice: 105,
    volatility: 0.20,
    expectedDirection: 'up',
    volatilityJump: false
  }
];

const marginInsufficientMaterials = [
  {
    id: 'MARGIN_001',
    round: 1,
    type: 'news',
    title: '市场平稳',
    content: '市场平稳运行',
    strikePrice: 100,
    optionPrice: 5.0,
    underlyingPrice: 100,
    volatility: 0.20,
    expectedDirection: 'down',
    volatilityJump: false
  },
  {
    id: 'MARGIN_002',
    round: 2,
    type: 'news',
    title: '黑天鹅 - 方向判断错误测试',
    content: '突发利好，市场大涨（如果买put会大亏）',
    strikePrice: 100,
    optionPrice: 15.0,
    underlyingPrice: 130,
    volatility: 0.50,
    expectedDirection: 'up',
    volatilityJump: true
  },
  {
    id: 'MARGIN_003',
    round: 3,
    type: 'news',
    title: '继续大涨',
    content: '利好持续发酵，继续大涨',
    strikePrice: 130,
    optionPrice: 12.0,
    underlyingPrice: 145,
    volatility: 0.45,
    expectedDirection: 'up',
    volatilityJump: false
  }
];

module.exports = {
  volatilitySamples,
  smoothTestMaterials,
  marginInsufficientMaterials,
  getAllSamples: () => Object.values(volatilitySamples),
  getSampleById: (id) => volatilitySamples[id],
  getVolatilityJumpSamples: () => Object.values(volatilitySamples).filter(s => s.category === 'volatility_jump')
};
