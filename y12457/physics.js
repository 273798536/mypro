const Physics = {
    GRAVITY: 9.8,
    STANDARD_WATER_DENSITY: 1000,
    SEA_WATER_DENSITY: 1025,

    calculateBuoyancy(volume, density) {
        return density * this.GRAVITY * volume;
    },

    calculateWeight(mass) {
        return mass * this.GRAVITY;
    },

    calculateNetBuoyancy(buoyancy, weight) {
        return buoyancy - weight;
    },

    massToWeight(mass) {
        return mass * this.GRAVITY;
    },

    weightToMass(weight) {
        return weight / this.GRAVITY;
    },

    calculateDisplacementMass(volume, density) {
        return density * volume;
    },

    calculateDensity(mass, volume) {
        return mass / volume;
    },

    getDensityForDepth(depth, baseDensity = this.SEA_WATER_DENSITY) {
        const pressureEffect = depth * 0.0001;
        const temperatureEffect = Math.max(0, -depth * 0.00005);
        return baseDensity * (1 + pressureEffect + temperatureEffect);
    },

    getPressureAtDepth(depth) {
        return 101325 + depth * 9800;
    },

    checkBuoyancyState(netBuoyancy, threshold = 50) {
        if (Math.abs(netBuoyancy) < threshold) {
            return { state: 'balanced', label: '平衡', class: 'status-neutral' };
        } else if (netBuoyancy > 0) {
            return { state: 'positive', label: '正浮力', class: 'status-positive' };
        } else {
            return { state: 'negative', label: '负浮力', class: 'status-negative' };
        }
    },

    calculateSubmarineState(submarine) {
        const { volume, baseMass, ballastWater, cargoMass, depth, waterDensity } = submarine;
        
        const actualDensity = this.getDensityForDepth(depth, waterDensity);
        const totalMass = baseMass + ballastWater + cargoMass;
        const totalWeight = this.calculateWeight(totalMass);
        const buoyancy = this.calculateBuoyancy(volume, actualDensity);
        const netBuoyancy = this.calculateNetBuoyancy(buoyancy, totalWeight);
        const displacementMass = this.calculateDisplacementMass(volume, actualDensity);
        const buoyancyState = this.checkBuoyancyState(netBuoyancy);

        return {
            actualDensity,
            totalMass,
            totalWeight,
            buoyancy,
            netBuoyancy,
            displacementMass,
            buoyancyState,
            willSink: netBuoyancy < -500,
            willFloat: netBuoyancy > 500,
            isBalanced: buoyancyState.state === 'balanced'
        };
    },

    calculateOxygenConsumption(depth, activityLevel = 1) {
        const depthFactor = 1 + depth * 0.001;
        return 0.05 * activityLevel * depthFactor;
    },

    estimateTimeToSurface(depth, ascentSpeed = 0.5) {
        return depth / ascentSpeed;
    },

    checkOxygenSufficiency(currentOxygen, depth, consumptionRate) {
        const timeToSurface = this.estimateTimeToSurface(depth);
        const requiredOxygen = timeToSurface * consumptionRate;
        return {
            sufficient: currentOxygen > requiredOxygen,
            timeToSurface,
            requiredOxygen,
            remainingTime: currentOxygen / consumptionRate
        };
    },

    calculateCargoCapacityWarning(currentCargo, maxCapacity) {
        const ratio = currentCargo / maxCapacity;
        if (ratio >= 1) {
            return { level: 'critical', message: '货舱已超载！' };
        } else if (ratio >= 0.9) {
            return { level: 'warning', message: '货舱接近满载' };
        } else if (ratio >= 0.7) {
            return { level: 'caution', message: '货舱装载过半' };
        }
        return { level: 'normal', message: '货舱正常' };
    },

    calculateSalvageScore(artifact, depth) {
        const baseScore = artifact.value;
        const depthBonus = Math.floor(depth * 0.5);
        const materialMultiplier = this.getMaterialMultiplier(artifact.material);
        return Math.floor(baseScore * materialMultiplier + depthBonus);
    },

    getMaterialMultiplier(material) {
        const multipliers = {
            'gold': 3.0,
            'silver': 2.0,
            'bronze': 1.5,
            'ceramic': 1.2,
            'wood': 1.0,
            'stone': 0.8,
            'iron': 1.3,
            'glass': 1.4,
            'jade': 2.5,
            'ivory': 1.8
        };
        return multipliers[material] || 1.0;
    },

    getMaterialName(material) {
        const names = {
            'gold': '黄金',
            'silver': '白银',
            'bronze': '青铜',
            'ceramic': '陶瓷',
            'wood': '木质',
            'stone': '石质',
            'iron': '铁质',
            'glass': '玻璃',
            'jade': '玉石',
            'ivory': '象牙'
        };
        return names[material] || material;
    },

    getArtifactTypeName(type) {
        const types = {
            'coin': '钱币',
            'vase': '花瓶',
            'statue': '雕像',
            'weapon': '兵器',
            'jewelry': '首饰',
            'pottery': '陶器',
            'scroll': '卷轴',
            'instrument': '乐器',
            'furniture': '家具',
            'cannon': '火炮'
        };
        return types[type] || type;
    },

    generateArtifacts(depth, count = 5) {
        const materials = ['gold', 'silver', 'bronze', 'ceramic', 'wood', 'stone', 'iron', 'glass', 'jade', 'ivory'];
        const types = ['coin', 'vase', 'statue', 'weapon', 'jewelry', 'pottery', 'scroll', 'instrument', 'furniture', 'cannon'];
        
        const artifacts = [];
        const depthFactor = 1 + depth / 100;
        
        for (let i = 0; i < count; i++) {
            const material = materials[Math.floor(Math.random() * materials.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const weight = Math.floor((20 + Math.random() * 100) * depthFactor);
            const value = Math.floor((50 + Math.random() * 500) * depthFactor * this.getMaterialMultiplier(material));
            
            artifacts.push({
                id: `artifact-${Date.now()}-${i}`,
                material,
                type,
                weight,
                value,
                depth,
                x: 10 + Math.random() * 80,
                discovered: false
            });
        }
        
        return artifacts;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Physics;
}
