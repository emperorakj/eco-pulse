(function () {
  'use strict';

  class CommunityGreenPoints {
    constructor() {
      this.user = { name: 'Demo Resident', points: 12450, wasteKg: 46.8 };
      this.members = [
        { name: 'Green Block A', points: 18420, wasteKg: 82.4, badge: '🌳 Eco Champion' },
        { name: 'Clean City Crew', points: 16100, wasteKg: 71.2, badge: '♻️ Waste Warrior' },
        { name: 'Demo Resident', points: 12450, wasteKg: 46.8, badge: '🌱 Green Starter' },
        { name: 'Eco Family', points: 10980, wasteKg: 42.6, badge: '🌿 Eco Contributor' }
      ];

      this.rewards = [
        { title: 'Municipal Bus Pass', cost: 500, description: '10 public-transport rides', icon: '🚌' },
        { title: 'Organic Compost Bag', cost: 300, description: '5 kg compost', icon: '🌱' },
        { title: 'Utility Bill Voucher', cost: 1200, description: '₹10 equivalent demo voucher', icon: '💳' },
        { title: 'Farmers Market Discount', cost: 400, description: 'Community market discount', icon: '🥕' }
      ];
    }

    processQRDeposit(itemType, weightKg, segregatedAccurately) {
      const weight = Math.max(0, Number(weightKg) || 0);
      if (!weight) return;

      const multiplier = segregatedAccurately ? 1.5 : 0.8;
      const points = Math.round(weight * 100 * multiplier);

      this.user.points += points;
      this.user.wasteKg += weight;

      const me = this.members.find(m => m.name === this.user.name);
      if (me) {
        me.points = this.user.points;
        me.wasteKg = this.user.wasteKg;
      }

      const state = window.telemetrySim.state;
      state.community.totalGreenPoints += points;
      state.community.wasteDivertedKg += weight;
      state.community.co2SavedKg += weight * 1.8;

      this.renderLeaderboard();
      window.telemetrySim.emitUpdate('qr_deposit');

      window.app?.showToast(
        `🏅 ${points} Green Points awarded for ${itemType} (${weight.toFixed(1)} kg).`,
        'success'
      );

      if (window.confetti) {
        window.confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      }
    }

    redeemReward(index) {
      const reward = this.rewards[index];
      if (!reward) return;

      if (this.user.points < reward.cost) {
        window.app?.showToast(`❌ Need ${reward.cost - this.user.points} more points.`, 'warning');
        return;
      }

      this.user.points -= reward.cost;
      const me = this.members.find(m => m.name === this.user.name);
      if (me) me.points = this.user.points;

      window.telemetrySim.state.community.totalGreenPoints = this.user.points;
      this.renderLeaderboard();
      window.telemetrySim.emitUpdate('reward_redeemed');

      window.app?.showToast(`🎁 ${reward.title} redeemed successfully (demo transaction).`, 'success');
    }

    renderLeaderboard() {
      const tbody = document.getElementById('leaderboard-tbody');
      if (!tbody) return;

      const sorted = [...this.members].sort((a, b) => b.points - a.points);

      tbody.replaceChildren(...sorted.map((member, index) => {
        const tr = document.createElement('tr');
        [
          String(index + 1),
          member.name,
          member.points.toLocaleString(),
          `${member.wasteKg.toFixed(1)} kg`,
          member.badge
        ].forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });
        return tr;
      }));
    }

    renderRewards() {
      const container = document.getElementById('rewards-grid-container');
      if (!container) return;

      container.replaceChildren(...this.rewards.map((reward, index) => {
        const card = document.createElement('div');
        card.className = 'reward-card';

        const title = document.createElement('h3');
        title.textContent = `${reward.icon} ${reward.title}`;

        const desc = document.createElement('p');
        desc.style.cssText = 'font-size:.8rem;color:var(--text-muted);';
        desc.textContent = reward.description;

        const button = document.createElement('button');
        button.className = 'btn-primary';
        button.textContent = `Redeem • ${reward.cost} GP`;
        button.onclick = () => this.redeemReward(index);

        card.append(title, desc, button);
        return card;
      }));
    }
  }

  window.communityPoints = new CommunityGreenPoints();
})();
