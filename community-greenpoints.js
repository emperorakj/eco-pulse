/**
 * QR-Based Community Participation & Green Points Engine
 * Handles QR deposit check-in, point calculation, community leaderboard, reward store, and eco-impact metrics.
 */
class CommunityGreenPoints {
  constructor() {
    this.userPoints = 12450;
    this.leaderboard = [
      { rank: 1, name: 'Green Block A (Sunrise Apts)', points: 48500, wasteKg: 2450, badge: '🏆 Eco Champions' },
      { rank: 2, name: 'Block C (Meadow View)', points: 39200, wasteKg: 1980, badge: '🥈 Zero-Waste Pioneer' },
      { rank: 3, name: 'Shaurya (You)', points: 12450, wasteKg: 648, badge: '🥉 Master Recycler' },
      { rank: 4, name: 'Block B (Orchard Park)', points: 11200, wasteKg: 580, badge: '⭐ Active Citizen' },
      { rank: 5, name: 'Block D (Willow Grove)', points: 8900, wasteKg: 420, badge: '🌱 Eco Enthusiast' }
    ];

    this.rewards = [
      { id: 1, title: 'Municipal Bus Pass (10 Rides)', points: 500, icon: '🚌', desc: '100% discount on city public transport.' },
      { id: 2, title: '5kg Organic Compost Bag', points: 300, icon: '🪴', desc: 'Harvested directly from our community composting unit.' },
      { id: 3, title: 'Utility Bill Voucher ($10)', points: 1200, icon: '⚡', desc: 'Direct credit towards monthly municipal water/electricity bill.' },
      { id: 4, title: 'Farmers Market Discount', points: 400, icon: '🍎', desc: '15% off fresh produce at local community market.' }
    ];
  }

  processQRDeposit(itemType, weightKg, segregatedAccurately) {
    const multiplier = segregatedAccurately ? 1.5 : 0.8;
    const earnedPoints = Math.round(weightKg * 100 * multiplier);

    this.userPoints += earnedPoints;

    // Update global state
    window.telemetrySim.state.community.totalGreenPoints = this.userPoints;
    window.telemetrySim.state.community.wasteDivertedKg = Number((window.telemetrySim.state.community.wasteDivertedKg + weightKg).toFixed(1));
    window.telemetrySim.state.community.co2SavedKg = Number((window.telemetrySim.state.community.co2SavedKg + (weightKg * 1.8)).toFixed(1));

    // Fire Confetti if available
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Trigger Notification Toast
    window.app.showToast(`🎉 deposit Verified! +${earnedPoints} Green Points Earned!`, 'success');

    this.renderLeaderboard();
    window.telemetrySim.emitUpdate('qr_deposit');
    return earnedPoints;
  }

  redeemReward(rewardId) {
    const reward = this.rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (this.userPoints < reward.points) {
      window.app.showToast(`⚠️ Insufficient Green Points! Need ${reward.points} pts.`, 'warning');
      return;
    }

    this.userPoints -= reward.points;
    window.telemetrySim.state.community.totalGreenPoints = this.userPoints;
    window.app.showToast(`🎁 Successfully Redeemed: ${reward.title}! Check your email/app wallet.`, 'success');

    window.telemetrySim.emitUpdate('reward_redeemed');
  }

  renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.leaderboard.map(u => `
      <tr style="${u.name.includes('You') ? 'background: rgba(16, 185, 129, 0.1); font-weight: 700;' : ''}">
        <td><strong>#${u.rank}</strong></td>
        <td>${u.name}</td>
        <td><strong style="color: var(--primary-green);">${u.points.toLocaleString()} pts</strong></td>
        <td>${u.wasteKg} kg</td>
        <td><span class="status-badge" style="background: rgba(6, 182, 212, 0.1); color: var(--accent-cyan);">${u.badge}</span></td>
      </tr>
    `).join('');
  }

  renderRewardStore() {
    const container = document.getElementById('rewards-grid-container');
    if (!container) return;

    container.innerHTML = this.rewards.map(r => `
      <div class="reward-card">
        <div style="display: flex; gap: 1rem; align-items: flex-start;">
          <div style="font-size: 2.2rem; background: rgba(255,255,255,0.05); width: 54px; height: 54px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;">
            ${r.icon}
          </div>
          <div>
            <h4 style="font-size: 1rem; color: var(--text-main);">${r.title}</h4>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${r.desc}</p>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem;">
          <span style="font-weight: 800; font-family: var(--font-heading); color: var(--warning-amber);">${r.points} Green Points</span>
          <button class="btn-primary" style="padding: 5px 12px; font-size: 0.75rem;" onclick="window.communityPoints.redeemReward(${r.id})">
            Redeem Coupon
          </button>
        </div>
      </div>
    `).join('');
  }
}

window.communityPoints = new CommunityGreenPoints();
