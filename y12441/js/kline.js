const KLine = (function() {
    const patterns = {
        bullish: [
            { id: 'hammer', name: '锤头线', desc: '下影线长，实体小，处于低位', requiresVolume: 'high' },
            { id: 'bullish_engulfing', name: '看涨吞没', desc: '大阳线完全包住前一根阴线', requiresVolume: 'increasing' },
            { id: 'piercing', name: '穿刺线', desc: '阴线后阳线深入阴线实体一半以上', requiresVolume: 'high' },
            { id: 'morning_star', name: '晨星', desc: '阴线+十字星+阳线组合', requiresVolume: 'increasing' },
            { id: 'doji_bullish', name: '十字星(低位)', desc: '开盘收盘几乎相等，多空平衡', requiresVolume: 'low' }
        ],
        bearish: [
            { id: 'shooting_star', name: '射击之星', desc: '上影线长，实体小，处于高位', requiresVolume: 'high' },
            { id: 'bearish_engulfing', name: '看跌吞没', desc: '大阴线完全包住前一根阳线', requiresVolume: 'increasing' },
            { id: 'dark_cloud', name: '乌云盖顶', desc: '阳线后阴线深入阳线实体一半以上', requiresVolume: 'high' },
            { id: 'evening_star', name: '暮星', desc: '阳线+十字星+阴线组合', requiresVolume: 'increasing' },
            { id: 'doji_bearish', name: '十字星(高位)', desc: '开盘收盘几乎相等，多空平衡', requiresVolume: 'low' }
        ],
        neutral: [
            { id: 'spinning_top', name: '纺锤线', desc: '实体小，上下影线都有', requiresVolume: 'normal' },
            { id: 'marubozu', name: '光头光脚', desc: '没有影线的大阳线或大阴线', requiresVolume: 'very_high' },
            { id: 'long_legged', name: '长腿十字', desc: '上下影线都很长', requiresVolume: 'high' }
        ]
    };

    const sampleLevels = [
        {
            id: 1,
            name: '初遇锤头',
            description: '敌军先锋试探，下方有支撑',
            klineData: [
                { open: 100, high: 102, low: 88, close: 98, volume: 85000 },
                { open: 98, high: 100, low: 92, close: 96, volume: 72000 },
                { open: 96, high: 98, low: 85, close: 95, volume: 95000 }
            ],
            correctPattern: 'hammer',
            correctDirection: 'bullish',
            source: {
                market: '模拟历史数据 - 2020年3月市场底部',
                dataSource: '课堂教学数据库 #CAL-2020-0315',
                collectionTime: '2020-03-15 15:00 CST',
                preCalculation: '已进行复权处理，剔除分红影响'
            },
            traps: [
                { type: 'wick_misjudge', description: '下影线虽长但成交量不足', threshold: 70000 },
                { type: 'trend_deviation', description: '短期趋势仍向下，不可贸然反攻', strength: 0.6 }
            ]
        },
        {
            id: 2,
            name: '吞没警戒',
            description: '敌军大举进攻，注意防守反击时机',
            klineData: [
                { open: 95, high: 97, low: 93, close: 94, volume: 68000 },
                { open: 94, high: 96, low: 90, close: 92, volume: 75000 },
                { open: 92, high: 105, low: 91, close: 104, volume: 120000 }
            ],
            correctPattern: 'bullish_engulfing',
            correctDirection: 'bullish',
            source: {
                market: '模拟历史数据 - 2019年1月底部反转',
                dataSource: '课堂教学数据库 #CAL-2019-0120',
                collectionTime: '2019-01-20 15:00 CST',
                preCalculation: '已进行除权除息调整'
            },
            traps: [
                { type: 'volume_divergence', description: '成交量放大但可持续性存疑', threshold: 150000 },
                { type: 'wick_misjudge', description: '上影线显示上方抛压较重', strength: 0.4 }
            ]
        },
        {
            id: 3,
            name: '射击之星',
            description: '敌军强攻失败，撤退信号显现',
            klineData: [
                { open: 110, high: 115, low: 108, close: 114, volume: 98000 },
                { open: 114, high: 118, low: 112, close: 117, volume: 105000 },
                { open: 117, high: 125, low: 115, close: 118, volume: 145000 }
            ],
            correctPattern: 'shooting_star',
            correctDirection: 'bearish',
            source: {
                market: '模拟历史数据 - 2021年2月市场顶部',
                dataSource: '课堂教学数据库 #CAL-2021-0218',
                collectionTime: '2021-02-18 15:00 CST',
                preCalculation: '已进行价格复权处理'
            },
            traps: [
                { type: 'wick_misjudge', description: '上影线是试盘还是出货？', strength: 0.7 },
                { type: 'event_overlay', description: '当日有利好消息公布，可能混淆判断', event: '业绩预增公告' }
            ]
        },
        {
            id: 4,
            name: '乌云压城',
            description: '敌军攻破防线，形势急转直下',
            klineData: [
                { open: 120, high: 128, low: 118, close: 126, volume: 110000 },
                { open: 126, high: 130, low: 124, close: 129, volume: 95000 },
                { open: 129, high: 130, low: 118, close: 120, volume: 155000 }
            ],
            correctPattern: 'dark_cloud',
            correctDirection: 'bearish',
            source: {
                market: '模拟历史数据 - 2022年6月拐点',
                dataSource: '课堂教学数据库 #CAL-2022-0628',
                collectionTime: '2022-06-28 15:00 CST',
                preCalculation: '已调整大额分红影响'
            },
            traps: [
                { type: 'volume_divergence', description: '放量下跌但接盘踊跃', threshold: 140000 },
                { type: 'trend_deviation', description: '长期趋势仍向上，是否为短期调整？', strength: 0.5 }
            ]
        },
        {
            id: 5,
            name: '十字迷局',
            description: '多空僵持，影线暗藏玄机',
            klineData: [
                { open: 105, high: 110, low: 102, close: 108, volume: 82000 },
                { open: 108, high: 112, low: 105, close: 109, volume: 78000 },
                { open: 109, high: 115, low: 103, close: 109, volume: 160000 }
            ],
            correctPattern: 'long_legged',
            correctDirection: 'neutral',
            source: {
                market: '模拟历史数据 - 2023年10月震荡期',
                dataSource: '课堂教学数据库 #CAL-2023-1012',
                collectionTime: '2023-10-12 15:00 CST',
                preCalculation: '已进行波动率标准化处理'
            },
            traps: [
                { type: 'wick_misjudge', description: '上下影线哪个更重要？', strength: 0.8 },
                { type: 'event_overlay', description: '盘后将公布重要经济数据', event: 'CPI数据公布' },
                { type: 'volume_divergence', description: '放量十字星是变盘信号还是出货？', threshold: 150000 }
            ]
        }
    ];

    function analyzeKLine(data) {
        const open = data.open;
        const high = data.high;
        const low = data.low;
        const close = data.close;
        const volume = data.volume;
        
        const bodySize = Math.abs(close - open);
        const upperWick = high - Math.max(open, close);
        const lowerWick = Math.min(open, close) - low;
        const totalRange = high - low;
        
        const isBullish = close > open;
        const isBearish = close < open;
        
        const avgVolume = sampleLevels.reduce((sum, level) => {
            return sum + level.klineData.reduce((s, k) => s + k.volume, 0);
        }, 0) / sampleLevels.reduce((sum, level) => sum + level.klineData.length, 0);
        
        const volumeStatus = volume > avgVolume * 1.5 ? 'very_high' :
                           volume > avgVolume * 1.2 ? 'high' :
                           volume < avgVolume * 0.8 ? 'low' : 'normal';
        
        const patternFeatures = {
            bodySize,
            upperWick,
            lowerWick,
            totalRange,
            bodyToRangeRatio: totalRange > 0 ? bodySize / totalRange : 0,
            upperWickToBodyRatio: bodySize > 0 ? upperWick / bodySize : Infinity,
            lowerWickToBodyRatio: bodySize > 0 ? lowerWick / bodySize : Infinity,
            isBullish,
            isBearish,
            isDoji: bodySize < totalRange * 0.1,
            volumeStatus,
            volume,
            avgVolume
        };
        
        return patternFeatures;
    }

    function identifyPattern(features) {
        const identified = [];
        
        if (features.isDoji) {
            if (features.upperWickToBodyRatio > 2 && features.lowerWickToBodyRatio > 2) {
                identified.push({
                    pattern: patterns.neutral.find(p => p.id === 'long_legged'),
                    confidence: 0.85
                });
            } else {
                identified.push({
                    pattern: patterns.bullish.find(p => p.id === 'doji_bullish'),
                    confidence: 0.6
                });
                identified.push({
                    pattern: patterns.bearish.find(p => p.id === 'doji_bearish'),
                    confidence: 0.6
                });
            }
        }
        
        if (features.isBullish && features.lowerWickToBodyRatio > 2 && features.bodyToRangeRatio < 0.3) {
            identified.push({
                pattern: patterns.bullish.find(p => p.id === 'hammer'),
                confidence: 0.75
            });
        }
        
        if (features.isBearish && features.upperWickToBodyRatio > 2 && features.bodyToRangeRatio < 0.3) {
            identified.push({
                pattern: patterns.bearish.find(p => p.id === 'shooting_star'),
                confidence: 0.75
            });
        }
        
        if (features.bodyToRangeRatio > 0.8 && features.upperWick < features.bodySize * 0.1 && features.lowerWick < features.bodySize * 0.1) {
            identified.push({
                pattern: patterns.neutral.find(p => p.id === 'marubozu'),
                confidence: 0.9
            });
        }
        
        if (features.bodyToRangeRatio < 0.4 && features.upperWickToBodyRatio > 1 && features.lowerWickToBodyRatio > 1) {
            identified.push({
                pattern: patterns.neutral.find(p => p.id === 'spinning_top'),
                confidence: 0.7
            });
        }
        
        if (identified.length === 0) {
            identified.push({
                pattern: { id: 'unknown', name: '普通K线', desc: '无明显特殊形态' },
                confidence: 0.5
            });
        }
        
        return identified.sort((a, b) => b.confidence - a.confidence);
    }

    function checkVolumePriceRelation(currentKLine, prevKLine) {
        const priceChange = currentKLine.close - prevKLine.close;
        const priceChangePercent = (priceChange / prevKLine.close) * 100;
        const volumeChange = currentKLine.volume - prevKLine.volume;
        const volumeChangePercent = (volumeChange / prevKLine.volume) * 100;
        
        let relation = '';
        let divergence = false;
        
        if (priceChange > 0 && volumeChange > 0) {
            relation = '价涨量增 - 健康上涨趋势';
        } else if (priceChange > 0 && volumeChange < 0) {
            relation = '价涨量缩 - 上涨动能不足，警惕背离';
            divergence = true;
        } else if (priceChange < 0 && volumeChange > 0) {
            relation = '价跌量增 - 恐慌性抛售，下跌动能强';
        } else if (priceChange < 0 && volumeChange < 0) {
            relation = '价跌量缩 - 下跌动能减弱，可能企稳';
        } else {
            relation = '量价关系不明确';
        }
        
        return {
            priceChange,
            priceChangePercent,
            volumeChange,
            volumeChangePercent,
            relation,
            divergence
        };
    }

    function analyzeWicks(features, context = {}) {
        const analysis = {
            upperWick: {
                length: features.upperWick,
                significance: features.upperWickToBodyRatio > 2 ? 'high' : 
                             features.upperWickToBodyRatio > 1 ? 'medium' : 'low',
                interpretation: ''
            },
            lowerWick: {
                length: features.lowerWick,
                significance: features.lowerWickToBodyRatio > 2 ? 'high' : 
                             features.lowerWickToBodyRatio > 1 ? 'medium' : 'low',
                interpretation: ''
            }
        };
        
        if (analysis.upperWick.significance === 'high') {
            if (context.position === 'high') {
                analysis.upperWick.interpretation = '高位长上影线 - 抛压沉重，主力可能出货';
            } else if (context.position === 'low') {
                analysis.upperWick.interpretation = '低位长上影线 - 试盘动作，关注后续能否突破';
            } else {
                analysis.upperWick.interpretation = '长上影线 - 上方压力较大';
            }
        }
        
        if (analysis.lowerWick.significance === 'high') {
            if (context.position === 'low') {
                analysis.lowerWick.interpretation = '低位长下影线 - 支撑强劲，多头反击信号';
            } else if (context.position === 'high') {
                analysis.lowerWick.interpretation = '高位长下影线 - 多空争夺剧烈，可能是诱多';
            } else {
                analysis.lowerWick.interpretation = '长下影线 - 下方有一定支撑';
            }
        }
        
        return analysis;
    }

    function getLevel(levelId) {
        return sampleLevels.find(l => l.id === levelId) || sampleLevels[0];
    }

    function getAllLevels() {
        return sampleLevels;
    }

    function getAllPatterns() {
        return {
            bullish: patterns.bullish,
            bearish: patterns.bearish,
            neutral: patterns.neutral
        };
    }

    function traceDataSource(level) {
        const currentKLine = level.klineData[level.klineData.length - 1];
        const features = analyzeKLine(currentKLine);
        const patternsIdentified = identifyPattern(features);
        
        let prevKLine = null;
        let volumeRelation = null;
        if (level.klineData.length >= 2) {
            prevKLine = level.klineData[level.klineData.length - 2];
            volumeRelation = checkVolumePriceRelation(currentKLine, prevKLine);
        }
        
        return {
            levelInfo: {
                id: level.id,
                name: level.name,
                description: level.description
            },
            source: level.source,
            rawData: {
                open: currentKLine.open,
                high: currentKLine.high,
                low: currentKLine.low,
                close: currentKLine.close,
                volume: currentKLine.volume
            },
            calculatedFeatures: features,
            patternsIdentified: patternsIdentified,
            volumeRelation: volumeRelation,
            traps: level.traps
        };
    }

    return {
        analyzeKLine,
        identifyPattern,
        checkVolumePriceRelation,
        analyzeWicks,
        getLevel,
        getAllLevels,
        getAllPatterns,
        traceDataSource,
        patterns
    };
})();
