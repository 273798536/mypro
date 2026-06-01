class AcousticModel {
    constructor() {
        this.soundSpeed = 343;
        this.frequencyBands = { low: 250, mid: 1000, high: 4000 };
    }

    calculateDistance(point1, point2) {
        return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    }

    calculatePathLoss(distance, frequency = 1000) {
        if (distance < 1) return 0;
        return 20 * Math.log10(distance) + 20 * Math.log10(frequency / 1000) - 14;
    }

    calculateAirAbsorption(distance, humidity = 50, temperature = 20) {
        const freqFactor = this.frequencyBands.high / 1000;
        const absorption = 0.01 * freqFactor * distance * (1 + humidity / 100);
        return Math.min(absorption, 30);
    }

    checkOcclusion(point1, point2, obstacles) {
        for (const obs of obstacles) {
            if (this.lineIntersectsRect(point1, point2, obs)) {
                return { blocked: true, obstacle: obs };
            }
        }
        return { blocked: false };
    }

    lineIntersectsRect(p1, p2, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        if ((p1.x < left && p2.x < left) || (p1.x > right && p2.x > right)) return false;
        if ((p1.y < top && p2.y < top) || (p1.y > bottom && p2.y > bottom)) return false;

        if (p1.x >= left && p1.x <= right && p1.y >= top && p1.y <= bottom) return true;
        if (p2.x >= left && p2.x <= right && p2.y >= top && p2.y <= bottom) return true;

        const edges = [
            [{ x: left, y: top }, { x: right, y: top }],
            [{ x: right, y: top }, { x: right, y: bottom }],
            [{ x: right, y: bottom }, { x: left, y: bottom }],
            [{ x: left, y: bottom }, { x: left, y: top }]
        ];

        for (const [e1, e2] of edges) {
            if (this.lineIntersectsLine(p1, p2, e1, e2)) return true;
        }
        return false;
    }

    lineIntersectsLine(p1, p2, p3, p4) {
        const d1 = this.crossProduct(p4.x - p3.x, p4.y - p3.y, p1.x - p3.x, p1.y - p3.y);
        const d2 = this.crossProduct(p4.x - p3.x, p4.y - p3.y, p2.x - p3.x, p2.y - p3.y);
        const d3 = this.crossProduct(p2.x - p1.x, p2.y - p1.y, p3.x - p1.x, p3.y - p1.y);
        const d4 = this.crossProduct(p2.x - p1.x, p2.y - p1.y, p4.x - p1.x, p4.y - p1.y);

        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        return false;
    }

    crossProduct(x1, y1, x2, y2) {
        return x1 * y2 - y1 * x2;
    }

    calculateSoundLevel(source, mic, settings, obstacles) {
        const distance = this.calculateDistance(source, mic);
        const occlusion = this.checkOcclusion(source, mic, obstacles);
        
        let level = source.volume;
        
        level += mic.gain - 60;
        
        const pathLoss = this.calculatePathLoss(distance);
        level -= pathLoss;
        
        const airAbsorption = this.calculateAirAbsorption(distance);
        level -= airAbsorption;
        
        if (occlusion.blocked) {
            level -= 25;
        }
        
        level += (settings.eqHigh || 0) * 0.5;
        level += (settings.eqLow || 0) * 0.3;
        
        level += (settings.volume - 70) * 0.3;
        
        return {
            level: Math.max(-60, Math.min(120, level)),
            distance,
            occlusion,
            pathLoss,
            airAbsorption
        };
    }

    calculateReverbEffect(reverbValue, roomSize = 100) {
        const reverbTime = 0.5 + (reverbValue / 100) * 4;
        const reflections = Math.floor(3 + (reverbValue / 100) * 8);
        const decayRate = 60 / reverbTime;
        
        return {
            reverbTime,
            reflections,
            decayRate,
            isExcessive: reverbValue > 60 || reverbTime > 3
        };
    }

    calculateDelayEffect(delayValue, bpm = 120) {
        const delayTime = (delayValue / 100) * 500;
        const feedback = 0.3 + (delayValue / 100) * 0.4;
        const noteValue = this.getNoteValue(delayTime, bpm);
        
        return {
            delayTime,
            feedback,
            noteValue,
            isOutOfSync: delayValue > 70 && Math.abs(delayTime - this.getNoteDuration('eighth', bpm)) > 50
        };
    }

    getNoteDuration(note, bpm) {
        const beatDuration = 60000 / bpm;
        const durations = {
            'whole': beatDuration * 4,
            'half': beatDuration * 2,
            'quarter': beatDuration,
            'eighth': beatDuration / 2,
            'sixteenth': beatDuration / 4
        };
        return durations[note] || beatDuration;
    }

    getNoteValue(delayTime, bpm) {
        const beatDuration = 60000 / bpm;
        const ratios = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25];
        const notes = ['whole', 'dotted half', 'half', 'dotted quarter', 'quarter', 'dotted eighth', 'eighth', 'triplet eighth', 'sixteenth'];
        
        let closest = 0;
        let minDiff = Infinity;
        
        for (let i = 0; i < ratios.length; i++) {
            const target = beatDuration * ratios[i];
            const diff = Math.abs(delayTime - target);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        }
        
        return notes[closest];
    }

    calculateCoverage(sources, mics, obstacles, settings) {
        const samplePoints = [];
        const gridSize = 40;
        
        for (let x = gridSize; x < 800; x += gridSize) {
            for (let y = gridSize; y < 500; y += gridSize) {
                samplePoints.push({ x, y });
            }
        }
        
        let coveredPoints = 0;
        const coverageData = [];
        
        for (const point of samplePoints) {
            let maxLevel = -Infinity;
            let contributingMic = null;
            let contributingSource = null;
            
            for (const source of sources) {
                for (const mic of mics) {
                    const result = this.calculateSoundLevel(source, mic, settings, obstacles);
                    const micToPointDist = this.calculateDistance(mic, point);
                    const pointLevel = result.level - this.calculatePathLoss(micToPointDist);
                    
                    if (pointLevel > maxLevel) {
                        maxLevel = pointLevel;
                        contributingMic = mic;
                        contributingSource = source;
                    }
                }
            }
            
            const isCovered = maxLevel > -10;
            if (isCovered) coveredPoints++;
            
            coverageData.push({
                point,
                level: maxLevel,
                covered: isCovered,
                mic: contributingMic,
                source: contributingSource
            });
        }
        
        const coveragePercent = (coveredPoints / samplePoints.length) * 100;
        
        return {
            percentage: coveragePercent,
            coveredPoints,
            totalPoints: samplePoints.length,
            coverageData
        };
    }

    calculateFeedbackRisk(mic, source, settings, aperture) {
        const distance = this.calculateDistance(mic, source);
        const angleDiff = Math.abs(mic.angle - 180);
        
        let risk = 0;
        
        if (mic.gain > 70) risk += (mic.gain - 70) * 2;
        if (source.volume > 80) risk += (source.volume - 80) * 1.5;
        if (distance < 50) risk += (50 - distance) * 0.5;
        if (settings.eqHigh > 15) risk += (settings.eqHigh - 15) * 0.8;
        if (angleDiff < 30) risk += 10;
        
        const apertureEffect = (5 - aperture) * 3;
        risk += apertureEffect;
        
        return {
            risk: Math.min(100, Math.max(0, risk)),
            level: risk < 30 ? 'low' : risk < 60 ? 'medium' : 'high',
            howlingLikely: risk >= 70,
            apertureEffect
        };
    }

    analyzeApertureImpact(aperture, sources, mics, settings) {
        const impacts = [];
        
        for (const source of sources) {
            for (const mic of mics) {
                const baseRisk = this.calculateFeedbackRisk(mic, source, settings, 5);
                const currentRisk = this.calculateFeedbackRisk(mic, source, settings, aperture);
                const riskChange = currentRisk.risk - baseRisk.risk;
                
                const sensitivity = 10 + (10 - aperture) * 2;
                const detectionRange = 50 + aperture * 10;
                
                impacts.push({
                    source: source.name,
                    mic: mic.name,
                    riskChange,
                    sensitivity,
                    detectionRange,
                    improved: riskChange < 0
                });
            }
        }
        
        const overallRiskChange = impacts.reduce((sum, i) => sum + i.riskChange, 0) / impacts.length;
        const avgSensitivity = impacts.reduce((sum, i) => sum + i.sensitivity, 0) / impacts.length;
        
        return {
            impacts,
            overallRiskChange,
            avgSensitivity,
            overallImproved: overallRiskChange < -5
        };
    }
}
