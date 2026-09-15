(function () {
  'use strict';

  class WasteSorter {
    constructor() {
      this.sortLog = [
        { timestamp: new Date(Date.now() - 60000).toISOString(), item: 'Vegetable Scraps', bin: 'Wet / Organic', angle: 90, moisture: 72, metal: false },
        { timestamp: new Date(Date.now() - 45000).toISOString(), item: 'Plastic Bottle', bin: 'Dry Waste', angle: 0, moisture: 12, metal: false },
        { timestamp: new Date(Date.now() - 30000).toISOString(), item: 'Aluminium Can', bin: 'Metal / Recyclable', angle: 180, moisture: 8, metal: true }
      ];
    }

    evaluateSensors(irPresent, moisturePct, isMetal) {
      const moisture = Number(moisturePct);
      if (!irPresent) return { bin: 'Idle', angle: 0, itemClass: 'none' };
      if (Boolean(isMetal)) return { bin: 'Metal / Recyclable', angle: 180, itemClass: 'metal' };
      if (Number.isFinite(moisture) && moisture >= 40) return { bin: 'Wet / Organic', angle: 90, itemClass: 'wet' };
      return { bin: 'Dry Waste', angle: 0, itemClass: 'dry' };
    }

    sortCustomItem(itemName, moisturePct, isMetal) {
      const item = String(itemName || 'Unnamed Waste').trim().slice(0, 80) || 'Unnamed Waste';
      const moisture = Math.min(100, Math.max(0, Number(moisturePct) || 0));
      const metal = Boolean(isMetal);
      const result = this.evaluateSensors(true, moisture, metal);

      const entry = {
        timestamp: new Date().toISOString(),
        item,
        bin: result.bin,
        angle: result.angle,
        moisture,
        metal
      };

      this.sortLog.unshift(entry);
      this.sortLog = this.sortLog.slice(0, 30);

      const state = window.telemetrySim.state;
      state.sorter.irProximity = true;
      state.sorter.moisture = moisture;
      state.sorter.inductive = metal;
      state.sorter.servoAngle = result.angle;
      state.sorter.lastItemType = result.bin;
      state.sorter.totalSortedToday += 1;

      const key = metal ? 'metal' : moisture >= 40 ? 'wet' : 'dry';
      state.sorter.segregation[key] += 1;

      this.animateSorterStage(result.angle, result.itemClass);
      this.renderSorterLogTable();
      window.telemetrySim.emitUpdate('manual_sorting_event');

      return result;
    }

    animateSorterStage(angle, itemClass) {
      const arm = document.getElementById('servo-arm-element');
      const angleText = document.getElementById('servo-angle-text');
      const item = document.getElementById('sorter-anim-item');

      if (arm) arm.style.transform = `rotate(${angle}deg)`;
      if (angleText) {
        const labels = {
          0: '0° (Dry Waste)',
          90: '90° (Wet / Organic)',
          180: '180° (Metal / Recyclable)'
        };
        angleText.textContent = labels[angle] || `${angle}°`;
      }

      if (item) {
        item.textContent = itemClass === 'metal' ? '🥫' : itemClass === 'wet' ? '🍌' : '📦';
        item.style.left = '10px';
        requestAnimationFrame(() => { item.style.left = 'calc(100% - 46px)'; });
      }
    }

    renderSorterLogTable() {
      const tbody = document.getElementById('sorter-log-tbody');
      if (!tbody) return;

      tbody.replaceChildren(...this.sortLog.map(entry => {
        const tr = document.createElement('tr');
        [
          new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          entry.item,
          entry.bin,
          `${entry.angle}°`,
          `${entry.moisture}%`,
          entry.metal ? 'TRUE' : 'FALSE'
        ].forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });
        return tr;
      }));
    }
  }

  window.wasteSorter = new WasteSorter();
})();
