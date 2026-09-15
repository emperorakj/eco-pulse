(function () {
  'use strict';

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const now = () => new Date();

  class TelemetrySimulator {
    constructor() {
      this.mode = 'autopilot';
      this.listeners = new Set();
      this.timer = null;
      this.lastUpdate = now();
      this.scenario = 'normal';
      this.alertState = new Map();

      this.state = {
        meta: {
          source: 'simulation',
          sourceLabel: 'SIMULATED IoT TELEMETRY',
          lastUpdated: now().toISOString(),
          heartbeat: 'healthy'
        },

        sorter: {
          irProximity: true,
          moisture: 65,
          inductive: false,
          servoAngle: 90,
          lastItemType: 'Wet / Organic',
          totalSortedToday: 142,
          segregation: { wet: 54, dry: 32, metal: 14 }
        },

        bins: {
          organic: 68,
          recyclable: 45,
          metal: 30,
          hazardous: 82,
          ewaste: 25
        },

        composting: {
          temp: 58.5,
          moisture: 52,
          humidity: 65,
          gasPpm: 120,
          aerationFan: false,
          phase: 'Thermophilic'
        },

        sanitization: {
          pirCount: 28,
          waterLevel: 74,
          odorPpm: 145,
          flushTriggered: false,
          disinfectantLevel: 88,
          lastAction: null
        },

        community: {
          totalGreenPoints: 12450,
          wasteDivertedKg: 648.5,
          co2SavedKg: 1120.4,
          compostKg: 215,
          members: 342
        },

        histories: {
          timestamps: [],
          compostTemp: [],
          compostMoisture: [],
          odorPpm: [],
          bins: []
        }
      };

      this.seedHistory();
      this.emitUpdate('initial');
      this.start();
    }

    seedHistory() {
      const t = Date.now();
      const seedTemp = [54, 55, 55.8, 56.6, 57.2, 58.0, 58.5];
      const seedMoisture = [55, 54, 54, 53, 53, 52.5, 52];
      const seedOdor = [95, 110, 125, 150, 138, 142, 145];

      for (let i = seedTemp.length - 1; i >= 0; i--) {
        const ts = new Date(t - (seedTemp.length - 1 - i) * 15000);
        this.state.histories.timestamps.push(ts.toISOString());
        this.state.histories.compostTemp.push(seedTemp[i]);
        this.state.histories.compostMoisture.push(seedMoisture[i]);
        this.state.histories.odorPpm.push(seedOdor[i]);
        this.state.histories.bins.push({ ...this.state.bins });
      }
    }

    start() {
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (this.mode === 'autopilot') this.tick();
      }, 2500);
    }

    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }

    setMode(mode) {
      this.mode = mode === 'manual' ? 'manual' : 'autopilot';
      this.emitUpdate('mode_changed');
    }

    setScenario(name) {
      const scenarios = ['normal', 'bin_overflow', 'compost_overheat', 'sanitization_demand', 'sensor_failure'];
      this.scenario = scenarios.includes(name) ? name : 'normal';

      if (this.scenario === 'bin_overflow') {
        this.state.bins.organic = 88;
        this.state.bins.hazardous = 91;
      } else if (this.scenario === 'compost_overheat') {
        this.state.composting.temp = 69;
      } else if (this.scenario === 'sanitization_demand') {
        this.state.sanitization.odorPpm = 315;
        this.state.sanitization.waterLevel = 34;
      } else if (this.scenario === 'sensor_failure') {
        this.state.meta.heartbeat = 'degraded';
      } else {
        this.state.meta.heartbeat = 'healthy';
      }

      this.emitUpdate('scenario_changed');
    }

    tick() {
      const s = this.state;

      // Realistic gradual bin accumulation.
      Object.keys(s.bins).forEach(key => {
        let delta = (Math.random() * 1.8) + 0.15;
        if (this.scenario === 'bin_overflow' && ['organic', 'hazardous'].includes(key)) {
          delta += 1.8;
        }
        s.bins[key] = clamp(s.bins[key] + delta, 0, 100);
      });

      // Compost thermal progression with small natural variation.
      let tempDelta = (Math.random() - 0.38) * 0.7;
      if (this.scenario === 'compost_overheat') tempDelta = 0.8 + Math.random() * 0.7;
      s.composting.temp = clamp(s.composting.temp + tempDelta, 20, 80);

      // Moisture slowly changes as decomposition proceeds.
      s.composting.moisture = clamp(
        s.composting.moisture + (Math.random() - 0.58) * 0.8,
        20,
        80
      );

      // Odor responds mildly to usage and compost activity.
      let odorDelta = (Math.random() - 0.5) * 18;
      if (this.scenario === 'sanitization_demand') odorDelta += 18;
      s.sanitization.odorPpm = clamp(s.sanitization.odorPpm + odorDelta, 20, 450);

      // Simulated facility usage.
      if (Math.random() < 0.18 || this.scenario === 'sanitization_demand') {
        s.sanitization.pirCount += 1;
        s.sanitization.waterLevel = clamp(s.sanitization.waterLevel - 0.4, 0, 100);
        s.sanitization.odorPpm = clamp(s.sanitization.odorPpm + 4, 0, 500);
      }

      this.applyRules();
      this.maybeSimulateSorting();
      this.recordHistory();
      this.emitUpdate('autopilot_tick');
    }

    applyRules() {
      const c = this.state.composting;
      if (c.temp > 65) c.aerationFan = true;
      else if (c.temp < 50) c.aerationFan = false;

      if (c.temp < 35) c.phase = 'Ready';
      else if (c.temp < 40) c.phase = 'Mesophilic';
      else if (c.temp <= 65) c.phase = 'Thermophilic';
      else c.phase = 'Cooling';

      const san = this.state.sanitization;
      if (san.waterLevel <= 20 || san.odorPpm >= 300) {
        if (!san.flushTriggered) this.triggerSanitizationFlush('Condition threshold reached');
      }
    }

    maybeSimulateSorting() {
      if (Math.random() > 0.28) return;

      const items = [
        { name: 'Vegetable Scraps', moisture: 72, metal: false, emoji: '🥬' },
        { name: 'Plastic Bottle', moisture: 12, metal: false, emoji: '🧴' },
        { name: 'Aluminium Can', moisture: 8, metal: true, emoji: '🥫' },
        { name: 'Food Waste', moisture: 81, metal: false, emoji: '🍌' }
      ];

      const item = items[Math.floor(Math.random() * items.length)];
      const result = window.wasteSorter
        ? window.wasteSorter.evaluateSensors(true, item.moisture, item.metal)
        : { bin: item.metal ? 'Metal / Recyclable' : item.moisture >= 40 ? 'Wet / Organic' : 'Dry Waste', angle: item.metal ? 180 : item.moisture >= 40 ? 90 : 0, itemClass: item.metal ? 'metal' : item.moisture >= 40 ? 'wet' : 'dry' };

      this.state.sorter.irProximity = true;
      this.state.sorter.moisture = item.moisture;
      this.state.sorter.inductive = item.metal;
      this.state.sorter.servoAngle = result.angle;
      this.state.sorter.lastItemType = result.bin;
      this.state.sorter.totalSortedToday += 1;

      const key = item.metal ? 'metal' : item.moisture >= 40 ? 'wet' : 'dry';
      this.state.sorter.segregation[key] += 1;
    }

    recordHistory() {
      const h = this.state.histories;
      h.timestamps.push(now().toISOString());
      h.compostTemp.push(Number(this.state.composting.temp.toFixed(1)));
      h.compostMoisture.push(Number(this.state.composting.moisture.toFixed(1)));
      h.odorPpm.push(Math.round(this.state.sanitization.odorPpm));
      h.bins.push({ ...this.state.bins });

      const max = 24;
      Object.keys(h).forEach(k => {
        if (h[k].length > max) h[k].shift();
      });

      this.state.meta.lastUpdated = now().toISOString();
    }

    updateManual(path, value, source = 'manual_sensor_lab') {
      const [section, key] = path.split('.');
      if (!this.state[section] || !(key in this.state[section])) return;

      const numeric = Number(value);
      this.state[section][key] = Number.isFinite(numeric) ? numeric : value;

      if (section === 'composting' && key === 'temp') this.applyRules();
      this.recordHistory();
      this.emitUpdate(source);
    }

    simulateBinCollection(binKey) {
      if (!(binKey in this.state.bins)) return false;
      this.state.bins[binKey] = 10;
      this.emitUpdate('simulated_collection');
      return true;
    }

    triggerSanitizationFlush(reason = 'Manual dashboard command') {
      const san = this.state.sanitization;
      if (san.flushTriggered) return false;

      san.flushTriggered = true;
      san.lastAction = {
        action: 'Disinfectant Flush',
        reason,
        status: 'EXECUTING',
        timestamp: now().toISOString()
      };
      this.emitUpdate('flush_started');

      setTimeout(() => {
        san.waterLevel = clamp(san.waterLevel + 12, 0, 100);
        san.odorPpm = clamp(san.odorPpm * 0.55, 10, 500);
        san.flushTriggered = false;
        san.lastAction.status = 'COMPLETED';
        san.lastAction.completedAt = now().toISOString();
        this.emitUpdate('flush_complete');
      }, 1800);

      return true;
    }

    toggleAerationFan() {
      this.state.composting.aerationFan = !this.state.composting.aerationFan;
      this.emitUpdate('manual_fan_toggle');
    }

    emitUpdate(source) {
      const snapshot = JSON.parse(JSON.stringify(this.state));
      this.listeners.forEach(fn => {
        try { fn(snapshot, source); } catch (err) { console.error('Telemetry listener error:', err); }
      });
    }

    onUpdate(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
  }

  window.telemetrySim = new TelemetrySimulator();
})();
