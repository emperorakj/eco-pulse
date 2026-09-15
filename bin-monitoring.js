/**
 * IoT Smart Bin Monitoring & Logistics Module
 * Manages ultrasonic distance telemetry, fill percentage, and condition-based dispatch alerts.
 */
class BinMonitor {
  constructor() {
    this.binMetadata = {
      organic: { name: 'Organic / Wet Bin', icon: '🌱', maxDepthCm: 100, color: 'var(--primary-green)' },
      recyclable: { name: 'Recyclable / Dry Bin', icon: '♻️', maxDepthCm: 100, color: 'var(--accent-cyan)' },
      metal: { name: 'Metal & Tins Bin', icon: '🥫', maxDepthCm: 80, color: 'var(--warning-amber)' },
      hazardous: { name: 'Hazardous Waste Bin', icon: '⚠️', maxDepthCm: 60, color: 'var(--danger-rose)' },
      ewaste: { name: 'E-Waste Bin', icon: '💻', maxDepthCm: 80, color: 'var(--purple-accent)' }
    };
  }

  getBinStatus(fillPct) {
    if (fillPct >= 85) return { status: 'OVERFLOWING', badgeClass: 'rose', alert: true, text: 'Immediate Dispatch Needed' };
    if (fillPct >= 70) return { status: 'NEAR FULL', badgeClass: 'amber', alert: false, text: 'Scheduled for Collection' };
    return { status: 'NORMAL', badgeClass: 'green', alert: false, text: 'Optimal Capacity' };
  }

  // Calculate distance in cm based on fill percentage
  getDistanceCm(binKey, fillPct) {
    const maxDepth = this.binMetadata[binKey].maxDepthCm;
    const filledCm = (fillPct / 100) * maxDepth;
    return Math.round(maxDepth - filledCm);
  }

  // Condition-Based Dispatching Algorithm
  calculateOptimalRoute(binsState) {
    const binsToCollect = [];
    Object.keys(binsState).forEach(key => {
      if (binsState[key] >= 75) {
        binsToCollect.push({
          key,
          name: this.binMetadata[key].name,
          fillPct: binsState[key],
          urgency: binsState[key] >= 85 ? 'HIGH' : 'MEDIUM'
        });
      }
    });

    // Sort by urgency/fill level descending
    binsToCollect.sort((a, b) => b.fillPct - a.fillPct);

    return {
      dispatchRequired: binsToCollect.length > 0,
      stopsCount: binsToCollect.length,
      estimatedCo2SavedKg: Number((binsToCollect.length * 4.2).toFixed(1)),
      route: binsToCollect
    };
  }

  renderBinCards(binsState) {
    const container = document.getElementById('bins-grid-container');
    if (!container) return;

    container.innerHTML = Object.keys(this.binMetadata).map(key => {
      const meta = this.binMetadata[key];
      const fillPct = Math.round(binsState[key]);
      const statusInfo = this.getBinStatus(fillPct);
      const distanceCm = this.getDistanceCm(key, fillPct);

      let fillClass = '';
      if (fillPct >= 85) fillClass = 'rose';
      else if (fillPct >= 70) fillClass = 'amber';

      return `
        <div class="bin-card">
          <div class="bin-header">
            <div class="bin-name">
              <span>${meta.icon}</span>
              <span>${meta.name}</span>
            </div>
            <span class="status-badge" style="background: rgba(255,255,255,0.05); color: ${fillPct >= 85 ? 'var(--danger-rose)' : (fillPct >= 70 ? 'var(--warning-amber)' : 'var(--primary-green)')};">
              ${statusInfo.status}
            </span>
          </div>

          <div class="bin-capacity-meter">
            <div class="bin-ultrasonic-beam"></div>
            <div class="bin-fill-level ${fillClass}" style="height: ${fillPct}%;">
              ${fillPct}%
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
            <span>Ultrasonic Distance: <strong>${distanceCm} cm</strong></span>
            <span>Capacity: <strong>${fillPct}/100%</strong></span>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="btn-secondary" style="flex: 1; padding: 6px;" onclick="window.telemetrySim.emptyBin('${key}')">
              🧹 Empty Bin
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.binMonitor = new BinMonitor();
