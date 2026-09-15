/**
 * Chart Manager Module
 * Manages 4 real-time interactive Chart.js visualizations with custom dark theme styling.
 */
class ChartManager {
  constructor() {
    this.charts = {};
  }

  initCharts(state) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library not loaded yet.');
      return;
    }

    // Chart global defaults for dark theme
    Chart.defaults.color = '#9ca3af';
    Chart.defaults.font.family = "'Inter', sans-serif";

    this.initBinChart(state.bins);
    this.initCompostChart(state.composting);
    this.initSegregationChart();
    this.initSanitizationChart(state.sanitization);
  }

  initBinChart(binsState) {
    const ctx = document.getElementById('chart-bin-levels')?.getContext('2d');
    if (!ctx) return;

    this.charts.binChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Organic', 'Recyclable', 'Metal', 'Hazardous', 'E-Waste'],
        datasets: [{
          label: 'Bin Fill Level (%)',
          data: [binsState.organic, binsState.recyclable, binsState.metal, binsState.hazardous, binsState.ewaste],
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(244, 63, 94, 0.7)',
            'rgba(139, 92, 246, 0.7)'
          ],
          borderColor: [
            '#10b981',
            '#06b6d4',
            '#f59e0b',
            '#f43f5e',
            '#8b5cf6'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { callback: v => v + '%' }
          },
          x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  initCompostChart(compostState) {
    const ctx = document.getElementById('chart-compost-telemetry')?.getContext('2d');
    if (!ctx) return;

    const timeLabels = ['10:40', '10:42', '10:44', '10:46', '10:48', '10:50', 'Now'];

    this.charts.compostChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: [42, 45, 50, 54, 57, 58, compostState.temperature],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yAxisID: 'yTemp',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Soil Moisture (%)',
            data: [60, 58, 56, 54, 53, 52, compostState.moisture],
            borderColor: '#06b6d4',
            backgroundColor: 'transparent',
            yAxisID: 'yMoisture',
            tension: 0.4,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yTemp: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            title: { display: true, text: 'Temp °C', color: '#f59e0b' }
          },
          yMoisture: {
            type: 'linear',
            position: 'right',
            grid: { display: false },
            title: { display: true, text: 'Moisture %', color: '#06b6d4' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  initSegregationChart() {
    const ctx = document.getElementById('chart-segregation-split')?.getContext('2d');
    if (!ctx) return;

    this.charts.segregationChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Wet / Organic (90°)', 'Dry Waste (0°)', 'Metal / Recyclable (180°)'],
        datasets: [{
          data: [54, 32, 14],
          backgroundColor: ['#10b981', '#06b6d4', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
        },
        cutout: '70%'
      }
    });
  }

  initSanitizationChart(sanitizationState) {
    const ctx = document.getElementById('chart-sanitization-trend')?.getContext('2d');
    if (!ctx) return;

    this.charts.sanitizationChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 'Now'],
        datasets: [{
          label: 'Air VOC / Odor (PPM)',
          data: [80, 110, 240, 310, 160, 190, sanitizationState.odorPpm],
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  updateCharts(state) {
    // Update Bin Chart
    if (this.charts.binChart) {
      this.charts.binChart.data.datasets[0].data = [
        state.bins.organic,
        state.bins.recyclable,
        state.bins.metal,
        state.bins.hazardous,
        state.bins.ewaste
      ];
      this.charts.binChart.update('none');
    }

    // Update Compost Chart
    if (this.charts.compostChart) {
      const dataTemp = this.charts.compostChart.data.datasets[0].data;
      const dataMoist = this.charts.compostChart.data.datasets[1].data;
      dataTemp.shift(); dataTemp.push(state.composting.temperature);
      dataMoist.shift(); dataMoist.push(state.composting.moisture);
      this.charts.compostChart.update('none');
    }

    // Update Sanitization Chart
    if (this.charts.sanitizationChart) {
      const dataOdor = this.charts.sanitizationChart.data.datasets[0].data;
      dataOdor.shift(); dataOdor.push(state.sanitization.odorPpm);
      this.charts.sanitizationChart.update('none');
    }
  }
}

window.chartManager = new ChartManager();
