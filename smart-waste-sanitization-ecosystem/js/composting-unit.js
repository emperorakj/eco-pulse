/**
 * Decentralized Composting Unit Module
 * Biological phase tracking, temperature/moisture telemetry, and condition-based aeration fan control.
 */
class CompostingUnit {
  constructor() {
    this.phases = [
      { id: 'Mesophilic', name: '1. Mesophilic Phase', range: '20°C - 40°C', desc: 'Initial organic breakdown by mesophilic microbes.' },
      { id: 'Thermophilic', name: '2. Thermophilic Phase', range: '40°C - 65°C', desc: 'High temperature pathogen & weed seed destruction.' },
      { id: 'Cooling', name: '3. Curing & Cooling', range: '65°C -> 40°C', desc: 'Lignin decomposition & maturation.' },
      { id: 'Ready', name: '4. Ready for Harvest', range: '< 35°C', desc: 'Nutrient-rich organic compost ready for community gardens.' }
    ];
  }

  getCurrentPhaseInfo(temp) {
    if (temp < 40) return this.phases[0];
    if (temp >= 40 && temp <= 65) return this.phases[1];
    if (temp > 65) return this.phases[2];
    return this.phases[3];
  }

  renderCompostView(state) {
    const temp = state.temperature;
    const moisture = state.moisture;
    const fanState = state.aerationFan;
    const currentPhase = this.getCurrentPhaseInfo(temp);

    // Update phase UI stepper
    const stepperContainer = document.getElementById('compost-stepper');
    if (stepperContainer) {
      stepperContainer.innerHTML = this.phases.map(p => {
        let activeClass = '';
        if (p.id === currentPhase.id) activeClass = 'active';
        else if (
          (currentPhase.id === 'Thermophilic' && p.id === 'Mesophilic') ||
          (currentPhase.id === 'Cooling' && (p.id === 'Mesophilic' || p.id === 'Thermophilic'))
        ) {
          activeClass = 'completed';
        }

        return `
          <div class="phase-step ${activeClass}">
            <div class="phase-circle">${p.name[0]}</div>
            <div class="phase-title">${p.name.split('.')[1]}</div>
          </div>
        `;
      }).join('');
    }

    // Update fan status widget
    const fanIcon = document.getElementById('aeration-fan-icon');
    const fanStatusText = document.getElementById('aeration-fan-status');
    if (fanIcon && fanStatusText) {
      if (fanState) {
        fanIcon.classList.add('spinning');
        fanStatusText.textContent = 'AERATION FAN ACTIVE (Cooling / O2 Supply)';
        fanStatusText.style.color = 'var(--accent-cyan)';
      } else {
        fanIcon.classList.remove('spinning');
        fanStatusText.textContent = 'AERATION FAN IDLE';
        fanStatusText.style.color = 'var(--text-muted)';
      }
    }
  }
}

window.compostingUnit = new CompostingUnit();
