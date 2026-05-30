const moment = require('moment');

class HeatLoadAnalyzer {
  constructor(config = {}) {
    this.config = {
      volume: 1000,
      targetTemp: -18,
      ambientTemp: 25,
      insulationUValue: 0.3,
      doorArea: 4,
      fanPower: 1.5,
      lightingPower: 0.5,
      ...config
    };
  }

  calculateTimeSlots(startTime, endTime, slotDurationHours = 1) {
    const slots = [];
    let current = moment(startTime).startOf('hour');
    const end = moment(endTime);

    while (current.isBefore(end)) {
      const slotEnd = current.clone().add(slotDurationHours, 'hours');
      slots.push({
        time_slot: current.format('YYYY-MM-DD HH:mm'),
        start_time: current.toISOString(),
        end_time: slotEnd.toISOString(),
        hour_of_day: current.hour(),
        is_peak: this.isPeakHour(current.hour())
      });
      current = slotEnd;
    }

    return slots;
  }

  isPeakHour(hour) {
    return hour >= 9 && hour <= 18;
  }

  estimateAmbientHeatLoss(slot) {
    const deltaT = this.config.ambientTemp - this.config.targetTemp;
    const surfaceArea = 6 * Math.pow(this.config.volume, 2/3);
    const heatLoss = surfaceArea * this.config.insulationUValue * deltaT / 1000;
    
    const hourFactor = 1 + 0.2 * Math.sin((slot.hour_of_day - 12) * Math.PI / 12);
    
    return heatLoss * hourFactor;
  }

  estimateDoorInfiltration(doorRecords, slot) {
    const slotStart = moment(slot.start_time);
    const slotEnd = moment(slot.end_time);
    
    const openDuration = doorRecords
      .filter(r => r.is_open)
      .filter(r => {
        const eventTime = moment(r.event_time);
        return eventTime.isBetween(slotStart, slotEnd, null, '[)');
      })
      .reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

    const openRatio = openDuration / 3600;
    const airChangeRate = 2;
    const airDensity = 1.2;
    const specificHeat = 1.005;
    const deltaT = this.config.ambientTemp - this.config.targetTemp;

    return (this.config.volume * airDensity * specificHeat * deltaT * airChangeRate * openRatio) / 3600;
  }

  estimateDefrostHeat(defrostRecords, slot) {
    const slotStart = moment(slot.start_time);
    const slotEnd = moment(slot.end_time);

    const defrostInSlot = defrostRecords.filter(r => {
      const defrostStart = moment(r.start_time);
      const defrostEnd = moment(r.end_time || r.start_time);
      return defrostStart.isBefore(slotEnd) && defrostEnd.isAfter(slotStart);
    });

    return defrostInSlot.reduce((sum, r) => {
      const overlapStart = moment.max(slotStart, moment(r.start_time));
      const overlapEnd = moment.min(slotEnd, moment(r.end_time || r.start_time));
      const overlapHours = overlapEnd.diff(overlapStart, 'seconds') / 3600;
      const powerKw = r.energy_consumption ? 
        r.energy_consumption / (r.duration_seconds / 3600) : 8;
      return sum + powerKw * overlapHours;
    }, 0);
  }

  estimateFanHeat(fanRecords, slot) {
    const slotStart = moment(slot.start_time);
    const slotEnd = moment(slot.end_time);

    const fanActivity = fanRecords.filter(r => {
      const statusTime = moment(r.status_time);
      return statusTime.isBetween(slotStart, slotEnd, null, '[)');
    });

    if (fanActivity.length === 0) {
      return this.config.fanPower;
    }

    const avgSpeed = fanActivity.reduce((sum, r) => 
      sum + (r.speed_percent || 100), 0) / fanActivity.length;
    
    return this.config.fanPower * (avgSpeed / 100);
  }

  estimateLightingHeat(slot) {
    return slot.is_peak ? this.config.lightingPower : this.config.lightingPower * 0.3;
  }

  estimateProductHeat(productRecords, slot) {
    if (!productRecords || productRecords.length === 0) {
      return slot.is_peak ? 3 : 1;
    }

    const slotStart = moment(slot.start_time);
    const slotEnd = moment(slot.end_time);

    const productInSlot = productRecords.filter(r => {
      const entryTime = moment(r.entry_time || r.time);
      return entryTime.isBetween(slotStart, slotEnd, null, '[)');
    });

    return productInSlot.reduce((sum, r) => {
      const mass = r.mass_kg || 0;
      const tempIn = r.temperature_in || 25;
      const specificHeat = r.frozen ? 2.1 : 4.2;
      return sum + (mass * specificHeat * (tempIn - this.config.targetTemp) / 3600 / 1000);
    }, 0) || (slot.is_peak ? 3 : 1);
  }

