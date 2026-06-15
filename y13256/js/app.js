const App = {
    init() {
        DataStore.init();
        ImportModule.init();
        PhotoModule.init();
        UI.init();

        console.log('学校接送容量复核系统已启动');
        console.log('功能模块:', {
            '数据存储': '✅ 已加载',
            '材料导入': '✅ 已加载',
            '复核验证': '✅ 已加载',
            '操作管理': '✅ 已加载',
            '照片补录': '✅ 已加载',
            '截图说明': '✅ 已加载',
            '用户界面': '✅ 已加载'
        });

        this.injectDemoData();
    },

    injectDemoData() {
        if (DataStore.records.length === 0) {
            const demoRecords = [
                {
                    schoolName: '第一实验小学',
                    date: '2026-06-15',
                    morningCapacity: 200,
                    eveningCapacity: 180,
                    capacity: 200,
                    primarySource: 'ledger',
                    sourceFile: '审批台账_20260615.xlsx',
                    status: RecordStatus.PENDING,
                    hasConflict: false,
                    hasModification: true,
                    needsManualReview: false,
                    conflictNote: '',
                    originalMorningCapacity: 180,
                    originalEveningCapacity: 160,
                    issues: ['审批台账与正常记录口径不一致', '早晚高峰容量差异20人'],
                    changes: [
                        {
                            id: 'CHG_DEMO_1',
                            type: ChangeType.LEDGER,
                            source: '审批台账',
                            sourceFile: '审批台账_20260615.xlsx',
                            lineNumber: 2,
                            field: '早晚高峰容量',
                            oldValue: null,
                            newValue: '早200人 / 晚180人',
                            description: '从审批台账导入初始数据',
                            timestamp: '2026-06-15T09:00:00.000Z'
                        },
                        {
                            id: 'CHG_DEMO_2',
                            type: ChangeType.MODIFIED,
                            source: '正常记录',
                            sourceFile: '正常记录_20260615.csv',
                            lineNumber: 2,
                            field: '早晚高峰容量',
                            oldValue: '早200人 / 晚180人',
                            newValue: '早180人 / 晚160人',
                            description: '正常记录与审批台账口径不一致',
                            timestamp: '2026-06-15T09:30:00.000Z'
                        }
                    ],
                    photos: [],
                    notes: []
                },
                {
                    schoolName: '第二中学',
                    date: '2026-06-15',
                    morningCapacity: 250,
                    eveningCapacity: 350,
                    capacity: 300,
                    primarySource: 'ledger',
                    sourceFile: '审批台账_20260615.xlsx',
                    status: RecordStatus.CONFLICT,
                    hasConflict: true,
                    hasModification: true,
                    needsManualReview: true,
                    conflictNote: '检测到旧方案覆盖新意见，已挂起待人工确认，不给出稳定结论',
                    originalMorningCapacity: 300,
                    originalEveningCapacity: 400,
                    issues: [
                        '⚠️ 审批台账覆盖了较新的正常记录，可能存在旧方案覆盖新意见',
                        '早晚高峰容量差异100人，可能口径不一致',
                        '标称容量(300)与早高峰容量(250)不一致'
                    ],
                    changes: [
                        {
                            id: 'CHG_DEMO_3',
                            type: ChangeType.LEDGER,
                            source: '审批台账',
                            sourceFile: '审批台账_20260615.xlsx',
                            lineNumber: 3,
                            field: '早晚高峰容量',
                            oldValue: null,
                            newValue: '早250人 / 晚350人',
                            description: '从审批台账导入初始数据',
                            timestamp: '2026-06-15T08:00:00.000Z'
                        },
                        {
                            id: 'CHG_DEMO_4',
                            type: ChangeType.CONFLICT,
                            source: '正常记录',
                            sourceFile: '正常记录_20260615.csv',
                            lineNumber: 5,
                            field: '早晚高峰容量',
                            oldValue: '早250人 / 晚350人',
                            newValue: '早300人 / 晚400人',
                            description: '⚠️ 冲突：审批台账覆盖了较新的正常记录',
                            timestamp: '2026-06-15T10:00:00.000Z'
                        }
                    ],
                    photos: [],
                    notes: []
                },
                {
                    schoolName: '第三幼儿园',
                    date: '2026-06-15',
                    morningCapacity: 150,
                    eveningCapacity: 140,
                    capacity: 150,
                    primarySource: 'ledger',
                    sourceFile: '审批台账_20260615.xlsx',
                    status: RecordStatus.DONE,
                    hasConflict: false,
                    hasModification: false,
                    needsManualReview: false,
                    conflictNote: '',
                    issues: [],
                    changes: [
                        {
                            id: 'CHG_DEMO_5',
                            type: ChangeType.LEDGER,
                            source: '审批台账',
                            sourceFile: '审批台账_20260615.xlsx',
                            lineNumber: 4,
                            field: '早晚高峰容量',
                            oldValue: null,
                            newValue: '早150人 / 晚140人',
                            description: '从审批台账导入初始数据',
                            timestamp: '2026-06-15T09:00:00.000Z'
                        },
                        {
                            id: 'CHG_DEMO_6',
                            type: ChangeType.MANUAL,
                            source: '人工操作',
                            field: '记录状态',
                            oldValue: '待补材料',
                            newValue: '已处理',
                            description: '用户确认记录无误',
                            timestamp: '2026-06-15T14:30:00.000Z'
                        }
                    ],
                    photos: [],
                    notes: [],
                    confirmedAt: '2026-06-15T14:30:00.000Z',
                    confirmedBy: '当前用户'
                }
            ];

            demoRecords.forEach(r => DataStore.addRecord(r));

            DataStore.sourceFiles = {
                ledger: { name: '审批台账_20260615.xlsx', size: 12345, lastModified: Date.now() },
                normal: { name: '正常记录_20260615.csv', size: 6789, lastModified: Date.now() },
                verbal: '第一实验小学早高峰调整为200人，第三幼儿园保持不变'
            };
            DataStore.save();

            UI.updateCounts();
            UI.renderRecordList();

            console.log('已注入演示数据，便于测试功能');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
