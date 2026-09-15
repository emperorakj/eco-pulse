(function () {
  'use strict';

  class AppController {
    constructor() {
      this.currentTab = 'dashboard';
      this.lastAlertKeys = new Set();
      this.lastState = null;
    }

    init() {
      this.bindNavigation();
      this.bindModes();
      this.bindManualControls();
      this.installScenarioPanel();

      window.chartManager.init();

      window.telemetrySim.onUpdate((state, source) => {
        this.lastState = state;
        this.updateUI(state, source);
      });

      window.wasteSorter.renderSorterLogTable();
      window.communityPoints.renderLeaderboard();
      window.communityPoints.renderRewards();
      window.esp32Bridge.renderCodeSnippet();

      this.updateClock();
      setInterval(() => this.updateClock(), 1000);
    }

    bindNavigation() {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', event => {
          event.preventDefault();
          const tab = item.dataset.tab;
          if (!tab) return;

          document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

          item.classList.add('active');
          document.getElementById(`tab-${tab}`)?.classList.add('active');
          this.currentTab = tab;
        });
      });
    }

    bindModes() {
      const autoBtn = document.getElementById('btn-mode-autopilot');
      const manualBtn = document.getElementById('btn-mode-manual');
      const panel = document.getElementById('manual-controls-panel');

      autoBtn?.addEventListener('click', () => {
        window.telemetrySim.setMode('autopilot');
        autoBtn.classList.add('active');
        manualBtn?.classList.remove('manual-active');
        if (panel) panel.style.display = 'none';
      });

      manualBtn?.addEventListener('click', () => {
        window.telemetrySim.setMode('manual');
        manualBtn.classList.add('manual-active');
        autoBtn?.classList.remove('active');
        if (panel) panel.style.display = 'block';
      });
    }

    bindManualControls() {
      const bindings = [
        ['slider-ir-moisture', 'val-ir-moisture', 'sorter.moisture', '%'],
        ['slider-bin-organic', 'val-bin-organic', 'bins.organic', '%'],
        ['slider-compost-temp', 'val-compost-temp', 'composting.temp', '°C'],
        ['slider-sanitization-water', 'val-sanitization-water', 'sanitization.waterLevel', '%']
      ];

      bindings.forEach(([sliderId, valueId, path, unit]) => {
        const slider = document.getElementById(sliderId);
        const label = document.getElementById(valueId);
        if (!slider) return;

        const sync = () => {
          const value = Number(slider.value);
          if (label) label.textContent = `${value}${unit}`;
          window.telemetrySim.updateManual(path, value);
        };

        slider.addEventListener('input', sync);
      });
    }

    installScenarioPanel() {
      const panel = document.getElementById('manual-controls-panel');
      if (!panel) return;

      const box = document.createElement('div');
      box.style.cssText = 'margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color);';

      const title = document.createElement('div');
      title.className = 'lab-panel-title';
      title.textContent = '🎬 Demo Scenarios';

      const buttons = document.createElement('div');
      buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:.6rem;';

      const scenarios = [
        ['normal', 'Normal Operation'],
        ['bin_overflow', 'Bin Overflow'],
        ['compost_overheat', 'Compost Overheat'],
        ['sanitization_demand', 'High Sanitization Demand'],
        ['sensor_failure', 'Sensor Failure']
      ];

      scenarios.forEach(([key, label]) => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.textContent = label;
        btn.onclick = () => {
          window.telemetrySim.setScenario(key);
          this.showToast(`🎬 Scenario: ${label}`, 'success');
        };
        buttons.appendChild(btn);
      });

      box.append(title, buttons);
      panel.appendChild(box);
    }

    updateUI(state, source) {
      this.updateKpis(state);
      window.binMonitor.renderBins(state);
      window.compostingUnit.renderCompostView(state);
      window.sanitizationFacility.syncAutomaticAction(state);
      window.sanitizationFacility.renderLogs();
      window.wasteSorter.renderSorterLogTable();
      window.chartManager.update(state);
      this.renderAlerts(state);
      this.updateDataSource(state, source);
    }

    updateKpis(state) {
      const set = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      set('kpi-total-waste', `${state.community.wasteDivertedKg.toFixed(1)} kg`);
      set('kpi-co2-saved', `${state.community.co2SavedKg.toFixed(1)} kg`);
      set('kpi-compost-temp', `${state.composting.temp.toFixed(1)}°C`);
      set('kpi-green-points', state.community.totalGreenPoints.toLocaleString());

      const tempSub = document.querySelector('#kpi-compost-temp')?.parentElement?.querySelector('.kpi-subtext');
      if (tempSub) {
        tempSub.textContent = `${state.composting.phase} Phase`;
      }

      const sorterMoisture = document.getElementById('sorter-live-moisture');
      const sorterMetal = document.getElementById('sorter-live-inductive');
      if (sorterMoisture) sorterMoisture.textContent = `${Math.round(state.sorter.moisture)}%`;
      if (sorterMetal) sorterMetal.textContent = state.sorter.inductive ? 'TRUE' : 'FALSE';

      const arm = document.getElementById('servo-arm-element');
      const angleText = document.getElementById('servo-angle-text');
      if (arm) arm.style.transform = `rotate(${state.sorter.servoAngle}deg)`;
      if (angleText) angleText.textContent = `${state.sorter.servoAngle}° (${state.sorter.lastItemType})`;

      const pir = document.getElementById('sanitization-pir-count');
      const water = document.getElementById('sanitization-water-val');
      if (pir) pir.textContent = state.sanitization.pirCount;
      if (water) water.textContent = `${Math.round(state.sanitization.waterLevel)}%`;

      const item = document.getElementById('sorter-anim-item');
      if (item) {
        item.textContent =
          state.sorter.inductive ? '🥫' :
          state.sorter.moisture >= 40 ? '🍌' : '📦';
      }
    }

    renderAlerts(state) {
      const alerts = [];
      const bins = Object.entries(state.bins);

      bins.forEach(([key, fill]) => {
        if (fill >= 85) alerts.push({
          key: `bin:${key}`,
          level: 'danger',
          title: `${window.binMonitor.config[key].name} bin overflowing`,
          detail: `${Math.round(fill)}% full • Immediate collection recommended`
        });
        else if (fill >= 70) alerts.push({
          key: `bin:${key}`,
          level: 'warning',
          title: `${window.binMonitor.config[key].name} bin near full`,
          detail: `${Math.round(fill)}% full • Schedule collection`
        });
      });

      if (state.composting.temp > 65) alerts.push({
        key: 'compost:overheat',
        level: 'danger',
        title: 'Compost temperature elevated',
        detail: `${state.composting.temp.toFixed(1)}°C • Aeration active`
      });

      if (state.sanitization.waterLevel <= 20) alerts.push({
        key: 'san:water',
        level: 'danger',
        title: 'Sanitization water low',
        detail: `${Math.round(state.sanitization.waterLevel)}% remaining`
      });

      if (state.sanitization.odorPpm >= 300) alerts.push({
        key: 'san:odor',
        level: 'warning',
        title: 'Odor/VOC threshold exceeded',
        detail: `${Math.round(state.sanitization.odorPpm)} PPM • Sanitization cycle required`
      });

      if (state.meta.heartbeat !== 'healthy') alerts.push({
        key: 'sensor:health',
        level: 'warning',
        title: 'Telemetry health degraded',
        detail: 'A simulated sensor communication fault is active'
      });

      const container = document.getElementById('alerts-feed-container');
      if (!container) return;

      if (!alerts.length) {
        container.replaceChildren(Object.assign(document.createElement('div'), {
          textContent: '✓ All monitored conditions are within configured thresholds.',
          style: 'color:var(--primary-green);font-size:.8rem;'
        }));
        return;
      }

      container.replaceChildren(...alerts.map(alert => {
        const item = document.createElement('div');
        item.className = `alert-item ${alert.level}`;

        const icon = document.createElement('div');
        icon.textContent = alert.level === 'danger' ? '🔴' : '🟠';

        const body = document.createElement('div');

        const title = document.createElement('strong');
        title.textContent = alert.title;

        const detail = document.createElement('div');
        detail.style.cssText = 'color:var(--text-muted);margin-top:2px;';
        detail.textContent = alert.detail;

        const time = document.createElement('div');
        time.className = 'alert-time';
        time.textContent = new Date().toLocaleTimeString();

        body.append(title, detail, time);
        item.append(icon, body);
        return item;
      }));
    }

    updateDataSource(state, source) {
      const badge = document.querySelector('.status-badge');
      if (badge) {
        const text = badge.querySelector('span:last-child');
        if (text) text.textContent = 'SIMULATION MODE • TELEMETRY ONLINE';
      }

      const clock = document.getElementById('header-system-clock');
      if (clock) clock.textContent = `${new Date().toLocaleTimeString()} | SIMULATED`;

      const footerStats = document.querySelectorAll('.sidebar-footer .quick-stat-row strong');
      if (footerStats[0]) footerStats[0].textContent = 'Simulation';
      if (footerStats[1]) footerStats[1].textContent = '2.5 s update';
      if (footerStats[2]) footerStats[2].textContent = 'Condition-Based';

      document.title = 'EcoPulse | Smart Waste & Sanitization • Simulation Prototype';
    }

    updateClock() {
      const clock = document.getElementById('header-system-clock');
      if (!clock) return;
      clock.textContent = `${new Date().toLocaleTimeString()} | SIMULATED`;
    }

    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.dataset.type = type;
      toast.textContent = message;

      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3200);
    }
  }

  window.app = new AppController();
  document.addEventListener('DOMContentLoaded', () => window.app.init());
})();
