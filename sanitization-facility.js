/**
 * Smart Sanitization Facility Module
 * Monitors PIR motion usage counter, water tank level, VOC/odor gas level, and disinfectant spray logic.
 */
class SanitizationFacility {
  constructor() {
    this.sanitationLogs = [
      { time: '10:48', event: 'Automated Disinfectant Mist', reason: 'Usage Count Reached (10 uses)', status: 'COMPLETED' },
      { time: '10:15', event: 'High VOC Odor Flush', reason: 'Ammonia Level > 300 PPM', status: 'COMPLETED' },
      { time: '09:30', event: 'Daily Water Refill Sync', reason: 'System Maintenance', status: 'COMPLETED' }
    ];
  }

  triggerManualSanitization() {
    window.telemetrySim.triggerSanitizationFlush();
    
    this.sanitationLogs.unshift({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: 'Manual Sanitation Trigger',
      reason: 'Dashboard User Command',
      status: 'EXECUTING...'
    });

    if (this.sanitationLogs.length > 10) this.sanitationLogs.pop();
    this.renderLogs();
  }

  renderLogs() {
    const tbody = document.getElementById('sanitization-log-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.sanitationLogs.map(l => `
      <tr>
        <td style="color: var(--text-dim);">${l.time}</td>
        <td><strong>${l.event}</strong></td>
        <td>${l.reason}</td>
        <td><span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--primary-green);">${l.status}</span></td>
      </tr>
    `).join('');
  }
}

window.sanitizationFacility = new SanitizationFacility();
