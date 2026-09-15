/**
 * Main Application Controller & App Orchestrator
 * Controls tab switching, global clock, toast notification system, and alert monitoring.
 */
class AppController {
  constructor() {
    this.activeTab = 'dashboard';
    this.activeAlerts = [];
  }

  init() {
    this.setupEventListeners();
    this.startGlobalClock();
    
    // Subscribe to telemetry simulator state updates
    window.telemetrySim.onUpdate((state, source) => {
      this.updateUI(state, source);
    });

    // Initial chart initialization
    window.chartManager.initCharts(window.telemetrySim.state);
    window.esp32Bridge.renderCodeSnippet();
    window.communityPoints.renderLeaderboard();
    window.communityPoints.renderRewardStore();

    // Trigger first UI update
    this.updateUI(window.telemetrySim.state, 'init');
  }

  setupEventListeners() {
    // Navigation Tab Switching
    document.querySelectorAll('.nav-item').forEach(nav => {
      nav.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = nav.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Autopilot vs Manual Mode Switch Buttons
    const btnAuto = document.getElementById('btn-mode-autopilot');
    const btnManual = document.getElementById('btn-mode-manual');

    if (btnAuto && btnManual) {
      btnAuto.addEventListener('click', () => {
        window.telemetrySim.setMode('autopilot');
        btnAuto.classList.add('active');
        btnManual.classList.remove('manual-active');
        document.getElementById('manual-controls-panel').style.display = 'none';
        this.showToast('🤖 Switched to Autopilot Telemetry Stream', 'success');
      });

      btnManual.addEventListener('click', () => {
        window.telemetrySim.setMode('manual');
        btnManual.classList.add('manual-active');
        btnAuto.classList.remove('active');
        document.getElementById('manual-controls-panel').style.display = 'block';
        this.showToast('🧪 Switched to Manual Laboratory Sensor Controls', 'warning');
      });
    }

    // Manual Slider Listeners
    this.bindManualSlider('slider-ir-moisture', 'sorter', 'moisture', 'val-ir-moisture', '%');
    this.bindManualSlider('slider-bin-organic', 'bins', 'organic', 'val-bin-organic', '%');
    this.bindManualSlider('slider-bin-recyclable', 'bins', 'recyclable', 'val-bin-recyclable', '%');
    this.bindManualSlider('slider-compost-temp', 'composting', 'temperature', 'val-compost-temp', '°C');
    this.bindManualSlider('slider-sanitization-water', 'sanitization', 'waterLevel', 'val-sanitization-water', '%');
    this.bindManualSlider('slider-sanitization-odor', 'sanitization', 'odorPpm', 'val-sanitization-odor', ' PPM');
  }

  bindManualSlider(sliderId, stateGroup, key, displayId, unit) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (display) display.textContent = val + unit;
        window.telemetrySim.updateManualSensor(stateGroup, key, val);
      });
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update active navbar item
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update view visibility
    document.querySelectorAll('.tab-content').forEach(view => {
      if (view.id === `tab-${tabId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  }

  startGlobalClock() {
    const clockEl = document.getElementById('header-system-clock');
    const updateClock = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString() + ' | LIVE';
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  updateUI(state, source) {
    // 1. Update KPI overview cards
    this.updateKPIs(state);

    // 2. Update Smart Bin Visual Cards
    window.binMonitor.renderBinCards(state.bins);

    // 3. Update Composting View
    window.compostingUnit.renderCompostView(state.composting);

    // 4. Update Sanitization View
    window.sanitizationFacility.renderLogs();

    // 5. Update Sorter Log Table
    window.wasteSorter.renderSorterLogTable();

    // 6. Update Real-Time Charts
    window.chartManager.updateCharts(state);

    // 7. Evaluate System Alerts
    this.evaluateAlerts(state);
  }

  updateKPIs(state) {
    const elWaste = document.getElementById('kpi-total-waste');
    const elCo2 = document.getElementById('kpi-co2-saved');
    const elPoints = document.getElementById('kpi-green-points');
    const elTemp = document.getElementById('kpi-compost-temp');

    if (elWaste) elWaste.textContent = `${state.community.wasteDivertedKg} kg`;
    if (elCo2) elCo2.textContent = `${state.community.co2SavedKg} kg`;
    if (elPoints) elPoints.textContent = state.community.totalGreenPoints.toLocaleString();
    if (elTemp) elTemp.textContent = `${state.composting.temperature}°C`;
  }

  evaluateAlerts(state) {
    const alertsFeed = document.getElementById('alerts-feed-container');
    const activeAlerts = [];

    // Bin Overflow Alert
    Object.keys(state.bins).forEach(binKey => {
      if (state.bins[binKey] >= 85) {
        activeAlerts.push({
          type: 'danger',
          text: `⚠️ OVERFLOW ALERT: ${window.binMonitor.binMetadata[binKey].name} is at ${Math.round(state.bins[binKey])}% capacity!`,
          time: new Date().toLocaleTimeString()
        });
      }
    });

    // Composting High Temp Alert
    if (state.composting.temperature >= 68.0) {
      activeAlerts.push({
        type: 'warning',
        text: `🔥 COMPOST TEMP WARNING: Temp reached ${state.composting.temperature}°C! Aeration Fan Active.`,
        time: new Date().toLocaleTimeString()
      });
    }

    // Sanitization Water Level Low
    if (state.sanitization.waterLevel <= 20) {
      activeAlerts.push({
        type: 'danger',
        text: `🚰 SANITIZATION ALERT: Water tank level critically low (${Math.round(state.sanitization.waterLevel)}%). Refill needed.`,
        time: new Date().toLocaleTimeString()
      });
    }

    // Odor Level Alert
    if (state.sanitization.odorPpm >= 300) {
      activeAlerts.push({
        type: 'warning',
        text: `🌬️ SANITIZATION ODOR: High VOC/Ammonia levels (${state.sanitization.odorPpm} PPM). Auto-flush triggered.`,
        time: new Date().toLocaleTimeString()
      });
    }

    if (alertsFeed) {
      if (activeAlerts.length === 0) {
        alertsFeed.innerHTML = `<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem;">All systems optimal. No active alerts.</div>`;
      } else {
        alertsFeed.innerHTML = activeAlerts.map(a => `
          <div class="alert-item ${a.type}">
            <div>
              <div>${a.text}</div>
              <div class="alert-time">${a.time}</div>
            </div>
          </div>
        `).join('');
      }
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Global App Initialization on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
