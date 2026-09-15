(function () {
  'use strict';

  class SanitizationFacility {
    constructor() {
      this.sanitationLogs = [
        { time: new Date(Date.now() - 120000).toISOString(), action: 'Automatic Flush', reason: 'Odor threshold', status: 'COMPLETED' },
        { time: new Date(Date.now() - 90000).toISOString(), action: 'Disinfectant Spray', reason: 'Scheduled usage cycle', status: 'COMPLETED' }
      ];
    }

    triggerManualSanitization() {
      const started = window.telemetrySim.triggerSanitizationFlush('Manual dashboard command');
      if (!started) {
        window.app?.showToast('⏳ Sanitization cycle already running.', 'warning');
        return;
      }

      this.addLog('Disinfectant Flush', 'Manual dashboard command', 'EXECUTING');
      window.app?.showToast('🧼 Simulated disinfectant flush started.', 'success');

      setTimeout(() => {
        this.addLog('Disinfectant Flush', 'Manual dashboard command', 'COMPLETED');
      }, 1900);
    }

    addLog(action, reason, status) {
      this.sanitationLogs.unshift({
        time: new Date().toISOString(),
        action,
        reason,
        status
      });
      this.sanitationLogs = this.sanitationLogs.slice(0, 20);
      this.renderLogs();
    }

    syncAutomaticAction(state) {
      const action = state.sanitization.lastAction;
      if (!action) return;

      const exists = this.sanitationLogs.some(
        log => log.time === action.timestamp && log.action === action.action
      );

      if (!exists) {
        this.addLog(action.action, action.reason, action.status);
      }
    }

    renderLogs() {
      const tbody = document.getElementById('sanitization-log-tbody');
      if (!tbody) return;

      tbody.replaceChildren(...this.sanitationLogs.map(log => {
        const tr = document.createElement('tr');
        [
          new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          log.action,
          log.reason,
          log.status
        ].forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });
        return tr;
      }));
    }
  }

  window.sanitizationFacility = new SanitizationFacility();
})();
