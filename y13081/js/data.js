const WarehouseData = (function() {
    const HAZARD_LEVELS = {
        1: { name: '一级', color: 0xfc8181, label: '极度危险' },
        2: { name: '二级', color: 0xed8936, label: '高度危险' },
        3: { name: '三级', color: 0xecc94b, label: '中度危险' }
    };

    const STATUS_TYPES = {
        normal: { name: '正常', color: 0x48bb78 },
        warning: { name: '预警', color: 0xecc94b },
        error: { name: '异常', color: 0xfc8181 }
    };

    function generateContainers() {
        const containers = [];
        const areas = ['A', 'B', 'C'];
        let id = 1;

        areas.forEach((area, areaIdx) => {
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 4; col++) {
                    for (let level = 0; level < 3; level++) {
                        const levelNum = (id % 3) + 1;
                        const container = {
                            id: `WH-${String(id).padStart(4, '0')}`,
                            area: area,
                            row: row + 1,
                            col: col + 1,
                            level: level + 1,
                            hazardLevel: levelNum,
                            position: {
                                x: areaIdx * 12 + col * 2.5 - 10,
                                y: level * 2 + 1,
                                z: row * 3 - 4
                            },
                            cadSource: {
                                layerName: `危险品容器层_${area}区`,
                                lineNumber: 100 + id * 3 + row,
                                rawData: `LAYER ${area}_HAZARD; ID WH${id}; POS (${(areaIdx*12+col*2.5).toFixed(2)}, ${(row*3).toFixed(2)}, ${(level*2).toFixed(2)}); TYPE CONTAINER_${levelNum};`
                            },
                            name: getHazardName(levelNum)
                        };
                        containers.push(container);
                        id++;
                    }
                }
            }
        });

        return containers;
    }

    function getHazardName(level) {
        const names = {
            1: ['硝酸铵', '三硝基甲苯', '硝化甘油'],
            2: ['高锰酸钾', '过氧化氢', '金属钠'],
            3: ['乙醇', '丙酮', '柴油']
        };
        return names[level][Math.floor(Math.random() * names[level].length)];
    }

    function generateTimeSeriesData(containers, startHour = 0, endHour = 24, intervalMinutes = 30) {
        const frames = [];
        const totalMinutes = (endHour - startHour) * 60;
        const numFrames = Math.floor(totalMinutes / intervalMinutes) + 1;

        for (let i = 0; i < numFrames; i++) {
            const timeMinutes = startHour * 60 + i * intervalMinutes;
            const hours = Math.floor(timeMinutes / 60);
            const minutes = timeMinutes % 60;
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

            const frame = {
                index: i,
                time: timeStr,
                timestamp: timeMinutes,
                records: []
            };

            containers.forEach(container => {
                const baseTemp = 18 + container.hazardLevel * 2;
                const timeVariation = Math.sin((timeMinutes / 60) * Math.PI / 12) * 3;
                const randomVariation = (Math.random() - 0.5) * 2;
                let temperature = baseTemp + timeVariation + randomVariation;

                let status = 'normal';
                let hasError = false;
                let errorType = null;

                if (container.id === 'WH-0045') {
                    temperature = baseTemp + 8 + Math.sin(i * 0.3) * 3;
                    if (temperature > 28) {
                        status = 'warning';
                    }
                    if (temperature > 32) {
                        status = 'error';
                    }
                }

                if (container.id === 'WH-0023' && i >= 12 && i <= 20) {
                    temperature = baseTemp + 12 + Math.random() * 5;
                    status = 'error';
                    hasError = true;
                    errorType = 'overheat';
                }

                const record = {
                    containerId: container.id,
                    temperature: parseFloat(temperature.toFixed(1)),
                    status: status,
                    hasError: hasError,
                    errorType: errorType,
                    humidity: parseFloat((50 + Math.random() * 20).toFixed(1)),
                    pressure: parseFloat((101.3 + (Math.random() - 0.5) * 2).toFixed(2))
                };

                frame.records.push(record);
            });

            frames.push(frame);
        }

        return frames;
    }

    function generateBadDataRecords(containers) {
        const badRecords = [];

        const normalContainer = containers.find(c => c.id === 'WH-0015');
        const adjacentContainer = containers.find(c => c.id === 'WH-0016');

        if (normalContainer && adjacentContainer) {
            badRecords.push({
                id: 'BAD-001',
                type: 'merge_error',
                title: '相邻点位合并错误',
                description: `检测到 ${normalContainer.id} 与 ${adjacentContainer.id} 的传感器数据存在合并异常，两个相邻点位的温度数据被错误地叠加计算。`,
                affectedContainers: [normalContainer.id, adjacentContainer.id],
                cadReferences: [
                    { ...normalContainer.cadSource },
                    { ...adjacentContainer.cadSource }
                ],
                severity: 'warning',
                nextSteps: [
                    '检查CAD图纸中两点位的传感器接线图，确认物理地址分配',
                    '核对PLC组态软件中的点位映射配置表',
                    '使用万用表实地检测两个传感器的输出信号',
                    '在SCADA系统中重新配置点位地址并重启采集服务'
                ],
                detectedFrame: 15,
                rawValueMismatch: '合并后温度值比单点正常值偏高约2.3倍'
            });
        }

        const misplacedContainer = containers.find(c => c.id === 'WH-0037');
        if (misplacedContainer) {
            badRecords.push({
                id: 'BAD-002',
                type: 'position_mismatch',
                title: 'CAD图层位置不匹配',
                description: `容器 ${misplacedContainer.id} 在CAD图层中的坐标与现场实际摆放位置存在偏差，X轴偏移约0.8米。`,
                affectedContainers: [misplacedContainer.id],
                cadReferences: [
                    { ...misplacedContainer.cadSource, note: '原始CAD记录与现场实测不符' }
                ],
                severity: 'warning',
                nextSteps: [
                    '使用全站仪现场复核容器实际坐标',
                    '比对竣工图与设计图纸的差异',
                    '在CAD中更新容器位置并重新生成图层',
                    '同步更新三维模型中的坐标数据'
                ],
                detectedFrame: 8,
                positionOffset: { x: 0.8, y: 0, z: 0.2 }
            });
        }

        return badRecords;
    }

    function init() {
        const containers = generateContainers();
        const timeFrames = generateTimeSeriesData(containers);
        const badRecords = generateBadDataRecords(containers);

        return {
            containers: containers,
            timeFrames: timeFrames,
            badRecords: badRecords,
            hazardLevels: HAZARD_LEVELS,
            statusTypes: STATUS_TYPES
        };
    }

    return {
        init: init,
        hazardLevels: HAZARD_LEVELS,
        statusTypes: STATUS_TYPES
    };
})();
