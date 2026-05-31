const sampleContracts = [
    new AnchorContract({
        id: 'contract_001',
        anchorId: 'anchor_001',
        anchorName: '小美同学',
        contractNo: 'HT-2024-001',
        minimumGuarantee: 50000,
        commissionRate: 0.7,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        platform: '抖音',
        status: 'active'
    }),
    new AnchorContract({
        id: 'contract_002',
        anchorId: 'anchor_002',
        anchorName: '大V主播',
        contractNo: 'HT-2024-002',
        minimumGuarantee: 100000,
        commissionRate: 0.75,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        platform: '快手',
        status: 'active'
    }),
    new AnchorContract({
        id: 'contract_003',
        anchorId: 'anchor_003',
        anchorName: '吃货小王',
        contractNo: 'HT-2024-003',
        minimumGuarantee: 30000,
        commissionRate: 0.65,
        startDate: '2024-03-01',
        endDate: '2025-02-28',
        platform: '淘宝直播',
        status: 'active'
    })
];

const sampleStreams = {
    anchor_001: [
        new LiveStream({
            id: 'stream_001',
            anchorId: 'anchor_001',
            streamDate: '2024-05-01',
            streamTitle: '五一美妆专场',
            duration: 240,
            giftRevenue: 8500,
            goodsRevenue: 25000,
            otherRevenue: 1200,
            receiptStatus: 'received',
            receiptDate: '2024-05-05',
            platform: '抖音',
            remark: '正常回单'
        }),
        new LiveStream({
            id: 'stream_002',
            anchorId: 'anchor_001',
            streamDate: '2024-05-05',
            streamTitle: '日常聊天直播',
            duration: 180,
            giftRevenue: 3200,
            goodsRevenue: 0,
            otherRevenue: 0,
            receiptStatus: 'received',
            receiptDate: '2024-05-08',
            platform: '抖音',
            remark: '正常回单'
        }),
        new LiveStream({
            id: 'stream_003',
            anchorId: 'anchor_001',
            streamDate: '2024-05-10',
            streamTitle: '品牌合作专场',
            duration: 300,
            giftRevenue: 5600,
            goodsRevenue: 18000,
            otherRevenue: 3500,
            receiptStatus: 'delayed',
            receiptDate: null,
            platform: '抖音',
            remark: '品牌方回单延迟，预计5月20日到账'
        }),
        new LiveStream({
            id: 'stream_004',
            anchorId: 'anchor_001',
            streamDate: '2024-05-15',
            streamTitle: '618预热场',
            duration: 360,
            giftRevenue: 12000,
            goodsRevenue: 35000,
            otherRevenue: 2800,
            receiptStatus: 'missing',
            receiptDate: null,
            platform: '抖音',
            remark: '平台回单异常，正在联系运营核实'
        }),
        new LiveStream({
            id: 'stream_005',
            anchorId: 'anchor_001',
            streamDate: '2024-05-20',
            streamTitle: '520特别场',
            duration: 240,
            giftRevenue: 9800,
            goodsRevenue: 22000,
            otherRevenue: 1500,
            receiptStatus: 'received',
            receiptDate: '2024-05-23',
            platform: '抖音',
            remark: '正常回单'
        })
    ],
    anchor_002: [
        new LiveStream({
            id: 'stream_006',
            anchorId: 'anchor_002',
            streamDate: '2024-05-02',
            streamTitle: '游戏直播日常',
            duration: 480,
            giftRevenue: 45000,
            goodsRevenue: 15000,
            otherRevenue: 8000,
            receiptStatus: 'received',
            receiptDate: '2024-05-06',
            platform: '快手',
            remark: '正常回单'
        }),
        new LiveStream({
            id: 'stream_007',
            anchorId: 'anchor_002',
            streamDate: '2024-05-08',
            streamTitle: '电竞比赛解说',
            duration: 360,
            giftRevenue: 32000,
            goodsRevenue: 0,
            otherRevenue: 12000,
            receiptStatus: 'received',
            receiptDate: '2024-05-12',
            platform: '快手',
            remark: '正常回单'
        }),
        new LiveStream({
            id: 'stream_008',
            anchorId: 'anchor_002',
            streamDate: '2024-05-18',
            streamTitle: '户外直播',
            duration: 300,
            giftRevenue: 28000,
            goodsRevenue: 12000,
            otherRevenue: 5000,
            receiptStatus: 'received',
            receiptDate: '2024-05-22',
            platform: '快手',
            remark: '正常回单'
        })
    ],
    anchor_003: [
        new LiveStream({
            id: 'stream_009',
            anchorId: 'anchor_003',
            streamDate: '2024-05-03',
            streamTitle: '零食测评',
            duration: 180,
            giftRevenue: 2000,
            goodsRevenue: 8000,
            otherRevenue: 500,
            receiptStatus: 'received',
            receiptDate: '2024-05-07',
            platform: '淘宝直播',
            remark: '正常回单'
        }),
        new LiveStream({
            id: 'stream_010',
            anchorId: 'anchor_003',
            streamDate: '2024-05-12',
            streamTitle: '生鲜专场',
            duration: 240,
            giftRevenue: 1500,
            goodsRevenue: 12000,
            otherRevenue: 800,
            receiptStatus: 'delayed',
            receiptDate: null,
            platform: '淘宝直播',
            remark: '生鲜类回单周期较长'
        }),
        new LiveStream({
            id: 'stream_011',
            anchorId: 'anchor_003',
            streamDate: '2024-05-22',
            streamTitle: '酒水专场',
            duration: 210,
            giftRevenue: 1800,
            goodsRevenue: 9500,
            otherRevenue: 600,
            receiptStatus: 'missing',
            receiptDate: null,
            platform: '淘宝直播',
            remark: '酒水供应商回单缺失'
        })
    ]
};

