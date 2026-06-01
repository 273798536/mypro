const HeatPumpData = {
    config: {
        copNormalRange: [2.5, 5.5],
        copLowRange: [1.5, 2.5],
        copHighRange: [5.5, 7.0],
        minDeltaT: 3.0,
        ratedPowerRange: [5, 25],
        waterFlow: 6.0,
        specificHeat: 4.1868,
        defrostDeltaTThreshold: 2.0,
        lateEntryThresholdMinutes: 30
    },

    sampleData: [
        {
            id: 'REC-001',
            timestamp: '2026-06-01 08:00:00',
            recordCreatedAt: '2026-06-01 08:00:05',
            tempIn: 40.0,
            tempOut: 45.0,
            deltaT: 5.0,
            power: 10.0,
            defrostFlag: false,
            remark: '系统启动后稳定运行',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 08:00:05',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-002',
            timestamp: '2026-06-01 08:15:00',
            recordCreatedAt: '2026-06-01 08:15:03',
            tempIn: 40.5,
            tempOut: 45.8,
            deltaT: 5.3,
            power: 9.8,
            defrostFlag: false,
            remark: '正常运行',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 08:15:03',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-003',
            timestamp: '2026-06-01 08:30:00',
            recordCreatedAt: '2026-06-01 08:30:04',
            tempIn: null,
            tempOut: 46.0,
            deltaT: null,
            power: 10.2,
            defrostFlag: false,
            remark: '进水温度传感器通信中断，晚补后恢复',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 08:30:04',
                    operator: '系统',
                    changes: null
                },
                {
                    action: '修改',
                    timestamp: '2026-06-01 09:05:20',
                    operator: '运维-张工',
                    changes: {
                        tempIn: { old: null, new: 41.0 },
                        deltaT: { old: null, new: 5.0 },
                        remark: { old: '进水温度传感器通信中断', new: '进水温度传感器通信中断，晚补后恢复' }
                    }
                }
            ],
            validation: {}
        },
        {
            id: 'REC-004',
            timestamp: '2026-06-01 08:45:00',
            recordCreatedAt: '2026-06-01 09:20:15',
            tempIn: 41.2,
            tempOut: 46.5,
            deltaT: 5.3,
            power: 10.5,
            defrostFlag: false,
            remark: '网络中断后晚补数据',
            source: '晚补采集',
            isLateEntry: true,
            history: [
                {
                    action: '晚补创建',
                    timestamp: '2026-06-01 09:20:15',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-005',
            timestamp: '2026-06-01 09:00:00',
            recordCreatedAt: '2026-06-01 09:00:06',
            tempIn: 41.5,
            tempOut: 42.0,
            deltaT: 0.5,
            power: 12.0,
            defrostFlag: true,
            remark: '正常除霜周期',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 09:00:06',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-006',
            timestamp: '2026-06-01 09:15:00',
            recordCreatedAt: '2026-06-01 09:15:03',
            tempIn: 41.8,
            tempOut: 42.2,
            deltaT: 0.4,
            power: 11.5,
            defrostFlag: false,
            remark: '温差异常，疑似除霜漏标',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 09:15:03',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-007',
            timestamp: '2026-06-01 09:30:00',
            recordCreatedAt: '2026-06-01 09:30:05',
            tempIn: 42.0,
            tempOut: 47.5,
            deltaT: 5.5,
            power: -9.8,
            defrostFlag: false,
            remark: '功率采集异常，反号',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 09:30:05',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-008',
            timestamp: '2026-06-01 09:45:00',
            recordCreatedAt: '2026-06-01 09:45:04',
            tempIn: 42.5,
            tempOut: 48.0,
            deltaT: 5.5,
            power: 10.0,
            defrostFlag: false,
            remark: '备注修改：运行状态良好，COP稳定',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 09:45:04',
                    operator: '系统',
                    changes: null
                },
                {
                    action: '修改备注',
                    timestamp: '2026-06-01 10:15:30',
                    operator: '运维-李工',
                    changes: {
                        remark: { old: '正常运行', new: '备注修改：运行状态良好，COP稳定' }
                    }
                }
            ],
            validation: {}
        },
        {
            id: 'REC-009',
            timestamp: '2026-06-01 10:00:00',
            recordCreatedAt: '2026-06-01 10:00:06',
            tempIn: 43.0,
            tempOut: 45.5,
            deltaT: 2.5,
            power: 8.0,
            defrostFlag: false,
            remark: '负载较低，COP偏低',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 10:00:06',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-010',
            timestamp: '2026-06-01 10:15:00',
            recordCreatedAt: '2026-06-01 10:15:03',
            tempIn: 43.5,
            tempOut: 50.0,
            deltaT: 6.5,
            power: 6.0,
            defrostFlag: false,
            remark: '功率异常偏低，COP偏高',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 10:15:03',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-011',
            timestamp: '2026-06-01 10:30:00',
            recordCreatedAt: '2026-06-01 10:30:05',
            tempIn: 44.0,
            tempOut: null,
            deltaT: null,
            power: 11.0,
            defrostFlag: false,
            remark: '出水温度缺测',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 10:30:05',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-012',
            timestamp: '2026-06-01 10:45:00',
            recordCreatedAt: '2026-06-01 10:45:04',
            tempIn: 44.5,
            tempOut: 50.5,
            deltaT: 6.0,
            power: 11.5,
            defrostFlag: false,
            remark: '正常运行，COP良好',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 10:45:04',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-013',
            timestamp: '2026-06-01 11:00:00',
            recordCreatedAt: '2026-06-01 11:00:06',
            tempIn: 45.0,
            tempOut: 45.5,
            deltaT: 0.5,
            power: 11.8,
            defrostFlag: false,
            remark: '温差接近0，功率正常，除霜漏标怀疑',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 11:00:06',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-014',
            timestamp: '2026-06-01 11:15:00',
            recordCreatedAt: '2026-06-01 11:45:22',
            tempIn: 45.2,
            tempOut: 51.0,
            deltaT: 5.8,
            power: null,
            defrostFlag: false,
            remark: '晚补数据，功率字段缺失',
            source: '晚补采集',
            isLateEntry: true,
            history: [
                {
                    action: '晚补创建',
                    timestamp: '2026-06-01 11:45:22',
                    operator: '系统',
                    changes: null
                }
            ],
            validation: {}
        },
        {
            id: 'REC-015',
            timestamp: '2026-06-01 11:30:00',
            recordCreatedAt: '2026-06-01 11:30:05',
            tempIn: 45.5,
            tempOut: 51.5,
            deltaT: 6.0,
            power: 12.0,
            defrostFlag: false,
            remark: '高负荷运行，COP正常',
            source: '自动采集',
            isLateEntry: false,
            history: [
                {
                    action: '创建',
                    timestamp: '2026-06-01 11:30:05',
                    operator: '系统',
                    changes: null
                },
                {
                    action: '修改',
                    timestamp: '2026-06-01 14:20:10',
                    operator: '暖通-王工',
                    changes: {
                        remark: { old: '高负荷运行', new: '高负荷运行，COP正常' },
                        power: { old: 12.5, new: 12.0 }
                    }
                }
            ],
            validation: {}
        }
    ],

    anomalyTypes: {
        MISSING_FIELD: {
            code: 'MISSING_FIELD',
            name: '字段缺失',
            level: 'warning',
            description: '关键数据字段为空'
        },
        POWER_SIGN_ERROR: {
            code: 'POWER_SIGN_ERROR',
            name: '功率反号',
            level: 'danger',
            description: '功率值为负数'
        },
        DEFROST_MISSED: {
            code: 'DEFROST_MISSED',
            name: '除霜漏标',
            level: 'danger',
            description: '温差异常偏小但未标记除霜'
        },
        LATE_ENTRY: {
            code: 'LATE_ENTRY',
            name: '晚补记录',
            level: 'info',
            description: '数据记录时间晚于采集时间超过阈值'
        },
        COP_LOW: {
            code: 'COP_LOW',
            name: 'COP偏低',
            level: 'warning',
            description: 'COP低于正常范围下限'
        },
        COP_HIGH: {
            code: 'COP_HIGH',
            name: 'COP偏高',
            level: 'warning',
            description: 'COP高于正常范围上限'
        },
        COP_ANOMALY: {
            code: 'COP_ANOMALY',
            name: 'COP异常',
            level: 'danger',
            description: 'COP超出合理范围'
        },
        POWER_ABNORMAL: {
            code: 'POWER_ABNORMAL',
            name: '功率异常',
            level: 'warning',
            description: '功率超出额定范围'
        },
        TEMP_ABNORMAL: {
            code: 'TEMP_ABNORMAL',
            name: '温度异常',
            level: 'warning',
            description: '温度值超出合理范围'
        }
    }
};
