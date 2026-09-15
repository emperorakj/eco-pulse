/**
 * Smart Waste Segregation Module
 * Simulates 3-sensor logic (IR Proximity, Moisture Analog, Inductive Digital) & Servo Actuation (0°, 90°, 180°).
 */
class WasteSorter {
  constructor() {
    this.sortLog = [
      { time: '10:52:10', item: 'Aluminum Soda Can', bin: 'Metal / Recyclable', angle: 180, wet: '8%', metal: 'YES' },
      { time: '10:50:35', item: 'Banana Peel', bin: 'Wet / Organic', angle: 90, wet: '78%', metal: 'NO' },
      { time: '10:48:12', item: 'PET Water Bottle', bin: 'Dry Waste', angle: 0, wet: '12%', metal: 'NO' },
      { time: '10:45:00', item: 'Steel Juice Can', bin: 'Metal / Recyclable', angle: 180, wet: '5%', metal: 'YES' }
    ];
  }

  // Core Sorting Logic Algorithm
  evaluateSensors(irPresent, moisturePct, isMetal) {
    if (!irPresent) {
      return { bin: 'Idle', angle: 0, itemClass: 'None' };
    }

    if (isMetal) {
      return { bin: 'Metal / Recyclable', angle: 180, itemClass: 'metal' };
    } else if (moisturePct >= 40) {
      return { bin: 'Wet / Organic', angle: 90, itemClass: 'wet' };
    } else {
      return { bin: 'Dry Waste', angle: 0, itemClass: 'dry' };
    }
  }

  // Trigger interactive item drop & sorter animation
  sortCustomItem(itemName, moisturePct, isMetal) {
    const irPresent = true;
    const result = this.evaluateSensors(irPresent, moisturePct, isMetal);

    // Update global state
    window.telemetrySim.state.sorter.irProximity = irPresent;
    window.telemetrySim.state.sorter.moisture = moisturePct;
    window.telemetrySim.state.sorter.inductive = isMetal;
    window.telemetrySim.state.sorter.servoAngle = result.angle;
    window.telemetrySim.state.sorter.lastItemType = itemName;
    window.telemetrySim.state.sorter.totalSortedToday += 1;

    // Log item entry
    const timestamp = new Date().toLocaleTimeString();
    this.sortLog.unshift({
      time: timestamp,
      item: itemName,
      bin: result.bin,
      angle: result.angle,
      wet: `${moisturePct}%`,
      metal: isMetal ? 'YES' : 'NO'
    });

    if (this.sortLog.length > 20) this.sortLog.pop();

    // Trigger visual conveyor belt drop
    this.animateSorterStage(itemName, result);

    window.telemetrySim.emitUpdate('manual_sorting_event');
    return result;
  }

  animateSorterStage(itemName, result) {
    const itemEl = document.getElementById('sorter-anim-item');
    const servoArm = document.getElementById('servo-arm-element');
    const angleBadge = document.getElementById('servo-angle-text');

    if (servoArm) {
      servoArm.style.transform = `rotate(${result.angle - 90}deg)`;
    }

    if (angleBadge) {
      angleBadge.textContent = `${result.angle}° (${result.bin})`;
    }

    if (itemEl) {
      itemEl.style.left = '10px';
      itemEl.style.opacity = '1';
      itemEl.textContent = isMetalEmoji(itemName, result);

      // Move along conveyor belt to sensor position
      setTimeout(() => {
        itemEl.style.left = '50%';
      }, 100);

      // Drop into bin after servo rotates
      setTimeout(() => {
        itemEl.style.left = result.angle === 0 ? '20%' : (result.angle === 90 ? '50%' : '85%');
        itemEl.style.transform = 'translateY(40px) scale(0.6)';
        itemEl.style.opacity = '0';

        setTimeout(() => {
          itemEl.style.transform = 'none';
          itemEl.style.left = '10px';
          itemEl.style.opacity = '1';
        }, 600);
      }, 900);
    }
  }

  renderSorterLogTable() {
    const tbody = document.getElementById('sorter-log-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.sortLog.map(entry => `
      <tr>
        <td style="color: var(--text-dim);">${entry.time}</td>
        <td><strong>${entry.item}</strong></td>
        <td><span class="status-badge" style="background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.3); color: var(--accent-cyan);">${entry.bin}</span></td>
        <td><strong style="color: var(--warning-amber);">${entry.angle}°</strong></td>
        <td>${entry.wet}</td>
        <td>${entry.metal === 'YES' ? '<span style="color: var(--primary-green); font-weight:700;">YES</span>' : '<span style="color: var(--text-muted);">NO</span>'}</td>
      </tr>
    `).join('');
  }
}

function isMetalEmoji(name, result) {
  if (result.itemClass === 'metal') return '🥫';
  if (result.itemClass === 'wet') return '🍌';
  return '📦';
}

window.wasteSorter = new WasteSorter();