const sampleDeductions = {
    anchor_001: [
        new Deduction({
            id: 'ded_001',
            settlementId: 'set_001',
            name: '平台服务费',
            amount: 5200,
            type: 'platform_fee',
            source: '系统自动计算',
            sourceId: 'auto_001',
            remark: '按流水10%扣除'
        }),
        new Deduction({
            id: 'ded_002',
            settlementId: 'set_001',
            name: '个人所得税',
            amount: 8500,
            type: 'tax',
            source: '税务系统',
            sourceId: 'tax_001',
            remark: '按劳务报酬计算'
        }),
        new Deduction({
            id: 'ded_003',
            settlementId: 'set_001',
            name: '违约罚款',
            amount: 2000,
            type: 'penalty',
            source: '运营部',
            sourceId: 'pen_001',
            remark: '5月10日直播迟到30分钟',
            isDuplicate: false
        }),
        new Deduction({
            id: 'ded_004',
            settlementId: 'set_001',
            name: '违约罚款',
            amount: 2000,
            type: 'penalty',
            source: '运营部(重复录入)',
            sourceId: 'pen_002',
            remark: '5月10日直播迟到30分钟 - 重复录入',
            isDuplicate: true,
            duplicateWith: 'ded_003'
        })
    ],
    anchor_002: [
        new Deduction({
            id: 'ded_005',
            settlementId: 'set_002',
            name: '平台服务费',
            amount: 12000,
            type: 'platform_fee',
            source: '系统自动计算',
            sourceId: 'auto_002',
            remark: '按流水10%扣除'
        }),
        new Deduction({
            id: 'ded_006',
            settlementId: 'set_002',
            name: '个人所得税',
            amount: 18000,
            type: 'tax',
            source: '税务系统',
            sourceId: 'tax_002',
            remark: '按劳务报酬计算'
        })
    ],
    anchor_003: [
        new Deduction({
            id: 'ded_007',
            settlementId: 'set_003',
            name: '平台服务费',
            amount: 1800,
            type: 'platform_fee',
            source: '系统自动计算',
            sourceId: 'auto_003',
            remark: '按流水10%扣除'
        }),
        new Deduction({
            id: 'ded_008',
            settlementId: 'set_003',
            name: '退货扣款',
            amount: 3500,
            type: 'other',
            source: '售后系统',
            sourceId: 'refund_001',
            remark: '生鲜专场退货率超标'
        })
    ]
};

const sampleNotes = {
    anchor_001: [
        new ReviewNote({
            id: 'note_001',
            settlementId: 'set_001',
            type: 'receipt',
            content: '5月15日直播回单缺失，已联系抖音运营小王，预计5月28日补回',
            createdBy: '财务-张三',
            createdAt: '2024-05-25T10:30:00Z'
        }),
        new ReviewNote({
            id: 'note_002',
            settlementId: 'set_001',
            type: 'deduction',
            content: '发现两笔相同的违约罚款，已标记为重复扣款，需运营确认删除哪一笔',
            createdBy: '财务-张三',
            createdAt: '2024-05-25T11:15:00Z'
        })
    ],
    anchor_003: [
        new ReviewNote({
            id: 'note_003',
            settlementId: 'set_003',
            type: 'minimum',
            content: '本月流水未达保底，已触发保底机制，需确认是否符合合同条款',
            createdBy: '财务-李四',
            createdAt: '2024-05-26T09:00:00Z'
        })
    ]
};

