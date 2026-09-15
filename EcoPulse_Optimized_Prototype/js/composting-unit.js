(function () {
  'use strict';

  class CompostingUnit {
    getCurrentPhaseInfo(temp) {
      const t = Number(temp);
      if (t < 35) return { phase: 'Ready', index: 3, description: 'Material has cooled toward the readiness range.' };
      if (t < 40) return { phase: 'Mesophilic', index: 0, description: 'Initial biological decomposition stage.' };
      if (t <= 65) return { phase: 'Thermophilic', index: 1, description: 'Elevated microbial activity and heat generation.' };
      return { phase: 'Cooling', index: 2, description: 'Temperature is above the thermophilic range; cooling/aeration is required.' };
    }

    renderCompostView(state) {
      const temp = Number(state.composting.temp);
      const moisture = Number(state.composting.moisture);
      const gas = Number(state.composting.gasPpm);
      const phase = this.getCurrentPhaseInfo(temp);

      const stepper = document.getElementById('compost-stepper');
      if (stepper) {
        const phases = ['Mesophilic', 'Thermophilic', 'Cooling', 'Ready'];
        stepper.replaceChildren(...phases.map((name, index) => {
          const div = document.createElement('div');
          div.className = `phase-step ${index === phase.index ? 'active' : ''} ${index < phase.index ? 'completed' : ''}`;

          const circle = document.createElement('div');
          circle.className = 'phase-circle';
          circle.textContent = index < phase.index ? '✓' : String(index + 1);

          const title = document.createElement('div');
          title.className = 'phase-title';
          title.textContent = name;

          div.append(circle, title);
          return div;
        }));
      }

      const fanStatus = document.getElementById('aeration-fan-status');
      const fanIcon = document.getElementById('aeration-fan-icon');

      if (fanStatus) fanStatus.textContent = state.composting.aerationFan ? 'AERATION FAN ACTIVE' : 'AERATION FAN IDLE';
      if (fanIcon) fanIcon.classList.toggle('spinning', Boolean(state.composting.aerationFan));

      const card = document.querySelector('#tab-composting .grid-cols-2 .glass-card:last-child');
      if (card) {
        const values = card.querySelectorAll('strong');
        if (values[0]) values[0].textContent = `${moisture.toFixed(1)}% (${moisture >= 40 && moisture <= 60 ? 'Optimal' : 'Check range'})`;
        if (values[1]) values[1].textContent = `${Math.round(gas)} PPM (${gas < 250 ? 'Normal' : 'Elevated'})`;
      }

      const description = document.querySelector('#tab-composting .fan-status-box div div');
      if (description) description.textContent = `Condition-based control • ${phase.phase} • ${phase.description}`;
    }
  }

  window.compostingUnit = new CompostingUnit();
})();