  analyzeTimeSlots(startTime, endTime, data) {
    const slots = this.calculateTimeSlots(startTime, endTime);
    const results = [];

    slots.forEach(slot => {
      const ambientHeat = this.estimateAmbientHeatLoss(slot);
      const doorInfiltration = this.estimateDoorInfiltration(data.doorRecords || [], slot);
      const defrostHeat = this.estimateDefrostHeat(data.defrostRecords || [], slot);
      const fanHeat = this.estimateFanHeat(data.fanRecords || [], slot);
      const lightingHeat = this.estimateLightingHeat(slot);
      const productHeat = this.estimateProductHeat(data.productRecords || [], slot);

      const totalHeatLoad = ambientHeat + doorInfiltration + defrostHeat + 
                           fanHeat + lightingHeat + productHeat;

      results.push({
        ...slot,
        total_heat_load_kw: totalHeatLoad,
        door_infiltration: doorInfiltration,
        defrost_heat: defrostHeat,
        product_heat: productHeat,
        ambient_heat: ambientHeat,
        fan_heat: fanHeat,
        lighting_heat: lightingHeat,
        breakdown: {
          door_infiltration_pct: (doorInfiltration / totalHeatLoad * 100).toFixed(1),
          defrost_heat_pct: (defrostHeat / totalHeatLoad * 100).toFixed(1),
          product_heat_pct: (productHeat / totalHeatLoad * 100).toFixed(1),
          ambient_heat_pct: (ambientHeat / totalHeatLoad * 100).toFixed(1),
          fan_heat_pct: (fanHeat / totalHeatLoad * 100).toFixed(1),
          lighting_heat_pct: (lightingHeat / totalHeatLoad * 100).toFixed(1)
        }
      });
    });

    return results;
  }

  analyzeTrend(slots) {
    if (slots.length < 2) return null;

    const first = slots[0].total_heat_load_kw;
    const last = slots[slots.length - 1].total_heat_load_kw;
    const avg = slots.reduce((sum, s) => sum + s.total_heat_load_kw, 0) / slots.length;

    const peakSlot = slots.reduce((max, s) => 
      s.total_heat_load_kw > max.total_heat_load_kw ? s : max, slots[0]);
    const valleySlot = slots.reduce((min, s) => 
      s.total_heat_load_kw < min.total_heat_load_kw ? s : min, slots[0]);

    return {
      trend: last > first * 1.1 ? 'rising' : last < first * 0.9 ? 'falling' : 'stable',
      change_percent: ((last - first) / first * 100).toFixed(1),
      average_kw: avg.toFixed(2),
      peak: {
        time: peakSlot.time_slot,
        value_kw: peakSlot.total_heat_load_kw.toFixed(2)
      },
      valley: {
        time: valleySlot.time_slot,
        value_kw: valleySlot.total_heat_load_kw.toFixed(2)
      },
      hourly_breakdown: slots.map(s => ({
        time: s.time_slot,
        total_kw: s.total_heat_load_kw.toFixed(2),
        defrost_pct: s.breakdown.defrost_heat_pct,
        door_pct: s.breakdown.door_infiltration_pct
      }))
    };
  }

  updateAttributionWithHeatLoad(anomalies, heatLoadSlots) {
    return anomalies.map(anomaly => {
      const updated = { ...anomaly };
      
      if (anomaly.anomaly_type === 'door_open_too_long') {
        const attribution = JSON.parse(anomaly.attribution);
        const affectedSlots = heatLoadSlots.filter(slot => {
          const eventStart = moment(anomaly.start_time);
          const eventEnd = moment(anomaly.end_time);
          const slotStart = moment(slot.start_time);
          const slotEnd = moment(slot.end_time);
          return eventStart.isBefore(slotEnd) && eventEnd.isAfter(slotStart);
        });

        if (affectedSlots.length > 0) {
          attribution.heat_load_impact = {
            affected_slots: affectedSlots.length,
            avg_increase_pct: ((affectedSlots.reduce((sum, s) => 
              sum + s.door_infiltration, 0) / affectedSlots.length / 
              affectedSlots[0].total_heat_load_kw) * 100).toFixed(1)
          };
          updated.attribution = JSON.stringify(attribution);
        }
      }

      if (anomaly.anomaly_type === 'defrost_overlap') {
        const attribution = JSON.parse(anomaly.attribution);
        const overlapSlots = heatLoadSlots.filter(slot => {
          const overlapStart = moment(anomaly.start_time);
          const overlapEnd = moment(anomaly.end_time);
          const slotStart = moment(slot.start_time);
          const slotEnd = moment(slot.end_time);
          return overlapStart.isBefore(slotEnd) && overlapEnd.isAfter(slotStart);
        });

        if (overlapSlots.length > 0) {
          attribution.heat_load_impact = {
            affected_slots: overlapSlots.length,
            additional_heat_kw: overlapSlots.reduce((sum, s) => 
              sum + s.defrost_heat, 0).toFixed(2)
          };
          updated.attribution = JSON.stringify(attribution);
        }
      }

      return updated;
    });
  }
}

module.exports = HeatLoadAnalyzer;