function generateSampleSettlements() {
    const settlements = [];
    
    const contract1 = sampleContracts[0];
    const streams1 = sampleStreams.anchor_001;
    const deductions1 = sampleDeductions.anchor_001;
    const notes1 = sampleNotes.anchor_001;
    
    const totalRevenue1 = streams1.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalDeductions1 = deductions1.reduce((sum, d) => sum + d.amount, 0);
    const commission1 = totalRevenue1 * contract1.commissionRate;
    const isMinimumTriggered1 = commission1 - totalDeductions1 < contract1.minimumGuarantee;
    const finalAmount1 = isMinimumTriggered1 ? contract1.minimumGuarantee : (commission1 - totalDeductions1);
    
    const warnings1 = [];
    const hints1 = [];
    
    const missingReceipts1 = streams1.filter(s => s.receiptStatus === 'missing');
    const delayedReceipts1 = streams1.filter(s => s.receiptStatus === 'delayed');
    const duplicateDeductions1 = deductions1.filter(d => d.isDuplicate);
    
    if (missingReceipts1.length > 0) {
        warnings1.push(`存在 ${missingReceipts1.length} 场直播回单缺失`);
        hints1.push(`请联系平台运营补回以下直播回单：${missingReceipts1.map(s => s.streamTitle).join('、')}`);
    }
    if (delayedReceipts1.length > 0) {
        warnings1.push(`存在 ${delayedReceipts1.length} 场直播回单延迟`);
        hints1.push(`关注延迟回单的到账情况，可暂缓结算或按部分到账金额处理`);
    }
    if (duplicateDeductions1.length > 0) {
        warnings1.push(`检测到 ${duplicateDeductions1.length} 笔疑似重复扣款`);
        hints1.push(`请与扣款来源部门确认重复扣款的处理方式，建议删除重复项`);
    }
    if (isMinimumTriggered1) {
        warnings1.push(`本月流水未达标，已触发保底机制`);
        hints1.push(`请复核保底条款，确认主播本月直播时长/场次是否符合保底要求`);
    }
    
    let status1 = 'ready';
    if (missingReceipts1.length > 0 || duplicateDeductions1.length > 0) {
        status1 = 'pending';
    } else if (delayedReceipts1.length > 0 || isMinimumTriggered1) {
        status1 = 'review';
    }
    
    settlements.push(new Settlement({
        id: 'set_001',
        anchorId: contract1.anchorId,
        anchorName: contract1.anchorName,
        contractId: contract1.id,
        settlementMonth: '2024-05',
        streams: streams1,
        deductions: deductions1,
        notes: notes1,
        totalStreamRevenue: totalRevenue1,
        totalDeductions: totalDeductions1,
        commissionAmount: commission1,
        minimumGuarantee: contract1.minimumGuarantee,
        isMinimumTriggered: isMinimumTriggered1,
        finalAmount: finalAmount1,
        status: status1,
        warnings: warnings1,
        actionHints: hints1
    }));
    
    const contract2 = sampleContracts[1];
    const streams2 = sampleStreams.anchor_002;
    const deductions2 = sampleDeductions.anchor_002;
    
    const totalRevenue2 = streams2.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalDeductions2 = deductions2.reduce((sum, d) => sum + d.amount, 0);
    const commission2 = totalRevenue2 * contract2.commissionRate;
    const isMinimumTriggered2 = commission2 - totalDeductions2 < contract2.minimumGuarantee;
    const finalAmount2 = isMinimumTriggered2 ? contract2.minimumGuarantee : (commission2 - totalDeductions2);
    
    settlements.push(new Settlement({
        id: 'set_002',
        anchorId: contract2.anchorId,
        anchorName: contract2.anchorName,
        contractId: contract2.id,
        settlementMonth: '2024-05',
        streams: streams2,
        deductions: deductions2,
        notes: [],
        totalStreamRevenue: totalRevenue2,
        totalDeductions: totalDeductions2,
        commissionAmount: commission2,
        minimumGuarantee: contract2.minimumGuarantee,
        isMinimumTriggered: isMinimumTriggered2,
        finalAmount: finalAmount2,
        status: 'ready',
        warnings: [],
        actionHints: []
    }));
    
    const contract3 = sampleContracts[2];
    const streams3 = sampleStreams.anchor_003;
    const deductions3 = sampleDeductions.anchor_003;
    const notes3 = sampleNotes.anchor_003;
    
    const totalRevenue3 = streams3.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalDeductions3 = deductions3.reduce((sum, d) => sum + d.amount, 0);
    const commission3 = totalRevenue3 * contract3.commissionRate;
    const isMinimumTriggered3 = commission3 - totalDeductions3 < contract3.minimumGuarantee;
    const finalAmount3 = isMinimumTriggered3 ? contract3.minimumGuarantee : (commission3 - totalDeductions3);
    
    const warnings3 = [];
    const hints3 = [];
    
    const missingReceipts3 = streams3.filter(s => s.receiptStatus === 'missing');
    if (missingReceipts3.length > 0) {
        warnings3.push(`存在 ${missingReceipts3.length} 场直播回单缺失`);
        hints3.push(`酒水供应商回单缺失，请联系采购部催促供应商尽快提供`);
    }
    if (isMinimumTriggered3) {
        warnings3.push(`本月流水未达标，已触发保底机制`);
        hints3.push(`新主播首月，建议按保底发放，后续关注流水提升情况`);
    }
    
    settlements.push(new Settlement({
        id: 'set_003',
        anchorId: contract3.anchorId,
        anchorName: contract3.anchorName,
        contractId: contract3.id,
        settlementMonth: '2024-05',
        streams: streams3,
        deductions: deductions3,
        notes: notes3,
        totalStreamRevenue: totalRevenue3,
        totalDeductions: totalDeductions3,
        commissionAmount: commission3,
        minimumGuarantee: contract3.minimumGuarantee,
        isMinimumTriggered: isMinimumTriggered3,
        finalAmount: finalAmount3,
        status: 'review',
        warnings: warnings3,
        actionHints: hints3
    }));
    
    return settlements;
}
