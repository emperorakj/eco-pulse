(function () {
  'use strict';

  class BinMonitor {
    constructor() {
      this.config = {
        organic: { name: 'Organic', icon: '🥬', capacityCm: 100 },
        recyclable: { name: 'Recyclable', icon: '♻️', capacityCm: 100 },
        metal: { name: 'Metal', icon: '🥫', capacityCm: 80 },
        hazardous: { name: 'Hazardous', icon: '⚠️', capacityCm: 60 },
        ewaste: { name: 'E-Waste', icon: '🔌', capacityCm: 80 }
      };
    }

    getBinStatus(fillPct) {
      const fill = Number(fillPct);
      if (fill >= 85) return { label: 'OVERFLOWING', className: 'rose', priority: 'HIGH', action: 'Immediate collection' };
      if (fill >= 70) return { label: 'NEAR FULL', className: 'amber', priority: 'MEDIUM', action: 'Schedule collection' };
      return { label: 'NORMAL', className: '', priority: 'LOW', action: 'No immediate action' };
    }

    getDistanceCm(binKey, fillPct) {
      const capacity = this.config[binKey]?.capacityCm || 100;
      return Math.max(0, capacity * (1 - Number(fillPct) / 100));
    }

    calculateOptimalRoute(binsState) {
      const candidates = Object.entries(binsState)
        .filter(([, fill]) => Number(fill) >= 75)
        .map(([key, fill]) => ({
          key,
          fill: Number(fill),
          urgency: Number(fill) >= 85 ? 'HIGH' : 'MEDIUM'
        }))
        .sort((a, b) => b.fill - a.fill);

      return {
        candidates,
        isRouteOptimized: false,
        description: 'Condition-based collection prioritization. GPS route optimization is a deployment extension.',
        estimatedTransportSavingPct: candidates.length ? Math.min(38, candidates.length * 6) : 0
      };
    }

    renderBins(state) {
      const container = document.getElementById('bins-grid-container');
      if (!container) return;

      const route = this.calculateOptimalRoute(state.bins);

      container.replaceChildren(...Object.entries(this.config).map(([key, cfg]) => {
        const fill = Math.round(Number(state.bins[key]) || 0);
        const status = this.getBinStatus(fill);
        const distance = this.getDistanceCm(key, fill);

        const card = document.createElement('div');
        card.className = 'bin-card';

        const header = document.createElement('div');
        header.className = 'bin-header';

        const name = document.createElement('div');
        name.className = 'bin-name';
        name.textContent = `${cfg.icon} ${cfg.name}`;

        const badge = document.createElement('span');
        badge.className = `status-badge ${status.className === 'rose' ? 'danger' : status.className === 'amber' ? 'warning' : ''}`;
        badge.textContent = status.label;

        header.append(name, badge);

        const meter = document.createElement('div');
        meter.className = 'bin-capacity-meter';

        const beam = document.createElement('div');
        beam.className = 'bin-ultrasonic-beam';

        const fillEl = document.createElement('div');
        fillEl.className = `bin-fill-level ${status.className}`;
        fillEl.style.height = `${fill}%`;
        fillEl.textContent = `${fill}%`;

        meter.append(fillEl, beam);

        const details = document.createElement('div');
        details.style.cssText = 'font-size:.75rem;color:var(--text-muted);display:flex;justify-content:space-between;gap:8px;';
        details.innerHTML = `<span>Simulated ultrasonic</span><span>${distance.toFixed(0)} cm</span>`;

        const action = document.createElement('div');
        action.style.cssText = 'font-size:.75rem;color:var(--text-muted);';
        action.textContent = status.action;

        const button = document.createElement('button');
        button.className = 'btn-secondary';
        button.textContent = 'Simulate Collection';
        button.disabled = fill < 50;
        button.onclick = () => {
          window.telemetrySim.simulateBinCollection(key);
          window.app?.showToast(`🗑️ ${cfg.name} bin collection simulated.`, 'success');
        };

        card.append(header, meter, details, action, button);
        return card;
      }));

      const routeText = document.querySelector('#tab-bins .glass-card p:nth-of-type(2) strong');
      if (routeText) {
        routeText.textContent = `${route.estimatedTransportSavingPct}% projected transport overhead reduction`;
      }
    }
  }

  window.binMonitor = new BinMonitor();
})();
