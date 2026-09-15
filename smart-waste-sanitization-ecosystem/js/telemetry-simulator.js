/**
 * Telemetry Simulator & State Manager
 * Handles sensor data generation, autopilot drift, manual controls, and event broadcasting.
 */
class TelemetrySimulator {
  constructor() {
    this.mode = 'autopilot'; // 'autopilot' | 'manual'
    this.listeners = [];

    // Core System State
    this.state = {
      // Smart Waste Segregation Sensors
      sorter: {
        irProximity: true,
        moisture: 65,      // 0 - 100%
        inductive: false,   // metallic detection
        servoAngle: 90,    // 0° (Dry), 90° (Wet), 180° (Metal)
        lastItemType: 'Organic Food Waste',
        totalSortedToday: 142
      },

      // IoT Smart Bin Ultrasonic Monitoring (%)
      bins: {
        organic: 68,
        recyclable: 45,
        metal: 30,
        hazardous: 82,
        ewaste: 25
      },

      // Decentralized Composting Unit
      composting: {
        temperature: 58.5, // °C
        moisture: 52.0,    // %
        humidity: 65.0,    // %
        gasPpm: 120,       // Methane / Odor PPM
        aerationFan: false,
        phase: 'Thermophilic' // 'Mesophilic' | 'Thermophilic' | 'Cooling' | 'Ready'
      },

      // Smart Sanitization Facility
      sanitization: {
        pirCount: 28,      // usage count
        waterLevel: 74,    // %
        odorPpm: 145,      // VOC/Ammonia PPM
        flushTriggered: false,
        disinfectantLevel: 88 // %
      },

      // Community Green Points & Environmental Impact
      community: {
        totalGreenPoints: 12450,
        wasteDivertedKg: 648.5,
        co2SavedKg: 1120.4,
        compostProducedKg: 215.0,
        activeMembers: 342
      }
    };

    this.timer = null;
    this.startAutopilot();
  }

  // Subscribe to telemetry updates
  onUpdate(callback) {
    this.listeners.push(callback);
  }

  emitUpdate(source = 'system') {
    this.listeners.forEach(cb => cb(this.state, source));
  }

  setMode(newMode) {
    this.mode = newMode;
    if (this.mode === 'autopilot') {
      this.startAutopilot();
    } else {
      this.stopAutopilot();
    }
    this.emitUpdate('mode_change');
  }

  startAutopilot() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.mode !== 'autopilot') return;
      this.simulateAutopilotTick();
    }, 2500);
  }

  stopAutopilot() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  simulateAutopilotTick() {
    // 1. Simulate Bin Fill Level Drift
    const binKeys = Object.keys(this.state.bins);
    const randomBin = binKeys[Math.floor(Math.random() * binKeys.length)];
    this.state.bins[randomBin] = Math.min(100, Math.max(0, this.state.bins[randomBin] + (Math.random() * 2.5)));

    // 2. Simulate Composting Heating/Cooling
    let tempDelta = (Math.random() * 1.2) - 0.5;
    if (this.state.composting.aerationFan) {
      tempDelta -= 0.8; // Fan cools compost down slightly
    }
    this.state.composting.temperature = Math.min(75, Math.max(25, Number((this.state.composting.temperature + tempDelta).toFixed(1))));
    
    // Auto-condition aeration logic
    if (this.state.composting.temperature > 65.0) {
      this.state.composting.aerationFan = true;
    } else if (this.state.composting.temperature < 50.0 && this.state.composting.aerationFan) {
      this.state.composting.aerationFan = false;
    }

    // Determine Composting Phase based on temperature & cycle
    const temp = this.state.composting.temperature;
    if (temp < 40) this.state.composting.phase = 'Mesophilic';
    else if (temp >= 40 && temp <= 65) this.state.composting.phase = 'Thermophilic';
    else if (temp > 65) this.state.composting.phase = 'Cooling';

    // 3. Simulate Sanitization Facility Usage
    if (Math.random() > 0.6) {
      this.state.sanitization.pirCount += 1;
      this.state.sanitization.waterLevel = Math.max(0, this.state.sanitization.waterLevel - 0.5);
      this.state.sanitization.odorPpm = Math.min(500, this.state.sanitization.odorPpm + Math.floor(Math.random() * 8));

      // Automated Flush condition (Every 10 usages or high odor)
      if (this.state.sanitization.pirCount % 10 === 0 || this.state.sanitization.odorPpm > 300) {
        this.triggerSanitizationFlush();
      }
    }

    // 4. Occasional Random Sorting Event Simulation
    if (Math.random() > 0.7) {
      this.simulateRandomSortingEvent();
    }

    this.emitUpdate('autopilot_tick');
  }

  simulateRandomSortingEvent() {
    const items = [
      { name: 'PET Plastic Bottle', wet: 15, metal: false, angle: 0 },
      { name: 'Banana Peel / Organic', wet: 85, metal: false, angle: 90 },
      { name: 'Aluminum Soda Can', wet: 10, metal: true, angle: 180 },
      { name: 'Cardboard Box', wet: 12, metal: false, angle: 0 },
      { name: 'Food Container', wet: 70, metal: false, angle: 90 },
      { name: 'Steel Juice Can', wet: 5, metal: true, angle: 180 }
    ];
    const item = items[Math.floor(Math.random() * items.length)];

    this.state.sorter.irProximity = true;
    this.state.sorter.moisture = item.wet;
    this.state.sorter.inductive = item.metal;
    this.state.sorter.servoAngle = item.angle;
    this.state.sorter.lastItemType = item.name;
    this.state.sorter.totalSortedToday += 1;

    // Update community metrics slightly
    this.state.community.wasteDivertedKg = Number((this.state.community.wasteDivertedKg + 0.4).toFixed(1));
    this.state.community.co2SavedKg = Number((this.state.community.co2SavedKg + 0.7).toFixed(1));
  }

  // Manual Control Overrides
  updateManualSensor(sensorGroup, key, value) {
    if (this.state[sensorGroup] && this.state[sensorGroup][key] !== undefined) {
      this.state[sensorGroup][key] = value;
      this.emitUpdate('manual_control');
    }
  }

  triggerSanitizationFlush() {
    this.state.sanitization.flushTriggered = true;
    this.state.sanitization.odorPpm = Math.max(45, this.state.sanitization.odorPpm - 120);
    this.state.sanitization.waterLevel = Math.max(0, this.state.sanitization.waterLevel - 3);
    setTimeout(() => {
      this.state.sanitization.flushTriggered = false;
      this.emitUpdate('flush_complete');
    }, 3000);
  }

  toggleAerationFan(overrideState = null) {
    this.state.composting.aerationFan = overrideState !== null ? overrideState : !this.state.composting.aerationFan;
    this.emitUpdate('aeration_toggle');
  }

  emptyBin(binKey) {
    if (this.state.bins[binKey] !== undefined) {
      this.state.bins[binKey] = 0;
      this.emitUpdate('bin_emptied');
    }
  }
}

// Global instance
window.telemetrySim = new TelemetrySimulator();
